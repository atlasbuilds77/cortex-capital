/**
 * Cortex Capital Bridge
 * Connects Fish Tank to real Alpaca paper trading account
 * AND the real Cortex Agent System
 */

const WebSocket = require('ws');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Alpaca Paper Trading Credentials
const ALPACA_KEY = 'PKQWAY24UNG2XV362XDATW6URI';
const ALPACA_SECRET = '5V71zMjGN3SN6qMhmBE1WWMfH6EH8hqmCLszassuENSB';
const ALPACA_BASE = 'https://paper-api.alpaca.markets';

// Path to real Cortex agent system
const CORTEX_AGENTS_PATH = '/Users/atlasbuilds/clawd/autonomous-trading-company/agents';
const AGENT_MEMORY_PATH = path.join(CORTEX_AGENTS_PATH, '.agent-memory');
const AGENT_REGISTRY_PATH = path.join(CORTEX_AGENTS_PATH, '.agent-registry.json');
const EVENT_LOG_PATH = path.join(CORTEX_AGENTS_PATH, 'message-board.json');

// Cortex agents mapped to trading roles
const CORTEX_AGENTS = [
  { id: 'cortex-analyst', name: 'Analyst', role: 'ANALYST', cortexId: 'intel', color: '#3B82F6' },
  { id: 'cortex-strategist', name: 'Strategist', role: 'STRATEGIST', cortexId: 'sage', color: '#8B5CF6' },
  { id: 'cortex-executor', name: 'Executor', role: 'EXECUTOR', cortexId: 'scout', color: '#10B981' },
  { id: 'cortex-reporter', name: 'Reporter', role: 'REPORTER', cortexId: 'growth', color: '#F59E0B' },
  { id: 'cortex-options-strategist', name: 'Options Strategist', role: 'OPTIONS_STRATEGIST', cortexId: 'prophet', color: '#EF4444' },
  { id: 'cortex-day-trader', name: 'Day Trader', role: 'DAY_TRADER', cortexId: 'surge', color: '#06B6D4' },
  { id: 'cortex-momentum', name: 'Momentum', role: 'MOMENTUM', cortexId: 'pulse', color: '#EC4899' },
];

// Map Cortex agent IDs to roles
const ROLE_MAP = {
  'scout': 'EXECUTOR',
  'sage': 'STRATEGIST',
  'intel': 'ANALYST',
  'growth': 'REPORTER',
  'prophet': 'OPTIONS_STRATEGIST',
  'surge': 'DAY_TRADER',
  'pulse': 'MOMENTUM',
  'iris': 'ANALYST', // Crypto analyst falls to analyst
  'cipher': 'ANALYST',
  'risk': 'STRATEGIST',
  'orion': 'STRATEGIST', // CEO oversight
  'atlas': 'EXECUTOR', // COO oversight
};

// In-memory state
let agentStates = {};
let recentTrades = [];
let totalPnL = 0;
let accountInfo = null;
let positions = [];
let lastEventLogMtime = 0;

// Initialize agent states
CORTEX_AGENTS.forEach(agent => {
  agentStates[agent.id] = {
    ...agent,
    status: 'idle',
    pnl: 0,
    lastTrade: null,
    lastSeen: new Date()
  };
});

// WebSocket clients
const clients = new Set();

// Broadcast to all connected clients
function broadcast(message) {
  const data = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Alpaca API call helper
function alpacaRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, ALPACA_BASE);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'APCA-API-KEY-ID': ALPACA_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Parse error: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Read real agent states from Cortex system
function readAgentStates() {
  try {
    // Read agent registry for current status
    if (fs.existsSync(AGENT_REGISTRY_PATH)) {
      const registry = JSON.parse(fs.readFileSync(AGENT_REGISTRY_PATH, 'utf-8'));
      
      // Update agent states based on registry
      CORTEX_AGENTS.forEach(agent => {
        const cortexAgent = registry[agent.cortexId];
        if (cortexAgent) {
          const isActive = cortexAgent.shifts?.day === 'active' || 
                          cortexAgent.shifts?.swing === 'active';
          agentStates[agent.id].status = isActive ? 'working' : 'idle';
        }
      });
    }
  } catch (err) {
    console.error('[CortexBridge] Error reading agent states:', err.message);
  }
}

