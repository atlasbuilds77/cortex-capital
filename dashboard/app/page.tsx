'use client';

import { useState, useEffect } from 'react';

interface PortfolioReport {
  portfolio_health: number;
  total_value: number;
  metrics: {
    sharpe_ratio: number;
    beta: number;
    volatility: number;
    max_drawdown: number;
  };
  concentration_risk: {
    top_holding_pct: number;
    sector_exposure: Record<string, number>;
  };
  tax_loss_candidates: Array<{
    ticker: string;
    unrealized_loss: number;
  }>;
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

export default function Dashboard() {
  const [report, setReport] = useState<PortfolioReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [accountId, setAccountId] = useState('6YB71689');

  const analyzePortfolio = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/portfolio/analyze/${accountId}`);
      const data = await res.json();
      if (data.success) {
        setReport(data.data);
      }
    } catch (error) {
      console.error('Failed to analyze portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Cortex Capital
          </h1>
          <p className="text-gray-600">Your Personal Hedge Fund</p>
        </div>

        {/* Account Input */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4">
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="Tradier Account ID"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            />
            <button
              onClick={analyzePortfolio}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Analyzing...' : 'Analyze Portfolio'}
            </button>
          </div>
        </div>

        {/* Portfolio Report */}
        {report && (
          <div className="space-y-6">
            {/* Health Score */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">Portfolio Health</h2>
              <div className="flex items-center gap-4">
                <div className="text-6xl font-bold text-blue-600">
                  {report.portfolio_health}
                </div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="h-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"
                      style={{ width: `${report.portfolio_health}%` }}
                    ></div>
                  </div>
                  <p className="text-gray-600 mt-2">
                    Total Value: ${report.total_value.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Sharpe Ratio"
                value={report.metrics.sharpe_ratio.toFixed(2)}
                subtitle="Risk-adjusted return"
              />
              <MetricCard
                title="Beta"
                value={report.metrics.beta.toFixed(2)}
                subtitle="Market correlation"
              />
              <MetricCard
                title="Volatility"
                value={`${report.metrics.volatility.toFixed(1)}%`}
                subtitle="Annual volatility"
              />
              <MetricCard
                title="Max Drawdown"
                value={`${report.metrics.max_drawdown.toFixed(1)}%`}
                subtitle="Largest decline"
              />
            </div>

            {/* Concentration Risk */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Concentration Risk</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-600 text-sm">Top Holding</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {report.concentration_risk.top_holding_pct.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm mb-2">Sector Exposure</p>
                  {Object.entries(report.concentration_risk.sector_exposure).map(
                    ([sector, pct]) => (
                      <div key={sector} className="flex justify-between items-center mb-2">
                        <span className="text-gray-700 capitalize">{sector}</span>
                        <span className="font-semibold text-gray-900">{pct.toFixed(1)}%</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Positions */}
            {report.positions.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Positions</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4 text-gray-600">Ticker</th>
                        <th className="text-right py-2 px-4 text-gray-600">Shares</th>
                        <th className="text-right py-2 px-4 text-gray-600">Value</th>
                        <th className="text-right py-2 px-4 text-gray-600">P/L</th>
                        <th className="text-right py-2 px-4 text-gray-600">P/L %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.positions.map((pos) => (
                        <tr key={pos.ticker} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-semibold text-gray-900">{pos.ticker}</td>
                          <td className="py-3 px-4 text-right text-gray-700">{pos.shares}</td>
                          <td className="py-3 px-4 text-right text-gray-900">
                            ${pos.value.toLocaleString()}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-semibold ${
                              pos.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            ${pos.unrealized_pnl.toFixed(2)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-semibold ${
                              pos.unrealized_pnl_pct >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {pos.unrealized_pnl_pct.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tax Loss Harvest */}
            {report.tax_loss_candidates.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">
                  Tax-Loss Harvest Opportunities
                </h2>
                {report.tax_loss_candidates.map((candidate) => (
                  <div key={candidate.ticker} className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900">{candidate.ticker}</span>
                    <span className="text-red-600">
                      ${candidate.unrealized_loss.toFixed(2)} loss
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!report && !loading && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 text-lg">
              Enter your Tradier account ID and click "Analyze Portfolio" to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-gray-600 text-sm mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-gray-500 text-xs">{subtitle}</p>
    </div>
  );
}
