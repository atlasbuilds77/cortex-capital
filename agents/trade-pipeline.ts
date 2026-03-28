/**
 * TRADE EXECUTION PIPELINE
 * Signal → Discussion → Approval → Execute → Report
 * 
 * This is the core loop that makes agents actually trade.
 */

import { collaborativeDaemon, discussionEmitter } from './collaborative-daemon';

const ALPACA_BASE = 'https://paper-api.alpaca.markets/v2';
const ALPACA_KEY = 'PKXPAHHSVOFCAXOXINQXP6UXST';
const ALPACA_SECRET = '4rwKDqN7nUfYztpB24ts7h3Zsp2ZtaccjvXBQsGJQuWV';

interface TradeSignal {
  symbol: string;
  direction: 'long' | 'short';
  thesis: string;
  source: string; // Which agent generated it
  confidence: number; // 0-100
}

interface TradeApproval {
  approved: boolean;
  positionSize: number; // Percentage of portfolio
  stopLoss: number;
  takeProfit: number;
  reason: string;
}

interface TradeExecution {
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  qty: number;
  filledPrice: number;
  timestamp: string;
}

/**
 * Place an order via Alpaca
 */
async function placeAlpacaOrder(
  symbol: string, 
  qty: number, 
  side: 'buy' | 'sell'
): Promise<TradeExecution | null> {
  try {
    const res = await fetch(`${ALPACA_BASE}/orders`, {
      method: 'POST',
      headers: {
        'APCA-API-KEY-ID': ALPACA_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol,
        qty: qty.toString(),
        side,
        type: 'market',
        time_in_force: 'day',
      }),
    });

    const order = await res.json();
    
    if (order.id) {
      console.log(`[EXECUTOR] Order placed: ${side} ${qty} ${symbol} - ID: ${order.id}`);
      return {
        orderId: order.id,
        symbol,
        side,
        qty,
        filledPrice: 0, // Will be filled async
        timestamp: new Date().toISOString(),
      };
    } else {
      console.error(`[EXECUTOR] Order failed:`, order);
      return null;
    }
  } catch (error: any) {
    console.error(`[EXECUTOR] Order error:`, error.message);
    return null;
  }
}

/**
 * Get current portfolio value for position sizing
 */
async function getPortfolioValue(): Promise<number> {
  try {
    const res = await fetch(`${ALPACA_BASE}/account`, {
      headers: {
        'APCA-API-KEY-ID': ALPACA_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET,
      },
    });
    const account = await res.json();
    return parseFloat(account.portfolio_value || '0');
  } catch {
    return 0;
  }
}

/**
 * Get current price of a symbol
 */
async function getCurrentPrice(symbol: string): Promise<number> {
  try {
    const res = await fetch(`${ALPACA_BASE}/positions/${symbol}`, {
      headers: {
        'APCA-API-KEY-ID': ALPACA_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET,
      },
    });
    if (res.ok) {
      const pos = await res.json();
      return parseFloat(pos.current_price || '0');
    }
    // If no position, get last trade
    const tradeRes = await fetch(`https://data.alpaca.markets/v2/stocks/${symbol}/trades/latest`, {
      headers: {
        'APCA-API-KEY-ID': ALPACA_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET,
      },
    });
    const trade = await tradeRes.json();
    return trade.trade?.p || 0;
  } catch {
    return 0;
  }
}

/**
 * The full trade pipeline
 * 
 * 1. MOMENTUM/ANALYST spots a signal
 * 2. Team discusses it (DeepSeek-powered)
 * 3. RISK approves with position sizing
 * 4. EXECUTOR places the trade
 * 5. REPORTER logs and broadcasts
 */
