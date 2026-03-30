/**
 * AUTO-TRADING DAEMON
 * 
 * Runs periodically during market hours:
 * 1. Fetches user portfolios
 * 2. Runs agent DISCUSSION (agents talk about the trade first)
 * 3. Generates trade recommendations
 * 4. Executes trades (if user has auto-execute enabled AND agents agree)
 * 5. Sends notifications
 * 
 * Only runs for users with:
 * - Broker connected
 * - auto_execute_enabled = true
 * - Tier that allows execution (scout+)
 */

import { query } from '../db';
import * as brokerService from '../services/broker-service';
import { loadUserPreferences, generatePreferencesContext, getPositionSizeGuidance } from './user-preferences-context';
import { getMarketContextForAgents } from './data/market-data';
import { getFullResearchContext } from './data/research-engine';
import { notifyTradeExecution, notifyTradeSignal } from '../notifications/trade-notifier';
import { collaborativeDaemon } from './collaborative-daemon';
import OpenAI from 'openai';
import * as fs from 'fs';

const TIER_CAN_EXECUTE: Record<string, boolean> = {
  free: false,
  recovery: false,  // $29 - alerts only
  scout: false,     // $49 - signals only, no auto-execute
  operator: true,   // $99 - full auto, stocks + options
};

const TIER_OPTIONS_ALLOWED: Record<string, boolean> = {
  recovery: false,
  scout: false,
  operator: true,   // Only Operator gets options
};

interface TradeRecommendation {
  symbol: string;
  action: 'buy' | 'sell';
  quantity: number;
  reason: string;
  confidence: number;
  isOption?: boolean;
}

interface User {
  id: string;
  email: string;
  tier: string;
  auto_execute_enabled: boolean;
  risk_profile: string;
}

function getDeepSeekClient(): OpenAI {
  let apiKey = '';
  try {
    const creds = JSON.parse(fs.readFileSync('/Users/atlasbuilds/clawd/credentials.json', 'utf-8'));
    apiKey = creds.deepseek?.api_key || process.env.DEEPSEEK_API_KEY || '';
  } catch {
    apiKey = process.env.DEEPSEEK_API_KEY || '';
  }
  return new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com' });
}

/**
 * Get users eligible for auto-trading
 * Supports both SnapTrade and legacy broker_credentials
 * 
 * CHANGED: Returns ALL operator users with brokers (not just auto_execute = true)
 * The daemon will:
 * - Always run agent discussions + show recommendations
 * - Only EXECUTE if auto_execute_enabled = true
 */
async function getEligibleUsers(): Promise<User[]> {
  const result = await query(`
    SELECT u.id, u.email, u.tier, u.auto_execute_enabled, u.risk_profile
    FROM users u
    WHERE u.tier = 'operator'
      AND (
        u.snaptrade_user_id IS NOT NULL 
        OR EXISTS (SELECT 1 FROM broker_credentials bc WHERE bc.user_id = u.id AND bc.credentials_encrypted IS NOT NULL)
      )
  `);
  
  return result.rows;
}

/**
 * Generate trade recommendations for a user
 */
