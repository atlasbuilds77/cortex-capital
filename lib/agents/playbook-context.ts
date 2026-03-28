// Cortex Capital - Playbook Context Generator
// Generates strategy context JSON that gets injected into agent prompts
// Rules match EXACTLY what's in ASSET-CLASS-PLAYBOOKS.md

import { ClassifiedPosition, Playbook } from './position-classifier';

export interface PlaybookRules {
  hardStop: number;  // percentage (negative)
  scalingExits: number[];  // e.g. [30, 50, 75, 100]
  maxHoldTime?: string;
  thetaWarning?: string;
  entryRules: string[];
  exitRules: string[];
  redFlags: string[];
}

export interface PlaybookContext {
  position: ClassifiedPosition;
  playbook: Playbook;
  rules: PlaybookRules;
  alerts: string[];
}

/**
 * Get playbook rules for OPTIONS_SCALP (0-1 DTE)
 */
function getScalpRules(): PlaybookRules {
  return {
    hardStop: -35,
    scalingExits: [30, 50, 75, 100],
    maxHoldTime: '3:30 PM ET (30 min before close)',
    thetaWarning: 'EXTREME theta decay. Every minute matters.',
    entryRules: [
      'Max $5 OTM for scalps (strike <3% from current price)',
      'Min 500 OI at strike, bid-ask spread <$0.10',
      'First 2 hours preferred (9:30-11:30 ET). Avoid lunch chop.',
      'Catalyst required (level break, volume surge, news)',
      'Max 5% of portfolio per trade',
    ],
    exitRules: [
      '0 DTE emergency: If losing at 2:00 PM ET → SELL immediately',
      'Never hold 0DTE overnight (they expire)',
      'After 12:00 PM ET on 0DTE, theta accelerates. Exit unless deep ITM.',
      'Close by 3:30 PM ET absolute latest',
      'Scaling: +30% → sell 1/3, +50% → sell 1/2 (stop to breakeven), +75% → sell 2/3, +100% → sell all',
    ],
    redFlags: [
      'Strike >5% OTM on 0DTE',
      'VIX >35 (premiums too expensive)',
      'No volume at strike (<500 OI)',
      'Entering after 1:00 PM ET on 0DTE',
      'No clear thesis',
    ],
  };
}

/**
 * Get playbook rules for OPTIONS_SWING (2-14 DTE)
 */
function getSwingRules(): PlaybookRules {
  return {
    hardStop: -35,
    scalingExits: [30, 50, 75, 100],
    maxHoldTime: 'Until DTE countdown reaches 2 (becomes scalp rules)',
    thetaWarning: 'MODERATE theta decay. Daily check-in required.',
    entryRules: [
      'Max $10 OTM or 5% from current price',
      'Min 1,000 OI at strike',
      'Catalyst alignment (earnings, Fed, macro event within DTE window)',
      'Daily theta cost must be <2% of position value',
      'Max 5% of portfolio per trade',
      'Prefer slightly ITM or ATM (lower theta burn)',
    ],
    exitRules: [
      'At 2 DTE remaining → position becomes scalp rules (Playbook 1)',
      'Thesis invalidation: if setup breaks → close immediately',
      'Never hold through earnings unless that was the thesis',
      'Daily theta checkpoint: if theta will eat >50% of value before expiry → close',
      'If position flat for 5 days → re-evaluate (dead money = opportunity cost)',
      'Scaling: +30% → sell 1/4, +50% → sell 1/3 (stop to breakeven), +75% → sell 1/2, +100%+ → sell 2/3',
    ],
    redFlags: [
      'No specific thesis (just "bullish")',
      'Theta cost >3% of position per day',
      'Earnings within DTE window (unless that\'s the play)',
      'Strike >7% OTM',
      'Low liquidity (<500 OI)',
    ],
  };
}

/**
 * Get playbook rules for OPTIONS_LEAPS (45+ DTE)
 */
function getLeapsRules(): PlaybookRules {
  return {
    hardStop: -40,
    scalingExits: [50, 100, 200],
    maxHoldTime: 'Until <45 DTE remaining (evaluate rolling or closing)',
    thetaWarning: 'LOW daily theta, but cumulative over months. Monthly review required.',
    entryRules: [
      'Strike: ATM or slightly ITM (delta 0.50-0.70)',
      'Strong fundamental thesis (takes time to play out)',
      'Less critical liquidity (not day-trading), but min 200 OI',
      'Max 3% of portfolio (leveraged = smaller size)',
      'Enter on pullbacks to support, not at highs',
    ],
    exitRules: [
      'At 30 DTE: position auto-converts to swing rules (Playbook 2). Roll or close.',
      'Thesis change: fundamentals shift → close',
      'Monthly review: is thesis intact?',
      'Target reached early → take profits',
      'Scaling: +50% → sell 1/4, +100% → sell 1/3, +200%+ → sell 1/2',
    ],
    redFlags: [
      'No fundamental thesis (pure technical LEAP = bad)',
      'OTM LEAPS (delta <0.40) — too speculative',
      'Position >5% of portfolio (leverage risk)',
      'No clear catalyst within timeframe',
    ],
  };
}

