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
import * as fs from 'fs';
import {
  loadUserPreferences,
  generatePreferencesContext,
  getPositionSizeGuidance,
  isSymbolExcluded,
  UserPreferences,
} from './user-preferences-context';
import { getMarketContextForAgents } from './data/market-data';
import { getFullResearchContext } from './data/research-engine';
import { notifyTradeExecution, notifyTradeSignal } from '../notifications/trade-notifier';
import { collaborativeDaemon } from './collaborative-daemon';
import { 
  checkTradeApproval, 
  createApproval, 
  TradeData as ApprovalTradeData 
} from '../approvals';
import OpenAI from 'openai';
import { getQuote } from '../polygon-data';
import { getTopTradeIdeas, TechnicalSignal } from './data/technical-signals';
import { 
  PROFILE_TRADING_RULES, 
  isTradeAllowed, 
  classifyOptionByDTE,
  getTradingRulesContext,
  type RiskProfile 
} from './profile-trading-rules';
import {
  logUserTrade,
  updateUserPreferences as updateUniversePreferences,
} from './user-universe-db';

/**
 * Get cached research from 8 AM cron, fallback to fresh if not available
 */
async function getCachedOrFreshResearch(
  userId: string,
  userSectors: string[],
  positionSymbols: string[],
  allowedSymbols: string[],
  options?: { riskProfile?: string; exclusions?: string[] }
): Promise<string> {
  try {
    // Check for today's cached research
    const todayEt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const cached = await query(`
      SELECT content FROM agent_memories 
      WHERE user_id = $1 
        AND agent_name = 'RESEARCH' 
        AND memory_type = 'insight'
        AND (created_at AT TIME ZONE 'US/Eastern')::date = $2::date
      ORDER BY created_at DESC 
      LIMIT 1
    `, [userId, todayEt]);

    if (cached.rows.length > 0 && cached.rows[0].content) {
      console.log(`[AutoTrade] Using cached research for user ${userId}`);
      const content = cached.rows[0].content;
      if (typeof content === 'string') return content;
      if (content && typeof content === 'object') {
        return String((content as any).text || JSON.stringify(content));
      }
    }
  } catch (error) {
    console.warn('[AutoTrade] Failed to fetch cached research:', error);
  }

  // Fallback to fresh research
  console.log(`[AutoTrade] No cached research, running fresh for user ${userId}`);
  const fresh = await getFullResearchContext(userSectors, positionSymbols, allowedSymbols, {
    riskProfile: options?.riskProfile,
    exclusions: options?.exclusions,
    userTag: userId.slice(0, 8),
  });

  // Persist fallback so repeated cron cycles don't regenerate expensive research.
  try {
    const todayEt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    await query(`
      DELETE FROM agent_memories
      WHERE user_id = $1
        AND agent_name = 'RESEARCH'
        AND memory_type = 'insight'
        AND (created_at AT TIME ZONE 'US/Eastern')::date = $2::date
    `, [userId, todayEt]);

    await query(`
      INSERT INTO agent_memories (agent_name, user_id, memory_type, content, created_at)
      VALUES ('RESEARCH', $1, 'insight', $2::jsonb, NOW())
    `, [userId, JSON.stringify({ text: fresh, date: todayEt })]);
  } catch (persistErr) {
    console.warn('[AutoTrade] Failed to persist fallback research cache:', persistErr);
  }

  return fresh;
}

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

interface QuantityDecision {
  quantity: number;
  skippedReason?: string;
  sizingNote?: string;
}

const SECTOR_SYMBOLS: Record<string, string[]> = {
  Technology: ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMD', 'INTC', 'SOFI', 'PLTR'],
  Healthcare: ['UNH', 'JNJ', 'LLY', 'ABBV', 'MRK', 'PFE', 'BMY'],
  Financials: ['JPM', 'BAC', 'GS', 'MS', 'WFC', 'C', 'SCHW', 'SOFI'],
  Energy: ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'HAL', 'XLE'],
  Consumer: ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX', 'F'],
  Utilities: ['NEE', 'DUK', 'SO', 'AEP', 'EXC', 'XLU', 'PPL'],
  Communications: ['GOOGL', 'META', 'NFLX', 'DIS', 'T', 'VZ', 'PARA'],
  Industrials: ['CAT', 'GE', 'DE', 'BA', 'HON', 'XLI'],
  'Real Estate': ['PLD', 'AMT', 'EQIX', 'PSA', 'SPG', 'O'],
  Materials: ['LIN', 'APD', 'SHW', 'ECL', 'NEM', 'FCX', 'XLB'],
};

