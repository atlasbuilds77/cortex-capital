/**
 * Options Worker - Tradier Integration
 * Claims execute_trade steps for options and executes via Tradier API
 * Rules: -35% stop, scaling (30/50/75/100)
 * 0DTE emergency protocol: Check expiry FIRST
 */

import https from 'https';
import { config, getCredentials } from '../../integration/config';
import * as db from '../../integration/db-adapter';

// Worker configuration
const WORKER_ID = `options-worker-${process.pid}`;
const POLL_INTERVAL = config.workers.pollIntervalMs;
const CIRCUIT_BREAKER_THRESHOLD = config.workers.circuitBreakerThreshold;
const CIRCUIT_BREAKER_RESET = config.workers.circuitBreakerResetMs;

// Circuit breaker state
let consecutiveFailures = 0;
let circuitOpen = false;
let circuitOpenedAt: Date | null = null;

// Trading rules
const STOP_LOSS = config.trading.options.stopLoss; // -35%
const SCALING_LEVELS = config.trading.options.scalingLevels; // [30%, 50%, 75%, 100%]

interface OptionsPayload {
  symbol: string;           // Underlying (e.g., "SPY")
  optionSymbol: string;     // OCC symbol (e.g., "SPY240207C00500000")
  side: 'buy_to_open' | 'sell_to_close' | 'buy_to_close' | 'sell_to_open';
  quantity: number;
  orderType: 'market' | 'limit';
  limitPrice?: number;
  expiration?: string;      // YYYY-MM-DD
  strike?: number;
  optionType?: 'call' | 'put';
}

interface TradierResponse {
  order?: {
    id: number;
    status: string;
  };
  errors?: {
    error: string[];
  };
}

/**
 * Check if option is 0DTE
 */
function is0DTE(expiration: string): boolean {
  const today = new Date();
  const expiryDate = new Date(expiration);
  return today.toDateString() === expiryDate.toDateString();
}

/**
 * Check if market is open
 */
function isMarketOpen(): boolean {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const day = now.getDay();
  
  // Closed on weekends
  if (day === 0 || day === 6) return false;
  
  // Market hours: 6:30 AM - 1:00 PM PST (9:30 AM - 4:00 PM EST)
  const pstHour = hours; // Assuming system is in PST
  const pstMinutes = minutes;
  
  if (pstHour < 6 || (pstHour === 6 && pstMinutes < 30)) return false;
  if (pstHour >= 13) return false;
  
  return true;
}

/**
 * Make Tradier API request
 */
