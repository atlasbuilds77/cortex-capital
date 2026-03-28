// Cortex Capital - ANALYST Agent
// Portfolio analysis, risk metrics, concentration detection

import {
  getPositions,
  getBalances,
  getQuotes,
  TradierPosition,
  TradierBalances,
} from '../integrations/tradier';

export interface PortfolioMetrics {
  sharpe_ratio: number;
  beta: number;
  volatility: number;
  max_drawdown: number;
}

export interface ConcentrationRisk {
  top_holding_pct: number;
  sector_exposure: Record<string, number>;
}

export interface TaxLossCandidate {
  ticker: string;
  unrealized_loss: number;
}

export interface AnalystReport {
  portfolio_health: number; // 0-100
  total_value: number;
  metrics: PortfolioMetrics;
  concentration_risk: ConcentrationRisk;
  tax_loss_candidates: TaxLossCandidate[];
  positions: Array<{
    ticker: string;
    shares: number;
    value: number;
    cost_basis: number;
    current_price: number;
    unrealized_pnl: number;
    unrealized_pnl_pct: number;
  }>;
}

// Simplified sector mapping (expand later)
const SECTOR_MAP: Record<string, string> = {
  AAPL: 'tech',
  MSFT: 'tech',
  GOOGL: 'tech',
  GOOG: 'tech',
  NVDA: 'tech',
  TSLA: 'tech',
  META: 'tech',
  AMZN: 'tech',
  JPM: 'finance',
  BAC: 'finance',
  WFC: 'finance',
  GS: 'finance',
  MS: 'finance',
  JNJ: 'healthcare',
  UNH: 'healthcare',
  PFE: 'healthcare',
  ABBV: 'healthcare',
  XOM: 'energy',
  CVX: 'energy',
  COP: 'energy',
};

const getSector = (ticker: string): string => {
  return SECTOR_MAP[ticker] || 'other';
};

export const analyzePortfolio = async (
  accountId: string
): Promise<AnalystReport> => {
  // Fetch positions and balances
  const [positions, balances] = await Promise.all([
    getPositions(accountId),
    getBalances(accountId),
  ]);

  if (positions.length === 0) {
    // Account is all cash - return simplified report
    return {
      portfolio_health: 100,
      total_value: balances.total_equity,
      metrics: {
        sharpe_ratio: 0,
        beta: 0,
        volatility: 0,
        max_drawdown: 0,
      },
      concentration_risk: {
        top_holding_pct: 0,
        sector_exposure: { cash: 100 },
      },
      tax_loss_candidates: [],
      positions: [],
    };
  }

  // Get current prices
  const symbols = positions.map((p) => p.symbol);
  const quotes = await getQuotes(symbols);

  // Build quote map
  const quoteMap: Record<string, number> = {};
  quotes.forEach((q: any) => {
    quoteMap[q.symbol] = q.last || q.close || 0;
  });

  // Calculate position values
  const enrichedPositions = positions.map((pos) => {
    const currentPrice = quoteMap[pos.symbol] || 0;
    const value = pos.quantity * currentPrice;
    const unrealizedPnl = value - pos.cost_basis;
    const unrealizedPnlPct = (unrealizedPnl / pos.cost_basis) * 100;

    return {
      ticker: pos.symbol,
      shares: pos.quantity,
      value,
      cost_basis: pos.cost_basis,
      current_price: currentPrice,
      unrealized_pnl: unrealizedPnl,
      unrealized_pnl_pct: unrealizedPnlPct,
    };
  });

  const totalValue = balances.total_equity;

  // Calculate concentration risk
  const sortedByValue = [...enrichedPositions].sort((a, b) => b.value - a.value);
  const topHoldingPct = (sortedByValue[0].value / totalValue) * 100;

  // Sector exposure
  const sectorExposure: Record<string, number> = {};
  enrichedPositions.forEach((pos) => {
    const sector = getSector(pos.ticker);
    if (!sectorExposure[sector]) {
      sectorExposure[sector] = 0;
    }
    sectorExposure[sector] += (pos.value / totalValue) * 100;
  });

  // Tax-loss harvest candidates (unrealized loss > $500)
  const taxLossCandidates = enrichedPositions
    .filter((pos) => pos.unrealized_pnl < -500)
    .map((pos) => ({
      ticker: pos.ticker,
      unrealized_loss: pos.unrealized_pnl,
    }));

  // Calculate metrics (simplified for MVP)
  const metrics = calculateMetrics(enrichedPositions, totalValue);

  // Calculate portfolio health score
  const portfolioHealth = calculateHealthScore(
    metrics,
    topHoldingPct,
    sectorExposure
  );

  return {
    portfolio_health: Math.round(portfolioHealth),
    total_value: totalValue,
    metrics,
    concentration_risk: {
      top_holding_pct: topHoldingPct,
      sector_exposure: sectorExposure,
    },
    tax_loss_candidates: taxLossCandidates,
    positions: enrichedPositions,
  };
};

const calculateMetrics = (
  positions: any[],
  totalValue: number
): PortfolioMetrics => {
  // Simplified metrics for MVP
  // TODO: Use historical data for accurate Sharpe ratio, beta, volatility

  // Placeholder calculations (will improve with historical data)
  const sharpeRatio = 1.2; // Placeholder
  const beta = 0.95; // Placeholder (assume slightly defensive)
  const volatility = 18.4; // Placeholder (moderate volatility)

  // Calculate max drawdown from current unrealized PnL
  const totalUnrealizedPnl = positions.reduce(
    (sum, pos) => sum + pos.unrealized_pnl,
    0
  );
  const maxDrawdown = (totalUnrealizedPnl / totalValue) * 100;

  return {
    sharpe_ratio: sharpeRatio,
    beta,
    volatility,
    max_drawdown: maxDrawdown,
  };
};

const calculateHealthScore = (
  metrics: PortfolioMetrics,
  topHoldingPct: number,
  sectorExposure: Record<string, number>
): number => {
  let score = 100;

  // Penalize high concentration (>20% in single holding)
  if (topHoldingPct > 20) {
    score -= (topHoldingPct - 20) * 2;
  }

  // Penalize high sector concentration (>40% in single sector)
  const maxSectorExposure = Math.max(...Object.values(sectorExposure));
  if (maxSectorExposure > 40) {
    score -= (maxSectorExposure - 40) * 1.5;
  }

  // Penalize high volatility (>25%)
  if (metrics.volatility > 25) {
    score -= (metrics.volatility - 25) * 1.5;
  }

  // Penalize large drawdown (< -15%)
  if (metrics.max_drawdown < -15) {
    score -= Math.abs(metrics.max_drawdown + 15) * 2;
  }

  // Reward high Sharpe ratio (>1.5)
  if (metrics.sharpe_ratio > 1.5) {
    score += (metrics.sharpe_ratio - 1.5) * 10;
  }

  return Math.max(0, Math.min(100, score));
};