async function generateRecommendations(
  userId: string,
  portfolio: any,
  prefs: any
): Promise<TradeRecommendation[]> {
  const client = getDeepSeekClient();
  
  // Build context
  const marketContext = await getMarketContextForAgents();
  const prefsContext = generatePreferencesContext(prefs);
  const positions = portfolio.positions.map((p: any) => 
    `${p.symbol}: ${p.qty} shares @ $${p.currentPrice.toFixed(2)} (${p.unrealizedPnlPct >= 0 ? '+' : ''}${p.unrealizedPnlPct.toFixed(1)}%)`
  ).join('\n');
  
  const researchContext = await getFullResearchContext(
    prefs.sectorInterests || ['Technology'],
    portfolio.positions.map((p: any) => p.symbol),
    prefs.allowedSymbols || []
  );
  
  const sizing = getPositionSizeGuidance(prefs, portfolio.account.portfolioValue);
  
  // Build allowed symbols constraint for prompt
  const allowedSymbols = prefs.allowedSymbols || [];
  const symbolConstraint = allowedSymbols.length > 0 
    ? `\nALLOWED SYMBOLS (ONLY recommend from this list): ${allowedSymbols.join(', ')}`
    : '';

  const prompt = `You are a trading AI analyzing a portfolio. Based on the data below, generate specific trade recommendations.

${marketContext}

${researchContext}

USER PREFERENCES:
${prefsContext}${symbolConstraint}

CURRENT PORTFOLIO:
Cash: $${portfolio.account.cash.toLocaleString()}
Portfolio Value: $${portfolio.account.portfolioValue.toLocaleString()}
Positions:
${positions}

POSITION SIZING RULES:
- Max position: ${sizing.maxPositionPct}% ($${sizing.maxPositionDollars.toFixed(0)})
- Stop loss at: -${sizing.stopLossPct}%

Respond with a JSON array of trade recommendations. Each should have:
- symbol: string
- action: "buy" | "sell"
- quantity: number (whole shares OR contracts if option)
- reason: string (1 sentence)
- confidence: number (0-100)
- isOption: boolean (true if LEAP/option, false if shares)
- optionDetails: { expiry: string, strike: number, type: "call" | "put" } (only if isOption)

SHARES vs LEAPS DECISION:
- Use SHARES for: core holdings, dividend stocks, lower conviction, conservative profiles
- Use LEAPS for: high conviction (85%+), growth plays, aggressive profiles, leveraged exposure
- LEAPS = 6 months to 2 years expiry, 0.60-0.80 delta, calls for bullish
- If using LEAPS, allocate LESS capital (options are leveraged)

Rules:
- Only recommend trades with confidence > 70${allowedSymbols.length > 0 ? '\n- ONLY recommend symbols from the ALLOWED SYMBOLS list above' : ''}
- Respect the user's exclusions (no excluded sectors)
- Match the user's risk profile
- Don't over-concentrate (max ${sizing.maxPositionPct}% per position)
- Consider existing positions before adding
- LEAPS only for Operator tier and above

If no trades needed, return empty array [].

Respond ONLY with valid JSON array, no other text.`;

  try {
    const response = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || '[]';
    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    
    const recommendations = JSON.parse(jsonMatch[0]);
    return recommendations.filter((r: any) => r.confidence > 70);
  } catch (error) {
    console.error('[AutoTrading] Failed to generate recommendations:', error);
    return [];
  }
}

/**
 * Execute a trade for a user
 */
