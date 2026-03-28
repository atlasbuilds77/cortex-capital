"use client";

import { useState, useEffect } from "react";

const API_BASE = ""; // API is same-origin

interface PnlOverlayProps {
  context?: "demo" | "dashboard";
}

export function PnlOverlay({ context = "demo" }: PnlOverlayProps) {
  const [pnl, setPnl] = useState<any>(null);
  const [source, setSource] = useState<string>("loading");

  useEffect(() => {
    const fetchPnl = async () => {
      try {
        // Use user-aware endpoint for dashboard
        const endpoint = context === "dashboard"
          ? `${API_BASE}/api/user/portfolio`
          : `${API_BASE}/api/pnl`;
          
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          setPnl(data);
          setSource(data.source || "demo");
        }
      } catch {}
    };
    fetchPnl();
    const interval = setInterval(fetchPnl, 15000);
    return () => clearInterval(interval);
  }, [context]);

  if (!pnl) return null;

  const todayPnl = pnl.todayPnL || pnl.todayPnl || 0;
  const totalValue = pnl.accountValue || pnl.portfolioValue || 0;
  const pctChange = totalValue > 0 ? ((todayPnl / (totalValue - todayPnl)) * 100).toFixed(2) : "0.00";
  const isUp = todayPnl >= 0;
  const openPositions = pnl.openPositions ?? pnl.positions?.length ?? 0;

  return (
    <div className="absolute top-20 left-4 z-40 flex items-center gap-4 rounded-2xl bg-black/35 backdrop-blur-md border border-white/10 px-5 py-2.5">
      {/* Source badge */}
      {source === "robinhood" && (
        <div className="absolute -top-2 left-3 bg-green-500/20 border border-green-500/30 rounded-full px-2 py-0.5 text-[8px] text-green-400 font-bold uppercase tracking-wider">
          Live
        </div>
      )}
      
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
          {openPositions}
        </div>
      </div>
    </div>
  );
}
