// Cortex Capital - Tradier API Integration
// Read-only portfolio data fetching
//
// PRODUCTION NOTES:
// - All API calls include retry logic for transient failures
// - Rate limiting: Tradier allows 120 requests/minute
// - Token is never logged

import axios, { AxiosInstance, AxiosError } from 'axios';
import dotenv from 'dotenv';
import { withRetry, ExternalAPIError, ConfigurationError } from '../lib/errors';
import { API_TIMEOUT_MS } from '../lib/constants';

dotenv.config();

const TRADIER_BASE_URL = process.env.TRADIER_BASE_URL || 'https://api.tradier.com';
const TRADIER_TOKEN = process.env.TRADIER_TOKEN;

// Validate configuration at startup
if (!TRADIER_TOKEN) {
  // Log specific error server-side
  console.error('[Tradier] Missing TRADIER_TOKEN environment variable');
  // Throw generic error (don't expose variable name in stack traces)
  throw new ConfigurationError('Brokerage API configuration error');
}

// Create axios client with defaults
const tradierClient: AxiosInstance = axios.create({
  baseURL: TRADIER_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Authorization': `Bearer ${TRADIER_TOKEN}`,
    'Accept': 'application/json',
  },
});

// Response interceptor for error handling
tradierClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Log error details (but never the token)
    console.error('[Tradier API Error]', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      // Only include response data in development
      ...(process.env.NODE_ENV !== 'production' && {
        data: error.response?.data,
      }),
    });
    
    // Enhance error message
    if (error.response?.status === 401) {
      throw new ExternalAPIError('Tradier', new Error('Invalid API credentials'));
    }
    if (error.response?.status === 429) {
      throw new ExternalAPIError('Tradier', new Error('Rate limit exceeded'));
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      throw new ExternalAPIError('Tradier', new Error('Service unavailable'));
    }
    
    throw error;
  }
);

export interface TradierProfile {
  id: string;
  name: string;
  account: {
    account_number: string;
    classification: string;
    date_created: string;
    day_trader: boolean;
    option_level: number;
    status: string;
    type: string;
  };
}

export interface TradierPosition {
  cost_basis: number;
  date_acquired: string;
  id: number;
  quantity: number;
  symbol: string;
}

export interface TradierBalances {
  option_short_value: number;
  total_equity: number;
  account_number: string;
  account_type: string;
  close_pl: number;
  current_requirement: number;
  equity: number;
  long_market_value: number;
  market_value: number;
  open_pl: number;
  option_long_value: number;
  option_requirement: number;
  pending_orders_count: number;
  short_market_value: number;
  stock_long_value: number;
  total_cash: number;
  uncleared_funds: number;
  pending_cash: number;
  margin: {
    fed_call: number;
    maintenance_call: number;
    option_buying_power: number;
    stock_buying_power: number;
    stock_short_value: number;
    sweep: number;
  };
}

/**
 * Get user profile from Tradier
 */
export const getUserProfile = async (): Promise<TradierProfile> => {
  return withRetry(async () => {
    const response = await tradierClient.get('/v1/user/profile');
    return response.data.profile;
  });
};

/**
 * Get list of account IDs for the user
 */
export const getAccounts = async (): Promise<string[]> => {
  const profile = await getUserProfile();
  // Handle both single account and multiple accounts
  const accounts = Array.isArray(profile.account) ? profile.account : [profile.account];
  return accounts.map(a => a.account_number);
};

/**
 * Get positions for an account
 * Returns empty array if no positions
 */
export const getPositions = async (accountId: string): Promise<TradierPosition[]> => {
  return withRetry(async () => {
    const response = await tradierClient.get(`/v1/accounts/${accountId}/positions`);
    
    // Handle various null/empty responses from Tradier
    if (!response.data.positions || 
        response.data.positions === 'null' || 
        response.data.positions === null) {
      return [];
    }
    
    const positions = response.data.positions.position;
    
    if (!positions || positions === 'null') {
      return [];
    }
    
    // Tradier returns single object or array depending on count
    return Array.isArray(positions) ? positions : [positions];
  });
};

