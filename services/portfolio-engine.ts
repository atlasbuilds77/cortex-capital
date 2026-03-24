/**
 * Portfolio Engine - Core Multi-Tenant Engine
 * 
 * Processes ANY user's portfolio through the agent system.
 * This is the heart of production mode.
 * 
 * Flow:
 * 1. Load user from Supabase
 * 2. Load their risk profile
 * 3. Call appropriate agents via LLM
 * 4. Store results to database
 * 5. Execute trades if approved
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LLMAgent, LLMConfig, AgentDecision } from '../agents/llm-agent-wrapper';
import { getProfileConfig, RiskProfile } from '../lib/profile-configs';
import { logger } from '../lib/logger';

// Types
export interface User {
  id: string;
  email: string;
  tier: 'scout' | 'operator' | 'partner';
  risk_profile: RiskProfile;
  created_at: string;
  updated_at: string;
}

export interface BrokerageConnection {
  id: string;
  user_id: string;
  broker: 'tradier' | 'webull';
  credentials_encrypted: string;
  connected_at: string;
  last_sync: string | null;
}

export interface PortfolioSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_value: number;
  positions: Record<string, any>;
  metrics: Record<string, any>;
}

export interface AnalysisResult {
  userId: string;
  timestamp: string;
  action: 'hold' | 'rebalance' | 'urgent_action';
  confidence: number;
  reasoning: string;
  issues: string[];
  metrics: {
    drift: number;
    volatility: number;
    sharpe?: number;
  };
  details?: Record<string, any>;
}

export interface RebalancingPlan {
  id: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  trades: Trade[];
  createdAt: string;
  expectedCost: number;
  expectedImpact: string;
  reasoning: string;
}

export interface Trade {
  ticker: string;
  action: 'buy' | 'sell';
  quantity: number;
  estimatedPrice?: number;
  reasoning?: string;
}

export interface ExecutionResult {
  planId: string;
  userId: string;
  status: 'success' | 'partial' | 'failed';
  executedTrades: ExecutedTrade[];
  failedTrades: Trade[];
  totalCost: number;
  timestamp: string;
}

export interface ExecutedTrade extends Trade {
  actualPrice: number;
  executedAt: string;
  orderId?: string;
}

// Portfolio Engine Class
export class PortfolioEngine {
  private supabase: SupabaseClient;
  private agents: Record<string, LLMAgent>;
  private llmConfig: LLMConfig;

  constructor(supabaseUrl: string, supabaseKey: string, llmConfig: LLMConfig) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.llmConfig = llmConfig;
    
    // Initialize agent team
    this.agents = {
      ANALYST: new LLMAgent('ANALYST', llmConfig),
      STRATEGIST: new LLMAgent('STRATEGIST', llmConfig),
      EXECUTOR: new LLMAgent('EXECUTOR', llmConfig),
      REPORTER: new LLMAgent('REPORTER', llmConfig),
    };
    
    logger.info('Portfolio Engine initialized', {
      llmProvider: llmConfig.provider,
      model: llmConfig.model
    });
  }

  /**
   * Load user from Supabase
   */
  async loadUser(userId: string): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new Error(`Failed to load user ${userId}: ${error?.message || 'User not found'}`);
    }

    logger.info('User loaded', { userId, email: data.email, riskProfile: data.risk_profile });
    return data as User;
  }

  /**
   * Get user's latest portfolio snapshot
   */
  async getLatestPortfolio(userId: string): Promise<PortfolioSnapshot | null> {
    const { data, error } = await this.supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      logger.warn('No portfolio snapshot found', { userId, error: error.message });
      return null;
    }

    return data as PortfolioSnapshot;
  }

  /**
   * Get user's brokerage connection
   */
  async getBrokerageConnection(userId: string): Promise<BrokerageConnection | null> {
    const { data, error } = await this.supabase
      .from('brokerage_connections')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      logger.warn('No brokerage connection found', { userId });
      return null;
    }

    return data as BrokerageConnection;
  }

  /**
   * Run portfolio analysis for a user
   * Calls ANALYST agent with LLM reasoning
   */
  async analyzePortfolio(userId: string): Promise<AnalysisResult> {
    logger.info('Starting portfolio analysis', { userId });

    // Load user and portfolio
    const user = await this.loadUser(userId);
    const portfolio = await this.getLatestPortfolio(userId);
    
    if (!portfolio) {
      throw new Error(`No portfolio found for user ${userId}`);
    }

    const profileConfig = getProfileConfig(user.risk_profile);

    // Build analysis task for ANALYST
    const task = `
Analyze this user's portfolio:

USER PROFILE:
- Risk Profile: ${user.risk_profile}
- Target Allocation: ${JSON.stringify(profileConfig.allocation)}
- Tier: ${user.tier}

CURRENT PORTFOLIO:
- Total Value: $${portfolio.total_value.toLocaleString()}
- Positions: ${JSON.stringify(portfolio.positions, null, 2)}
- Metrics: ${JSON.stringify(portfolio.metrics, null, 2)}

TASK:
1. Calculate drift from target allocation
2. Assess risk metrics
3. Identify any urgent issues
4. Recommend action: HOLD, REBALANCE, or URGENT_ACTION

Return your analysis with confidence score.
    `.trim();

    // Call ANALYST agent
    const decision: AgentDecision = await this.agents.ANALYST.decide(task, {
      userProfile: user,
      portfolio: portfolio.positions,
      marketData: portfolio.metrics
    });

    // Parse analysis result
    const result: AnalysisResult = {
      userId,
      timestamp: new Date().toISOString(),
      action: this.parseAction(decision.action),
      confidence: decision.confidence,
      reasoning: decision.reasoning,
      issues: decision.details?.issues || [],
      metrics: {
        drift: decision.details?.drift || 0,
        volatility: decision.details?.volatility || 0,
        sharpe: decision.details?.sharpe
      },
      details: decision.details
    };

    // Store analysis result
    await this.supabase.from('analysis_results').insert({
      user_id: userId,
      action: result.action,
      confidence: result.confidence,
      reasoning: result.reasoning,
      metrics: result.metrics,
      details: result.details,
      created_at: result.timestamp
    });

    logger.info('Portfolio analysis complete', {
      userId,
      action: result.action,
      confidence: result.confidence
    });

    return result;
  }

  private parseAction(agentAction: string): 'hold' | 'rebalance' | 'urgent_action' {
    const action = agentAction.toLowerCase();
    if (action.includes('hold') || action === 'skip') return 'hold';
    if (action.includes('urgent')) return 'urgent_action';
    return 'rebalance';
  }

  /**
   * Generate rebalancing plan
   * Calls STRATEGIST agent with LLM reasoning
   */
  async generatePlan(userId: string): Promise<RebalancingPlan> {
    logger.info('Generating rebalancing plan', { userId });

    // Load context
    const user = await this.loadUser(userId);
    const portfolio = await this.getLatestPortfolio(userId);
    
    if (!portfolio) {
      throw new Error(`No portfolio found for user ${userId}`);
    }

    const profileConfig = getProfileConfig(user.risk_profile);

    // Build planning task for STRATEGIST
    const task = `
Generate a rebalancing plan for this user:

USER PROFILE:
- Risk Profile: ${user.risk_profile}
- Target Allocation: ${JSON.stringify(profileConfig.allocation)}
- Tier: ${user.tier}
- Max Trades: ${profileConfig.maxTrades}

CURRENT PORTFOLIO:
- Total Value: $${portfolio.total_value.toLocaleString()}
- Positions: ${JSON.stringify(portfolio.positions, null, 2)}

TASK:
1. Identify trades needed to reach target allocation
2. Minimize trading costs
3. Consider tax implications (${profileConfig.taxOptimize})
4. Respect max trades limit
5. Provide clear reasoning for each trade

Return a list of trades with reasoning.
    `.trim();

    // Call STRATEGIST agent
    const decision: AgentDecision = await this.agents.STRATEGIST.decide(task, {
      userProfile: user,
      portfolio: portfolio.positions
    });

    // Parse plan
    const trades: Trade[] = decision.details?.trades || [];
    
    // Create plan in database
    const { data: planData, error } = await this.supabase
      .from('rebalancing_plans')
      .insert({
        user_id: userId,
        status: 'pending',
        trades: trades,
        expected_cost: decision.details?.expectedCost || 0,
        reasoning: decision.reasoning,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error || !planData) {
      throw new Error(`Failed to create plan: ${error?.message}`);
    }

    const plan: RebalancingPlan = {
      id: planData.id,
      userId,
      status: 'pending',
      trades,
      createdAt: planData.created_at,
      expectedCost: decision.details?.expectedCost || 0,
      expectedImpact: decision.details?.expectedImpact || 'Unknown',
      reasoning: decision.reasoning
    };

    logger.info('Rebalancing plan generated', {
      userId,
      planId: plan.id,
      tradesCount: trades.length
    });

    return plan;
  }

  /**
   * Execute approved rebalancing plan
   * Calls EXECUTOR agent for each trade
   */
  async executePlan(userId: string, planId: string): Promise<ExecutionResult> {
    logger.info('Executing rebalancing plan', { userId, planId });

    // Load plan
    const { data: planData, error: planError } = await this.supabase
      .from('rebalancing_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', userId)
      .single();

    if (planError || !planData) {
      throw new Error(`Plan not found: ${planError?.message}`);
    }

    if (planData.status !== 'approved') {
      throw new Error(`Plan status is ${planData.status}, must be approved`);
    }

    // Get brokerage connection
    const broker = await this.getBrokerageConnection(userId);
    if (!broker) {
      throw new Error('No brokerage connection found');
    }

    const trades: Trade[] = planData.trades;
    const executedTrades: ExecutedTrade[] = [];
    const failedTrades: Trade[] = [];
    let totalCost = 0;

    // Execute each trade via EXECUTOR agent
    for (const trade of trades) {
      try {
        const task = `
Execute this trade:

BROKER: ${broker.broker}
TICKER: ${trade.ticker}
ACTION: ${trade.action}
QUANTITY: ${trade.quantity}

Return execution details (price, order ID, timestamp).
        `.trim();

        const decision: AgentDecision = await this.agents.EXECUTOR.decide(task, {
          userProfile: await this.loadUser(userId),
          portfolio: await this.getLatestPortfolio(userId)
        });

        if (decision.action === 'execute' && decision.details?.executed) {
          const executedTrade: ExecutedTrade = {
            ...trade,
            actualPrice: decision.details.price,
            executedAt: new Date().toISOString(),
            orderId: decision.details.orderId
          };

          executedTrades.push(executedTrade);
          totalCost += decision.details.cost || 0;

          // Store trade in database
          await this.supabase.from('trades').insert({
            user_id: userId,
            plan_id: planId,
            ticker: trade.ticker,
            action: trade.action,
            quantity: trade.quantity,
            price: decision.details.price,
            executed_at: executedTrade.executedAt
          });
        } else {
          failedTrades.push(trade);
          logger.warn('Trade execution failed', { trade, reason: decision.reasoning });
        }
      } catch (error) {
        failedTrades.push(trade);
        logger.error('Trade execution error', { trade, error });
      }
    }

    // Update plan status
    const finalStatus = failedTrades.length === 0 ? 'executed' 
      : executedTrades.length > 0 ? 'partial' 
      : 'failed';

    await this.supabase
      .from('rebalancing_plans')
      .update({
        status: finalStatus === 'partial' ? 'executed' : finalStatus,
        executed_at: new Date().toISOString()
      })
      .eq('id', planId);

    const result: ExecutionResult = {
      planId,
      userId,
      status: failedTrades.length === 0 ? 'success' : 'partial',
      executedTrades,
      failedTrades,
      totalCost,
      timestamp: new Date().toISOString()
    };

    logger.info('Plan execution complete', {
      userId,
      planId,
      executed: executedTrades.length,
      failed: failedTrades.length,
      totalCost
    });

    return result;
  }

  /**
   * Send report to user
   * Calls REPORTER agent to generate human-readable report
   */
  async sendReport(userId: string, reportType: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    logger.info('Generating report', { userId, reportType });

    // Load context
    const user = await this.loadUser(userId);
    const portfolio = await this.getLatestPortfolio(userId);
    
    if (!portfolio) {
      logger.warn('No portfolio to report on', { userId });
      return;
    }

    // Get recent activity
    const { data: recentTrades } = await this.supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('executed_at', { ascending: false })
      .limit(10);

    // Build report task for REPORTER
    const task = `
Generate a ${reportType} report for this user:

USER: ${user.email}
RISK PROFILE: ${user.risk_profile}

PORTFOLIO VALUE: $${portfolio.total_value.toLocaleString()}
POSITIONS: ${JSON.stringify(portfolio.positions, null, 2)}
METRICS: ${JSON.stringify(portfolio.metrics, null, 2)}

RECENT TRADES:
${JSON.stringify(recentTrades || [], null, 2)}

Create a clear, human-readable ${reportType} report.
Include: performance summary, key metrics, recent activity, recommendations.
    `.trim();

    // Call REPORTER agent
    const decision: AgentDecision = await this.agents.REPORTER.decide(task, {
      userProfile: user,
      portfolio: portfolio.positions
    });

    // Store report
    await this.supabase.from('reports').insert({
      user_id: userId,
      report_type: reportType,
      content: decision.details?.report || decision.reasoning,
      created_at: new Date().toISOString()
    });

    // TODO: Send via email or notification system
    // For now, just log
    logger.info('Report generated', { userId, reportType });
  }
}

// Factory function
export function createPortfolioEngine(
  supabaseUrl?: string,
  supabaseKey?: string,
  llmConfig?: LLMConfig
): PortfolioEngine {
  const url = supabaseUrl || process.env.SUPABASE_URL;
  const key = supabaseKey || process.env.SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase URL and Key required');
  }

  const config: LLMConfig = llmConfig || {
    provider: (process.env.LLM_PROVIDER as any) || 'deepseek',
    model: process.env.LLM_MODEL || 'deepseek-chat',
    apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '',
    temperature: 0.3,
    maxTokens: 2000
  };

  return new PortfolioEngine(url, key, config);
}
