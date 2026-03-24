// Recent trades feed for Cortex Capital in Fish Tank
"use client";

import { useCortexTrades } from "../hooks/useCortexData";
import type { CortexTrade } from "@/lib/cortex-capital-api";
import { AlertTriangle } from "lucide-react";

function TradeCard({ trade }: { trade: CortexTrade }) {
  const actionColor = {
    BUY: "text-green-400 bg-green-900/20",
    SELL: "text-red-400 bg-red-900/20",
    CLOSE: "text-blue-400 bg-blue-900/20",
  }[trade.action];

  const profitColor = trade.profit
    ? trade.profit > 0
      ? "text-green-400"
      : "text-red-400"
    : "text-gray-400";

  return (
    <div className="p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${actionColor}`}>
            {trade.action}
          </span>
          <span className="text-white font-medium">{trade.ticker}</span>
        </div>
        <span className="text-xs text-gray-500">
          {new Date(trade.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-gray-500">Qty:</span>{" "}
          <span className="text-white">{trade.quantity}</span>
        </div>
        <div>
          <span className="text-gray-500">@</span>{" "}
          <span className="text-white">${trade.price.toFixed(2)}</span>
        </div>
        {trade.profit !== undefined && (
          <div>
            <span className="text-gray-500">P&L:</span>{" "}
            <span className={profitColor}>
              {trade.profit > 0 ? "+" : ""}${trade.profit.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
        <span>{trade.agentRole}</span>
        {trade.strategyType && (
          <>
            <span>-</span>
            <span>{trade.strategyType}</span>
          </>
        )}
      </div>
    </div>
  );
}

export function CortexTradesFeed({ limit = 10 }: { limit?: number }) {
  const { trades, loading, error } = useCortexTrades(limit);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="p-3 bg-gray-800 rounded-lg border border-gray-700 animate-pulse"
          >
            <div className="h-4 bg-gray-700 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-48"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 rounded-lg border border-red-700">
        <p className="text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </p>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 text-center">
        <p className="text-gray-500 text-sm">No recent trades</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-400">Recent Trades</h3>
        <span className="text-xs text-gray-500">{trades.length} trades</span>
      </div>
      {trades.map((trade) => (
        <TradeCard key={trade.id} trade={trade} />
      ))}
    </div>
  );
}
