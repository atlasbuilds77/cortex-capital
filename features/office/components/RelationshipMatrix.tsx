"use client";

import { useEffect, useState } from "react";

// Agent types matching backend - now with avatar images!
const AGENTS = [
  { id: "ANALYST", emoji: "📊", name: "Analyst", avatar: "/avatars/analyst.jpg" },
  { id: "STRATEGIST", emoji: "🎯", name: "Strategist", avatar: "/avatars/strategist.jpg" },
  { id: "DAY_TRADER", emoji: "⚡", name: "Day Trader", avatar: "/avatars/day_trader.jpg" },
  { id: "MOMENTUM", emoji: "🚀", name: "Momentum", avatar: "/avatars/momentum.jpg" },
  { id: "OPTIONS_STRATEGIST", emoji: "🎰", name: "Options Pro", avatar: "/avatars/options_strategist.jpg" },
  { id: "RISK", emoji: "🛡️", name: "Risk", avatar: "/avatars/risk.jpg" },
  { id: "EXECUTOR", emoji: "🎬", name: "Executor", avatar: "/avatars/executor.jpg" },
  { id: "GROWTH", emoji: "📈", name: "Growth", avatar: "/avatars/growth.jpg" },
  { id: "VALUE", emoji: "💎", name: "Value", avatar: "/avatars/value.jpg" },
] as const;

type AgentId = typeof AGENTS[number]["id"];

interface RelationshipData {
  from: AgentId;
  to: AgentId;
  trustScore: number;
  interactionCount: number;
  label: string;
}

interface RelationshipShift {
  from: AgentId;
  to: AgentId;
  delta: number;
  reason: string;
  timestamp: string;
}

interface ApiResponse {
  relationships: RelationshipData[];
  recentShifts: RelationshipShift[];
}

function getTrustColor(score: number): string {
  if (score >= 81) return "bg-green-600/40 border-green-500/60 text-green-100";
  if (score >= 61) return "bg-blue-600/40 border-blue-500/60 text-blue-100";
  if (score >= 41) return "bg-gray-600/40 border-gray-500/60 text-gray-100";
  if (score >= 21) return "bg-orange-600/40 border-orange-500/60 text-orange-100";
  return "bg-red-600/40 border-red-500/60 text-red-100";
}

function getTrustLabel(score: number): string {
  if (score >= 81) return "Partners";
  if (score >= 61) return "Allies";
  if (score >= 41) return "Cordial";
  if (score >= 21) return "Tense";
  return "Rivals";
}

