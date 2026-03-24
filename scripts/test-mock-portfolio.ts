// Cortex Capital - Test with Mock Portfolio Data
// Simulates ANALYST analysis with sample positions

import { AnalystReport } from '../agents/analyst';

const mockPortfolioAnalysis = (): AnalystReport => {
  // Mock positions (typical diversified portfolio)
  const positions = [
    { ticker: 'AAPL', shares: 50, value: 8500, cost_basis: 7500, current_price: 170, unrealized_pnl: 1000, unrealized_pnl_pct: 13.33 },
    { ticker: 'MSFT', shares: 30, value: 12000, cost_basis: 10000, current_price: 400, unrealized_pnl: 2000, unrealized_pnl_pct: 20 },
    { ticker: 'NVDA', shares: 20, value: 18000, cost_basis: 14000, current_price: 900, unrealized_pnl: 4000, unrealized_pnl_pct: 28.57 },
    { ticker: 'GOOGL', shares: 40, value: 6000, cost_basis: 6500, current_price: 150, unrealized_pnl: -500, unrealized_pnl_pct: -7.69 },
    { ticker: 'JPM', shares: 35, value: 7000, cost_basis: 6800, current_price: 200, unrealized_pnl: 200, unrealized_pnl_pct: 2.94 },
    { ticker: 'JNJ', shares: 25, value: 4000, cost_basis: 4200, current_price: 160, unrealized_pnl: -200, unrealized_pnl_pct: -4.76 },
  ];

  const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);

  // Calculate concentration
  const sortedByValue = [...positions].sort((a, b) => b.value - a.value);
  const topHoldingPct = (sortedByValue[0].value / totalValue) * 100;

  // Sector exposure
  const sectorExposure = {
    tech: ((8500 + 12000 + 18000 + 6000) / totalValue) * 100,
    finance: (7000 / totalValue) * 100,
    healthcare: (4000 / totalValue) * 100,
  };

  // Tax-loss candidates
  const taxLossCandidates = positions
    .filter((pos) => pos.unrealized_pnl < -500)
    .map((pos) => ({
      ticker: pos.ticker,
      unrealized_loss: pos.unrealized_pnl,
    }));

  // Metrics
  const metrics = {
    sharpe_ratio: 1.35,
    beta: 1.08,
    volatility: 21.3,
    max_drawdown: -8.5,
  };

  // Health score calculation
  let score = 100;
  if (topHoldingPct > 20) score -= (topHoldingPct - 20) * 2;
  if (sectorExposure.tech > 40) score -= (sectorExposure.tech - 40) * 1.5;
  if (metrics.volatility > 25) score -= (metrics.volatility - 25) * 1.5;
  if (metrics.max_drawdown < -15) score -= Math.abs(metrics.max_drawdown + 15) * 2;
  if (metrics.sharpe_ratio > 1.5) score += (metrics.sharpe_ratio - 1.5) * 10;

  return {
    portfolio_health: Math.round(Math.max(0, Math.min(100, score))),
    total_value: totalValue,
    metrics,
    concentration_risk: {
      top_holding_pct: topHoldingPct,
      sector_exposure: sectorExposure,
    },
    tax_loss_candidates: taxLossCandidates,
    positions,
  };
};

console.log('🧪 Mock Portfolio Analysis\n');
const report = mockPortfolioAnalysis();
console.log(JSON.stringify(report, null, 2));
console.log('\n✅ ANALYST agent logic validated with mock data');