/**
 * Get account balances
 */
export const getBalances = async (accountId: string): Promise<TradierBalances> => {
  return withRetry(async () => {
    const response = await tradierClient.get(`/v1/accounts/${accountId}/balances`);
    return response.data.balances;
  });
};

/**
 * Get quotes for multiple symbols
 * @param symbols - Array of ticker symbols
 */
export const getQuotes = async (symbols: string[]): Promise<TradierQuote[]> => {
  if (symbols.length === 0) {
    return [];
  }
  
  return withRetry(async () => {
    const symbolsStr = symbols.join(',');
    const response = await tradierClient.get('/v1/markets/quotes', {
      params: { symbols: symbolsStr },
    });
    
    // Handle null/empty response
    if (!response.data.quotes || !response.data.quotes.quote) {
      return [];
    }
    
    const quotes = response.data.quotes.quote;
    return Array.isArray(quotes) ? quotes : [quotes];
  });
};

/**
 * Get price map for multiple symbols (convenience function)
 * @param symbols - Array of ticker symbols
 * @returns Map of symbol -> price
 */
export const getPriceMap = async (symbols: string[]): Promise<Record<string, number>> => {
  const quotes = await getQuotes(symbols);
  const priceMap: Record<string, number> = {};
  
  for (const quote of quotes) {
    // Use last price, fall back to close
    priceMap[quote.symbol] = quote.last ?? quote.close ?? 0;
  }
  
  return priceMap;
};

/**
 * Get account history
 */
export const getHistory = async (
  accountId: string,
  limit: number = 100
): Promise<TradierHistoryEvent[]> => {
  return withRetry(async () => {
    const response = await tradierClient.get(`/v1/accounts/${accountId}/history`, {
      params: { limit: Math.min(limit, 1000) }, // Tradier max is 1000
    });
    
    if (!response.data.history || !response.data.history.event) {
      return [];
    }
    
    const history = response.data.history.event;
    return Array.isArray(history) ? history : [history];
  });
};

// Additional type for quotes
export interface TradierQuote {
  symbol: string;
  last: number | null;
  close: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number;
  change: number | null;
  change_percentage: number | null;
}

// Additional type for history events
export interface TradierHistoryEvent {
  date: string;
  type: string;
  trade?: {
    symbol: string;
    quantity: number;
    price: number;
    commission: number;
  };
}

// Options chain types
export interface TradierOption {
  symbol: string;
  description: string;
  exch: string;
  type: 'call' | 'put';
  last: number | null;
  change: number | null;
  volume: number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  bid: number;
  ask: number;
  underlying: string;
  strike: number;
  change_percentage: number | null;
  average_volume: number;
  last_volume: number;
  trade_date: number;
  prevclose: number | null;
  week_52_high: number;
  week_52_low: number;
  bidsize: number;
  bidexch: string;
  bid_date: number;
  asksize: number;
  askexch: string;
  ask_date: number;
  open_interest: number;
  contract_size: number;
  expiration_date: string;
  expiration_type: string;
  option_type: string;
  root_symbol: string;
  // Greeks (flattened for easier access)
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  rho?: number;
  phi?: number;
  bid_iv?: number;
  mid_iv?: number;
  ask_iv?: number;
  implied_volatility?: number;
  smv_vol?: number;
  greeks_updated_at?: string;
}

export interface TradierOptionsChain {
  options: TradierOption[];
  underlying_price?: number;
  volatility?: number;
}

// News types
export interface TradierNewsArticle {
  id: number;
  headline: string;
  source: string;
  date: string;
  content: string;
  symbols: string[];
  url: string;
}

// Sector performance types
export interface TradierSectorPerformance {
  symbol: string;
  name: string;
  performance: number;
  last: number;
  change: number;
  change_percentage: number;
}

