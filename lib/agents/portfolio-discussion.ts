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
  private formatPortfolioContext(portfolio: PortfolioData, profile: UserProfile): string {
    console.log('[PortfolioDiscussion] formatPortfolioContext - portfolio_value:', portfolio.portfolio_value, 'cash:', portfolio.cash, 'positions:', portfolio.positions.length);
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
        prompt = `Review this portfolio and discuss whether rebalancing is needed:\n\n${context}\n\nConsider: sector allocation, position sizing, cash levels, and alignment with user's risk profile.`;
        participants = ['ANALYST', 'STRATEGIST', 'RISK'];
        break;
      
      case 'risk':
        topic = 'Risk Assessment Review';
        prompt = `Analyze the risk profile of this portfolio:\n\n${context}\n\nDiscuss: concentration risk, volatility exposure, downside protection, and whether it matches the user's stated risk tolerance.`;
        participants = ['RISK', 'ANALYST', 'STRATEGIST'];
        break;
      
      case 'opportunities':
        topic = 'Investment Opportunities Discussion';
        prompt = `Given this portfolio, what opportunities should we consider:\n\n${context}\n\nDebate: sectors to rotate into, individual stocks to add, and timing considerations.`;
        participants = ['GROWTH', 'VALUE', 'STRATEGIST', 'RISK'];
        break;
      
      case 'performance':
        topic = 'Performance Review';
        prompt = `Review the performance of current holdings:\n\n${context}\n\nDiscuss: winners to trim, losers to cut, and positions to add to.`;
        participants = ['ANALYST', 'GROWTH', 'VALUE'];
        break;
      
      default:
        topic = 'Weekly Portfolio Review';
        prompt = `Conduct a comprehensive review of this portfolio:\n\n${context}\n\nCover: current performance, risk alignment, rebalancing needs, and opportunities.`;
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
