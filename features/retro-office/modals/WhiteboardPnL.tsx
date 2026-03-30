"use client";

import { X, TrendingUp, TrendingDown } from "lucide-react";

type WhiteboardPnLProps = {
  onClose: () => void;
  portfolioData?: {
    dailyPnL: number;
    winRate: number;
    topPerformer: string;
  };
};

export function WhiteboardPnL({ onClose, portfolioData }: WhiteboardPnLProps) {
  // Mock data if not provided
  const dailyPnL = portfolioData?.dailyPnL ?? Math.floor(Math.random() * 2000) - 500;
  const winRate = portfolioData?.winRate ?? Math.floor(Math.random() * 30) + 60;
  const topPerformer = portfolioData?.topPerformer ?? ["SPY calls", "TSLA puts", "QQQ scalp"][Math.floor(Math.random() * 3)];
  
  const isProfit = dailyPnL >= 0;
  const percentChange = ((dailyPnL / 10000) * 100).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a0a0a] to-[#0f0f0f] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 transition-colors hover:bg-black/60 hover:text-white"
          aria-label="Close"
        >
          <X size={14} />
        </button>

        {/* Title */}
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-white">Daily Performance</h2>
          <p className="mt-2 text-sm text-white/50">Real-time trading desk metrics</p>
        </div>

        {/* Main P&L display */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-black/20 p-8 text-center">
          <div className="mb-2 text-sm font-bold uppercase tracking-widest text-white/50">Today's P&L</div>
          <div className={`flex items-center justify-center gap-3 text-5xl font-bold ${
            isProfit ? 'text-green-400' : 'text-red-400'
          }`}>
            {isProfit ? <TrendingUp size={40} /> : <TrendingDown size={40} />}
            <span>{isProfit ? '+' : ''}{dailyPnL.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
          </div>
          <div className={`mt-2 text-lg ${isProfit ? 'text-green-400/70' : 'text-red-400/70'}`}>
            {isProfit ? '+' : ''}{percentChange}%
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Win rate */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">Win Rate</h3>
            <div className="mb-3 text-3xl font-bold text-cyan-400">{winRate}%</div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div 
                className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                style={{ width: `${winRate}%` }}
              />
            </div>
          </div>

          {/* Top performer */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">Top Performer</h3>
            <div className="text-lg font-semibold text-white">{topPerformer}</div>
            <div className="mt-2 text-sm text-green-400">+${Math.floor(Math.random() * 500 + 200)}</div>
          </div>

          {/* Total trades */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">Total Trades</h3>
            <div className="text-3xl font-bold text-white">{Math.floor(Math.random() * 20 + 10)}</div>
          </div>

          {/* Active positions */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">Active Positions</h3>
            <div className="text-3xl font-bold text-amber-400">{Math.floor(Math.random() * 5 + 2)}</div>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-center">
          <p className="text-xs text-amber-200/80">
            Live performance tracking • Updated every 5 minutes
          </p>
        </div>
      </div>
    </div>
  );
}
