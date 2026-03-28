/**
 * Risk Profile Modifier
 * 
 * Adjusts agent behavior based on user's selected risk profile.
 * This injects user-specific context into agent prompts so they
 * give advice appropriate to the user's risk tolerance.
 * 
 * Profiles:
 * - conservative: Preserve capital, minimal risk, steady growth
 * - moderate: Balanced approach, accept some volatility
 * - aggressive: Maximize growth, comfortable with swings
 * - ultra_aggressive: Maximum returns, high conviction plays
 */

export type RiskProfile = 'conservative' | 'moderate' | 'aggressive' | 'ultra_aggressive';

interface RiskModifier {
  // How agent should frame recommendations
  framingStyle: string;
  // Position sizing guidance
  positionSizing: string;
  // Stop loss approach
  stopLossApproach: string;
  // Profit taking approach  
  profitTaking: string;
  // Asset types to focus on
  assetFocus: string;
  // Time horizon emphasis
  timeHorizon: string;
  // Risk language
  riskLanguage: string;
  // Conviction level needed to recommend
  convictionThreshold: string;
}

export const RISK_MODIFIERS: Record<RiskProfile, RiskModifier> = {
  conservative: {
    framingStyle: 'Focus on capital preservation and steady income. Emphasize downside protection.',
    positionSizing: 'Recommend small positions (1-2% of portfolio max). Never suggest concentrated bets.',
    stopLossApproach: 'Tight stop losses (5-8%). Cut losses quickly, protect capital at all costs.',
    profitTaking: 'Take profits early (15-20% gains). Lock in wins, dont get greedy.',
    assetFocus: 'Blue chips, dividend stocks, bonds, defensive sectors. Avoid speculation.',
    timeHorizon: 'Long-term focus. Ignore daily noise. Think in years, not days.',
    riskLanguage: 'Use cautious language. "Consider", "might want to", "could be worth looking at".',
    convictionThreshold: 'Only recommend with HIGH conviction. When in doubt, stay cash.',
  },
  
  moderate: {
    framingStyle: 'Balance growth and protection. Accept some volatility for better returns.',
    positionSizing: 'Standard positions (2-5% of portfolio). Larger for high conviction.',
    stopLossApproach: 'Moderate stops (8-12%). Give positions room to breathe.',
    profitTaking: 'Take partial profits at 25-30%. Let winners run with trailing stops.',
    assetFocus: 'Mix of growth and value. Quality companies. Some sector rotation.',
    timeHorizon: 'Medium-term (months to years). Opportunistic on shorter timeframes.',
    riskLanguage: 'Balanced language. Present both opportunities and risks clearly.',
    convictionThreshold: 'Recommend with moderate-to-high conviction. Okay to suggest exploring ideas.',
  },
  
  aggressive: {
    framingStyle: 'Focus on growth and alpha. Accept significant volatility for outsized returns.',
    positionSizing: 'Larger positions (5-10%) for high conviction. Concentrated when thesis is strong.',
    stopLossApproach: 'Wider stops (15-20%) or mental stops. Give volatile plays room.',
    profitTaking: 'Let winners run. Take profits at 50%+ or when thesis changes.',
    assetFocus: 'Growth stocks, momentum plays, sector leaders. Okay with higher beta.',
    timeHorizon: 'Flexible. Can trade short-term momentum or hold long-term compounders.',
    riskLanguage: 'Confident language. "This looks strong", "worth a position", "high upside".',
    convictionThreshold: 'Recommend interesting setups. Okay to speculate with smaller sizing.',
  },
  
  ultra_aggressive: {
    framingStyle: 'Maximum returns. High conviction, concentrated bets. Embrace volatility.',
    positionSizing: 'Large positions (10-20%) for best ideas. Concentration is fine.',
    stopLossApproach: 'Wide or no stops. Thesis-based exits, not price-based.',
    profitTaking: 'Hold for multi-baggers. Only sell when thesis breaks.',
    assetFocus: 'High-growth, small caps, options, momentum. Comfort with speculation.',
    timeHorizon: 'Opportunistic. Swing trades to multi-year holds based on setup.',
    riskLanguage: 'Bold language. "Strong conviction", "significant opportunity", "asymmetric upside".',
    convictionThreshold: 'Actively hunt for opportunities. This user wants action, not caution.',
  },
};

/**
 * Get the system prompt modifier for a user's risk profile
 */
