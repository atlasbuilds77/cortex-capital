/**
 * TRADE EXECUTION PIPELINE
 * Signal → Discussion → Approval → Execute → Report
 * 
 * This is the core loop that makes agents actually trade.
 */

import { collaborativeDaemon, discussionEmitter } from './collaborative-daemon';
import { calculatePositionSize, calculateQuantity, RiskProfile } from '../position-sizing';

const ALPACA_BASE = 'https://paper-api.alpaca.markets/v2';

function getAlpacaCredentials() {
  const apiKey = process.env.ALPACA_API_KEY || process.env.DEMO_ALPACA_API_KEY;
  const apiSecret = process.env.ALPACA_SECRET_KEY || process.env.ALPACA_SECRET || process.env.DEMO_ALPACA_SECRET_KEY;

  if (!apiKey || !apiSecret) {
    return null;
  }

  return { apiKey, apiSecret };
}

interface TradeSignal {
  symbol: string;
  direction: 'long' | 'short';
  thesis: string;
  source: string; // Which agent generated it
  confidence: number; // 0-100
  userId?: string; // For per-user position sizing
  riskProfile?: RiskProfile; // User's risk profile
  accountBalance?: number; // User's account balance
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
 * Place a bracket order via Alpaca (entry + stop loss + take profit)
 */
async function placeAlpacaBracketOrder(
  symbol: string, 
  qty: number, 
  side: 'buy' | 'sell',
  stopLossPercent: number,
  takeProfitPercent: number
): Promise<TradeExecution | null> {
  try {
    const credentials = getAlpacaCredentials();
    if (!credentials) {
      console.error('[EXECUTOR] Missing Alpaca credentials in environment');
      return null;
    }

    // First get current price to calculate SL/TP levels
    const quoteRes = await fetch(`https://data.alpaca.markets/v2/stocks/${symbol}/quotes/latest`, {
      headers: {
        'APCA-API-KEY-ID': credentials.apiKey,
        'APCA-API-SECRET-KEY': credentials.apiSecret,
      },
    });
    const quote = await quoteRes.json();
    const currentPrice = quote.quote?.ap || quote.quote?.bp || 0;
    
    if (!currentPrice) {
      console.error(`[EXECUTOR] Could not get price for ${symbol}`);
      return null;
    }

    // Calculate stop and take profit prices
    const stopLossPrice = side === 'buy' 
      ? currentPrice * (1 - stopLossPercent / 100)
      : currentPrice * (1 + stopLossPercent / 100);
    
    const takeProfitPrice = side === 'buy'
      ? currentPrice * (1 + takeProfitPercent / 100)
      : currentPrice * (1 - takeProfitPercent / 100);

    console.log(`[EXECUTOR] Bracket order: ${symbol} @ ~$${currentPrice.toFixed(2)}`);
    console.log(`[EXECUTOR] Stop Loss: $${stopLossPrice.toFixed(2)} (-${stopLossPercent}%)`);
    console.log(`[EXECUTOR] Take Profit: $${takeProfitPrice.toFixed(2)} (+${takeProfitPercent}%)`);

    const res = await fetch(`${ALPACA_BASE}/orders`, {
      method: 'POST',
      headers: {
        'APCA-API-KEY-ID': credentials.apiKey,
        'APCA-API-SECRET-KEY': credentials.apiSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol,
        qty: qty.toString(),
        side,
        type: 'market',
        time_in_force: 'gtc',
        order_class: 'bracket',
        stop_loss: {
          stop_price: stopLossPrice.toFixed(2),
        },
        take_profit: {
          limit_price: takeProfitPrice.toFixed(2),
        },
      }),
    });

    const order = await res.json();
    
    if (order.id) {
      console.log(`[EXECUTOR] Bracket order placed: ${side} ${qty} ${symbol} - ID: ${order.id}`);
      return {
        orderId: order.id,
        symbol,
        side,
        qty,
        filledPrice: currentPrice,
        timestamp: new Date().toISOString(),
      };
    } else {
      console.error(`[EXECUTOR] Bracket order failed:`, order);
      // Fallback to simple market order if bracket fails
      console.log(`[EXECUTOR] Falling back to simple market order...`);
      return placeSimpleAlpacaOrder(symbol, qty, side);
    }
  } catch (error: any) {
    console.error(`[EXECUTOR] Bracket order error:`, error.message);
    return null;
  }
}

/**
 * Place a simple market order (fallback)
 */
