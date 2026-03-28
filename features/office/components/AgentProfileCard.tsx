"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface AgentProfileCardProps {
  agentId: string;
  onClose: () => void;
}

interface AgentInfo {
  id: string;
  name: string;
  role: string;
  emoji: string;
}

interface Relationship {
  targetAgentId: string;
  targetAgentName: string;
  status: string;
  score: number;
}

interface AgentStats {
  winRate: number;
  totalTrades: number;
  bestSetup: string;
}

const PERSONALITY_SUMMARIES: Record<string, string> = {
  ANALYST: "Methodical, data-obsessed. Trusts numbers over instinct.",
  STRATEGIST: "Chess player. Always thinking 3 moves ahead.",
  DAY_TRADER: "Fast, instinctive. Lives for the open and power hour.",
  MOMENTUM: "Sees markets in waves. Always hunting the next rotation.",
  RISK: "The guardian. Keeps the team alive.",
  EXECUTOR: "Quiet professional. Clean fills, zero ego.",
  REPORTER: "The storyteller. Translates jargon into narratives.",
};

export function AgentProfileCard({ agentId, onClose }: AgentProfileCardProps) {
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [stats, setStats] = useState<AgentStats>({
    winRate: 0,
    totalTrades: 0,
    bestSetup: "—",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch agent info
        const agentsRes = await fetch("/api/phone-booth/agents");
        const agents = await agentsRes.json();
        const agent = agents.find((a: AgentInfo) => a.id === agentId);
        if (agent) {
          setAgentInfo(agent);
        }

        // Fetch relationships
        const relsRes = await fetch(`/api/agents/relationships/${agentId}`);
        const relsData = await relsRes.json();
        setRelationships(relsData.relationships || []);

        // Placeholder stats (will be populated later)
        setStats({
          winRate: Math.floor(Math.random() * 30) + 60, // 60-90%
          totalTrades: Math.floor(Math.random() * 200) + 50,
          bestSetup: ["Bull Flag", "Range Break", "Momentum Fade", "Gap Fill"][
            Math.floor(Math.random() * 4)
          ],
        });
      } catch (error) {
        console.error("Failed to fetch agent data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [agentId]);

  const personality = agentInfo?.role
    ? PERSONALITY_SUMMARIES[agentInfo.role] || "Unknown personality."
    : "";

  const getRelationshipColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "allies":
        return "text-green-400";
      case "cordial":
        return "text-blue-400";
      case "neutral":
        return "text-gray-400";
      case "tense":
        return "text-yellow-400";
      case "rival":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative w-full max-w-2xl bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-white/40">Loading...</div>
            </div>
          ) : agentInfo ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="text-6xl">{agentInfo.emoji}</div>
                <div>
                  <h2 className="text-3xl font-bold text-white">
                    {agentInfo.name}
                  </h2>
                  <div className="text-lg text-white/60">{agentInfo.role}</div>
                </div>
              </div>

              {/* Personality */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-sm font-semibold text-white/60 mb-1">
                  PERSONALITY
                </div>
                <div className="text-white italic">{personality}</div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-2xl font-bold text-white">
                    {stats.winRate}%
                  </div>
                  <div className="text-sm text-white/60">Win Rate</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-2xl font-bold text-white">
                    {stats.totalTrades}
                  </div>
                  <div className="text-sm text-white/60">Total Trades</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-lg font-bold text-white">
                    {stats.bestSetup}
                  </div>
                  <div className="text-sm text-white/60">Best Setup</div>
                </div>
              </div>

              {/* Relationships */}
              {relationships.length > 0 && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-sm font-semibold text-white/60 mb-3">
                    RELATIONSHIPS
                  </div>
                  <div className="space-y-2">
                    {relationships.map((rel) => (
                      <div
                        key={rel.targetAgentId}
                        className="flex items-center justify-between"
                      >
                        <div className="text-white">{rel.targetAgentName}</div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold ${getRelationshipColor(rel.status)}`}
                          >
                            {rel.status}
                          </span>
                          <span className="text-white/40 text-sm">
                            ({rel.score})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action button */}
              <button className="w-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-white/20 rounded-xl py-3 px-6 text-white font-semibold transition-all duration-200 hover:scale-[1.02]">
                Talk to Agent
              </button>
            </div>
          ) : (
            <div className="text-center text-white/60 py-20">
              Agent not found
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
