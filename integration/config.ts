/**
 * Environment Configuration
 * Single source of truth for all config values
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Credentials path
const CREDENTIALS_PATH = '/Users/atlasbuilds/clawd/credentials.json';

interface Credentials {
  tradier: {
    token: string;
    base_url: string;
  };
  webull: {
    did: string;
    access_token: string;
    email: string;
    trading_password: string;
    account_id: string;
  };
  topstepx: {
    username: string;
    api_key: string;
    base_url: string;
    active_accounts: number[];
  };
  nebula: {
    base_url: string;
    prices_endpoint: string;
  };
  jupiter: {
    api_key: string;
    base_url: string;
  };
  solana: {
    wallet_address: string;
    private_key_file: string;
    balance_sol: number;
    balance_usd: number;
  };
  polygon: {
    api_key: string;
    base_url: string;
  };
}

// Load credentials from JSON file
function loadCredentials(): Credentials {
  try {
    const raw = readFileSync(CREDENTIALS_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to load credentials:', error);
    throw new Error('Cannot load credentials.json');
  }
}

// Lazy-loaded singleton
let _credentials: Credentials | null = null;

export function getCredentials(): Credentials {
  if (!_credentials) {
    _credentials = loadCredentials();
  }
  return _credentials;
}

// Environment configuration
export const config = {
  // Database
  database: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/trading_company',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',
    poolMin: 2,
    poolMax: 10,
  },

  // LLM Provider
  llm: {
    provider: process.env.LLM_PROVIDER || 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || '',
    model: process.env.LLM_MODEL || 'claude-3-5-sonnet-20241022',
    maxTokens: 500,
  },

  // Heartbeat
  heartbeat: {
    intervalMs: 5 * 60 * 1000, // 5 minutes
    budgetMs: 15000, // 15 seconds max per heartbeat
    operationTimeouts: {
      evaluateTriggers: 4000,
      processReactionQueue: 3000,
      promoteInsights: 2000,
      learnFromOutcomes: 3000,
      recoverStaleSteps: 2000,
      recoverStaleRoundtables: 1000,
    },
  },

  // Workers
  workers: {
    pollIntervalMs: 20000, // 20 seconds
    claimTimeoutMs: 30 * 60 * 1000, // 30 minutes
    circuitBreakerThreshold: 3,
    circuitBreakerResetMs: 5 * 60 * 1000, // 5 minutes
  },

  // Trading
  trading: {
    crypto: {
      positionSizeSol: 0.23, // ~$20
      maxPositions: 3,
      takeProfit: 0.30, // +30%
      stopLoss: -0.30, // -30%
    },
    options: {
      stopLoss: -0.35, // -35%
      scalingLevels: [0.30, 0.50, 0.75, 1.00], // 30%, 50%, 75%, 100%
    },
    futures: {
      contracts: 10, // ALWAYS 10 CONTRACTS
      tp1Contracts: 5, // Trim 5 at TP1
      tp2Contracts: 5, // Run 5 to TP2
      account: 18354484, // TopstepX account
    },
  },

  // API Endpoints
  apis: {
    jupiter: {
      swap: 'https://api.jup.ag/swap/v1/swap',
      quote: 'https://api.jup.ag/swap/v1/quote',
    },
    tradier: {
      base: 'https://api.tradier.com/v1',
      orders: '/accounts/{account_id}/orders',
      positions: '/accounts/{account_id}/positions',
    },
    nebula: {
      webhook: 'https://nebula.zerogtrading.com/webhook/tv?key=Ob48WT8SpiYCyAQPMaJWN4EWJ1D_puBH',
      prices: 'http://127.0.0.1:8000/api/futures/prices?symbols=MES,MNQ,ES,NQ',
    },
    dexscreener: {
      search: 'https://api.dexscreener.com/latest/dex/search',
      pairs: 'https://api.dexscreener.com/latest/dex/pairs/solana',
    },
  },

  // Agents
  agents: {
    ids: ['atlas', 'sage', 'scout', 'growth', 'intel', 'observer'] as const,
    defaultRelationships: {
      'atlas-sage': 0.80,
      'sage-observer': 0.80,
      'scout-intel': 0.75,
      'growth-intel': 0.70,
      'atlas-growth': 0.60,
      'atlas-scout': 0.60,
      'atlas-observer': 0.55,
      'sage-growth': 0.55,
      'sage-scout': 0.50,
      'scout-observer': 0.50,
      'atlas-intel': 0.35,
      'sage-intel': 0.30,
      'intel-observer': 0.40,
      'growth-observer': 0.45,
      'scout-growth': 0.50,
    },
  },

  // Dashboard
  dashboard: {
    port: process.env.PORT || 3000,
    sseHeartbeat: 15000, // 15 seconds
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    json: process.env.LOG_FORMAT === 'json',
  },
};

export type AgentId = typeof config.agents.ids[number];
export type Config = typeof config;
