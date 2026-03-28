// Live P&L display for Cortex Capital in Fish Tank
"use client";

import { useCortexPnL } from "../hooks/useCortexData";
import { formatPnL, getPnLColor } from "@/lib/cortex-capital-api";

export function CortexPnLDisplay() {
  const { pnl, loading, error } = useCortexPnL();

  if (loading) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-32 mb-2"></div>
          <div className="h-8 bg-gray-700 rounded w-24"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 rounded-lg border border-red-700">
        <p className="text-red-400 text-sm">⚠️ {error}</p>
      </div>
    );
  }

  if (!pnl) {
    return null;
  }

  const todayColor = getPnLColor(pnl.todayPnL);
  const totalColor = getPnLColor(pnl.totalPnL);

  return (
    <div className="p-4 bg-gray-900 rounded-lg border border-gray-700 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400">Cortex Capital P&L</h3>
        <span className="text-xs text-gray-500">
          {new Date(pnl.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Today</p>
          <p
            className={`text-2xl font-bold ${
              todayColor === "green"
                ? "text-green-400"
                : todayColor === "red"
                ? "text-red-400"
                : "text-gray-400"
            }`}
          >
            {formatPnL(pnl.todayPnL)}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-1">Total</p>
          <p
            className={`text-2xl font-bold ${
              totalColor === "green"
                ? "text-green-400"
                : totalColor === "red"
                ? "text-red-400"
                : "text-gray-400"
            }`}
          >
            {formatPnL(pnl.totalPnL)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-gray-800">
        <div>
          <p className="text-gray-500">Positions</p>
          <p className="text-white font-medium">{pnl.openPositions}</p>
        </div>
        <div>
          <p className="text-gray-500">Day Trades</p>
          <p className="text-white font-medium">{pnl.dayTrades}</p>
        </div>
        <div>
          <p className="text-gray-500">Buying Power</p>
          <p className="text-white font-medium">${(pnl.buyingPower / 1000).toFixed(1)}k</p>
        </div>
      </div>
    </div>
  );
}
