/**
 * TRADE DECISION PARSER
 * Extracts trade decisions from agent discussion messages
 */

export interface TradeDecision {
  id: string;
  timestamp: string;
  agentName: string;
  action: 'buy' | 'sell';
  symbol: string;
  quantity: number;
  instrumentType: 'stock' | 'etf' | 'option' | 'future';
  strategy?: string; // e.g., "bull_call_spread", "covered_call"
  strikes?: number[]; // For options
  expiry?: string; // For options
  price?: number; // Optional price for limit orders
  reasoning: string;
  rawMessage: string;
}

/**
 * Parse EXECUTOR agent messages for trade decisions
 */
export function parseAgentDecisions(
  discussionMessages: Array<{ agent: string; content: string; timestamp: string }>
): TradeDecision[] {
  const decisions: TradeDecision[] = [];

  for (const msg of discussionMessages) {
    // Only parse EXECUTOR agent messages
    if (msg.agent !== 'EXECUTOR') {
      continue;
    }

    const content = msg.content.toLowerCase();

    // Pattern 1: "I'll execute 5 spreads of QQQ $440/$455"
    const spreadMatch = content.match(
      /execute (\d+) (?:spreads?|contracts?) (?:of )?([A-Z]{1,5})(?: \$(\d+)\/\$(\d+))?/i
    );
    if (spreadMatch) {
      const [, qty, symbol, strike1, strike2] = spreadMatch;
      decisions.push({
        id: `${msg.timestamp}-${symbol}`,
        timestamp: msg.timestamp,
        agentName: 'EXECUTOR',
        action: 'buy',
        symbol: symbol.toUpperCase(),
        quantity: parseInt(qty, 10),
        instrumentType: 'option',
        strategy: 'bull_call_spread',
        strikes: [parseInt(strike1, 10), parseInt(strike2, 10)],
        reasoning: msg.content,
        rawMessage: msg.content,
      });
      continue;
    }

    // Pattern 2: "Buy 100 shares of NVDA"
    const stockMatch = content.match(/(?:buy|purchase) (\d+) shares? (?:of )?([A-Z]{1,5})/i);
    if (stockMatch) {
      const [, qty, symbol] = stockMatch;
      decisions.push({
        id: `${msg.timestamp}-${symbol}`,
        timestamp: msg.timestamp,
        agentName: 'EXECUTOR',
        action: 'buy',
        symbol: symbol.toUpperCase(),
        quantity: parseInt(qty, 10),
        instrumentType: 'stock',
        reasoning: msg.content,
        rawMessage: msg.content,
      });
      continue;
    }

    // Pattern 3: "Sell 50 shares of QQQ"
    const sellMatch = content.match(/sell (\d+) shares? (?:of )?([A-Z]{1,5})/i);
    if (sellMatch) {
      const [, qty, symbol] = sellMatch;
      decisions.push({
        id: `${msg.timestamp}-${symbol}`,
        timestamp: msg.timestamp,
        agentName: 'EXECUTOR',
        action: 'sell',
        symbol: symbol.toUpperCase(),
        quantity: parseInt(qty, 10),
        instrumentType: 'stock',
        reasoning: msg.content,
        rawMessage: msg.content,
      });
      continue;
    }

    // Pattern 4: "Scale out 25% of NVDA position"
    const scaleMatch = content.match(/scale (?:out|down) (\d+)% (?:of )?([A-Z]{1,5})/i);
    if (scaleMatch) {
      const [, pct, symbol] = scaleMatch;
      decisions.push({
        id: `${msg.timestamp}-${symbol}`,
        timestamp: msg.timestamp,
        agentName: 'EXECUTOR',
        action: 'sell',
        symbol: symbol.toUpperCase(),
        quantity: -1, // Will be calculated from current position
        instrumentType: 'stock',
        reasoning: `Scale ${pct}%: ${msg.content}`,
        rawMessage: msg.content,
      });
      continue;
    }
  }

  return decisions;
}

/**
 * Validate trade decision against tier permissions
 */
export function validateTradeDecision(
  decision: TradeDecision,
  tier: 'free' | 'recovery' | 'scout' | 'operator' | 'partner'
): { allowed: boolean; reason?: string } {
  // Check if tier can execute trades at all
  if (tier === 'free' || tier === 'recovery') {
    return {
      allowed: false,
      reason: `${tier} tier cannot execute trades (view-only / alerts only)`,
    };
  }

  // Scout tier: stocks and ETFs only
  if (tier === 'scout') {
    if (decision.instrumentType !== 'stock' && decision.instrumentType !== 'etf') {
      return {
        allowed: false,
        reason: `Scout tier can only trade stocks and ETFs (attempted: ${decision.instrumentType})`,
      };
    }
  }

  // Operator tier: add options
  if (tier === 'operator') {
    if (decision.instrumentType === 'future') {
      return {
        allowed: false,
        reason: 'Operator tier cannot trade futures (Partner tier required)',
      };
    }
  }

  // Partner tier: everything allowed
  return { allowed: true };
}