// Read events from the message board to attribute trades
function readEventLog() {
  try {
    if (!fs.existsSync(EVENT_LOG_PATH)) return;
    
    const stat = fs.statSync(EVENT_LOG_PATH);
    if (stat.mtimeMs <= lastEventLogMtime) return; // No changes
    
    lastEventLogMtime = stat.mtimeMs;
    const content = fs.readFileSync(EVENT_LOG_PATH, 'utf-8');
    
    // Parse JSONL or JSON array
    let events = [];
    try {
      events = JSON.parse(content);
    } catch {
      // Try JSONL
      events = content.split('\n')
        .filter(line => line.trim())
        .map(line => {
          try { return JSON.parse(line); } catch { return null; }
        })
        .filter(Boolean);
    }
    
    // Look for recent trade events
    const tradeEvents = events.filter(e => 
      e.kind === 'trade_executed' || 
      e.kind === 'trade_closed' ||
      e.kind === 'position_opened' ||
      e.kind === 'position_closed'
    );
    
    return tradeEvents.slice(-50); // Last 50 events
  } catch (err) {
    console.error('[CortexBridge] Error reading event log:', err.message);
    return [];
  }
}

// Get the real agent that executed a trade based on event log
function getAgentForTrade(orderId, symbol) {
  const events = readEventLog() || [];
  
  // Find matching trade event
  const matchingEvent = events.find(e => 
    e.data?.orderId === orderId || 
    e.data?.symbol === symbol
  );
  
  if (matchingEvent && matchingEvent.source) {
    const role = ROLE_MAP[matchingEvent.source];
    const agent = CORTEX_AGENTS.find(a => a.role === role);
    if (agent) {
      return agent;
    }
  }
  
  // Fallback: attribute based on trade characteristics
  return attributeTradeByCharacteristics(symbol);
}

// Attribute trade based on characteristics when no event is found
function attributeTradeByCharacteristics(symbol) {
  // Options trades go to Options Strategist
  if (symbol && (symbol.includes('C') || symbol.includes('P')) && symbol.length > 10) {
    return CORTEX_AGENTS.find(a => a.role === 'OPTIONS_STRATEGIST');
  }
  
  // Crypto goes to analyst (Iris falls under analyst)
  const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'DOGE', 'AVAX'];
  if (cryptoSymbols.some(c => symbol?.includes(c))) {
    return CORTEX_AGENTS.find(a => a.role === 'ANALYST');
  }
  
  // High frequency / small positions go to Day Trader
  // Default to Executor (Scout) for regular stock trades
  return CORTEX_AGENTS.find(a => a.role === 'EXECUTOR');
}

// Fetch account info
async function fetchAccount() {
  try {
    const account = await alpacaRequest('/v2/account');
    accountInfo = {
      id: account.account_number,
      equity: parseFloat(account.equity),
      cash: parseFloat(account.cash),
      buyingPower: parseFloat(account.buying_power),
      status: account.status,
      pnl: parseFloat(account.equity) - 100000, // Paper starts at $100k
    };
    console.log(`[Alpaca] Account: $${accountInfo.equity.toLocaleString()} equity`);
    return accountInfo;
  } catch (err) {
    console.error('[Alpaca] Account fetch error:', err.message);
    return null;
  }
}

// Fetch positions
async function fetchPositions() {
  try {
    const pos = await alpacaRequest('/v2/positions');
    positions = pos.map(p => ({
      symbol: p.symbol,
      qty: parseInt(p.qty),
      side: parseInt(p.qty) > 0 ? 'long' : 'short',
      avgEntry: parseFloat(p.avg_entry_price),
      currentPrice: parseFloat(p.current_price),
      marketValue: parseFloat(p.market_value),
      unrealizedPL: parseFloat(p.unrealized_pl),
      unrealizedPLPct: parseFloat(p.unrealized_plpc) * 100,
    }));
    console.log(`[Alpaca] Positions: ${positions.length} open`);
    return positions;
  } catch (err) {
    console.error('[Alpaca] Positions fetch error:', err.message);
    return [];
  }
}

