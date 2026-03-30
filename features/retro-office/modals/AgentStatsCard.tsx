"use client";

import { X } from "lucide-react";
import type { OfficeAgent } from "@/features/retro-office/core/types";

type AgentStatsCardProps = {
  agent: OfficeAgent;
  onClose: () => void;
  stats?: {
    currentMood?: string;
    recentTrades?: string[];
    trustScore?: number;
  };
};

export function AgentStatsCard({ agent, onClose, stats }: AgentStatsCardProps) {
  const trustScore = stats?.trustScore ?? Math.floor(Math.random() * 30) + 70;
  const mood = stats?.currentMood ?? ["Focused", "Optimistic", "Calculating", "Confident"][Math.floor(Math.random() * 4)];
  const recentTrades = stats?.recentTrades ?? [
    "Long SPY 450c 0DTE",
    "Short TSLA 240p weekly",
    "Scalp QQQ intraday",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        className="relative w-full max-w-md rounded-2xl border-2 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{
          borderColor: agent.color,
          backgroundColor: '#0a0a0a',
          boxShadow: `0 0 40px ${agent.color}40`,
        }}
      >
        {/* Card header */}
        <div 
          className="relative overflow-hidden rounded-t-2xl px-6 py-8"
          style={{
            background: `linear-gradient(135deg, ${agent.color}20, transparent)`,
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 transition-colors hover:bg-black/60 hover:text-white"
            aria-label="Close"
          >
            <X size={14} />
          </button>

          {/* Agent avatar circle */}
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 text-3xl font-bold" style={{
            backgroundColor: agent.color,
            borderColor: '#0a0a0a',
            color: '#0a0a0a',
          }}>
            {agent.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>

          {/* Agent name */}
          <h2 className="text-center text-2xl font-bold text-white">{agent.name}</h2>
          <p className="mt-1 text-center text-sm uppercase tracking-widest text-white/60">{agent.item}</p>

          {/* Status badge */}
          <div className="mt-3 flex justify-center">
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
              agent.status === 'working' 
                ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/40'
                : agent.status === 'error'
                ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40'
                : 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/40'
            }`}>
              {agent.status}
            </span>
          </div>
        </div>

        {/* Card body */}
        <div className="space-y-6 px-6 py-6">
          {/* Current Mood */}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-white/50">Current Mood</h3>
            <p className="text-lg font-semibold" style={{ color: agent.color }}>{mood}</p>
          </div>

          {/* Trust Score */}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-white/50">Trust Score</h3>
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${trustScore}%`,
                    backgroundColor: agent.color,
                  }}
                />
              </div>
              <span className="text-lg font-bold text-white">{trustScore}%</span>
            </div>
          </div>

          {/* Recent Trades */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">Recent Trades</h3>
            <div className="space-y-2">
              {recentTrades.map((trade, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                >
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: agent.color }} />
                  <span className="text-sm text-white/80">{trade}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Role description */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs leading-relaxed text-white/60">
              Trading agent specialized in {agent.item.toLowerCase()}. Analyzing market conditions and executing strategies with precision.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
