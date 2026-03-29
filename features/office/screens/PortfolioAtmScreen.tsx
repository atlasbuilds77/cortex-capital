"use client";

import { useEffect, useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Wallet, RefreshCw, DollarSign, PieChart, ArrowUpDown } from "lucide-react";

interface PortfolioData {
  source: string;
  accountValue: number | null;
  buyingPower: number | null;
  todayPnL: number | null;
  positions: Array<{
    symbol: string;
    quantity: number;
    currentPrice: number;
    unrealizedPnL: number;
    todayChange: number;
  }>;
  message?: string;
}

type SortKey = 'symbol' | 'value' | 'pnl' | 'change';
type SortDir = 'asc' | 'desc';

export function PortfolioAtmScreen({ token }: { token?: string | null }) {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sortedPositions = useMemo(() => {
    if (!portfolio?.positions) return [];
    return [...portfolio.positions].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'symbol':
          cmp = a.symbol.localeCompare(b.symbol);
          break;
        case 'value':
          cmp = (a.quantity * a.currentPrice) - (b.quantity * b.currentPrice);
          break;
        case 'pnl':
          cmp = a.unrealizedPnL - b.unrealizedPnL;
          break;
        case 'change':
          cmp = a.todayChange - b.todayChange;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [portfolio?.positions, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const fetchPortfolio = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/portfolio", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      const data = await res.json();
      setPortfolio(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, [token]);

  const formatCurrency = (value: number | null) => {
    if (value === null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,#0a2a1a_0%,#051510_65%,#020805_100%)]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-400" />
          <div className="text-emerald-200/70 uppercase tracking-widest text-sm">Loading Portfolio...</div>
        </div>
      </div>
    );
  }

  if (!portfolio || portfolio.source === "none") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,#0a2a1a_0%,#051510_65%,#020805_100%)] text-emerald-100">
        <Wallet className="h-16 w-16 text-emerald-400/50 mb-6" />
        <h2 className="text-2xl font-semibold tracking-wide">No Broker Connected</h2>
        <p className="mt-3 text-emerald-200/60 text-center max-w-md">
          Connect your broker in Settings to see your portfolio here.
        </p>
        <a
          href="/settings/brokers"
          className="mt-8 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
        >
          Connect Broker
        </a>
      </div>
    );
  }

  const totalValue = portfolio.accountValue ?? 0;
  const todayPnL = portfolio.todayPnL ?? 0;
  const todayPnLPercent = totalValue > 0 ? (todayPnL / totalValue) * 100 : 0;
  const isPositive = todayPnL >= 0;

  return (
    <div className="absolute inset-0 overflow-y-auto bg-[radial-gradient(circle_at_top,#0a2a1a_0%,#051510_45%,#020805_100%)] text-emerald-100">
      {/* Scanlines */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:repeating-linear-gradient(to_bottom,rgba(255,255,255,0.15)_0px,rgba(255,255,255,0.15)_1px,transparent_2px,transparent_4px)]" />
      
      <div className="relative p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <DollarSign className="h-6 w-6 text-emerald-400" />
            <span className="text-sm uppercase tracking-[0.3em] text-emerald-300/70">Cortex ATM</span>
          </div>
          <button
            onClick={fetchPortfolio}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-500/30 bg-emerald-900/30 text-emerald-200 hover:bg-emerald-800/40 transition-colors text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Main Balance */}
        <div className="text-center mb-10">
          <div className="text-sm uppercase tracking-[0.25em] text-emerald-400/60 mb-2">
            Portfolio Value
          </div>
          <div className="text-5xl font-bold tracking-tight text-emerald-50">
            {formatCurrency(totalValue)}
          </div>
          <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full ${
            isPositive 
              ? "bg-emerald-500/20 text-emerald-300" 
              : "bg-red-500/20 text-red-300"
          }`}>
            {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            <span className="font-semibold">
              {formatCurrency(todayPnL)} ({formatPercent(todayPnLPercent)})
            </span>
            <span className="text-sm opacity-70">today</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-900/20 p-4 overflow-hidden">
            <div className="text-xs uppercase tracking-widest text-emerald-400/60 mb-2">
              Buying Power
            </div>
            <div className="text-lg sm:text-xl font-semibold text-emerald-100 truncate">
              {formatCurrency(portfolio.buyingPower)}
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-900/20 p-4">
            <div className="text-xs uppercase tracking-widest text-emerald-400/60 mb-2">
              Positions
            </div>
            <div className="text-lg sm:text-xl font-semibold text-emerald-100">
              {portfolio.positions.length}
            </div>
          </div>
        </div>

        {/* Positions */}
        {portfolio.positions.length > 0 && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-900/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-emerald-400" />
                <span className="text-sm uppercase tracking-widest text-emerald-400/70">
                  Holdings
                </span>
              </div>
              {/* Sort buttons */}
              <div className="flex gap-1">
                {[
                  { key: 'symbol' as SortKey, label: 'A-Z' },
                  { key: 'value' as SortKey, label: '$' },
                  { key: 'pnl' as SortKey, label: 'P/L' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => toggleSort(key)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      sortKey === key
                        ? 'bg-emerald-500/30 text-emerald-300'
                        : 'bg-emerald-900/30 text-emerald-500/60 hover:bg-emerald-900/50'
                    }`}
                  >
                    {label} {sortKey === key && (sortDir === 'asc' ? '↑' : '↓')}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {sortedPositions.slice(0, 8).map((pos) => (
                <div
                  key={pos.symbol}
                  className="flex items-center justify-between py-3 border-b border-emerald-500/10 last:border-0"
                >
                  <div>
                    <div className="font-semibold text-emerald-100">{pos.symbol}</div>
                    <div className="text-sm text-emerald-300/60">
                      {pos.quantity} shares @ {formatCurrency(pos.currentPrice)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={pos.unrealizedPnL >= 0 ? "text-emerald-400" : "text-red-400"}>
                      {formatCurrency(pos.unrealizedPnL)}
                    </div>
                    <div className={`text-sm ${pos.todayChange >= 0 ? "text-emerald-300/60" : "text-red-300/60"}`}>
                      {formatPercent(pos.todayChange)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Source indicator */}
        <div className="mt-6 text-center text-xs uppercase tracking-widest text-emerald-500/40">
          Data source: {portfolio.source}
        </div>
      </div>
    </div>
  );
}
