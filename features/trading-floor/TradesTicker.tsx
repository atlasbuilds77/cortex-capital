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

export function TradesTicker() {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/fishtank/trades`);
        if (res.ok) setTrades(await res.json());
      } catch {}
    };
    fetchTrades();
    const interval = setInterval(fetchTrades, 60000); // Refresh every min
    return () => clearInterval(interval);
  }, []);

  if (trades.length === 0) return null;

  return (
    <div className="absolute bottom-12 left-0 right-0 z-20 overflow-hidden pointer-events-none">
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