async function tradierRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: Record<string, any>
): Promise<any> {
  const creds = getCredentials();
  
  return new Promise((resolve, reject) => {
    const url = new URL(`${creds.tradier.base_url}${endpoint}`);
    
    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method,
      headers: {
        'Authorization': `Bearer ${creds.tradier.token}`,
        'Accept': 'application/json',
      },
    };
    
    if (body && method === 'POST') {
      options.headers!['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    
    if (body && method === 'POST') {
      const formData = Object.entries(body)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      req.write(formData);
    }
    
    req.end();
  });
}

/**
 * Get account ID
 */
async function getAccountId(): Promise<string> {
  const response = await tradierRequest('/user/profile');
  if (response.profile?.account?.account_number) {
    return response.profile.account.account_number;
  }
  throw new Error('Could not get account ID');
}

/**
 * Get current option quote
 */
async function getOptionQuote(optionSymbol: string): Promise<{
  bid: number;
  ask: number;
  last: number;
  change: number;
  changePct: number;
}> {
  const response = await tradierRequest(`/markets/quotes?symbols=${optionSymbol}`);
  const quote = response.quotes?.quote;
  
  if (!quote) {
    throw new Error(`No quote found for ${optionSymbol}`);
  }
  
  return {
    bid: quote.bid || 0,
    ask: quote.ask || 0,
    last: quote.last || 0,
    change: quote.change || 0,
    changePct: quote.change_percentage || 0,
  };
}

/**
 * Place options order via Tradier
 */
async function placeOrder(
  accountId: string,
  payload: OptionsPayload
): Promise<TradierResponse> {
  const orderData: Record<string, any> = {
    class: 'option',
    symbol: payload.symbol,
    option_symbol: payload.optionSymbol,
    side: payload.side,
    quantity: payload.quantity,
    type: payload.orderType,
    duration: 'day',
  };
  
  if (payload.orderType === 'limit' && payload.limitPrice) {
    orderData.price = payload.limitPrice;
  }
  
  console.log(`[OptionsWorker] Placing order:`, orderData);
  
  const response = await tradierRequest(
    `/accounts/${accountId}/orders`,
    'POST',
    orderData
  );
  
  return response;
}

/**
 * Calculate P&L for position
 */
function calculatePnL(entryPrice: number, currentPrice: number): {
  pnl: number;
  pnlPct: number;
  shouldStop: boolean;
  scalingLevel: number | null;
} {
  const pnl = currentPrice - entryPrice;
  const pnlPct = (pnl / entryPrice) * 100;
  const shouldStop = pnlPct <= STOP_LOSS * 100;
  
  // Check if at scaling level
  let scalingLevel: number | null = null;
  for (const level of SCALING_LEVELS) {
    if (pnlPct >= level * 100 && pnlPct < (level + 0.20) * 100) {
      scalingLevel = level;
      break;
    }
  }
  
  return { pnl, pnlPct, shouldStop, scalingLevel };
}

/**
 * Execute an options trade
 */
async function executeTrade(payload: OptionsPayload): Promise<{
  success: boolean;
  orderId?: number;
  error?: string;
  is0DTE?: boolean;
}> {
  try {
    // 0DTE Check - FIRST!
    if (payload.expiration) {
      const is0DTEOption = is0DTE(payload.expiration);
      if (is0DTEOption) {
        console.log('[OptionsWorker] ⚠️ 0DTE OPTION - Emergency protocol active');
        
        // Extra checks for 0DTE
        if (!isMarketOpen()) {
          return { success: false, error: '0DTE cannot be traded after market hours', is0DTE: true };
        }
        
        // Force market orders for 0DTE
        if (payload.orderType === 'limit') {
          console.log('[OptionsWorker] Converting 0DTE limit order to market');
          payload.orderType = 'market';
        }
      }
    }
    
    // Get account ID
    const accountId = await getAccountId();
    console.log(`[OptionsWorker] Using account: ${accountId}`);
    
    // Get current quote for context
    const quote = await getOptionQuote(payload.optionSymbol);
    console.log(`[OptionsWorker] Current quote: Bid ${quote.bid} / Ask ${quote.ask} / Last ${quote.last}`);
    
    // Place order
    const response = await placeOrder(accountId, payload);
    
    if (response.errors) {
      throw new Error(response.errors.error.join(', '));
    }
    
    if (response.order?.id) {
      console.log(`[OptionsWorker] ✅ Order placed: ${response.order.id} (${response.order.status})`);
      return { 
        success: true, 
        orderId: response.order.id,
        is0DTE: payload.expiration ? is0DTE(payload.expiration) : false,
      };
    }
    
    throw new Error('No order ID returned');
    
  } catch (error) {
    console.error('[OptionsWorker] Trade failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Process a single step
 */
async function processStep(step: db.MissionStep): Promise<void> {
  const payload = step.payload as OptionsPayload;
  console.log(`[OptionsWorker] Processing step ${step.id}: ${payload.side} ${payload.optionSymbol}`);
  
  try {
    const result = await executeTrade(payload);
    
    if (result.success) {
      await db.completeStep(step.id!, {
        orderId: result.orderId,
        is0DTE: result.is0DTE,
        executedAt: new Date().toISOString(),
      });
      
      // Create event
      await db.createEvent({
        agent_id: 'scout',
        kind: 'trade_executed',
        title: `Executed ${payload.side} ${payload.optionSymbol}`,
        summary: `Order ID: ${result.orderId}${result.is0DTE ? ' (0DTE)' : ''}`,
        tags: ['trade', 'options', payload.side, payload.symbol, result.is0DTE ? '0dte' : 'swing'],
        metadata: {
          step_id: step.id,
          mission_id: step.mission_id,
          ...result,
        },
      });
      
      consecutiveFailures = 0;
    } else {
      throw new Error(result.error || 'Trade failed');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[OptionsWorker] Step ${step.id} failed:`, errorMsg);
    
    await db.failStep(step.id!, errorMsg);
    consecutiveFailures++;
    
    if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      console.error(`[OptionsWorker] 🔴 Circuit breaker OPEN after ${consecutiveFailures} failures`);
      circuitOpen = true;
      circuitOpenedAt = new Date();
    }
  }
}

/**
 * Main polling loop
 */
async function pollLoop(): Promise<void> {
  // Check circuit breaker
  if (circuitOpen) {
    const timeSinceOpen = Date.now() - (circuitOpenedAt?.getTime() || 0);
    if (timeSinceOpen > CIRCUIT_BREAKER_RESET) {
      console.log('[OptionsWorker] 🟢 Circuit breaker RESET');
      circuitOpen = false;
      circuitOpenedAt = null;
      consecutiveFailures = 0;
    } else {
      console.log(`[OptionsWorker] Circuit breaker open, waiting ${Math.ceil((CIRCUIT_BREAKER_RESET - timeSinceOpen) / 1000)}s...`);
      return;
    }
  }
  
  try {
    // Get queued execute_trade steps for options
    const steps = await db.getQueuedSteps('execute_trade');
    const optionSteps = steps.filter(s => 
      s.payload?.market === 'options' || 
      s.payload?.optionSymbol || 
      s.payload?.side?.includes('_to_')
    );
    
    for (const step of optionSteps) {
      // Atomic claim
      const claimed = await db.claimStep(step.id!, WORKER_ID);
      if (!claimed) {
        console.log(`[OptionsWorker] Step ${step.id} claimed by another worker`);
        continue;
      }
      
      await processStep(step);
      
      // Small delay between trades
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (error) {
    console.error('[OptionsWorker] Poll loop error:', error);
    consecutiveFailures++;
  }
}

/**
 * Start worker
 */
async function start(): Promise<void> {
  console.log(`[OptionsWorker] Starting worker ${WORKER_ID}...`);
  console.log(`[OptionsWorker] Stop loss: ${STOP_LOSS * 100}%`);
  console.log(`[OptionsWorker] Scaling levels: ${SCALING_LEVELS.map(l => l * 100 + '%').join(', ')}`);
  console.log(`[OptionsWorker] Polling every ${POLL_INTERVAL}ms`);
  
  // Initial poll
  await pollLoop();
  
  // Set up interval
  setInterval(pollLoop, POLL_INTERVAL);
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[OptionsWorker] Received SIGTERM, shutting down...');
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('[OptionsWorker] Received SIGINT, shutting down...');
    process.exit(0);
  });
}

// Run if main module
if (require.main === module) {
  start().catch(error => {
    console.error('[OptionsWorker] Fatal error:', error);
    process.exit(1);
  });
}

export { start, executeTrade, processStep, calculatePnL };
