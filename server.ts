// Cortex Capital - API Server
// Fastify backend with portfolio analysis endpoints

import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyRawBody from 'fastify-raw-body';
import fastifyStatic from '@fastify/static';
import path from 'path';
import dotenv from 'dotenv';
import { analyzePortfolio } from './agents/analyst';
import { getAccounts, getUserProfile } from './integrations/tradier';
import { query } from './integrations/database';
import { authRoutes } from './routes/auth';
import { paymentRoutes } from './routes/payments';
import { oauthRoutes } from './routes/oauth';
import { discordTierOverride } from './routes/discord-tier-override';
import discussionRoutes from './routes/discussions';
import tradeRoutes from './routes/trades';
import cortexFishtankRoutes from './routes/cortex-fishtank';
import { collaborativeDaemon, discussionEmitter } from './agents/collaborative-daemon';
import { createScheduler } from './services/scheduler';

dotenv.config();

const server = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Register CORS
server.register(cors, {
  origin: true, // Allow all origins for MVP
});

// Register raw body plugin for Stripe webhooks
server.register(fastifyRawBody, {
  field: 'rawBody',
  global: false,
  encoding: 'utf8',
  runFirst: true,
});

// Health check
server.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Get Tradier user profile
server.get('/api/tradier/profile', async (request, reply) => {
  try {
    const profile = await getUserProfile();
    return { success: true, data: profile };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Get Tradier accounts
server.get('/api/tradier/accounts', async (request, reply) => {
  try {
    const accounts = await getAccounts();
    return { success: true, data: accounts };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Analyze portfolio
server.get<{
  Params: { accountId: string };
}>('/api/portfolio/analyze/:accountId', async (request, reply) => {
  try {
    const { accountId } = request.params;
    const report = await analyzePortfolio(accountId);
    return { success: true, data: report };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Create user (simplified for MVP)
server.post<{
  Body: {
    email: string;
    password: string;
    tier: string;
    risk_profile: string;
  };
}>('/api/users', async (request, reply) => {
  try {
    const { email, password, tier = 'free', risk_profile = 'moderate' } = request.body;

    // Hash password with bcrypt
    const bcrypt = await import('bcrypt');
    const SALT_ROUNDS = 12;
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await query(
      `INSERT INTO users (email, password_hash, tier, risk_profile) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, tier, risk_profile, created_at`,
      [email, passwordHash, tier, risk_profile]
    );

    return { success: true, data: result.rows[0] };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Save portfolio snapshot
server.post<{
  Body: {
    user_id: string;
    total_value: number;
    positions: any[];
    metrics: any;
  };
}>('/api/portfolio/snapshot', async (request, reply) => {
  try {
    const { user_id, total_value, positions, metrics } = request.body;

    const result = await query(
      `INSERT INTO portfolio_snapshots (user_id, total_value, positions, metrics) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, created_at`,
      [user_id, total_value, JSON.stringify(positions), JSON.stringify(metrics)]
    );

    return { success: true, data: result.rows[0] };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Get portfolio snapshots for user
server.get<{
  Params: { userId: string };
}>('/api/portfolio/snapshots/:userId', async (request, reply) => {
  try {
    const { userId } = request.params;

    const result = await query(
      `SELECT id, snapshot_date, total_value, positions, metrics 
       FROM portfolio_snapshots 
       WHERE user_id = $1 
       ORDER BY snapshot_date DESC 
       LIMIT 30`,
      [userId]
    );

    return { success: true, data: result.rows };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// ==================== PHASE 2 ENDPOINTS ====================

// STRATEGIST: Generate rebalancing plan
server.post<{
  Body: {
    user_id: string;
    account_id: string;
    risk_profile: string;
    constraints: {
      never_sell: string[];
      max_position_size: number;
      max_sector_exposure: number;
    };
  };
}>('/api/strategist/generate-plan', async (request, reply) => {
  try {
    const { user_id, account_id, risk_profile, constraints } = request.body;
    
    // Import strategist dynamically to avoid circular dependencies
    const { generateRebalancingPlan } = await import('./agents/strategist');
    const { analyzePortfolio } = await import('./agents/analyst');
    
    // Get current portfolio analysis
    const portfolioReport = await analyzePortfolio(account_id);
    
    // Generate rebalancing plan
    const userPreferences = {
      risk_profile: risk_profile as 'conservative' | 'moderate' | 'aggressive',
      investment_horizon: 'medium' as const,
      constraints,
    };
    
    const marketEnvironment = {
      market_volatility: 'medium' as const,
      economic_outlook: 'neutral' as const,
      interest_rate_trend: 'stable' as const,
      sector_rotations: {},
    };
    
    const plan = await generateRebalancingPlan(
      user_id,
      portfolioReport,
      userPreferences,
      marketEnvironment
    );
    
    // Save plan to database
    const result = await query(
      `INSERT INTO rebalancing_plans (user_id, status, trades) 
       VALUES ($1, $2, $3) 
       RETURNING id, created_at`,
      [user_id, plan.status, JSON.stringify(plan.trades)]
    );
    
    return { 
      success: true, 
      data: {
        ...plan,
        db_id: result.rows[0].id,
      }
    };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// STRATEGIST: Get rebalancing plans for user
server.get<{
  Params: { userId: string };
  Querystring: { status?: string; limit?: number };
}>('/api/strategist/plans/:userId', async (request, reply) => {
  try {
    const { userId } = request.params;
    const { status, limit = 10 } = request.query;
    
    let queryStr = `
      SELECT id, status, trades, created_at, approved_at, executed_at 
      FROM rebalancing_plans 
      WHERE user_id = $1
    `;
    const params: any[] = [userId];
    
    if (status) {
      queryStr += ` AND status = $2`;
      params.push(status);
    }
    
    queryStr += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await query(queryStr, params);
    
    return { success: true, data: result.rows };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// EXECUTOR: Execute trades from approved plan
server.post<{
  Body: {
    plan_id: string;
    account_id: string;
    user_id: string;
    dry_run: boolean;
  };
}>('/api/executor/execute', async (request, reply) => {
  try {
    const { plan_id, account_id, user_id, dry_run } = request.body;
    
    // Get plan from database
    const planResult = await query(
      `SELECT trades FROM rebalancing_plans WHERE id = $1 AND user_id = $2 AND status = 'approved'`,
      [plan_id, user_id]
    );
    
    if (planResult.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: 'Plan not found or not approved',
      });
    }
    
    const trades = planResult.rows[0].trades;
    
    // Import executor
    const { TradeExecutor } = await import('./agents/executor');
    
    const config = {
      dry_run,
      order_type: 'market' as const,
      price_tolerance: 0.5,
      max_slippage: 1.0,
      retry_attempts: 2,
      delay_between_trades: 1000,
    };
    
    const executor = new TradeExecutor(config);
    const executionReport = await executor.executeTrades(
      account_id,
      plan_id,
      user_id,
      trades
    );
    
    // Update plan status if not dry run
    if (!dry_run && executionReport.summary.success_rate > 0) {
      await query(
        `UPDATE rebalancing_plans SET status = 'executed', executed_at = NOW() WHERE id = $1`,
        [plan_id]
      );
      
      // Save trade history
      for (const tradeResult of executionReport.results) {
        if (tradeResult.status === 'filled' || tradeResult.status === 'partial') {
          await query(
            `INSERT INTO trades (user_id, plan_id, ticker, action, quantity, price, executed_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              user_id,
              plan_id,
              tradeResult.ticker,
              tradeResult.action,
              tradeResult.filled_quantity,
              tradeResult.average_price,
              tradeResult.execution_time,
            ]
          );
        }
      }
    }
    
    return { success: true, data: executionReport };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// REPORTER: Send email notification
server.post<{
  Body: {
    user_id: string;
    email: string;
    name: string;
    report_type: 'performance' | 'alert' | 'confirmation' | 'market_update';
    data: any;
  };
}>('/api/reporter/send-email', async (request, reply) => {
  try {
    const { user_id, email, name, report_type, data } = request.body;
    
    // Import reporter
    const { ReportGenerator } = await import('./agents/reporter');
    const generator = new ReportGenerator();
    
    const recipient: import('./agents/reporter').EmailRecipient = {
      email,
      name,
      preferences: {
        report_frequency: 'weekly',
        notification_types: ['trade_execution', 'portfolio_alert', 'market_update'],
      },
    };
    
    let emailTemplate;
    
    switch (report_type) {
      case 'performance':
        const { portfolio_report, performance_metrics } = data;
        const reportContent = generator.generatePerformanceReport(
          recipient,
          portfolio_report,
          performance_metrics
        );
        emailTemplate = {
          subject: `Portfolio Performance Report - ${new Date().toLocaleDateString()}`,
          body: reportContent.text,
          html_body: reportContent.html,
        };
        break;
        
      case 'alert':
        const { alert_type, threshold } = data;
        emailTemplate = generator.generatePortfolioAlert(
          recipient,
          data.portfolio_report,
          alert_type,
          threshold
        );
        break;
        
      case 'confirmation':
        emailTemplate = generator.generateTradeConfirmationEmail(
          recipient,
          data.execution_report,
          data.trades
        );
        break;
        
      case 'market_update':
        emailTemplate = generator.generateMarketUpdate(
          [recipient],
          data.market_data,
          data.period
        );
        break;
        
      default:
        throw new Error(`Unknown report type: ${report_type}`);
    }
    
    // In MVP, just return the email template
    // In production, this would send via Resend API
    console.log(`[REPORTER] Would send email to ${email}: ${emailTemplate.subject}`);
    
    return { 
      success: true, 
      data: {
        sent: false, // MVP: not actually sent
        email_template: emailTemplate,
        preview: emailTemplate.body.substring(0, 200) + '...',
      }
    };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// REPORTER: Get user email preferences
server.get<{
  Params: { userId: string };
}>('/api/reporter/preferences/:userId', async (request, reply) => {
  try {
    const { userId } = request.params;
    
    // In MVP, return default preferences
    // In production, fetch from database
    return {
      success: true,
      data: {
        report_frequency: 'weekly',
        notification_types: ['trade_execution', 'portfolio_alert', 'market_update'],
        email: 'user@example.com', // Would come from users table
        name: 'User Name',
      },
    };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Start server
// ============================================================================
// PHASE 3: Risk Profiles & Options Integration Endpoints
// ============================================================================

// Set risk profile
server.post<{
  Body: {
    user_id: string;
    risk_profile: 'conservative' | 'moderate' | 'ultra_aggressive';
  };
}>('/api/profile/select', async (request, reply) => {
  try {
    const { user_id, risk_profile } = request.body;
    
    // Validate profile
    const validProfiles = ['conservative', 'moderate', 'ultra_aggressive'];
    if (!validProfiles.includes(risk_profile)) {
      return reply.status(400).send({
        success: false,
        error: `Invalid risk profile. Must be one of: ${validProfiles.join(', ')}`,
      });
    }
    
    // Update user profile
    await query(
      `UPDATE users SET risk_profile = $1, updated_at = NOW() WHERE id = $2`,
      [risk_profile, user_id]
    );
    
    // Update user preferences
    await query(
      `UPDATE user_preferences SET risk_profile = $1, updated_at = NOW() WHERE user_id = $2`,
      [risk_profile, user_id]
    );
    
    server.log.info(`User ${user_id} updated risk profile to ${risk_profile}`);
    
    return {
      success: true,
      data: {
        user_id,
        risk_profile,
        updated_at: new Date().toISOString(),
        message: `Risk profile updated to ${risk_profile}`,
      },
    };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Get LEAPS recommendations
server.get<{
  Params: { userId: string };
  Querystring: {
    capital?: string;
    maxAllocation?: string;
  };
}>('/api/options/leaps/:userId', async (request, reply) => {
  try {
    const { userId } = request.params;
    const capital = parseFloat(request.query.capital || '10000');
    const maxAllocation = parseFloat(request.query.maxAllocation || '0.2');
    
    // Get user's risk profile
    const userResult = await query(
      `SELECT risk_profile FROM users WHERE id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: 'User not found',
      });
    }
    
    const riskProfile = userResult.rows[0].risk_profile;
    
    // Only moderate and ultra_aggressive profiles support LEAPS
    if (!['moderate', 'ultra_aggressive'].includes(riskProfile)) {
      return reply.status(400).send({
        success: false,
        error: `LEAPS not supported for ${riskProfile} profile`,
      });
    }
    
    // Get user's stock positions for LEAPS selection
    const positionsResult = await query(
      `SELECT symbol, shares, current_price 
       FROM positions 
       WHERE user_id = $1 AND type = 'stock'
       ORDER BY value DESC
       LIMIT 5`,
      [userId]
    );
    
    const stockPositions = positionsResult.rows.map(row => ({
      symbol: row.symbol,
      shares: row.shares,
      currentPrice: parseFloat(row.current_price),
    }));
    
    // Generate LEAPS recommendations
    const { OptionsStrategist } = await import('./agents/options-strategist');
    const strategist = new OptionsStrategist(riskProfile as any);
    
    const leapsAllocation = capital * maxAllocation;
    const capitalPerLeap = leapsAllocation / 3; // Split across 3 positions
    
    const recommendations = [];
    
    for (const stock of stockPositions.slice(0, 3)) {
      const leap = await strategist.selectLeaps({
        stock: stock.symbol,
        capital: capitalPerLeap,
        targetDelta: [0.70, 0.80],
        minDTE: 365,
      });
      
      if (leap) {
        recommendations.push(leap);
      }
    }
    
    return {
      success: true,
      data: {
        risk_profile: riskProfile,
        total_capital: capital,
        leaps_allocation: leapsAllocation,
        recommendations,
        count: recommendations.length,
      },
    };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Get covered call opportunities
server.get<{
  Params: { userId: string };
}>('/api/options/covered-calls/:userId', async (request, reply) => {
  try {
    const { userId } = request.params;
    
    // Get user's risk profile
    const userResult = await query(
      `SELECT risk_profile FROM users WHERE id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: 'User not found',
      });
    }
    
    const riskProfile = userResult.rows[0].risk_profile;
    
    // Only ultra_aggressive profile supports covered calls
    if (riskProfile !== 'ultra_aggressive') {
      return reply.status(400).send({
        success: false,
        error: `Covered calls only supported for ultra_aggressive profile`,
      });
    }
    
    // Get user's stock positions
    const positionsResult = await query(
      `SELECT symbol, shares, cost_basis, current_price 
       FROM positions 
       WHERE user_id = $1 AND type = 'stock' AND shares >= 100
       ORDER BY value DESC
       LIMIT 10`,
      [userId]
    );
    
    const stockPositions = positionsResult.rows.map(row => ({
      symbol: row.symbol,
      shares: row.shares,
      costBasis: parseFloat(row.cost_basis),
      currentPrice: parseFloat(row.current_price),
    }));
    
    // Generate covered call recommendations
    const { OptionsStrategist } = await import('./agents/options-strategist');
    const strategist = new OptionsStrategist(riskProfile as any);
    
    const recommendations = [];
    
    for (const stock of stockPositions) {
      const coveredCall = await strategist.generateCoveredCalls({
        stockPosition: stock,
        otmRange: [0.10, 0.15], // 10-15% OTM
        dteRange: [30, 45], // 30-45 days to expiry
      });
      
      if (coveredCall) {
        recommendations.push(coveredCall);
      }
    }
    
    return {
      success: true,
      data: {
        risk_profile: riskProfile,
        recommendations,
        count: recommendations.length,
        total_premium_opportunity: recommendations.reduce((sum, rec) => 
          sum + (rec.premiumReceived || 0), 0
        ),
      },
    };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Get intraday setups (ultra aggressive only)
server.get<{
  Params: { userId: string };
  Querystring: {
    minPrice?: string;
    maxPrice?: string;
    minVolume?: string;
  };
}>('/api/day-trading/setups/:userId', async (request, reply) => {
  try {
    const { userId } = request.params;
    const minPrice = parseFloat(request.query.minPrice || '10');
    const maxPrice = parseFloat(request.query.maxPrice || '500');
    const minVolume = parseInt(request.query.minVolume || '1000000');
    
    // Get user's risk profile and day trading allocation
    const userResult = await query(
      `SELECT u.risk_profile, up.day_trading_allocation
       FROM users u
       LEFT JOIN user_preferences up ON u.id = up.user_id
       WHERE u.id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: 'User not found',
      });
    }
    
    const riskProfile = userResult.rows[0].risk_profile;
    const dayTradingAllocation = parseFloat(userResult.rows[0].day_trading_allocation) || 0;
    
    // Only ultra_aggressive profile supports day trading
    if (riskProfile !== 'ultra_aggressive') {
      return reply.status(400).send({
        success: false,
        error: `Day trading only supported for ultra_aggressive profile`,
      });
    }
    
    // Get user's portfolio value for capital calculation
    const portfolioResult = await query(
      `SELECT SUM(value) as total_value FROM positions WHERE user_id = $1`,
      [userId]
    );
    
    const portfolioValue = parseFloat(portfolioResult.rows[0]?.total_value) || 0;
    const dayTradingCapital = portfolioValue * dayTradingAllocation;
    
    // Scan for day trading setups
    const { DayTrader } = await import('./agents/day-trader');
    const dayTrader = new DayTrader(
      userId,
      dayTradingCapital,
      0.05, // max risk per trade
      '15:45' // force exit time
    );
    
    const setups = await dayTrader.scanForSetups({
      minPrice,
      maxPrice,
      minVolume,
      excludeETFs: true,
    });
    
    return {
      success: true,
      data: {
        risk_profile: riskProfile,
        day_trading_capital: dayTradingCapital,
        max_risk_per_trade: dayTradingCapital * 0.05,
        setups: setups.slice(0, 10), // Return top 10 setups
        count: setups.length,
        scan_filters: {
          minPrice,
          maxPrice,
          minVolume,
        },
      },
    };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Get weekly rotation plan (ultra aggressive only)
server.get<{
  Params: { userId: string };
}>('/api/momentum/rotation/:userId', async (request, reply) => {
  try {
    const { userId } = request.params;
    
    // Get user's risk profile
    const userResult = await query(
      `SELECT risk_profile FROM users WHERE id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: 'User not found',
      });
    }
    
    const riskProfile = userResult.rows[0].risk_profile;
    
    // Only ultra_aggressive profile supports momentum rotation
    if (riskProfile !== 'ultra_aggressive') {
      return reply.status(400).send({
        success: false,
        error: `Momentum rotation only supported for ultra_aggressive profile`,
      });
    }
    
    // Get user's portfolio value for rotation capital
    const portfolioResult = await query(
      `SELECT SUM(value) as total_value FROM positions WHERE user_id = $1`,
      [userId]
    );
    
    const portfolioValue = parseFloat(portfolioResult.rows[0]?.total_value) || 0;
    const rotationCapital = portfolioValue * 0.2; // 20% for rotation
    
    // Generate rotation plan
    const { MomentumAgent } = await import('./agents/momentum');
    const momentumAgent = new MomentumAgent(userId, rotationCapital);
    
    const rotationPlan = await momentumAgent.generateRotationPlan();
    
    return {
      success: true,
      data: {
        risk_profile: riskProfile,
        rotation_capital: rotationCapital,
        plan: rotationPlan,
        execution_window: 'Monday market open',
        expected_weekly_return: rotationPlan.expected_weekly_return,
        risk_level: rotationPlan.riskLevel,
      },
    };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Get options Greeks for positions
server.get<{
  Params: { userId: string };
}>('/api/options/greeks/:userId', async (request, reply) => {
  try {
    const { userId } = request.params;
    
    // Get user's open options positions
    const positionsResult = await query(
      `SELECT * FROM options_positions 
       WHERE user_id = $1 AND status = 'open'
       ORDER BY created_at DESC`,
      [userId]
    );
    
    if (positionsResult.rows.length === 0) {
      return {
        success: true,
        data: {
          message: 'No open options positions',
          positions: [],
        },
      };
    }
    
    // Calculate Greeks for each position
    const { GreeksCalculator } = await import('./services/greeks-calculator');
    const calculator = new GreeksCalculator();
    
    const positionsWithGreeks = [];
    
    for (const position of positionsResult.rows) {
      const greeks = await calculator.calculateGreeks(
        position.symbol,
        parseFloat(position.long_strike),
        position.type.includes('call') ? 'call' : 'put',
        new Date(position.expiry)
      );
      
      positionsWithGreeks.push({
        ...position,
        greeks,
        days_to_expiry: Math.ceil(
          (new Date(position.expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ),
      });
    }
    
    // Calculate portfolio Greeks
    const portfolioGreeks = await calculator.calculatePortfolioGreeks(
      positionsResult.rows.map(p => ({
        symbol: p.symbol,
        strike: parseFloat(p.long_strike),
        optionType: p.type.includes('call') ? 'call' : 'put',
        expiry: new Date(p.expiry),
        quantity: p.quantity,
        isLong: !p.type.includes('short'),
      }))
    );
    
    // Analyze risk
    const riskAnalysis = await calculator.analyzeRisk(portfolioGreeks);
    
    return {
      success: true,
      data: {
        positions: positionsWithGreeks,
        portfolio_greeks: portfolioGreeks,
        risk_analysis: riskAnalysis,
        total_positions: positionsResult.rows.length,
        total_value: positionsResult.rows.reduce((sum, p) => sum + parseFloat(p.premium_paid), 0),
      },
    };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Old start function removed - see end of file for unified startup

// ============================================
// TRADE EXECUTION ENDPOINTS
// ============================================

import { TradeExecutor, executeRotationPlan } from './services/trade-executor';

// Execute momentum rotation for a user
server.post<{
  Body: { userId: string; capital?: number };
}>('/api/execute/momentum-rotation', async (request, reply) => {
  try {
    const { userId, capital = 50000 } = request.body;
    
    // Get the rotation plan first
    const { MomentumAgent } = await import('./agents/momentum');
    const momentumAgent = new MomentumAgent(userId, capital * 0.2); // 20% for rotation
    const plan = await momentumAgent.generateRotationPlan();
    
    // Execute it
    const results = await executeRotationPlan(userId, plan);
    
    return {
      success: true,
      data: {
        plan_summary: {
          buys: plan.buys.length,
          sells: plan.sells.length,
          capital_deployed: plan.totalRotationCapital,
        },
        execution_results: results,
        dry_run: process.env.DRY_RUN === 'true',
      },
    };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Manual trade execution
server.post<{
  Body: {
    userId: string;
    symbol: string;
    side: 'buy' | 'sell';
    quantity?: number;
    notional?: number;
    type?: 'market' | 'limit';
    limit_price?: number;
    reason?: string;
  };
}>('/api/execute/trade', async (request, reply) => {
  try {
    const { userId, symbol, side, quantity, notional, type = 'market', limit_price, reason = 'manual' } = request.body;
    
    const executor = new TradeExecutor(userId);
    const result = await executor.executeTrade({
      symbol,
      side,
      quantity,
      notional,
      type,
      limit_price,
      strategy: 'manual',
      reason,
    });
    
    return {
      success: result.success,
      data: result,
      dry_run: process.env.DRY_RUN === 'true',
    };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Get Alpaca account status
server.get('/api/broker/alpaca/account', async (request, reply) => {
  try {
    const alpaca = (await import('./integrations/alpaca')).default;
    const account = await alpaca.getAccount();
    const positions = await alpaca.getPositions();
    
    return {
      success: true,
      data: {
        account_number: account.account_number,
        status: account.status,
        cash: parseFloat(account.cash),
        portfolio_value: parseFloat(account.portfolio_value),
        buying_power: parseFloat(account.buying_power),
        day_trades: account.daytrade_count,
        paper_trading: alpaca.isPaperTrading(),
        positions: positions.map(p => ({
          symbol: p.symbol,
          qty: parseFloat(p.qty),
          avg_entry: parseFloat(p.avg_entry_price),
          current_price: parseFloat(p.current_price),
          market_value: parseFloat(p.market_value),
          unrealized_pnl: parseFloat(p.unrealized_pl),
          unrealized_pnl_pct: parseFloat(p.unrealized_plpc) * 100,
        })),
      },
    };
  } catch (error: any) {
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// ROBINHOOD ENDPOINTS (Unofficial API)
// ============================================

import { RobinhoodBridge, isConfigured as isRobinhoodConfigured } from './integrations/robinhood-bridge';

// Get Robinhood account status
server.get('/api/broker/robinhood/account', async (request, reply) => {
  try {
    if (!isRobinhoodConfigured()) {
      return reply.status(400).send({
        success: false,
        error: 'Robinhood not configured. Set ROBINHOOD_USERNAME and ROBINHOOD_PASSWORD',
      });
    }
    
    const client = new RobinhoodBridge();
    const account = await client.getAccount();
    const positions = await client.getPositions();
    
    return {
      success: true,
      data: {
        ...account,
        positions,
        unofficial_api: true,
        warning: 'This uses an unofficial API that can break at any time',
      },
    };
  } catch (error: any) {
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Execute trade on Robinhood
server.post<{
  Body: {
    symbol: string;
    side: 'buy' | 'sell';
    quantity?: number;
    amount?: number;
    limit_price?: number;
  };
}>('/api/broker/robinhood/trade', async (request, reply) => {
  try {
    if (!isRobinhoodConfigured()) {
      return reply.status(400).send({
        success: false,
        error: 'Robinhood not configured',
      });
    }
    
    const { symbol, side, quantity, amount, limit_price } = request.body;
    const client = new RobinhoodBridge();
    
    let result;
    if (side === 'buy') {
      result = await client.buyStock(symbol, quantity, amount, limit_price);
    } else {
      result = await client.sellStock(symbol, quantity, amount, limit_price);
    }
    
    return {
      success: true,
      data: result,
      unofficial_api: true,
    };
  } catch (error: any) {
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// FISH TANK ENDPOINTS (Live Alpaca Data)
// ============================================

// Get live data for Fish Tank display

// ============================================
// AGENT DISCUSSIONS (Real-time streaming)
// ============================================

// SSE endpoint for real-time agent discussions

// Get recent discussions (non-streaming)

// Trigger a discussion manually (for testing or user-specific)
server.post<{
  Body: {
    type: 'briefing' | 'trade_idea' | 'position_review' | 'portfolio_review' | 'portfolio_risk' | 'portfolio_opportunities';
    userId?: string;  // Optional: specific user's portfolio (uses demo if omitted)
    params?: any;
  };
}>('/api/fishtank/discussions/trigger', async (request, reply) => {
  const { type, userId, params } = request.body;
  
  // Import portfolio discussion engine
  const { portfolioDiscussionEngine } = await import('./agents/portfolio-discussion');
  
  let discussion;
  switch (type) {
    case 'briefing':
      discussion = await collaborativeDaemon.morningBriefing();
      break;
    case 'trade_idea':
      discussion = await collaborativeDaemon.discussTradeIdea(
        params?.symbol || 'QQQ',
        params?.direction || 'long',
        params?.thesis || 'Technical breakout setup'
      );
      break;
    case 'position_review':
      discussion = await collaborativeDaemon.reviewPosition(
        params?.symbol || 'NVDA',
        params?.entry || 850,
        params?.current || 890,
        params?.pnl || 4000
      );
      break;
    case 'portfolio_review':
      // Full portfolio review - uses userId if provided, else demo
      const reviewPortfolio = await portfolioDiscussionEngine.fetchPortfolio(userId);
      if (reviewPortfolio) {
        await portfolioDiscussionEngine.discussPortfolio(reviewPortfolio, {
          risk_tolerance: params?.risk_tolerance || 'moderate',
          investment_horizon: params?.horizon || 'medium',
          goals: params?.goals || ['Growth', 'Capital Preservation']
        });
      }
      return { success: true, message: 'Portfolio review discussion started', userId: userId || 'demo' };
    case 'portfolio_risk':
      // Risk-focused portfolio discussion
      const portfolio = await portfolioDiscussionEngine.fetchPortfolio(userId);
      if (portfolio) {
        await portfolioDiscussionEngine.discussPortfolio(portfolio, {
          risk_tolerance: params?.risk_tolerance || 'moderate',
          investment_horizon: params?.horizon || 'medium',
          goals: params?.goals || ['Growth']
        }, 'risk');
      }
      return { success: true, message: 'Risk assessment discussion started', userId: userId || 'demo' };
    case 'portfolio_opportunities':
      // Opportunity-focused discussion
      const pf = await portfolioDiscussionEngine.fetchPortfolio(userId);
      if (pf) {
        await portfolioDiscussionEngine.discussPortfolio(pf, {
          risk_tolerance: params?.risk_tolerance || 'aggressive',
          investment_horizon: params?.horizon || 'medium',
          goals: params?.goals || ['Growth', 'Alpha']
        }, 'opportunities');
      }
      return { success: true, message: 'Opportunities discussion started', userId: userId || 'demo' };
    default:
      return reply.status(400).send({ error: 'Invalid discussion type' });
  }
  
  return { success: true, data: discussion };
});

// ============================================
// SERVER STARTUP
// ============================================

const PORT = parseInt(process.env.PORT || '3001', 10);

async function start() {
  try {
    // Serve static frontend files (Next.js build) - PRODUCTION ONLY
    if (process.env.NODE_ENV === 'production') {
      const frontendPath = path.join(__dirname, 'frontend', 'out');
      server.register(fastifyStatic, {
        root: frontendPath,
        prefix: '/',
      });
    }

    // Register API routes
    server.register(authRoutes);
    server.register(paymentRoutes);
    server.register(oauthRoutes);
    server.register(discordTierOverride);
    server.register(discussionRoutes);
    server.register(tradeRoutes);
    server.register(cortexFishtankRoutes);
    
    // Start server
    await server.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`\n🚀 Cortex Capital API running on port ${PORT}`);
    
    // Print routes
    console.log('\n📍 API Routes:');
    console.log(`   GET  /health - Health check`);
    console.log(`   GET  /api/tradier/profile - Get Tradier profile`);
    console.log(`   GET  /api/portfolio/analyze/:accountId - Analyze portfolio`);
    console.log(`   GET  /api/fishtank/live - Live fishtank data (Alpaca)`);
    console.log(`   GET  /api/fishtank/discussions/stream - SSE agent discussions`);
    console.log(`   GET  /api/fishtank/discussions - Recent discussions`);
    console.log(`   POST /api/fishtank/discussions/trigger - Trigger discussion`);
    console.log(`   GET  /api/momentum/rotation/:userId - Get weekly rotation plan`);
    
    // Start scheduler (if configured)
    if (process.env.ENABLE_SCHEDULER === 'true') {
      try {
        const scheduler = createScheduler();
        scheduler.start();
        console.log('\n📅 Scheduler started');
      } catch (error: any) {
        console.log(`\n⚠️  Scheduler not started: ${error.message}`);
      }
    }
    
    // Start collaborative daemon (agent discussions)
    if (process.env.ENABLE_DISCUSSIONS !== 'false') {
      console.log('\n🧠 Starting Collaborative Daemon...');
      collaborativeDaemon.start().catch(console.error);
    }
    
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

start();