/**
 * Get playbook rules for STOCKS_ACTIVE (swing trading)
 */
function getActiveStockRules(): PlaybookRules {
  return {
    hardStop: -8,
    scalingExits: [10, 20, 30],
    maxHoldTime: 'Re-evaluate if flat after 10 days',
    entryRules: [
      'Technical setup: breakout, pullback to support, or momentum continuation',
      'Volume confirmation: above average on entry day',
      'Sector check: is sector strong or rotating in?',
      'Max 5% of portfolio per stock',
      'Risk/reward: minimum 2:1 (target 2x the stop distance)',
    ],
    exitRules: [
      'Hard stop: -8% from entry',
      'Trailing stop: after +10%, trail at 50% of gains (e.g., +20% up → stop at +10%)',
      'Can add 50% more at +5% if thesis strengthening',
      'NO averaging down on losers',
      'Sector rotation: if sector weakens → reduce exposure',
      'Earnings: decide BEFORE earnings whether to hold or close',
    ],
    redFlags: [
      'No technical setup',
      'Low volume',
      'Weak sector',
      'No clear thesis',
    ],
  };
}

/**
 * Get playbook rules for STOCKS_LONGTERM (portfolio investing)
 */
function getLongtermStockRules(): PlaybookRules {
  return {
    hardStop: 0, // No hard stop for long-term
    scalingExits: [], // Rebalance instead of scaling
    maxHoldTime: 'Months to years',
    entryRules: [
      'Fundamental strength: strong earnings, moat, cash flow',
      'Valuation: not absurdly overvalued (P/E vs sector average)',
      'Diversification: no single stock >10% of portfolio, no single sector >30%',
      'Dollar-cost average: Tranche 1 (40%), Tranche 2 (30% after 2 weeks), Tranche 3 (30% after 4 weeks)',
    ],
    exitRules: [
      'No hard stop (ride through volatility)',
      'Rebalance: if position grows to >12% → trim to 8%',
      'Quarterly review: is thesis intact? Earnings growing? Moat widening?',
      'Add on weakness: can add to winners that pull back',
      'Exit only on: thesis broken (3+ quarters declining revenue), extreme overvaluation (P/E >2x sector), better opportunity',
      'Tax awareness: prefer holding >1 year for long-term capital gains',
    ],
    redFlags: [
      'Fundamental deterioration (declining revenue, management crisis)',
      'Extreme overvaluation with no growth justification',
      'Panic selling on red days (avoid)',
    ],
  };
}

/**
 * Generate full playbook context for a classified position
 */
export function getPlaybookContext(classified: ClassifiedPosition): PlaybookContext {
  let rules: PlaybookRules;
  
  switch (classified.playbook) {
    case 'OPTIONS_SCALP':
      rules = getScalpRules();
      break;
    case 'OPTIONS_SWING':
      rules = getSwingRules();
      break;
    case 'OPTIONS_LEAPS':
      rules = getLeapsRules();
      break;
    case 'STOCKS_ACTIVE':
      rules = getActiveStockRules();
      break;
    case 'STOCKS_LONGTERM':
      rules = getLongtermStockRules();
      break;
    default:
      throw new Error(`Unknown playbook: ${classified.playbook}`);
  }
  
  return {
    position: classified,
    playbook: classified.playbook,
    rules,
    alerts: classified.alerts,
  };
}

/**
 * Generate contexts for multiple positions
 */
export function getPlaybookContexts(positions: ClassifiedPosition[]): PlaybookContext[] {
  return positions.map(getPlaybookContext);
}

/**
 * Format context as JSON string for agent injection
 */
export function formatContextForAgent(context: PlaybookContext): string {
  return JSON.stringify({
    position: {
      symbol: context.position.symbol,
      asset_class: context.position.assetClass,
      ...(context.position.assetClass === 'option' && {
        type: context.position.optionType,
        strike: context.position.strike,
        expiry: context.position.expiryDate?.toISOString().split('T')[0],
        dte: context.position.dte,
        underlying_symbol: context.position.underlyingSymbol,
        underlying_price: context.position.underlyingPrice,
      }),
      current_price: context.position.currentPrice,
      entry_price: context.position.entryPrice,
      unrealized_pnl_pct: context.position.unrealizedPnlPct.toFixed(2),
      qty: context.position.qty,
      market_value: context.position.marketValue.toFixed(2),
    },
    playbook: context.playbook,
    rules: {
      hard_stop: context.rules.hardStop,
      scaling_exits: context.rules.scalingExits,
      max_hold_time: context.rules.maxHoldTime,
      theta_warning: context.rules.thetaWarning,
      entry_rules: context.rules.entryRules,
      exit_rules: context.rules.exitRules,
      red_flags: context.rules.redFlags,
    },
    alerts: context.alerts,
  }, null, 2);
}
