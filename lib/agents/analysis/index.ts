// Cortex Capital - Technical Analysis Engine
// Main export file for all analysis modules

// Technical Indicators
export * from './technical-indicators';

// Sector Momentum
export * from './sector-momentum';

// Signal Generator
export * from './signal-generator';

// Options Flow Analysis
export * from './options-flow';
export * from './flow-signals';
export * from './smart-money-detector';

// Research Engine (NEW) - Use explicit exports to avoid conflicts
export {
  // News research
  searchStockNews,
  getNewsSentiment,
  checkBreakingNews,
  getNewsResearch,
  // Earnings research  
  getUpcomingEarnings,
  getEarningsHistory,
  checkEarningsWhisper,
  getEarningsResearch,
  // Research aggregator
  getFullResearch,
  getBatchResearch,
  clearCache
} from './research-aggregator';

// Re-export commonly used types from technical indicators
export type {
  PriceData,
  IndicatorSignal,
  RSIResult,
  MACDResult,
  IchimokuResult,
  BollingerBandsResult
} from './technical-indicators';

// Re-export research engine types
export type {
  NewsArticle,
  NewsResult,
  EarningsEvent,
  EarningsHistory,
  EarningsWhisper,
  ResearchReport
} from './research-aggregator';

// Convenience exports for research engine
export { getFullResearch as research } from './research-aggregator';
export { getBatchResearch as batchResearch } from './research-aggregator';

/**
 * Initialize research engine with configuration
 */
export function initResearchEngine(config?: { braveApiKey?: string }) {
  if (config?.braveApiKey) {
    process.env.BRAVE_API_KEY = config.braveApiKey;
  }
  
  console.log('Research engine initialized');
  return {
    news: {
      searchStockNews: async (symbol: string) => {
        const { searchStockNews } = await import('./news-research');
        return searchStockNews(symbol);
      },
      getNewsSentiment: async (symbol: string) => {
        const { getNewsSentiment } = await import('./news-research');
        return getNewsSentiment(symbol);
      },
      checkBreakingNews: async (symbol: string) => {
        const { checkBreakingNews } = await import('./news-research');
        return checkBreakingNews(symbol);
      }
    },
    earnings: {
      getUpcomingEarnings: async (symbol: string) => {
        const { getUpcomingEarnings } = await import('./earnings-research');
        return getUpcomingEarnings(symbol);
      },
      getEarningsHistory: async (symbol: string) => {
        const { getEarningsHistory } = await import('./earnings-research');
        return getEarningsHistory(symbol);
      },
      checkEarningsWhisper: async (symbol: string) => {
        const { checkEarningsWhisper } = await import('./earnings-research');
        return checkEarningsWhisper(symbol);
      }
    },
    research: {
      getFullResearch: async (symbol: string) => {
        const { getFullResearch } = await import('./research-aggregator');
        return getFullResearch(symbol);
      },
      getBatchResearch: async (symbols: string[]) => {
        const { getBatchResearch } = await import('./research-aggregator');
        return getBatchResearch(symbols);
      }
    }
  };
}