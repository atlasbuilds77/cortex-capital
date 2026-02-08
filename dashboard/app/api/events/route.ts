import { NextRequest } from 'next/server';

// In production, this would connect to a real database/pub-sub system
// For now, we simulate events for demo purposes

const AGENTS = ['atlas', 'sage', 'scout', 'growth', 'intel', 'observer'];
const EVENT_TYPES = [
  'conversation_turn',
  'trade_executed',
  'proposal_created',
  'trigger_fired',
  'memory_created',
];

const SAMPLE_MESSAGES = {
  atlas: [
    "What's our current exposure?",
    "Let's review the morning signals.",
    "Risk-reward looks acceptable.",
    "Hold off on that entry.",
  ],
  sage: [
    "Max drawdown scenario is concerning.",
    "Position sizing looks appropriate.",
    "I'd recommend a tighter stop here.",
    "Correlation risk is elevated.",
  ],
  scout: [
    "Fill confirmed at market.",
    "Watching for slippage.",
    "Order executed successfully.",
    "Position opened.",
  ],
  growth: [
    "Pattern recognition shows...",
    "Win rate on this setup is 68%.",
    "Historical data suggests caution.",
    "This aligns with our edge.",
  ],
  intel: [
    "Seeing unusual volume on this pair.",
    "KOL accumulation detected.",
    "Social sentiment shifting bullish.",
    "New signal: confidence 85%.",
  ],
  observer: [
    "Process check: all rules followed.",
    "Slight deviation from protocol noted.",
    "System health: all green.",
    "Risk limits within bounds.",
  ],
};

function generateEvent() {
  const type = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
  const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
  
  switch (type) {
    case 'conversation_turn':
      const messages = SAMPLE_MESSAGES[agent as keyof typeof SAMPLE_MESSAGES];
      return {
        type: 'conversation_turn',
        data: {
          speaker: agent,
          message: messages[Math.floor(Math.random() * messages.length)],
          turn: Math.floor(Math.random() * 10) + 1,
        },
      };
    
    case 'trade_executed':
      const tokens = ['SOL', 'BONK', 'WIF', 'SPY', 'QQQ', 'MES', 'MNQ'];
      return {
        type: 'trade_executed',
        data: {
          agent_id: 'scout',
          title: `Executed ${Math.random() > 0.5 ? 'BUY' : 'SELL'} ${tokens[Math.floor(Math.random() * tokens.length)]}`,
          market: ['crypto', 'options', 'futures'][Math.floor(Math.random() * 3)],
        },
      };
    
    case 'proposal_created':
      return {
        type: 'proposal_created',
        data: {
          agent_id: agent,
          title: `New proposal from ${agent}`,
          status: 'pending',
        },
      };
    
    case 'trigger_fired':
      const triggers = ['trade_big_win', 'position_at_risk', 'signal_high_confidence'];
      return {
        type: 'trigger_fired',
        data: {
          agent_id: agent,
          trigger: triggers[Math.floor(Math.random() * triggers.length)],
        },
      };
    
    case 'memory_created':
      return {
        type: 'memory_created',
        data: {
          agent_id: agent,
          type: ['insight', 'pattern', 'lesson'][Math.floor(Math.random() * 3)],
          confidence: (0.6 + Math.random() * 0.35).toFixed(2),
        },
      };
    
    default:
      return { type: 'heartbeat', data: {} };
  }
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', data: { agents: AGENTS } })}\n\n`));
      
      // Simulate events every 2-10 seconds
      const interval = setInterval(() => {
        try {
          const event = generateEvent();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch (error) {
          console.error('SSE error:', error);
          clearInterval(interval);
          controller.close();
        }
      }, 3000 + Math.random() * 7000);
      
      // Heartbeat every 15 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (error) {
          clearInterval(heartbeat);
        }
      }, 15000);
      
      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
