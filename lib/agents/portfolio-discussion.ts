/**
 * PORTFOLIO DISCUSSION ENGINE
 * 
 * Agents analyze real portfolio data and discuss improvements.
 * This is the "fishtank" content that clients watch.
 * 
 * Discussion Types:
 * 1. Portfolio Review - Analyze current holdings, suggest changes
 * 2. Rebalancing Debate - Bull vs Bear on each position
 * 3. Risk Assessment - Is the portfolio aligned with user's goals?
 * 4. Opportunity Scan - What should we add/rotate into?
 * 
 * Built: 2026-03-23
 * Updated: 2026-03-24 (Added user-specific discussions)
 */

import OpenAI from 'openai';
import * as fs from 'fs';
import { collaborativeDaemon, discussionEmitter } from './collaborative-daemon';
import { query } from '../integrations/database';
import { getRiskProfilePrompt, getQuickRiskContext, type RiskProfile } from './risk-profile-modifier';

// Alpaca types
interface Position {
  symbol: string;
  qty: number;
  avg_entry_price: number;
  current_price: number;
  market_value: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
}

interface PortfolioData {
  cash: number;
  portfolio_value: number;
  positions: Position[];
  buying_power: number;
}

interface UserProfile {
  risk_tolerance: 'conservative' | 'moderate' | 'aggressive' | 'ultra_aggressive';
  investment_horizon: 'short' | 'medium' | 'long';
  goals: string[];
  excluded_sectors?: string[];
}

// User context for personalized discussions
interface UserContext {
  userId: string;
  name: string;
  email: string;
  risk_profile: 'conservative' | 'moderate' | 'aggressive' | 'ultra_aggressive';
  tier: 'scout' | 'operator' | 'partner';
  goals: string[];
  current_positions: Position[];
  total_value: number;
  cash: number;
  sectors: Record<string, number>; // sector -> allocation %
  p_and_l_ytd?: number;
  top_winners?: Array<{symbol: string, gain: number}>;
  top_losers?: Array<{symbol: string, loss: number}>;
}

// Discussion thread with user context
export interface Discussion {
  id: string;
  userId: string;
  discussionType: 'review' | 'risk_assessment' | 'opportunities' | 'morning_briefing';
  userContext: UserContext;
  messages: Array<{
    agent: string;
    role: string;
    content: string;
    timestamp: string;
  }>;
  startedAt: string;
  completedAt?: string;
  summary?: string;
}

// Agent roles for portfolio discussions
const PORTFOLIO_AGENTS = {
  ANALYST: {
    name: 'ANALYST',
    role: 'Portfolio Analyst',
    perspective: 'Data-driven analysis of holdings, sector exposure, and performance metrics',
    avatar: '📊'
  },
  STRATEGIST: {
    name: 'STRATEGIST', 
    role: 'Investment Strategist',
    perspective: 'Long-term allocation strategy, rebalancing needs, and macro outlook',
    avatar: '🎯'
  },
  RISK: {
    name: 'RISK',
    role: 'Risk Manager',
    perspective: 'Drawdown protection, position sizing, volatility management',
    avatar: '🛡️'
  },
  GROWTH: {
    name: 'GROWTH',
    role: 'Growth Advocate',
    perspective: 'Bullish on opportunities, momentum plays, sector rotation',
    avatar: '🚀'
  },
  VALUE: {
    name: 'VALUE',
    role: 'Value Investor',
    perspective: 'Contrarian views, undervalued assets, dividend focus',
    avatar: '💎'
  }
};

class PortfolioDiscussionEngine {
  private openai: OpenAI;