export function getRiskProfilePrompt(profile: RiskProfile): string {
  const mod = RISK_MODIFIERS[profile];
  
  return `
## USER RISK PROFILE: ${profile.toUpperCase()}

This user has selected a ${profile.replace('_', ' ')} risk profile. Adjust ALL recommendations accordingly:

**Framing:** ${mod.framingStyle}
**Position Sizing:** ${mod.positionSizing}
**Stop Losses:** ${mod.stopLossApproach}
**Profit Taking:** ${mod.profitTaking}
**Asset Focus:** ${mod.assetFocus}
**Time Horizon:** ${mod.timeHorizon}
**Language Style:** ${mod.riskLanguage}
**Conviction Needed:** ${mod.convictionThreshold}

IMPORTANT: Your advice MUST match this risk profile. A conservative user should never hear "YOLO into calls" and an ultra-aggressive user shouldn't hear "maybe consider a small position if you're comfortable."
`.trim();
}

/**
 * Get short risk context for quick agent prompts
 */
export function getQuickRiskContext(profile: RiskProfile): string {
  const contexts: Record<RiskProfile, string> = {
    conservative: 'User is CONSERVATIVE: prioritize capital preservation, suggest cautious moves only.',
    moderate: 'User is MODERATE: balance growth and safety, standard risk tolerance.',
    aggressive: 'User is AGGRESSIVE: comfortable with volatility, growth-focused.',
    ultra_aggressive: 'User is ULTRA-AGGRESSIVE: wants maximum alpha, high conviction plays welcome.',
  };
  return contexts[profile];
}

/**
 * Agent-specific adjustments based on risk profile
 */
export function getAgentRiskAdjustment(agent: string, profile: RiskProfile): string {
  const adjustments: Record<string, Record<RiskProfile, string>> = {
    ANALYST: {
      conservative: 'Flag ANY concentration over 10%. Recommend rebalancing frequently.',
      moderate: 'Standard risk metrics. Flag concentration over 20%.',
      aggressive: 'Higher tolerance for concentration. Flag over 30%.',
      ultra_aggressive: 'Allow concentrated positions. Only flag extreme imbalances.',
    },
    STRATEGIST: {
      conservative: 'Defensive positioning. Recommend hedges. Avoid timing market.',
      moderate: 'Balanced allocation. Some tactical moves okay.',
      aggressive: 'Growth-tilted allocation. Active sector rotation.',
      ultra_aggressive: 'Concentrated bets on best ideas. Momentum-driven allocation.',
    },
    DAY_TRADER: {
      conservative: 'Rare recommendations. Only extremely high-probability setups.',
      moderate: 'Selective setups with good risk/reward.',
      aggressive: 'Active trading suggestions. Multiple setups per day okay.',
      ultra_aggressive: 'Full momentum trader mode. Hunt for runners.',
    },
    RISK: {
      conservative: 'Maximum caution. Red flags on everything. Protect capital above all.',
      moderate: 'Balanced risk assessment. Flag major concerns.',
      aggressive: 'Focus on position-level risk, not portfolio paranoia.',
      ultra_aggressive: 'Risk is opportunity. Help size bets, dont kill them.',
    },
    EXECUTOR: {
      conservative: 'Small orders. Limit orders only. Wide safety margins.',
      moderate: 'Standard execution. Mix of order types.',
      aggressive: 'Efficient execution. Market orders okay for liquid names.',
      ultra_aggressive: 'Fast execution. Get fills, worry less about pennies.',
    },
    MOMENTUM: {
      conservative: 'Only blue-chip momentum. Mega-cap breakouts.',
      moderate: 'Quality momentum plays. Mid to large cap.',
      aggressive: 'Full momentum hunting. Any market cap.',
      ultra_aggressive: 'Maximum momentum. Small caps, runners, breakouts.',
    },
    OPTIONS_STRATEGIST: {
      conservative: 'Covered calls, cash-secured puts only. No naked options.',
      moderate: 'Defined risk spreads. Limited directional plays.',
      aggressive: 'Full options playbook. LEAPS, spreads, directional.',
      ultra_aggressive: 'Aggressive options. Weeklies, momentum plays, asymmetric bets.',
    },
  };
  
  return adjustments[agent]?.[profile] || '';
}

export default {
  RISK_MODIFIERS,
  getRiskProfilePrompt,
  getQuickRiskContext,
  getAgentRiskAdjustment,
};