export async function executeTradeIdea(signal: TradeSignal): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TRADE PIPELINE: ${signal.direction.toUpperCase()} ${signal.symbol}`);
  console.log(`Source: ${signal.source} | Confidence: ${signal.confidence}%`);
  console.log(`${'='.repeat(60)}\n`);

  // Step 1: Team discusses the trade idea
  const discussion = await collaborativeDaemon.discussTradeIdea(
    signal.symbol,
    signal.direction,
    signal.thesis
  );

  // Step 2: Check if RISK approved (parse from discussion)
  const riskMessage = discussion?.messages?.find(
    (m: any) => m.agent === 'RISK'
  );
  
  const approved = riskMessage && 
    !riskMessage.content.toLowerCase().includes('reject') &&
    !riskMessage.content.toLowerCase().includes('pass') &&
    !riskMessage.content.toLowerCase().includes('too risky');

  if (!approved) {
    console.log(`[PIPELINE] Trade REJECTED by RISK`);
    discussionEmitter.emit('message', {
      id: `${Date.now()}-pipeline`,
      timestamp: new Date().toISOString(),
      agent: 'RISK',
      role: 'Risk Manager',
      avatar: '🛡️',
      color: '#EF4444',
      content: `Trade REJECTED: ${signal.symbol} ${signal.direction}. Risk parameters not met.`,
      discussionId: discussion?.id,
      discussionTopic: 'Trade Decision',
    });
    return;
  }

  // Step 3: Calculate position size (2% of portfolio default)
  const portfolioValue = await getPortfolioValue();
  const currentPrice = await getCurrentPrice(signal.symbol);
  
  if (!currentPrice || !portfolioValue) {
    console.log(`[PIPELINE] Cannot get price/portfolio data`);
    return;
  }

  const positionValue = portfolioValue * 0.02; // 2% position
  const qty = Math.floor(positionValue / currentPrice);
  
  if (qty < 1) {
    console.log(`[PIPELINE] Position too small: $${positionValue} / $${currentPrice} = ${qty} shares`);
    return;
  }

  // Step 4: EXECUTOR places the trade
  const side = signal.direction === 'long' ? 'buy' : 'sell';
  const execution = await placeAlpacaOrder(signal.symbol, qty, side);

  if (execution) {
    // Emit execution event
    discussionEmitter.emit('message', {
      id: `${Date.now()}-exec`,
      timestamp: new Date().toISOString(),
      agent: 'EXECUTOR',
      role: 'Trade Executor',
      avatar: '🎬',
      color: '#6366F1',
      content: `Filled ${qty} ${signal.symbol} @ market. Order ID: ${execution.orderId.slice(0, 8)}...`,
      discussionId: discussion?.id,
      discussionTopic: 'Trade Execution',
    });

    // Step 5: REPORTER logs it
    setTimeout(() => {
      discussionEmitter.emit('message', {
        id: `${Date.now()}-report`,
        timestamp: new Date().toISOString(),
        agent: 'REPORTER',
        role: 'Market Reporter',
        avatar: '📰',
        color: '#F97316',
        content: `New position: ${signal.direction.toUpperCase()} ${qty} ${signal.symbol} at ~$${currentPrice.toFixed(2)}. Notional: $${(qty * currentPrice).toFixed(0)}. Risk: 2% of portfolio.`,
        discussionId: discussion?.id,
        discussionTopic: 'Trade Report',
      });
    }, 2000);
  }
}

/**
 * Morning routine - runs at 6:15 AM
 */
export async function morningRoutine(): Promise<void> {
  console.log('\n🌅 MORNING ROUTINE STARTING\n');
  
  // 1. Morning briefing
  await collaborativeDaemon.morningBriefing();
  
  // 2. Check existing positions
  try {
    const res = await fetch(`${ALPACA_BASE}/positions`, {
      headers: {
        'APCA-API-KEY-ID': ALPACA_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET,
      },
    });
    const positions = await res.json();
    
    if (positions.length > 0) {
      // Review each position
      for (const pos of positions.slice(0, 3)) { // Max 3 reviews
        await collaborativeDaemon.reviewPosition(
          pos.symbol,
          parseFloat(pos.avg_entry_price),
          parseFloat(pos.current_price),
          parseFloat(pos.unrealized_pl)
        );
      }
    }
  } catch (error: any) {
    console.error('Morning position review failed:', error.message);
  }
}

/**
 * End of day routine - runs at 1:15 PM
 */
export async function endOfDayRoutine(): Promise<void> {
  console.log('\n🌙 END OF DAY ROUTINE\n');
  
  // Get today's P&L
  try {
    const res = await fetch(`${ALPACA_BASE}/account`, {
      headers: {
        'APCA-API-KEY-ID': ALPACA_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET,
      },
    });
    const account = await res.json();
    const todayPnL = parseFloat(account.equity) - parseFloat(account.last_equity);
    
    // Trigger EOD discussion
    const topic = `End of Day Recap. Portfolio: $${parseFloat(account.equity).toFixed(0)}. Today P&L: ${todayPnL >= 0 ? '+' : ''}$${todayPnL.toFixed(0)} (${((todayPnL / parseFloat(account.last_equity)) * 100).toFixed(2)}%).`;
    
    await collaborativeDaemon.morningBriefing(); // Reuse briefing format for EOD
  } catch (error: any) {
    console.error('EOD routine failed:', error.message);
  }
}

export { TradeSignal, TradeApproval, TradeExecution };