async function placeSimpleAlpacaOrder(
  symbol: string, 
  qty: number, 
  side: 'buy' | 'sell'
): Promise<TradeExecution | null> {
  try {
    const credentials = getAlpacaCredentials();
    if (!credentials) return null;

    const res = await fetch(`${ALPACA_BASE}/orders`, {
      method: 'POST',
      headers: {
        'APCA-API-KEY-ID': credentials.apiKey,
        'APCA-API-SECRET-KEY': credentials.apiSecret,
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
      console.log(`[EXECUTOR] Simple order placed: ${side} ${qty} ${symbol} - ID: ${order.id}`);
      return {
        orderId: order.id,
        symbol,
        side,
        qty,
        filledPrice: 0,
        timestamp: new Date().toISOString(),
      };
    }
    return null;
  } catch (error: any) {
    console.error(`[EXECUTOR] Simple order error:`, error.message);
    return null;
  }
}

// Legacy function name for compatibility
async function placeAlpacaOrder(
  symbol: string, 
  qty: number, 
  side: 'buy' | 'sell'
): Promise<TradeExecution | null> {
  // Default to 7% stop, 15% TP (moderate profile defaults)
  return placeAlpacaBracketOrder(symbol, qty, side, 7, 15);
}

/**
 * Get current portfolio value for position sizing
 */
async function getPortfolioValue(): Promise<number> {
  try {
    const credentials = getAlpacaCredentials();
    if (!credentials) return 0;

    const res = await fetch(`${ALPACA_BASE}/account`, {
      headers: {
        'APCA-API-KEY-ID': credentials.apiKey,
        'APCA-API-SECRET-KEY': credentials.apiSecret,
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
    const credentials = getAlpacaCredentials();
    if (!credentials) return 0;

    const res = await fetch(`${ALPACA_BASE}/positions/${symbol}`, {
      headers: {
        'APCA-API-KEY-ID': credentials.apiKey,
        'APCA-API-SECRET-KEY': credentials.apiSecret,
      },
    });
    if (res.ok) {
      const pos = await res.json();
      return parseFloat(pos.current_price || '0');
    }
    // If no position, get last trade
    const tradeRes = await fetch(`https://data.alpaca.markets/v2/stocks/${symbol}/trades/latest`, {
      headers: {
        'APCA-API-KEY-ID': credentials.apiKey,
        'APCA-API-SECRET-KEY': credentials.apiSecret,
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
      avatar: '/avatars/risk.jpg',
      color: '#EF4444',
      content: `Trade REJECTED: ${signal.symbol} ${signal.direction}. Risk parameters not met.`,
      discussionId: discussion?.id,
      discussionTopic: 'Trade Decision',
    });
    return;
  }

  // Step 3: Calculate position size based on user's risk profile
  const portfolioValue = signal.accountBalance || await getPortfolioValue();
  const currentPrice = await getCurrentPrice(signal.symbol);
  
  if (!currentPrice || !portfolioValue) {
    console.log(`[PIPELINE] Cannot get price/portfolio data`);
    return;
  }

  // Use per-user position sizing based on risk profile
  const riskProfile = signal.riskProfile || 'moderate';
  const positionSizing = calculatePositionSize(
    portfolioValue,
    riskProfile,
    signal.confidence,
    0 // TODO: get current open positions count
  );
  
  if (positionSizing.positionDollars <= 0) {
    console.log(`[PIPELINE] ${positionSizing.reasoning}`);
    return;
  }
  
  const qty = calculateQuantity(positionSizing.positionDollars, currentPrice);
  
  if (qty < 1) {
    console.log(`[PIPELINE] Position too small: $${positionSizing.positionDollars.toFixed(0)} / $${currentPrice} = ${qty} shares`);
    return;
  }
  
  console.log(`[PIPELINE] Position sizing: ${positionSizing.reasoning}`);

  // Step 4: EXECUTOR places the trade with bracket order (SL + TP)
  const side = signal.direction === 'long' ? 'buy' : 'sell';
  const execution = await placeAlpacaBracketOrder(
    signal.symbol, 
    qty, 
    side,
    positionSizing.stopLossPercent,
    positionSizing.takeProfitPercent
  );

  if (execution) {
    // Emit execution event
    discussionEmitter.emit('message', {
      id: `${Date.now()}-exec`,
      timestamp: new Date().toISOString(),
      agent: 'EXECUTOR',
      role: 'Trade Executor',
      avatar: '🎬',
      color: '#6366F1',
      content: `Bracket order filled: ${qty} ${signal.symbol} @ ~$${execution.filledPrice?.toFixed(2) || 'market'}. Stop: -${positionSizing.stopLossPercent}% | TP: +${positionSizing.takeProfitPercent}%. Order ID: ${execution.orderId.slice(0, 8)}...`,
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
        content: `New position: ${signal.direction.toUpperCase()} ${qty} ${signal.symbol} at ~$${currentPrice.toFixed(2)}. Notional: $${(qty * currentPrice).toFixed(0)}. Risk: ${positionSizing.positionPercent.toFixed(1)}% (${riskProfile}). Stop: ${positionSizing.stopLossPercent}%, TP: ${positionSizing.takeProfitPercent}%.`,
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

  const credentials = getAlpacaCredentials();
  if (!credentials) {
    console.warn('[PIPELINE] Skipping morning position review, Alpaca credentials missing');
    return;
  }
  
  // 2. Check existing positions
  try {
    const res = await fetch(`${ALPACA_BASE}/positions`, {
      headers: {
        'APCA-API-KEY-ID': credentials.apiKey,
        'APCA-API-SECRET-KEY': credentials.apiSecret,
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

  const credentials = getAlpacaCredentials();
  if (!credentials) {
    console.warn('[PIPELINE] Skipping EOD routine, Alpaca credentials missing');
    return;
  }
  
  // Get today's P&L
  try {
    const res = await fetch(`${ALPACA_BASE}/account`, {
      headers: {
        'APCA-API-KEY-ID': credentials.apiKey,
        'APCA-API-SECRET-KEY': credentials.apiSecret,
      },
    });
    const account = await res.json();
    const todayPnL = parseFloat(account.equity) - parseFloat(account.last_equity);
    
    // Trigger EOD discussion
    const topic = `End of Day Recap. Portfolio: $${parseFloat(account.equity).toFixed(0)}. Today P&L: ${todayPnL >= 0 ? '+' : ''}$${todayPnL.toFixed(0)} (${((todayPnL / parseFloat(account.last_equity)) * 100).toFixed(2)}%).`;
    void topic;

    await collaborativeDaemon.morningBriefing(); // Reuse briefing format for EOD
  } catch (error: any) {
    console.error('EOD routine failed:', error.message);
  }
}

export type { TradeSignal, TradeApproval, TradeExecution };
