"use client";

import { useState, useEffect } from "react";

const API_BASE = ""; // API is same-origin

interface Trade {
  id: string;
  symbol: string;
  side: string;
  qty: number;
  price: number;
  timestamp: string;
}

interface TradesTickerProps {
  context?: "demo" | "dashboard";
}

export function TradesTicker({ context = "demo" }: TradesTickerProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [source, setSource] = useState<string>("loading");

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        // Use user-aware endpoint for dashboard, demo endpoint for demo
        const endpoint = context === "dashboard" 
          ? `${API_BASE}/api/user/trades`
          : `${API_BASE}/api/fishtank/trades`;
          
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          // Handle both formats (user endpoint returns {source, trades}, demo returns array)
          if (Array.isArray(data)) {
            setTrades(data);
            setSource("demo");
          } else {
            setTrades(data.trades || []);
            setSource(data.source || "unknown");
          }
        }
      } catch {}
    };
    fetchTrades();
    const interval = setInterval(fetchTrades, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [context]);

  if (trades.length === 0) return null;

  return (
    <div className="absolute bottom-12 left-0 right-0 z-20 overflow-hidden pointer-events-none">
      {/* Source indicator */}
      {source === "user" && (
        <div className="absolute -top-5 left-4 text-[9px] text-green-400/60 uppercase tracking-wider">
          ● Live Trades
        </div>
      )}
      
      <div className="animate-marquee flex gap-8 whitespace-nowrap">
        {[...trades, ...trades].map((trade, i) => (
          <span
            key={`${trade.id}-${i}`}
            className="inline-flex items-center gap-2 text-[11px] font-mono"
          >
            <span className={trade.side === "buy" ? "text-green-400" : "text-red-400"}>
              {trade.side === "buy" ? "▲" : "▼"}
            </span>
            <span className="text-white/60 font-semibold">{trade.symbol}</span>
            <span className="text-white/30">
              {trade.qty}@${trade.price.toFixed(2)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
