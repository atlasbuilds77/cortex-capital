"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { OfficeAgent } from "@/features/retro-office/core/types";
import type { OfficeAnimationState } from "@/lib/office/eventTriggers";
import { getAllCortexAgents } from "@/agents/cortex-agents";
import { AgentDiscussionPanel } from "@/features/office/components/AgentDiscussionPanel";
import {
  subscribeToDiscussions,
  type AgentDiscussionMessage,
} from "@/lib/cortex-capital-api";

const API_BASE = ""; // API is same-origin

const RetroOffice3D = dynamic(
  () =>
    import("@/features/retro-office/RetroOffice3D").then((mod) => ({
      default: mod.RetroOffice3D,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-background text-white">
        <div className="text-center">
          <div className="mb-4 text-4xl">C</div>
          <div className="text-xl font-semibold">Loading Trading Floor</div>
          <div className="mt-2 text-sm text-text-secondary">Initializing 3D office</div>
        </div>
      </div>
    ),
  },
);

const AGENT_ROLE_MAP: Record<string, string> = {
  ANALYST: "cortex-analyst",
  STRATEGIST: "cortex-strategist",
  RISK: "cortex-risk",
  EXECUTOR: "cortex-executor",
  MOMENTUM: "cortex-momentum",
  GROWTH: "cortex-growth",
  VALUE: "cortex-value",
  DAY_TRADER: "cortex-day-trader",
  OPTIONS_STRATEGIST: "cortex-options-strategist",
  REPORTER: "cortex-reporter",
};

type TradingFloorShellProps = {
  context?: "demo" | "dashboard";
  initialShowDiscussions?: boolean;
  fullHeightClassName?: string;
};

export function TradingFloorShell({
  context = "demo",
  initialShowDiscussions = true,
  fullHeightClassName = "h-screen",
}: TradingFloorShellProps) {
  const [agents, setAgents] = useState<OfficeAgent[]>(() =>
    getAllCortexAgents("working"),
  );
  const [speakingAgentId, setSpeakingAgentId] = useState<string | null>(null);
  const [showDiscussions, setShowDiscussions] = useState(initialShowDiscussions);
  const [lastMessage, setLastMessage] = useState<string>("");

  const [animationState, setAnimationState] = useState<OfficeAnimationState>({
    awaitingApprovalByAgentId: {},
    cleaningCues: [],
    deskHoldByAgentId: {},
    githubHoldByAgentId: {},
    gymHoldByAgentId: {},
    manualGymUntilByAgentId: {},
    pendingStandupRequest: null,
    phoneBoothHoldByAgentId: {},
    phoneCallByAgentId: {},
    qaHoldByAgentId: {},
    smsBoothHoldByAgentId: {},
    skillGymHoldByAgentId: {},
    streamingByAgentId: {},
    textMessageByAgentId: {},
    thinkingByAgentId: {},
    workingUntilByAgentId: {},
  });

  useEffect(() => {
    const unsubscribe = subscribeToDiscussions(
      (message: AgentDiscussionMessage) => {
        if (!message?.agent) return; // Guard against malformed messages
        
        const agentRole = message.agent.toUpperCase();
        const agentId = AGENT_ROLE_MAP[agentRole] || `cortex-${message.agent.toLowerCase()}`;

        setSpeakingAgentId(agentId);
        setLastMessage(message.content || '');

        setAgents((prev) =>
          prev.map((agent) => ({
            ...agent,
            status: agent.id === agentId ? "working" : agent.status,
          })),
        );

        setAnimationState((prev) => ({
          ...prev,
          thinkingByAgentId: {
            ...prev.thinkingByAgentId,
            [agentId]: true,
          },
        }));

        const timeout = window.setTimeout(() => {
          setSpeakingAgentId(null);
          setAnimationState((prev) => ({
            ...prev,
            thinkingByAgentId: {
              ...prev.thinkingByAgentId,
              [agentId]: false,
            },
          }));
        }, 5000);

        return () => window.clearTimeout(timeout);
      },
      (discussion) => {
        const participants = discussion?.participants || [];
        setAgents((prev) =>
          prev.map((agent) => ({
            ...agent,
            status: participants.some(
              (participant: string) =>
                AGENT_ROLE_MAP[participant.toUpperCase()] === agent.id ||
                `cortex-${participant.toLowerCase()}` === agent.id,
            )
              ? "working"
              : agent.status,
          })),
        );
      },
      () => {
        setAgents((prev) =>
          prev.map((agent) => ({
            ...agent,
            status: "idle",
          })),
        );
      },
    );

    return () => unsubscribe();
  }, []);

  // Sims-like idle behavior - agents naturally move around
  useEffect(() => {
    const agentIds = agents.map(a => a.id);
    if (agentIds.length === 0) return;
    
    // Track when each agent last changed activity
    const lastChange: Record<string, number> = {};
    agentIds.forEach(id => { lastChange[id] = 0; });

    const assignActivity = (agentId: string) => {
      const now = Date.now();
      // Don't change if agent changed less than 8s ago
      if (now - (lastChange[agentId] || 0) < 8000) return;
      lastChange[agentId] = now;

      // Weighted activities: mostly desk, occasionally other things
      const roll = Math.random();
      let activity: string;
      if (roll < 0.55) activity = 'desk';        // 55% - working at desk
      else if (roll < 0.70) activity = 'gym';     // 15% - working out
      else if (roll < 0.85) activity = 'phoneBooth'; // 15% - phone call
      else activity = 'smsBooth';                 // 15% - texting
      
      setAnimationState(prev => ({
        ...prev,
        gymHoldByAgentId: { ...prev.gymHoldByAgentId, [agentId]: activity === 'gym' },
        phoneBoothHoldByAgentId: { ...prev.phoneBoothHoldByAgentId, [agentId]: activity === 'phoneBooth' },
        smsBoothHoldByAgentId: { ...prev.smsBoothHoldByAgentId, [agentId]: activity === 'smsBooth' },
        deskHoldByAgentId: { ...prev.deskHoldByAgentId, [agentId]: activity === 'desk' },
      }));
    };

    // Stagger initial assignments
    agentIds.forEach((id, i) => {
      setTimeout(() => assignActivity(id), 1000 + i * 1200);
    });

    // Every 3 seconds, maybe change ONE agent (50% chance)
    const idleLoop = setInterval(() => {
      if (Math.random() < 0.5) {
        const agentId = agentIds[Math.floor(Math.random() * agentIds.length)];
        assignActivity(agentId);
      }
    }, 3000);

    return () => clearInterval(idleLoop);
  }, [agents]);

  const triggerDiscussion = async (type: string) => {
    try {
      await fetch(`${API_BASE}/api/fishtank/discussions/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
    } catch (error) {
      console.error("Failed to trigger discussion:", error);
    }
  };

  return (
    <div className={`${fullHeightClassName} flex overflow-hidden bg-background text-white`}>
      <div
        className={`relative h-full transition-all duration-300 ${showDiscussions ? "w-full xl:w-2/3" : "w-full"}`}
      >
        {/* Speech bubble - shows when agent is talking */}
        {speakingAgentId && lastMessage && (
          <div className="absolute left-4 bottom-16 z-30 max-w-sm animate-fade-in">
            <div className="rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 px-4 py-3 shadow-2xl">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base">
                  {speakingAgentId.includes('analyst') ? '📊' : 
                   speakingAgentId.includes('strategist') ? '🎯' : 
                   speakingAgentId.includes('day') ? '⚡' : 
                   speakingAgentId.includes('momentum') ? '🚀' : 
                   speakingAgentId.includes('risk') ? '🛡️' : 
                   speakingAgentId.includes('executor') ? '🎬' : 
                   speakingAgentId.includes('reporter') ? '📰' : '🤖'}
                </span>
                <span className="text-xs font-bold text-white/80 uppercase tracking-wide">
                  {speakingAgentId.replace("cortex-", "").replace(/-/g, " ")}
                </span>
              </div>
              <p className="text-sm text-white/70 leading-relaxed line-clamp-3">{lastMessage}</p>
            </div>
            {/* Speech bubble tail */}
            <div className="ml-6 w-3 h-3 bg-black/50 rotate-45 -mt-1.5 border-r border-b border-white/10" />
          </div>
        )}

        {/* Minimal chat toggle - bottom right */}
        <button
          onClick={() => setShowDiscussions((prev) => !prev)}
          className="absolute right-4 bottom-4 z-30 flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5 backdrop-blur-sm border border-white/5 transition-all hover:bg-black/50 cursor-pointer"
        >
          <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] font-medium text-white/50">{showDiscussions ? "✕" : "💬"}</span>
        </button>

        <RetroOffice3D
          agents={agents}
          animationState={animationState}
          officeTitle="Cortex Capital"
          officeTitleLoaded
          gatewayStatus="connected"
        />
      </div>

      {showDiscussions && (
        <aside className="absolute right-0 top-0 bottom-0 w-80 z-20 border-l border-white/5 bg-black/60 backdrop-blur-xl">
          <AgentDiscussionPanel maxMessages={50} />
        </aside>
      )}
    </div>
  );
}