const EXCLUSION_SYMBOLS: Record<string, string[]> = {
  Tobacco: ['MO', 'PM', 'BTI', 'IMBBY'],
  Weapons: ['LMT', 'RTX', 'NOC', 'GD', 'BA'],
  Gambling: ['MGM', 'WYNN', 'LVS', 'CZR', 'DKNG', 'PENN'],
  'Fossil fuels': ['XOM', 'CVX', 'COP', 'OXY', 'SLB', 'HAL'],
  'Private prisons': ['GEO', 'CXW'],
};

const MICRO_ACCOUNT_THRESHOLD = 500;
const SMALL_ACCOUNT_THRESHOLD = 2000;
const MICRO_ACCOUNT_MIN_NOTIONAL = 25;
const SMALL_ACCOUNT_MIN_NOTIONAL = 40;
const MIN_EXECUTABLE_NOTIONAL = 5;
const MIN_AUTO_EXECUTION_PORTFOLIO_VALUE = 1000;

function normalizeSymbols(symbols: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const symbol of symbols) {
    const normalized = String(symbol || '').trim().toUpperCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function defaultSectorsForRisk(riskProfile: string): string[] {
  switch ((riskProfile || '').toLowerCase()) {
    case 'conservative':
      return ['Healthcare', 'Utilities', 'Financials'];
    case 'aggressive':
      return ['Technology', 'Communications', 'Consumer'];
    case 'ultra_aggressive':
      return ['Technology', 'Consumer', 'Energy', 'Communications'];
    default:
      return ['Technology', 'Healthcare', 'Financials'];
  }
}

function deriveAllowedSymbolsFromPreferences(prefs: UserPreferences): string[] {
  const sectors = (prefs.sectorInterests || []).length > 0
    ? prefs.sectorInterests
    : defaultSectorsForRisk(prefs.riskProfile);

  const blocked = new Set<string>();
  for (const exclusion of prefs.exclusions || []) {
    for (const symbol of EXCLUSION_SYMBOLS[exclusion] || []) {
      blocked.add(symbol.toUpperCase());
    }
  }

  const sectorSymbols = sectors.flatMap((sector) => SECTOR_SYMBOLS[sector] || []);
  const requested = normalizeSymbols(prefs.allowedSymbols || []);
  const merged = normalizeSymbols([...requested, ...sectorSymbols]).filter((symbol) => !blocked.has(symbol));

  const cap =
    prefs.riskProfile === 'conservative' ? 4 :
    prefs.riskProfile === 'ultra_aggressive' ? 10 :
    prefs.riskProfile === 'aggressive' ? 8 : 6;

  if (merged.length === 0) {
    return ['SPLG', 'QQQM', 'SOFI', 'F'].slice(0, cap);
  }
  return merged.slice(0, cap);
}

function supportsFractionalShares(broker: string, isOption: boolean): boolean {
  if (isOption) return false;
  const name = String(broker || '').toLowerCase();
  if (!name) return false;
  if (name.includes('tradier')) return false;
  // Fractionals are explicitly enabled only for known-capable broker APIs.
  if (
    name.includes('alpaca') ||
    name.includes('robinhood') ||
    name.includes('webull') ||
    name.includes('public')
  ) {
    return true;
  }
  return false;
}

function roundFractional(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function findPortfolioPositionQty(portfolio: any, symbol: string): number {
  const match = (portfolio?.positions || []).find(
    (p: any) => String(p?.symbol || '').toUpperCase() === symbol.toUpperCase(),
  );
  return Number(match?.qty || 0);
}

function mapRiskProfileToUniverseTolerance(
  riskProfile: string
): 'conservative' | 'moderate' | 'aggressive' {
  const normalized = String(riskProfile || '').toLowerCase();
  if (normalized === 'conservative') return 'conservative';
  if (normalized === 'aggressive' || normalized === 'ultra_aggressive') return 'aggressive';
  return 'moderate';
}

async function syncUniversePreferenceMirror(userId: string, prefs: UserPreferences): Promise<void> {
  try {
    await updateUniversePreferences(userId, {
      riskTolerance: mapRiskProfileToUniverseTolerance(prefs.riskProfile),
      sectors: prefs.sectorInterests || [],
      tradingStyle: (prefs.tradingGoals && prefs.tradingGoals[0]) || prefs.riskProfile || 'balanced',
    });
  } catch (error) {
    console.warn(`[AutoTrade] Failed to sync universe preference mirror for ${userId}:`, error);
  }
}

function getRiskAdjustedSmallAccountPct(
  riskProfile: string,
  accountValue: number
): number {
  const normalizedRisk = String(riskProfile || '').toLowerCase();
  if (accountValue <= MICRO_ACCOUNT_THRESHOLD) {
    if (normalizedRisk === 'conservative') return 0.30;
    if (normalizedRisk === 'aggressive') return 0.55;
    if (normalizedRisk === 'ultra_aggressive') return 0.65;
    return 0.45; // moderate
  }

  if (accountValue <= SMALL_ACCOUNT_THRESHOLD) {
    if (normalizedRisk === 'conservative') return 0.20;
    if (normalizedRisk === 'aggressive') return 0.35;
    if (normalizedRisk === 'ultra_aggressive') return 0.45;
    return 0.28; // moderate
  }

  return 0;
}

function getRiskAdjustedSmallAccountFloor(
  riskProfile: string,
  accountValue: number
): number {
  const normalizedRisk = String(riskProfile || '').toLowerCase();
  if (accountValue <= MICRO_ACCOUNT_THRESHOLD) {
    if (normalizedRisk === 'conservative') return MICRO_ACCOUNT_MIN_NOTIONAL;
    if (normalizedRisk === 'aggressive') return 45;
    if (normalizedRisk === 'ultra_aggressive') return 55;
    return 35; // moderate
  }
  if (accountValue <= SMALL_ACCOUNT_THRESHOLD) {
    if (normalizedRisk === 'conservative') return SMALL_ACCOUNT_MIN_NOTIONAL;
    if (normalizedRisk === 'aggressive') return 65;
    if (normalizedRisk === 'ultra_aggressive') return 85;
    return 50; // moderate
  }
  return MIN_EXECUTABLE_NOTIONAL;
}

function computePositionCapDollars(
  accountValue: number,
  cash: number,
  baseMaxPositionDollars: number,
  riskProfile: string
): number {
  let cap = Number(baseMaxPositionDollars || 0);
  if (accountValue > 0 && accountValue <= SMALL_ACCOUNT_THRESHOLD) {
    const pctCap = cash * getRiskAdjustedSmallAccountPct(riskProfile, accountValue);
    const floorCap = getRiskAdjustedSmallAccountFloor(riskProfile, accountValue);
    const boost = accountValue <= MICRO_ACCOUNT_THRESHOLD ? 1.25 : 1.15;
    cap = Math.max(cap * boost, pctCap, floorCap);
  }

  // Keep some cash reserve to avoid all-in behavior.
  return Math.min(cap, Math.max(0, cash * 0.9));
}

async function normalizeTradeQuantity(
  trade: TradeRecommendation,
  portfolio: any,
  prefs: UserPreferences
): Promise<QuantityDecision> {
  const symbol = String(trade.symbol || '').toUpperCase();
  if (!symbol) {
    return { quantity: 0, skippedReason: 'Missing symbol' };
  }

  const accountValue = Number(portfolio?.account?.portfolioValue || 0);
  const cash = Number(portfolio?.account?.cash || 0);
  const brokerName = String(portfolio?.broker || '');
  const fractionalEnabled = supportsFractionalShares(brokerName, !!trade.isOption);
  const sizing = getPositionSizeGuidance(prefs, accountValue);

  const maxPositionDollars = computePositionCapDollars(
    accountValue,
    cash,
    Number(sizing.maxPositionDollars || 0),
    prefs.riskProfile
  );
  if (trade.action === 'buy' && maxPositionDollars < MIN_EXECUTABLE_NOTIONAL) {
    return {
      quantity: 0,
      skippedReason: `Buying power too small after limits ($${maxPositionDollars.toFixed(2)})`,
    };
  }

  if (trade.isOption && accountValue > 0 && accountValue < SMALL_ACCOUNT_THRESHOLD) {
    return {
      quantity: 0,
      skippedReason: 'Options disabled for accounts under $2k to avoid over-concentration',
    };
  }

  let price = 0;
  const portfolioMatch = (portfolio?.positions || []).find(
    (p: any) => String(p?.symbol || '').toUpperCase() === symbol,
  );
  if (portfolioMatch && Number(portfolioMatch.currentPrice) > 0) {
    price = Number(portfolioMatch.currentPrice);
  } else {
    const quote = await getQuote(symbol).catch(() => null);
    price = Number(quote?.price || 0);
  }

  if (price <= 0) {
    return { quantity: 0, skippedReason: `No valid quote available for ${symbol}` };
  }

  const requestedQty = Number(trade.quantity || 0);
  const maxAffordableQty = maxPositionDollars > 0 ? (maxPositionDollars / price) : 0;

  if (trade.action === 'sell') {
    const heldQty = findPortfolioPositionQty(portfolio, symbol);
    if (heldQty <= 0) {
      return { quantity: 0, skippedReason: `No open ${symbol} position to sell` };
    }
    const targetQty = requestedQty > 0 ? Math.min(requestedQty, heldQty) : heldQty;
    const sellQty = fractionalEnabled ? roundFractional(targetQty) : Math.floor(targetQty);
    if (sellQty <= 0) {
      return { quantity: 0, skippedReason: `Sell size rounded to zero for ${symbol}` };
    }
    return { quantity: sellQty };
  }

  const targetQty = requestedQty > 0 ? Math.min(requestedQty, maxAffordableQty) : maxAffordableQty;
  const qty = fractionalEnabled ? roundFractional(targetQty) : Math.floor(targetQty);
  if (qty <= 0) {
    return {
      quantity: 0,
      skippedReason: fractionalEnabled
        ? `Insufficient buying power for fractional ${symbol}`
        : `Insufficient buying power for 1 share of ${symbol} at $${price.toFixed(2)}`,
    };
  }

  return {
    quantity: qty,
    sizingNote: `position cap $${maxPositionDollars.toFixed(0)} (${fractionalEnabled ? 'fractional enabled' : 'whole shares only'})`,
  };
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
        OR EXISTS (
          SELECT 1
          FROM broker_credentials bc
          WHERE bc.user_id = u.id
            AND bc.is_active = true
            AND bc.encrypted_api_key IS NOT NULL
        )
        OR EXISTS (
          SELECT 1
          FROM brokerage_connections bcx
          WHERE bcx.user_id = u.id
            AND bcx.credentials_encrypted IS NOT NULL
        )
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
  prefs: UserPreferences
): Promise<TradeRecommendation[]> {
  const client = getDeepSeekClient();
  
  // Build context
  const marketContext = await getMarketContextForAgents();
  const prefsContext = generatePreferencesContext(prefs);
  const positions = (portfolio.positions || []).map((p: any) =>
    `${p.symbol}: ${p.qty} shares @ $${Number(p.currentPrice || 0).toFixed(2)} (${Number(p.unrealizedPnlPct || 0) >= 0 ? '+' : ''}${Number(p.unrealizedPnlPct || 0).toFixed(1)}%)`
  ).join('\n');
  
  // Use cached research from 8 AM cron, fallback to fresh if needed
  const researchContext = await getCachedOrFreshResearch(
    userId,
    prefs.sectorInterests || ['Technology'],
    (portfolio.positions || []).map((p: any) => p.symbol),
    prefs.allowedSymbols || [],
    {
      riskProfile: prefs.riskProfile,
      exclusions: prefs.exclusions || [],
    }
  );
  
  const sizing = getPositionSizeGuidance(prefs, portfolio.account.portfolioValue);
  const accountValue = Number(portfolio?.account?.portfolioValue || 0);
  const cash = Number(portfolio?.account?.cash || 0);
  const fractionalEnabled = supportsFractionalShares(String(portfolio?.broker || ''), false);
  const adjustedPositionCap = computePositionCapDollars(
    accountValue,
    cash,
    Number(sizing.maxPositionDollars || 0),
    prefs.riskProfile
  );
  const maxWholeSharePrice = Math.max(1, Math.floor(adjustedPositionCap));
  const smallAccountConstraint = !fractionalEnabled && accountValue > 0 && accountValue <= SMALL_ACCOUNT_THRESHOLD
    ? `\nSMALL ACCOUNT MODE:
- This broker uses WHOLE SHARES only
- Favor symbols with current price <= $${maxWholeSharePrice}
- Avoid recommending symbols that cannot buy at least 1 share within cap`
    : '';
  
  // Build allowed symbols constraint for prompt
  const allowedSymbols = normalizeSymbols(prefs.allowedSymbols || []);
  const symbolConstraint = allowedSymbols.length > 0 
    ? `\nALLOWED SYMBOLS (ONLY recommend from this list): ${allowedSymbols.join(', ')}`
    : '';

  // Get technical signals for allowed symbols (or default watchlist)
  const symbolsToScan = allowedSymbols.length > 0 
    ? allowedSymbols.slice(0, 20) // Limit to 20 symbols
    : ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN', 'TSLA', 'AMD'];
  
  let technicalContext = '';
  try {
    const technicalSignals = await getTopTradeIdeas(symbolsToScan, 'buy', 5);
    if (technicalSignals.length > 0) {
      technicalContext = `\nTECHNICAL SIGNALS (Price Action Analysis):
${technicalSignals.map(s => 
  `${s.symbol}: ${s.signal.toUpperCase()} (${s.strength}% confidence)
   Patterns: ${s.patterns.join(', ')}
   Reasons: ${s.reasons.join('; ')}
   ${s.entry ? `Entry: $${s.entry.toFixed(2)} | Stop: $${s.stop?.toFixed(2)} | Target: $${s.target?.toFixed(2)}` : ''}`
).join('\n\n')}

PRIORITIZE these technical setups when generating recommendations.`;
    }
  } catch (techErr: any) {
    console.warn('[AutoTrading] Technical signals error:', techErr.message);
  }

  const prompt = `You are a trading AI analyzing a portfolio. Based on the data below, generate specific trade recommendations.

${marketContext}

${researchContext}
${technicalContext}

USER PREFERENCES:
${prefsContext}${symbolConstraint}

${getTradingRulesContext((prefs.riskProfile || 'moderate') as RiskProfile)}

CURRENT PORTFOLIO:
Cash: $${portfolio.account.cash.toLocaleString()}
Portfolio Value: $${portfolio.account.portfolioValue.toLocaleString()}
Positions:
${positions || 'None'}

POSITION SIZING RULES:
- Max position: ${sizing.maxPositionPct}% ($${sizing.maxPositionDollars.toFixed(0)})
- Stop loss at: -${sizing.stopLossPct}%
${smallAccountConstraint}

Respond with a JSON array of trade recommendations. Each should have:
- symbol: string
- action: "buy" | "sell"
- quantity: number (supports fractional shares for brokers that allow it)
- reason: string (1 sentence)
- confidence: number (0-100)
- isOption: boolean (true if LEAP/option, false if shares)
- optionDetails: { expiry: string, strike: number, type: "call" | "put" } (only if isOption)
- optionSymbol: string (broker option symbol to execute, REQUIRED if isOption=true)

SHARES vs LEAPS DECISION:
- Use SHARES for: core holdings, dividend stocks, lower conviction, conservative profiles
- Use LEAPS for: high conviction (85%+), growth plays, aggressive profiles, leveraged exposure
- LEAPS = 6 months to 2 years expiry, 0.60-0.80 delta, calls for bullish
- ULTRA-AGGRESSIVE: intraday "day trader" mode is allowed, BUT still prefer LEAPS unless a specific intraday setup is identified
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
    // Execute through unified broker service.
    // This path supports SnapTrade-first users and legacy brokers.
    const result = await brokerService.executeUserTrade(userId, {
      symbol: trade.symbol,
      side: trade.action,
      qty: trade.quantity,
      type: 'market',
      ...(trade.isOption && {
        isOption: true,
        optionSymbol: (trade as any).optionSymbol || (trade as any).option_symbol,
      }),
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
      
      // Persist to the live trade log schema used by digests and broker dashboards.
      await query(`
        INSERT INTO trade_logs (
          user_id,
          broker,
          symbol,
          side,
          quantity,
          order_type,
          status,
          order_id,
          filled_price,
          filled_quantity,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      `, [
        userId,
        trade.isOption ? 'snaptrade_options' : 'auto_trading',
        trade.symbol,
        trade.action,
        trade.quantity,
        'market',
        'filled',
        result.orderId || null,
        result.avgPrice || null,
        trade.quantity,
      ]);

      // Mirror execution into per-user universe memory/trade history.
      await logUserTrade(userId, {
        symbol: trade.symbol,
        direction: trade.action === 'buy' ? 'long' : 'short',
        entry: Number(result.avgPrice || 0),
        outcome: 'pending',
        pnl: 0,
      });
      
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
          if (!user.auto_execute_enabled) {
            console.log(`[AutoTrading] ${user.email}: no portfolio data, skipping recommendation-only cycle`);
            continue;
          }
          results.errors.push(`${user.email}: No portfolio data`);
          continue;
        }
        const portfolioValue = Number(portfolio?.account?.portfolioValue || 0);
        const meetsExecutionMinimum = portfolioValue >= MIN_AUTO_EXECUTION_PORTFOLIO_VALUE;

        // Load preferences
        const prefs = await loadUserPreferences(user.id);
        if (!prefs) {
          results.errors.push(`${user.email}: No preferences`);
          continue;
        }

        // Universe is derived from user preferences (risk + sectors + exclusions).
        prefs.sectorInterests = (prefs.sectorInterests || []).length > 0
          ? prefs.sectorInterests
          : defaultSectorsForRisk(prefs.riskProfile);
        prefs.allowedSymbols = deriveAllowedSymbolsFromPreferences(prefs);
        await syncUniversePreferenceMirror(user.id, prefs);

        // Generate recommendations
        let recommendations = await generateRecommendations(user.id, portfolio, prefs);
        console.log(`[AutoTrading] ${user.email}: ${recommendations.length} raw recommendations`);

        // Filter by allowed symbols (if user has set any)
        const allowedSymbols = (prefs.allowedSymbols || []).map((s: string) => s.toUpperCase());
        if (allowedSymbols.length > 0) {
          recommendations = recommendations.filter(r => 
            allowedSymbols.includes(r.symbol.toUpperCase())
          );
          console.log(`[AutoTrading] ${user.email}: ${recommendations.length} after allowed_symbols filter`);
        }
        
        // Hard exclusion gate (non-negotiable), independent of model prompt fidelity.
        recommendations = recommendations.filter((r) => !isSymbolExcluded(r.symbol, prefs));
        console.log(`[AutoTrading] ${user.email}: ${recommendations.length} after exclusions filter`);

        // PROFILE TRADING RULES GATE
        // Filter out trades that don't match the user's risk profile rules
        const riskProfile = (prefs.riskProfile || 'moderate') as RiskProfile;
        const profileRules = PROFILE_TRADING_RULES[riskProfile];
        
        recommendations = recommendations.filter((r) => {
          // Determine trade type
          let tradeType: 'shares' | 'swing_option' | 'leap' | 'day_trade' = 'shares';
          
          if (r.isOption) {
            // Extract DTE from option symbol if possible
            const dteMatch = r.optionSymbol?.match(/(\d{6})[CP]/);
            let dte = 30; // Default assumption
            
            if (dteMatch) {
              const dateStr = dteMatch[1];
              const year = 2000 + parseInt(dateStr.slice(0, 2));
              const month = parseInt(dateStr.slice(2, 4)) - 1;
              const day = parseInt(dateStr.slice(4, 6));
              const expiry = new Date(year, month, day);
              dte = Math.floor((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            }
            
            tradeType = classifyOptionByDTE(dte);
            
            // Check DTE limits
            if (dte < profileRules.minDTE) {
              console.log(`[AutoTrading] Blocking ${r.symbol} for ${user.email}: DTE ${dte} below minimum ${profileRules.minDTE} for ${riskProfile}`);
              return false;
            }
          }
          
          // Check if trade type is allowed
          const typeCheck = isTradeAllowed(riskProfile, tradeType);
          if (!typeCheck.allowed) {
            console.log(`[AutoTrading] Blocking ${r.symbol} for ${user.email}: ${typeCheck.reason}`);
            return false;
          }
          
          // Check if shorting is allowed (for sell/short signals)
          if (r.action === 'sell' && !r.isOption) {
            const shortCheck = isTradeAllowed(riskProfile, 'short');
            if (!shortCheck.allowed) {
              console.log(`[AutoTrading] Blocking short ${r.symbol} for ${user.email}: ${shortCheck.reason}`);
              return false;
            }
          }
          
          return true;
        });
        console.log(`[AutoTrading] ${user.email}: ${recommendations.length} after profile rules filter (${riskProfile})`);

        // Skip if no recommendations
        if (recommendations.length === 0) {
          continue;
        }

        // AGENTS DISCUSS THE TRADE FIRST
        // This streams to the office so user can see the discussion
        for (const trade of recommendations) {
          const quantityDecision = await normalizeTradeQuantity(trade, portfolio, prefs);
          if (quantityDecision.skippedReason) {
            console.log(`[AutoTrading] Skipping ${trade.symbol} for ${user.email}: ${quantityDecision.skippedReason}`);
            continue;
          }
          trade.quantity = quantityDecision.quantity;
          if (quantityDecision.sizingNote) {
            trade.reason = `${trade.reason} | ${quantityDecision.sizingNote}`;
          }

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
            user.risk_profile || 'moderate',
            user.id
          );
          
          // collaborative-daemon returns a Discussion thread (messages + optional outcome),
          // not explicit boolean consensus fields.
          const discussionText = [
            discussionResult?.outcome || '',
            ...(discussionResult?.messages || []).map((m: any) => m?.content || ''),
          ]
            .join(' ')
            .toLowerCase();
          const positiveSignals = (discussionText.match(/\b(approve|approved|buy|bullish|take trade|greenlight)\b/g) || []).length;
          const negativeSignals = (discussionText.match(/\b(reject|rejected|avoid|skip|no trade|pass)\b/g) || []).length;
          const agentsApproved = positiveSignals > negativeSignals || trade.confidence >= 80; // High confidence = auto-approve
          
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
            if (!meetsExecutionMinimum) {
              console.log(
                `[AutoTrading] ${user.email} below auto-execution minimum ($${portfolioValue.toFixed(2)} < $${MIN_AUTO_EXECUTION_PORTFOLIO_VALUE})`
              );
              await notifyTradeSignal(
                user.id,
                trade.symbol,
                trade.action,
                `Auto-execution paused: account value $${portfolioValue.toFixed(2)} is below $${MIN_AUTO_EXECUTION_PORTFOLIO_VALUE.toLocaleString()} minimum. Recommendation only: ${trade.reason}`
              );
              continue;
            }
            // Check if trade requires approval
            const approvalTradeData: ApprovalTradeData = {
              symbol: trade.symbol,
              action: trade.action,
              quantity: trade.quantity,
              isOption: trade.isOption || false,
              optionSymbol: trade.optionSymbol,
              estimatedPrice: trade.price,
              estimatedTotal: trade.price ? trade.price * trade.quantity : undefined,
              confidence: trade.confidence,
              reason: trade.reason,
              direction: trade.action === 'buy' ? 'long' : 'short',
              dte: trade.dte,
              portfolioPercentage: trade.price && portfolioValue 
                ? ((trade.price * trade.quantity) / portfolioValue) * 100 
                : undefined,
            };
            
            const approvalCheck = await checkTradeApproval(user.id, approvalTradeData);
            
            if (approvalCheck.requiresApproval) {
              // Trade requires approval - add to queue instead of executing
              console.log(`[AutoTrading] Trade requires approval for ${user.email}: ${approvalCheck.reasons.join(', ')}`);
              await createApproval(user.id, approvalTradeData, approvalCheck.reasons);
              console.log(`[AutoTrading] Added ${trade.symbol} to approval queue for ${user.email}`);
              continue;
            }
            
            // No approval needed - execute immediately
            const success = await executeTrade(user.id, trade);
            if (success) {
              results.tradesExecuted++;
              console.log(`[AutoTrading] Executed: ${trade.action} ${trade.quantity} ${trade.symbol} for ${user.email}`);
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
        console.error(`[AutoTrading] Error for ${user.email}:`, userError);
        results.errors.push(`${user.email}: ${userError.message} | Stack: ${userError.stack?.split('\n').slice(0,3).join(' <- ')}`);
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
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const day = now.getUTCDay();
  
  // Skip weekends
  if (day === 0 || day === 6) return false;
  
  // Market hours: 9:30 AM - 4:00 PM ET = 13:30 - 20:00 UTC (during ET DST).
  const marketOpenUtcMinutes = 13 * 60 + 30;
  const marketCloseUtcMinutes = 20 * 60;
  return utcMinutes >= marketOpenUtcMinutes && utcMinutes < marketCloseUtcMinutes;
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
