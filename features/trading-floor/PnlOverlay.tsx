"use client";

import { useState, useEffect } from "react";

const API_BASE = ""; // API is same-origin

export function PnlOverlay() {
  const [pnl, setPnl] = useState<any>(null);

  useEffect(() => {
    const fetchPnl = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/pnl`);
        if (res.ok) setPnl(await res.json());
      } catch {}
    };
    fetchPnl();
    const interval = setInterval(fetchPnl, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!pnl) return null;

  const todayPnl = pnl.todayPnL || 0;
  const totalValue = pnl.accountValue || 0;
  const pctChange = totalValue > 0 ? ((todayPnl / (totalValue - todayPnl)) * 100).toFixed(2) : "0.00";
  const isUp = todayPnl >= 0;

  return (
    <div className="absolute top-20 left-4 z-40 flex items-center gap-4 rounded-2xl bg-black/35 backdrop-blur-md border border-white/10 px-5 py-2.5">
      <div>
        <div className="text-[10px] text-white/30 uppercase tracking-widest font-medium">Portfolio</div>
        <div className="text-lg font-bold text-white tracking-tight">
          ${totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </div>
      </div>
      <div className="w-px h-10 bg-white/10" />
      <div>
        <div className="text-[10px] text-white/30 uppercase tracking-widest font-medium">Today</div>
        <div className={`text-lg font-bold tracking-tight ${isUp ? "text-green-400" : "text-red-400"}`}>
          {isUp ? "+" : "-"}${Math.abs(todayPnl).toLocaleString("en-US", { maximumFractionDigits: 0 })}
          <span className="text-sm ml-1 opacity-70">({pctChange}%)</span>
        </div>
      </div>
      <div className="w-px h-10 bg-white/10" />
      <div>
        <div className="text-[10px] text-white/30 uppercase tracking-widest font-medium">Open</div>
        <div className="text-lg font-bold text-white tracking-tight">
          {pnl.openPositions || 0}
        </div>
      </div>
    </div>
  );
}