export function RelationshipMatrix() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const apiUrl = ""; // API is same-origin

  useEffect(() => {
    async function fetchRelationships() {
      try {
        const res = await fetch(`${apiUrl}/api/agents/relationships`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        
        // Transform matrix object to relationships array
        let relationships: RelationshipData[] = [];
        if (json.matrix && typeof json.matrix === 'object' && !Array.isArray(json.matrix)) {
          // Matrix is an object like { "ANALYST::STRATEGIST": { score, ... } }
          relationships = Object.entries(json.matrix).map(([key, val]: [string, any]) => {
            const [from, to] = key.split('::');
            return {
              from: from as AgentId,
              to: to as AgentId,
              trustScore: val.score ?? val.trustScore ?? 50,
              interactions: val.interactions ?? 0,
              interactionCount: val.interactions ?? val.interactionCount ?? 0,
              label: val.label ?? getTrustLabel(val.score ?? 50),
            };
          });
        } else if (Array.isArray(json.matrix)) {
          relationships = json.matrix.map((r: any) => ({
            from: (r.agent_a || r.from) as AgentId,
            to: (r.agent_b || r.to) as AgentId,
            trustScore: r.score ?? r.trustScore ?? 50,
            interactions: r.interactions ?? 0,
            interactionCount: r.interactions ?? r.interactionCount ?? 0,
            label: r.label ?? getTrustLabel(r.score ?? 50),
          }));
        }
        
        setData({ 
          relationships, 
          recentShifts: json.recentShifts || [] 
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch");
      } finally {
        setLoading(false);
      }
    }

    fetchRelationships();
    const interval = setInterval(fetchRelationships, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [apiUrl]);

  // Build relationship lookup map
  const relationshipMap = new Map<string, RelationshipData>();
  if (data?.relationships) {
    data.relationships.forEach((rel) => {
      relationshipMap.set(`${rel.from}-${rel.to}`, rel);
    });
  }

  function getRelationship(from: AgentId, to: AgentId): RelationshipData | null {
    return relationshipMap.get(`${from}-${to}`) || null;
  }

  if (loading) {
    return (
      <div className="p-6 bg-black/40 backdrop-blur-sm rounded-lg border border-white/10">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded w-1/3"></div>
          <div className="h-64 bg-white/5 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-black/40 backdrop-blur-sm rounded-lg border border-red-500/30">
        <div className="text-red-400 text-sm">
          <div className="font-semibold mb-1">Failed to load relationships</div>
          <div className="text-xs text-red-400/70">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Agent Relationships</h3>
        <div className="text-xs text-gray-400">
          {data?.relationships.length || 0} connections
        </div>
      </div>

      {/* 7x7 Matrix */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Column headers */}
          <div className="flex">
            <div className="w-24 flex-shrink-0"></div>
            {AGENTS.map((agent) => (
              <div
                key={agent.id}
                className="w-20 flex-shrink-0 text-center text-xs font-medium text-gray-400 pb-2"
              >
                <img 
                  src={agent.avatar} 
                  alt={agent.name}
                  className="w-10 h-10 rounded-full mx-auto mb-1 border border-white/20"
                />
                <div className="truncate px-1">{agent.name}</div>
              </div>
            ))}
          </div>

          {/* Matrix rows */}
          {AGENTS.map((rowAgent) => (
            <div key={rowAgent.id} className="flex items-center">
              {/* Row header */}
              <div className="w-24 flex-shrink-0 text-right pr-3 text-xs font-medium text-gray-400">
                <div className="flex items-center justify-end gap-2">
                  <span className="truncate">{rowAgent.name}</span>
                  <img 
                    src={rowAgent.avatar} 
                    alt={rowAgent.name}
                    className="w-8 h-8 rounded-full border border-white/20"
                  />
                </div>
              </div>

              {/* Cells */}
              {AGENTS.map((colAgent) => {
                const rel = getRelationship(rowAgent.id, colAgent.id);
                const cellKey = `${rowAgent.id}-${colAgent.id}`;
                const isHovered = hoveredCell === cellKey;
                const isDiagonal = rowAgent.id === colAgent.id;

                if (isDiagonal) {
                  return (
                    <div
                      key={cellKey}
                      className="w-20 h-16 flex-shrink-0 p-1"
                    >
                      <div className="h-full bg-gray-900/50 rounded border border-gray-700/50"></div>
                    </div>
                  );
                }

                if (!rel) {
                  return (
                    <div
                      key={cellKey}
                      className="w-20 h-16 flex-shrink-0 p-1"
                    >
                      <div className="h-full bg-black/30 rounded border border-white/5 flex items-center justify-center">
                        <span className="text-xs text-gray-600">—</span>
                      </div>
                    </div>
                  );
                }

                const colorClass = getTrustColor(rel.trustScore);

                return (
                  <div
                    key={cellKey}
                    className="w-20 h-16 flex-shrink-0 p-1 relative group"
                    onMouseEnter={() => setHoveredCell(cellKey)}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    <div
                      className={`h-full rounded border transition-all duration-200 flex flex-col items-center justify-center text-center ${colorClass} ${
                        isHovered ? "scale-105 shadow-lg" : ""
                      }`}
                    >
                      <div className="text-lg font-bold">{rel.trustScore}</div>
                      <div className="text-[10px] leading-tight opacity-90">
                        {rel.label}
                      </div>
                    </div>

                    {/* Hover tooltip */}
                    {isHovered && (
                      <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 border border-white/20 rounded-lg shadow-xl whitespace-nowrap">
                        <div className="text-xs text-white font-medium">
                          {rowAgent.emoji} → {colAgent.emoji}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {rel.interactionCount} interactions
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {getTrustLabel(rel.trustScore)} ({rel.trustScore})
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Shifts */}
      {data?.recentShifts && data.recentShifts.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-white/10">
          <h4 className="text-sm font-semibold text-gray-300">Recent Shifts</h4>
          <div className="space-y-2">
            {data.recentShifts.slice(0, 5).map((shift, idx) => {
              const fromAgent = AGENTS.find((a) => a.id === shift.from);
              const toAgent = AGENTS.find((a) => a.id === shift.to);
              const deltaColor =
                shift.delta > 0
                  ? "text-green-400"
                  : shift.delta < 0
                  ? "text-red-400"
                  : "text-gray-400";

              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-1.5 text-sm flex-shrink-0">
                    <span>{fromAgent?.emoji}</span>
                    <span className="text-gray-500">→</span>
                    <span>{toAgent?.emoji}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-mono font-semibold ${deltaColor}`}>
                        {shift.delta > 0 ? "+" : ""}
                        {shift.delta}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(shift.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {shift.reason}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-600/40 border border-green-500/60"></div>
          <span className="text-xs text-gray-400">81-100 Partners</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-600/40 border border-blue-500/60"></div>
          <span className="text-xs text-gray-400">61-80 Allies</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-600/40 border border-gray-500/60"></div>
          <span className="text-xs text-gray-400">41-60 Cordial</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-orange-600/40 border border-orange-500/60"></div>
          <span className="text-xs text-gray-400">21-40 Tense</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-600/40 border border-red-500/60"></div>
          <span className="text-xs text-gray-400">0-20 Rivals</span>
        </div>
      </div>
    </div>
  );
}
