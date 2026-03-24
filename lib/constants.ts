// Cortex Capital - Shared Constants
// Extract magic numbers and configuration values

// ============ TRADING CONSTANTS ============

/** Minimum loss threshold for tax-loss harvesting consideration */
export const TAX_LOSS_THRESHOLD = -500;

/** Maximum number of trades per rebalancing plan */
export const MAX_TRADES_PER_PLAN = 10;

/** Percentage of position to sell for tax-loss harvesting */
export const TAX_LOSS_SELL_RATIO = 0.3;

/** Minimum percentage difference to trigger sector rebalancing */
export const SECTOR_REBALANCE_THRESHOLD = 5;

/** Minimum percentage difference to trigger style rebalancing */
export const STYLE_REBALANCE_THRESHOLD = 10;

/** Maximum cash position percentage during high volatility */
export const HIGH_VOLATILITY_CASH_CAP = 20;

/** Extra cash buffer to add during high volatility */
export const HIGH_VOLATILITY_CASH_BUFFER = 10;

/** Maximum improvement points from rebalancing */
export const MAX_HEALTH_IMPROVEMENT = 25;

// ============ RISK THRESHOLDS ============

/** Default maximum position size as percentage of portfolio */
export const DEFAULT_MAX_POSITION_SIZE = 25;

/** Default maximum sector exposure as percentage */
export const DEFAULT_MAX_SECTOR_EXPOSURE = 40;

/** Concentration warning threshold (single holding %) */
export const CONCENTRATION_WARNING_THRESHOLD = 20;

/** Sector concentration warning threshold */
export const SECTOR_CONCENTRATION_THRESHOLD = 40;

/** Volatility warning threshold */
export const VOLATILITY_WARNING_THRESHOLD = 25;

/** Maximum drawdown warning threshold */
export const DRAWDOWN_WARNING_THRESHOLD = -15;

/** Sharpe ratio bonus threshold */
export const SHARPE_BONUS_THRESHOLD = 1.5;

// ============ EXECUTION CONSTANTS ============

/** Minimum order commission in dollars */
export const MIN_COMMISSION = 1;

/** Commission rate as decimal (0.1%) */
export const COMMISSION_RATE = 0.001;

/** Estimated slippage as decimal (0.05%) */
export const SLIPPAGE_RATE = 0.0005;

/** Buying power safety buffer (leave 10% unused) */
export const BUYING_POWER_BUFFER = 0.9;

/** Long-term capital gains tax rate */
export const LONG_TERM_CAP_GAINS_RATE = 0.15;

/** Maximum tax loss deduction per year */
export const MAX_TAX_LOSS_DEDUCTION = 3000;

// ============ API CONSTANTS ============

/** Default delay between consecutive trades (ms) */
export const DEFAULT_TRADE_DELAY_MS = 1000;

/** Default API timeout (ms) */
export const API_TIMEOUT_MS = 30000;

/** Default retry attempts for API calls */
export const DEFAULT_RETRY_ATTEMPTS = 3;

/** Base delay for exponential backoff (ms) */
export const RETRY_BASE_DELAY_MS = 1000;

/** Maximum retry delay (ms) */
export const RETRY_MAX_DELAY_MS = 10000;

// ============ DATABASE CONSTANTS ============

/** Default limit for list queries */
export const DEFAULT_QUERY_LIMIT = 10;

/** Maximum limit for list queries */
export const MAX_QUERY_LIMIT = 100;

/** Portfolio snapshot history limit */
export const SNAPSHOT_HISTORY_LIMIT = 30;

// ============ VALIDATION CONSTANTS ============

/** Minimum password length */
export const MIN_PASSWORD_LENGTH = 8;

/** Maximum password length */
export const MAX_PASSWORD_LENGTH = 128;

/** Maximum email length */
export const MAX_EMAIL_LENGTH = 255;

/** Bcrypt salt rounds */
export const BCRYPT_SALT_ROUNDS = 12;

// ============ RATE LIMITING ============

/** General API rate limit (requests per minute) */
export const RATE_LIMIT_GENERAL = 100;

/** Trade execution rate limit (requests per minute) */
export const RATE_LIMIT_TRADES = 5;

/** Auth endpoint rate limit (requests per minute) */
export const RATE_LIMIT_AUTH = 10;

// ============ MARKET HOURS (Eastern Time) ============

/** Market open hour (9:30 AM ET = 9) */
export const MARKET_OPEN_HOUR = 9;

/** Market open minute (30) */
export const MARKET_OPEN_MINUTE = 30;

/** Market close hour (4:00 PM ET = 16) */
export const MARKET_CLOSE_HOUR = 16;

/** Market close minute (0) */
export const MARKET_CLOSE_MINUTE = 0;

// ============ ENUMS ============

export const RISK_PROFILES = ['conservative', 'moderate', 'aggressive'] as const;
export type RiskProfile = typeof RISK_PROFILES[number];

export const INVESTMENT_HORIZONS = ['short', 'medium', 'long'] as const;
export type InvestmentHorizon = typeof INVESTMENT_HORIZONS[number];

export const USER_TIERS = ['scout', 'operator', 'partner'] as const;
export type UserTier = typeof USER_TIERS[number];

export const PLAN_STATUSES = ['pending', 'approved', 'rejected', 'executed'] as const;
export type PlanStatus = typeof PLAN_STATUSES[number];

export const TRADE_ACTIONS = ['buy', 'sell'] as const;
export type TradeAction = typeof TRADE_ACTIONS[number];

export const ORDER_TYPES = ['market', 'limit', 'stop'] as const;
export type OrderType = typeof ORDER_TYPES[number];

export const MARKET_VOLATILITY_LEVELS = ['low', 'medium', 'high'] as const;
export type MarketVolatility = typeof MARKET_VOLATILITY_LEVELS[number];

export const ECONOMIC_OUTLOOKS = ['recession', 'neutral', 'expansion'] as const;
export type EconomicOutlook = typeof ECONOMIC_OUTLOOKS[number];

export const INTEREST_RATE_TRENDS = ['falling', 'stable', 'rising'] as const;
export type InterestRateTrend = typeof INTEREST_RATE_TRENDS[number];