// ETF holdings types
export interface TradierETFHolding {
  symbol: string;
  name: string;
  weight: number;
  shares: number;
}

export interface TradierETFHoldings {
  holdings: {
    holding: TradierETFHolding[];
  } | null;
}

/**
 * Get a single real-time quote
 * @param symbol - Ticker symbol
 */
export const getQuote = async (symbol: string): Promise<TradierQuote | null> => {
  return withRetry(async () => {
    const response = await tradierClient.get('/v1/markets/quotes', {
      params: { symbols: symbol },
    });
    
    if (!response.data.quotes || !response.data.quotes.quote) {
      return null;
    }
    
    const quote = response.data.quotes.quote;
    return Array.isArray(quote) ? quote[0] : quote;
  });
};

/**
 * Get options chain for a symbol
 * @param symbol - Underlying ticker symbol
 * @param expiration - Optional expiration date (YYYY-MM-DD format)
 */
export const getOptionsChain = async (
  symbol: string,
  expiration?: string
): Promise<TradierOptionsChain> => {
  return withRetry(async () => {
    const params: { symbol: string; expiration?: string; greeks?: boolean } = {
      symbol,
      greeks: true, // Include Greeks by default
    };
    
    if (expiration) {
      params.expiration = expiration;
    }
    
    const response = await tradierClient.get('/v1/markets/options/chains', {
      params,
    });
    
    if (!response.data.options || !response.data.options.option) {
      return { options: [] };
    }
    
    const rawOptions = response.data.options.option;
    const rawOptionsArray = Array.isArray(rawOptions) ? rawOptions : [rawOptions];
    
    // Flatten Greeks for easier access
    const optionsArray = rawOptionsArray.map((opt: any) => {
      const flattened: TradierOption = { ...opt };
      
      // If greeks are nested, flatten them
      if (opt.greeks) {
        flattened.delta = opt.greeks.delta;
        flattened.gamma = opt.greeks.gamma;
        flattened.theta = opt.greeks.theta;
        flattened.vega = opt.greeks.vega;
        flattened.rho = opt.greeks.rho;
        flattened.phi = opt.greeks.phi;
        flattened.bid_iv = opt.greeks.bid_iv;
        flattened.mid_iv = opt.greeks.mid_iv;
        flattened.ask_iv = opt.greeks.ask_iv;
        flattened.implied_volatility = opt.greeks.mid_iv; // Use mid IV as implied volatility
        flattened.smv_vol = opt.greeks.smv_vol;
        flattened.greeks_updated_at = opt.greeks.updated_at;
      }
      
      return flattened;
    });
    
    return {
      options: optionsArray,
      underlying_price: response.data.underlying_price,
      volatility: response.data.volatility,
    };
  });
};

/**
 * Get news for a specific symbol
 * @param symbol - Ticker symbol
 */
export const getNews = async (symbol: string): Promise<TradierNewsArticle[]> => {
  return withRetry(async () => {
    const response = await tradierClient.get('/v1/markets/news', {
      params: { symbols: symbol },
    });
    
    if (!response.data.news || !response.data.news.article) {
      return [];
    }
    
    const articles = response.data.news.article;
    return Array.isArray(articles) ? articles : [articles];
  });
};

/**
 * Get sector performance (using major sector ETFs)
 * Returns performance data for key sector ETFs
 */