// Fetch recent orders (filled = trades) and attribute to real agents
async function fetchRecentOrders() {
  try {
    const orders = await alpacaRequest('/v2/orders?status=filled&limit=20&direction=desc');
    const newTrades = orders.map(o => {
      // Get the REAL agent that made this trade
      const agent = getAgentForTrade(o.id, o.symbol);
      return {
        id: o.id,
        agent: agent.id,
        agentName: agent.name,
        role: agent.role,
        action: o.side.toUpperCase(),
        symbol: o.symbol,
        qty: parseInt(o.filled_qty),
        price: parseFloat(o.filled_avg_price),
        pnl: 0, // Can't calculate without entry price
        timestamp: o.filled_at,
        orderId: o.id,
      };
    });
    
    // Only add new trades
    const existingIds = new Set(recentTrades.map(t => t.orderId));
    const brandNew = newTrades.filter(t => !existingIds.has(t.orderId));
    
    if (brandNew.length > 0) {
      recentTrades = [...brandNew, ...recentTrades].slice(0, 50);
      console.log(`[Alpaca] ${brandNew.length} new trades`);
      
      // Update agent states for active traders
      brandNew.forEach(trade => {
        if (agentStates[trade.agent]) {
          agentStates[trade.agent].status = 'working';
          agentStates[trade.agent].lastTrade = trade;
          agentStates[trade.agent].lastSeen = new Date();
        }
      });
      
      // Broadcast new trades
      brandNew.forEach(trade => {
        broadcast({
          type: 'trade',
          trade,
          agentState: agentStates[trade.agent],
          totalPnL: accountInfo?.pnl || 0
        });
      });
    }
    
    return recentTrades;
  } catch (err) {
    console.error('[Alpaca] Orders fetch error:', err.message);
    return [];
  }
}

// Calculate agent P&L from positions
function updateAgentPnL() {
  // Reset all to 0
  CORTEX_AGENTS.forEach(agent => {
    agentStates[agent.id].pnl = 0;
  });
  
  // Attribute position P&L to agents based on who likely opened them
  positions.forEach((pos) => {
    const agent = attributeTradeByCharacteristics(pos.symbol);
    if (agent) {
      agentStates[agent.id].pnl += pos.unrealizedPL;
      agentStates[agent.id].status = pos.unrealizedPL > 0 ? 'success' : 'error';
    }
  });
  
  // Calculate total P&L
  totalPnL = positions.reduce((sum, p) => sum + p.unrealizedPL, 0);
}

// Main polling loop
async function pollAlpaca() {
  // Read real agent states from Cortex system
  readAgentStates();
  
  await fetchAccount();
  await fetchPositions();
  await fetchRecentOrders();
  updateAgentPnL();
  
  // Broadcast full state update
  broadcast({
    type: 'state_update',
    account: accountInfo,
    positions,
    agents: agentStates,
    recentTrades: recentTrades.slice(0, 20),
    totalPnL
  });
}

// Create WebSocket server
function createCortexBridge(port = 3004) {
  const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Health check endpoint
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        agents: CORTEX_AGENTS.length,
        alpaca: !!accountInfo,
        positions: positions.length,
        cortexConnected: fs.existsSync(AGENT_REGISTRY_PATH)
      }));
      return;
    }

    // State endpoint
    if (req.url === '/state') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        account: accountInfo,
        positions,
        agents: agentStates,
        recentTrades: recentTrades.slice(0, 20),
        totalPnL
      }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`[CortexBridge] Client connected. Total: ${clients.size}`);

    // Send initial state
    ws.send(JSON.stringify({
      type: 'init',
      account: accountInfo,
      positions,
      agents: agentStates,
      recentTrades: recentTrades.slice(0, 20),
      totalPnL
    }));

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[CortexBridge] Client disconnected. Total: ${clients.size}`);
    });
  });

  // Initial fetch
  pollAlpaca();

  // Poll every 5 seconds
  setInterval(pollAlpaca, 5000);

  server.listen(port, () => {
    console.log(`[CortexBridge] Running on port ${port}`);
    console.log(`[CortexBridge] WebSocket: ws://localhost:${port}`);
    console.log(`[CortexBridge] HTTP State: http://localhost:${port}/state`);
    console.log(`[CortexBridge] Connected to Alpaca Paper Trading`);
    console.log(`[CortexBridge] Connected to Cortex Agent System: ${fs.existsSync(AGENT_REGISTRY_PATH) ? 'YES' : 'NO'}`);
  });

  return server;
}

module.exports = { createCortexBridge };

// Run standalone
if (require.main === module) {
  createCortexBridge(3004);
}