async function executeTrade(
  userId: string,
  trade: TradeRecommendation
): Promise<boolean> {
  try {
    // Get user's broker connection
    const connection = await brokerService.getBrokerConnection(userId);
    if (!connection) {
      console.error('[AutoTrading] No broker connection for user:', userId);
      return false;
    }

    // Execute based on broker type
    // For now, we'll use the unified broker service
    const result = await brokerService.executeUserTrade(userId, {
      symbol: trade.symbol,
      side: trade.action,
      qty: trade.quantity,
      type: 'market',
    });

    if (result.success) {
      // Send notification
      await notifyTradeExecution({
        userId,
        symbol: trade.symbol,
        action: trade.action,
        quantity: trade.quantity,
        price: result.avgPrice || 0,
        reason: trade.reason,
      });
      
      // Log to database
      await query(`
        INSERT INTO trade_logs (user_id, symbol, action, quantity, price, reason, executed_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [userId, trade.symbol, trade.action, trade.quantity, result.avgPrice, trade.reason]);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[AutoTrading] Trade execution failed:', error);
    return false;
  }
}

/**
 * Run the auto-trading loop for all eligible users
 */
export async function runAutoTradingCycle(): Promise<{
  usersProcessed: number;
  tradesExecuted: number;
  errors: string[];
}> {
  console.log('[AutoTrading] Starting cycle at', new Date().toISOString());
  
  const results = {
    usersProcessed: 0,
    tradesExecuted: 0,
    errors: [] as string[],
  };

  try {
    const users = await getEligibleUsers();
    console.log(`[AutoTrading] Found ${users.length} eligible users`);

    for (const user of users) {
      try {
        results.usersProcessed++;
        
        // Fetch portfolio
        const portfolio = await brokerService.fetchUserPortfolio(user.id);
        if (!portfolio) {
          results.errors.push(`${user.email}: No portfolio data`);
          continue;
        }

        // Load preferences
        const prefs = await loadUserPreferences(user.id);
        if (!prefs) {
          results.errors.push(`${user.email}: No preferences`);
          continue;
        }

        // Generate recommendations
        let recommendations = await generateRecommendations(user.id, portfolio, prefs);
        console.log(`[AutoTrading] ${user.email}: ${recommendations.length} raw recommendations`);

        // Filter by allowed symbols (if user has set any)
        const allowedSymbols = prefs.allowedSymbols || [];
        if (allowedSymbols.length > 0) {
          recommendations = recommendations.filter(r => 
            allowedSymbols.includes(r.symbol.toUpperCase())
          );
          console.log(`[AutoTrading] ${user.email}: ${recommendations.length} after allowed_symbols filter`);
        }

        // Skip if no recommendations
        if (recommendations.length === 0) {
          continue;
        }

        // AGENTS DISCUSS THE TRADE FIRST
        // This streams to the office so user can see the discussion
        for (const trade of recommendations) {
          // Skip options for scout tier
          if (trade.isOption && !TIER_OPTIONS_ALLOWED[user.tier]) {
            console.log(`[AutoTrading] Skipping option trade for ${user.email} (tier: ${user.tier})`);
            continue;
          }

          // Run agent discussion about this trade
          // Pass risk_profile so ultra_aggressive users get DAY_TRADER and MOMENTUM agents
          const discussionResult = await collaborativeDaemon.discussTradeIdea(
            trade.symbol,
            trade.action === 'buy' ? 'long' : 'short',
            trade.reason,
            user.risk_profile || 'moderate'
          );
          
          // Check if agents reached consensus (all approved)
          const agentsApproved = discussionResult?.consensus === true || 
                                  discussionResult?.approved === true ||
                                  trade.confidence >= 80; // High confidence = auto-approve
          
          if (!agentsApproved) {
            console.log(`[AutoTrading] Agents did NOT approve ${trade.symbol} for ${user.email}`);
            // Notify user that agents discussed but didn't execute
            await notifyTradeSignal(
              user.id,
              trade.symbol,
              trade.action,
              `Agents discussed but did not reach consensus: ${trade.reason}`
            );
            continue;
          }

          // Agents approved - now check if user has auto_execute enabled
          if (user.auto_execute_enabled) {
            // Execute the trade
            const success = await executeTrade(user.id, trade);
            if (success) {
              results.tradesExecuted++;
              console.log(`[AutoTrading] Executed: ${trade.action} ${trade.quantity} ${trade.symbol} for ${user.email}`);
              
              // Notify user via email
              await notifyTradeExecution({
                userId: user.id,
                symbol: trade.symbol,
                action: trade.action,
                quantity: trade.quantity,
                price: 0, // Filled price comes from broker
                reason: trade.reason,
              });
            }
          } else {
            // User has auto_execute OFF - just show recommendation
            console.log(`[AutoTrading] Agents approved ${trade.symbol} but auto_execute disabled for ${user.email} - sending recommendation only`);
            await notifyTradeSignal(
              user.id,
              trade.symbol,
              trade.action,
              `Agents recommend: ${trade.reason} (confidence: ${trade.confidence}%) - Enable auto-execute to trade automatically`
            );
          }
        }

      } catch (userError: any) {
        results.errors.push(`${user.email}: ${userError.message}`);
      }
    }

  } catch (error: any) {
    results.errors.push(`Cycle error: ${error.message}`);
  }

  console.log(`[AutoTrading] Cycle complete:`, results);
  return results;
}

/**
 * Check if market is open (simplified)
 */
function isMarketOpen(): boolean {
  const now = new Date();
  const hour = now.getUTCHours();
  const day = now.getUTCDay();
  
  // Skip weekends
  if (day === 0 || day === 6) return false;
  
  // Market hours: 9:30 AM - 4:00 PM ET = 13:30 - 20:00 UTC
  return hour >= 14 && hour < 20;
}

/**
 * Start the auto-trading daemon
 */
export function startAutoTradingDaemon(intervalMinutes: number = 15): NodeJS.Timeout {
  console.log(`[AutoTrading] Daemon starting, interval: ${intervalMinutes} minutes`);
  
  const runIfMarketOpen = async () => {
    if (isMarketOpen()) {
      await runAutoTradingCycle();
    } else {
      console.log('[AutoTrading] Market closed, skipping cycle');
    }
  };

  // Run immediately if market is open
  runIfMarketOpen();

  // Then run on interval
  return setInterval(runIfMarketOpen, intervalMinutes * 60 * 1000);
}

export default {
  runAutoTradingCycle,
  startAutoTradingDaemon,
  isMarketOpen,
};