export const getSectorPerformance = async (): Promise<TradierSectorPerformance[]> => {
  return withRetry(async () => {
    // Major sector ETFs
    const sectorETFs = [
      'XLK', // Technology
      'XLF', // Financials
      'XLV', // Healthcare
      'XLE', // Energy
      'XLI', // Industrials
      'XLC', // Communication Services
      'XLY', // Consumer Discretionary
      'XLP', // Consumer Staples
      'XLRE', // Real Estate
      'XLU', // Utilities
      'XLB', // Materials
    ];
    
    const sectorNames: Record<string, string> = {
      'XLK': 'Technology',
      'XLF': 'Financials',
      'XLV': 'Healthcare',
      'XLE': 'Energy',
      'XLI': 'Industrials',
      'XLC': 'Communication Services',
      'XLY': 'Consumer Discretionary',
      'XLP': 'Consumer Staples',
      'XLRE': 'Real Estate',
      'XLU': 'Utilities',
      'XLB': 'Materials',
    };
    
    const quotes = await getQuotes(sectorETFs);
    
    return quotes.map(quote => ({
      symbol: quote.symbol,
      name: sectorNames[quote.symbol] || quote.symbol,
      performance: quote.change_percentage ?? 0,
      last: quote.last ?? quote.close ?? 0,
      change: quote.change ?? 0,
      change_percentage: quote.change_percentage ?? 0,
    }));
  });
};

/**
 * Get ETF holdings/constituents
 * Note: Tradier doesn't have a dedicated ETF holdings endpoint,
 * so this returns a placeholder. For production, consider using
 * a third-party data provider or scraping ETF provider websites.
 * @param symbol - ETF ticker symbol
 */
export const getETFHoldings = async (symbol: string): Promise<TradierETFHolding[]> => {
  return withRetry(async () => {
    // Tradier doesn't have a native ETF holdings endpoint
    // This would require integration with another data provider
    // For now, return empty array with console note
    console.warn(`[Tradier] ETF holdings not available via Tradier API for ${symbol}`);
    console.warn('[Tradier] Consider integrating with ETF.com, Holdings Channel, or similar provider');
    
    return [];
  });
};

// ============================================
// ORDER EXECUTION (Added for paper trading)
// ============================================

export interface TradierOrderParams {
  account_id: string;
  class: 'equity' | 'option' | 'combo' | 'multileg';
  symbol: string;
  side: 'buy' | 'sell' | 'buy_to_open' | 'buy_to_close' | 'sell_to_open' | 'sell_to_close';
  quantity: number;
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  duration: 'day' | 'gtc' | 'pre' | 'post';
  price?: number;
  stop?: number;
  option_symbol?: string;
}

export interface TradierOrder {
  id: number;
  type: string;
  symbol: string;
  side: string;
  quantity: number;
  status: string;
  duration: string;
  price: number;
  avg_fill_price: number;
  exec_quantity: number;
  last_fill_price: number;
  last_fill_quantity: number;
  remaining_quantity: number;
  create_date: string;
  transaction_date: string;
  class: string;
}

export async function placeOrder(params: TradierOrderParams): Promise<TradierOrder> {
  const formData = new URLSearchParams();
  formData.append('class', params.class);
  formData.append('symbol', params.symbol);
  formData.append('side', params.side);
  formData.append('quantity', params.quantity.toString());
  formData.append('type', params.type);
  formData.append('duration', params.duration);
  
  if (params.price) {
    formData.append('price', params.price.toString());
  }
  if (params.stop) {
    formData.append('stop', params.stop.toString());
  }
  if (params.option_symbol) {
    formData.append('option_symbol', params.option_symbol);
  }
  
  console.log(`[Tradier] Placing ${params.side} order: ${params.quantity} ${params.symbol}`);
  
  const response = await withRetry(() =>
    tradierClient.post(`/v1/accounts/${params.account_id}/orders`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  );
  
  return response.data.order;
}

export async function getOrders(accountId: string): Promise<TradierOrder[]> {
  const response = await withRetry(() =>
    tradierClient.get(`/v1/accounts/${accountId}/orders`)
  );
  
  const orders = response.data.orders;
  if (!orders || orders === 'null') return [];
  return Array.isArray(orders.order) ? orders.order : [orders.order];
}

export async function cancelOrder(accountId: string, orderId: number): Promise<void> {
  await withRetry(() =>
    tradierClient.delete(`/v1/accounts/${accountId}/orders/${orderId}`)
  );
}


// Check if using sandbox
export function isSandbox(): boolean {
  return TRADIER_BASE_URL.includes('sandbox');
}