  constructor() {
    const apiKey = this.getDeepSeekKey();
    this.openai = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com'
    });
  }

  private getDeepSeekKey(): string {
    try {
      const credsPath = '/Users/atlasbuilds/clawd/credentials.json';
      const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
      return creds.deepseek?.api_key || process.env.DEEPSEEK_API_KEY || '';
    } catch {
      return process.env.DEEPSEEK_API_KEY || '';
    }
  }

  /**
   * Fetch real portfolio data from user's broker or demo account
   */
  async fetchPortfolio(userId?: string): Promise<PortfolioData | null> {
    try {
      const brokerService = await import('../services/broker-service');
      
      // Fetch from user's broker or demo
      const portfolio = userId 
        ? await brokerService.fetchUserPortfolio(userId)
        : await brokerService.fetchDemoPortfolio();
      
      if (!portfolio) {
        return null;
      }
      
      // Convert unified format to PortfolioData
      return {
        cash: portfolio.account.cash,
        portfolio_value: portfolio.account.portfolioValue,
        buying_power: portfolio.account.buyingPower,
        positions: portfolio.positions.map(p => ({
          symbol: p.symbol,
          qty: p.qty,
          avg_entry_price: p.avgEntryPrice,
          current_price: p.currentPrice,
          market_value: p.marketValue,
          unrealized_pnl: p.unrealizedPnl,
          unrealized_pnl_pct: p.unrealizedPnlPct
        }))
      };
    } catch (error: any) {
      console.error('[PortfolioDiscussion] Failed to fetch portfolio:', error.message);
      return null;
    }
  }

  /**
   * Format portfolio for agent context
   */
  private formatPortfolioContext(portfolio: PortfolioData, profile: UserProfile, userId?: string): string {
    console.log('[PortfolioDiscussion] formatPortfolioContext - userId:', userId, 'portfolio_value:', portfolio.portfolio_value, 'cash:', portfolio.cash, 'positions:', portfolio.positions.length);

    // FLAG: If portfolio value seems like demo data (> $1M with few positions), warn agents
    const isDemoData = portfolio.portfolio_value > 1000000 && portfolio.positions.length < 3;
    const demoWarning = isDemoData ? `
⚠️ WARNING: This portfolio data appears to be DEMO/SAMPLE data (value: $${portfolio.portfolio_value.toLocaleString()}).
The user's actual account may have different values. Discuss generically or ask for clarification.
` : '';

    const positionSummary = portfolio.positions.length > 0
      ? portfolio.positions.map(p => 
          `${p.symbol}: ${p.qty} shares @ $${p.current_price.toFixed(2)} (${p.unrealized_pnl_pct >= 0 ? '+' : ''}${p.unrealized_pnl_pct.toFixed(1)}%)`
        ).join('\n')
      : 'No positions currently held';

    const totalInvested = portfolio.positions.reduce((sum, p) => sum + p.market_value, 0);
    const cashPct = (portfolio.cash / portfolio.portfolio_value * 100).toFixed(1);

    // Get risk profile behavioral guidance
    const riskProfileGuidance = getRiskProfilePrompt(profile.risk_tolerance as RiskProfile);

    return `
${riskProfileGuidance}

IMPORTANT: Discuss based on the data below. Do not ask for more data or "required actions". Give your analysis and recommendations directly. No markdown formatting.

---

PORTFOLIO SNAPSHOT:
- Total Value: $${portfolio.portfolio_value.toLocaleString()}
- Cash: $${portfolio.cash.toLocaleString()} (${cashPct}%)
- Invested: $${totalInvested.toLocaleString()}
- Buying Power: $${portfolio.buying_power.toLocaleString()}

POSITIONS:
${positionSummary}

USER PROFILE:
- Risk Tolerance: ${profile.risk_tolerance}
- Investment Horizon: ${profile.investment_horizon}
- Goals: ${profile.goals.join(', ')}
${profile.excluded_sectors ? `- Excluded Sectors: ${profile.excluded_sectors.join(', ')}` : ''}
`.trim();
  }

  /**
   * Have agents discuss the portfolio
   */
  async discussPortfolio(
    portfolio: PortfolioData,
    profile: UserProfile,
    focusArea?: 'rebalancing' | 'risk' | 'opportunities' | 'performance',
    userId?: string
  ): Promise<void> {
    const context = this.formatPortfolioContext(portfolio, profile);
    
    let topic: string;
    let prompt: string;
    let participants: (keyof typeof PORTFOLIO_AGENTS)[];

    switch (focusArea) {
      case 'rebalancing':
        topic = 'Portfolio Rebalancing Discussion';
        prompt = `REBALANCING MISSION: Review this portfolio and determine if rebalancing is needed.

${context}

KEY QUESTIONS:
- Which positions are overweight/underweight vs target allocation?
- Should we trim winners or add to losers?
- Is cash level appropriate given market conditions?
- Any sector concentration risks to address?

Use the LIVE RESEARCH and MARKET DATA provided above. Reference your past discussions with this client about their rebalancing preferences. Be specific with numbers.`;
        participants = ['ANALYST', 'STRATEGIST', 'RISK'];
        break;
      
      case 'risk':
        topic = 'Risk Assessment Review';
        prompt = `RISK AUDIT: Analyze the risk profile of this portfolio comprehensively.

${context}

KEY QUESTIONS:
- What's the portfolio's beta vs SPY? Too aggressive or too conservative?
- Any single-name concentration risks (>10% in one position)?
- How does current volatility (VIX) affect our risk budget?
- Are we aligned with the client's stated risk tolerance?
- What's the max drawdown scenario?

Use the LIVE RESEARCH and MARKET DATA. Reference past risk discussions with this client. Give specific risk metrics.`;
        participants = ['RISK', 'ANALYST', 'STRATEGIST'];
        break;
      
      case 'opportunities':
        topic = 'Investment Ideas Generation';
        prompt = `GENERATE TRADE IDEAS: Use technical analysis and research to find actual trade setups.

${context}

YOUR MISSION: Generate 2-3 specific trade ideas with entry points, targets, and stop losses.

ANALYST: Scan for technical setups (breakouts, reversals, flags). Use market data provided.
STRATEGIST: Identify sector rotation plays and macro themes from research.
GROWTH: Find momentum names with strong fundamentals.
VALUE: Find oversold quality names ready to bounce.
RISK: Vet each idea for risk/reward (min 2:1 ratio).

OUTPUT FORMAT for each idea:
- SYMBOL: [ticker]
- SETUP: [breakout/reversal/etc]
- ENTRY: $[price]
- TARGET: $[price] (+X%)
- STOP: $[price] (-X%)
- THESIS: [2 sentences max]

Use LIVE RESEARCH on trends, catalysts, and sector momentum. Be specific - no generic "buy QQQ" ideas. Find actual alpha opportunities.`;
        participants = ['ANALYST', 'STRATEGIST', 'GROWTH', 'VALUE', 'RISK'];
        break;
      
      case 'performance':
        topic = 'Performance Review';
        prompt = `PERFORMANCE POST-MORTEM: Review how this portfolio is performing.

${context}

KEY QUESTIONS:
- Which positions are working? Which aren't?
- Are we beating SPY/QQQ or lagging?
- Any positions to cut losses on?
- Winners to trim and take profits?
- Is our strategy working or do we need to adapt?

Use the LIVE MARKET DATA. Compare to benchmarks. Reference past performance reviews with this client. Be honest about what's working.`;
        participants = ['ANALYST', 'GROWTH', 'VALUE'];
        break;
      
      default:
        topic = 'Weekly Portfolio Review';
        prompt = `COMPREHENSIVE PORTFOLIO REVIEW: Full analysis of current holdings and strategy.

${context}

Cover: performance vs benchmarks, risk alignment, rebalancing needs, opportunities, and strategy adjustments.

Use all LIVE RESEARCH and MARKET DATA provided. Reference your memory of past discussions with this client.`;
        participants = ['ANALYST', 'STRATEGIST', 'RISK', 'GROWTH'];
    }

    // Use the collaborative daemon to run the discussion with userId for preferences
    await collaborativeDaemon.runDiscussion(topic, participants as any, prompt, 2, userId);
  }

  /**
   * Generate specific position discussion
   */
  async discussPosition(
    position: Position,
    portfolio: PortfolioData,
    action: 'trim' | 'add' | 'hold' | 'exit'
  ): Promise<void> {
    const positionWeight = (position.market_value / portfolio.portfolio_value * 100).toFixed(1);
    
    const context = `
POSITION UNDER REVIEW: ${position.symbol}
- Shares: ${position.qty}
- Entry: $${position.avg_entry_price.toFixed(2)}
- Current: $${position.current_price.toFixed(2)}
- P&L: ${position.unrealized_pnl >= 0 ? '+' : ''}$${position.unrealized_pnl.toFixed(2)} (${position.unrealized_pnl_pct >= 0 ? '+' : ''}${position.unrealized_pnl_pct.toFixed(1)}%)
- Portfolio Weight: ${positionWeight}%

PROPOSED ACTION: ${action.toUpperCase()}

Should we ${action} this position? Debate the pros and cons.
`.trim();

    await collaborativeDaemon.runDiscussion(
      `${position.symbol} Position Review`,
      ['ANALYST', 'GROWTH', 'VALUE', 'RISK'] as any,
      context,
      2
    );
  }

  /**
   * Morning portfolio briefing
   */
  async morningPortfolioBriefing(): Promise<void> {
    const portfolio = await this.fetchPortfolio();
    if (!portfolio) {
      console.log('[PortfolioDiscussion] No portfolio data available');
      return;
    }

    // Default profile for demo (would come from user settings)
    const profile: UserProfile = {
      risk_tolerance: 'moderate',
      investment_horizon: 'medium',
      goals: ['Growth', 'Capital Preservation']
    };

    await this.discussPortfolio(portfolio, profile);
  }

  /**
   * Triggered discussion for specific concerns
   */
  async alertDiscussion(
    alertType: 'big_winner' | 'big_loser' | 'concentration' | 'cash_drag',
    details: string
  ): Promise<void> {
    const prompts = {
      big_winner: `ALERT: We have a big winner that might need attention.\n\n${details}\n\nShould we take profits or let it run?`,
      big_loser: `ALERT: Position is significantly down.\n\n${details}\n\nCut losses or hold for recovery?`,
      concentration: `ALERT: Portfolio concentration detected.\n\n${details}\n\nShould we diversify or maintain conviction?`,
      cash_drag: `ALERT: High cash levels may be hurting returns.\n\n${details}\n\nDeploy capital or stay defensive?`
    };

    await collaborativeDaemon.runDiscussion(
      `Portfolio Alert: ${alertType.replace('_', ' ').toUpperCase()}`,
      ['ANALYST', 'RISK', 'STRATEGIST'] as any,
      prompts[alertType],
      2
    );
  }
}

// Export singleton
export const portfolioDiscussionEngine = new PortfolioDiscussionEngine();

// CLI test
if (require.main === module) {
  console.log('Testing Portfolio Discussion Engine...\n');
  
  portfolioDiscussionEngine.morningPortfolioBriefing()
    .then(() => console.log('\nDiscussion complete'))
    .catch(console.error);
}
