'use client';

import { useState, useEffect } from 'react';

interface Stats {
  portfolioValue: number;
  pnl24h: number;
  pnl24hPct: number;
  winRate: number;
  openPositions: number;
  totalTrades: number;
  activeAgents: number;
  conversationsToday: number;
  memoriesCreated: number;
  accountBalances?: {
    crypto: number;
    webull: number;
    topstep: number;
    total: number;
    topstepFunded: number;
    futuresPnL: number;
    optionsPnL: number;
    cryptoPnL: number;
    totalPnL: number;
  };
}

interface Position {
  id: string;
  token: string;
  market: string;
  entryPrice: number;
  currentPrice: number;
  size: number;
  unrealizedPnl: number;
  pnlPct: number;
}

const MARKET_COLORS: Record<string, string> = {
  crypto: '#F59E0B',
  options: '#8B5CF6',
  futures: '#EF4444',
};

export default function StatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);
  
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || null);
        setPositions(data.positions || []);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading || !stats) {
    return (
      <div className="space-y-4">
        <div className="bg-bg-card rounded-xl p-6 h-[300px] animate-pulse card-glow">
          <div className="h-4 bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-slate-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }
  
  const pnlColor = stats.pnl24h >= 0 ? 'text-green-400' : 'text-red-400';
  const pnlBg = stats.pnl24h >= 0 ? 'bg-green-500/10' : 'bg-red-500/10';
  
  return (
    <div className="space-y-4">
      {/* Portfolio Overview */}
      <div className="bg-bg-card rounded-xl p-4 card-glow">
        <h3 className="text-sm text-slate-400 mb-2">Portfolio Value</h3>
        <div className="text-3xl font-bold font-mono">
          ${stats.portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full mt-2 text-sm ${pnlBg} ${pnlColor}`}>
          {stats.pnl24h >= 0 ? '▲' : '▼'} ${Math.abs(stats.pnl24h).toFixed(2)} ({stats.pnl24hPct.toFixed(2)}%)
        </div>
        
        {/* Account Breakdown by Market */}
        {stats.accountBalances && (
          <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
            {/* Futures Account */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs text-slate-400">FUTURES (TopstepX)</span>
              </div>
              <div className="flex justify-between items-center pl-4">
                <span className="text-sm text-slate-300">Funded</span>
                <span className="font-mono text-sm">${stats.accountBalances.topstepFunded.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pl-4">
                <span className="text-sm text-slate-300">Current</span>
                <span className="font-mono text-sm">${stats.accountBalances.topstep.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pl-4">
                <span className={`text-sm ${stats.accountBalances.futuresPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>P&L</span>
                <span className={`font-mono text-sm ${stats.accountBalances.futuresPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.accountBalances.futuresPnL >= 0 ? '+' : ''}{stats.accountBalances.futuresPnL < 0 ? '-' : ''}${Math.abs(stats.accountBalances.futuresPnL).toLocaleString()}
                </span>
              </div>
            </div>
            
            {/* Options Account */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-xs text-slate-400">OPTIONS (Webull)</span>
              </div>
              <div className="flex justify-between items-center pl-4">
                <span className="text-sm text-slate-300">Balance</span>
                <span className="font-mono text-sm">${stats.accountBalances.webull.toLocaleString()}</span>
              </div>
              {stats.accountBalances.optionsPnL !== 0 && (
                <div className="flex justify-between items-center pl-4">
                  <span className={`text-sm ${stats.accountBalances.optionsPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>P&L</span>
                  <span className={`font-mono text-sm ${stats.accountBalances.optionsPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stats.accountBalances.optionsPnL >= 0 ? '+' : ''}{stats.accountBalances.optionsPnL < 0 ? '-' : ''}${Math.abs(stats.accountBalances.optionsPnL).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            
            {/* Crypto Account */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs text-slate-400">CRYPTO (Solana)</span>
              </div>
              <div className="flex justify-between items-center pl-4">
                <span className="text-sm text-slate-300">Balance</span>
                <span className="font-mono text-sm">${stats.accountBalances.crypto.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              {stats.accountBalances.cryptoPnL !== 0 && (
                <div className="flex justify-between items-center pl-4">
                  <span className={`text-sm ${stats.accountBalances.cryptoPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>P&L</span>
                  <span className={`font-mono text-sm ${stats.accountBalances.cryptoPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stats.accountBalances.cryptoPnL >= 0 ? '+' : ''}{stats.accountBalances.cryptoPnL < 0 ? '-' : ''}${Math.abs(stats.accountBalances.cryptoPnL).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            
            {/* Total P&L */}
            <div className="pt-3 border-t border-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-300">Total P&L (All Accounts)</span>
                <span className={`font-mono text-lg font-bold ${stats.accountBalances.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.accountBalances.totalPnL >= 0 ? '+' : ''}{stats.accountBalances.totalPnL < 0 ? '-' : ''}${Math.abs(stats.accountBalances.totalPnL).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-bg-card rounded-xl p-3 card-glow">
          <div className="text-xs text-slate-400">Win Rate</div>
          <div className="text-xl font-bold text-green-400">
            {stats.winRate.toFixed(1)}%
          </div>
        </div>
        <div className="bg-bg-card rounded-xl p-3 card-glow">
          <div className="text-xs text-slate-400">Total Trades</div>
          <div className="text-xl font-bold">
            {stats.totalTrades}
          </div>
        </div>
        <div className="bg-bg-card rounded-xl p-3 card-glow">
          <div className="text-xs text-slate-400">Open Positions</div>
          <div className="text-xl font-bold text-amber-400">
            {stats.openPositions}
          </div>
        </div>
        <div className="bg-bg-card rounded-xl p-3 card-glow">
          <div className="text-xs text-slate-400">Conversations</div>
          <div className="text-xl font-bold text-blue-400">
            {stats.conversationsToday}
          </div>
        </div>
      </div>
      
      {/* Open Positions */}
      <div className="bg-bg-card rounded-xl p-4 card-glow">
        <h3 className="text-sm text-slate-400 mb-3">Open Positions</h3>
        {positions.length === 0 ? (
          <div className="text-center text-slate-500 py-4">
            <div className="text-2xl mb-1">📊</div>
            <p className="text-sm">No open positions</p>
          </div>
        ) : (
          <div className="space-y-2">
            {positions.slice(0, 3).map(pos => (
              <div 
                key={pos.id} 
                className="flex items-center justify-between p-2 rounded-lg bg-bg-hover"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: MARKET_COLORS[pos.market] || '#64748B' }}
                  />
                  <div>
                    <div className="text-sm font-medium">{pos.token}</div>
                    <div className="text-xs text-slate-500">{pos.market}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-mono ${pos.unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {pos.unrealizedPnl >= 0 ? '+' : ''}{pos.unrealizedPnl.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {pos.pnlPct.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Market Performance */}
      <div className="bg-bg-card rounded-xl p-4 card-glow">
        <h3 className="text-sm text-slate-400 mb-3">Performance by Market</h3>
        <div className="space-y-2">
          {[
            { market: 'Crypto', color: MARKET_COLORS.crypto, winRate: 65, trades: 12 },
            { market: 'Options', color: MARKET_COLORS.options, winRate: 58, trades: 8 },
            { market: 'Futures', color: MARKET_COLORS.futures, winRate: 72, trades: 15 },
          ].map(item => (
            <div key={item.market} className="flex items-center gap-3">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <div className="flex-1">
                <div className="flex justify-between text-sm">
                  <span>{item.market}</span>
                  <span className="text-slate-400">{item.trades} trades</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${item.winRate}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
              <div className="text-sm font-mono" style={{ color: item.color }}>
                {item.winRate}%
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* System Health */}
      <div className="bg-bg-card rounded-xl p-4 card-glow">
        <h3 className="text-sm text-slate-400 mb-3">System Health</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 status-dot" />
            <span className="text-sm">All systems operational</span>
          </div>
          <span className="text-xs text-slate-500">
            {stats.activeAgents}/6 agents active
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-center">
          <div className="p-2 rounded bg-green-500/10 text-green-400">
            <div>🔄</div>
            <div>Heartbeat OK</div>
          </div>
          <div className="p-2 rounded bg-green-500/10 text-green-400">
            <div>⚡</div>
            <div>Workers OK</div>
          </div>
          <div className="p-2 rounded bg-green-500/10 text-green-400">
            <div>📡</div>
            <div>SSE Live</div>
          </div>
        </div>
      </div>
    </div>
  );
}
