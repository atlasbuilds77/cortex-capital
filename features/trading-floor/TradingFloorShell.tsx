"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import type { OfficeAgent } from "@/features/retro-office/core/types";
import type { OfficeAnimationState } from "@/lib/office/eventTriggers";
import { getAllCortexAgents, CORTEX_AGENTS } from "@/agents/cortex-agents";
import { AgentDiscussionPanel } from "@/features/office/components/AgentDiscussionPanel";
import {
  subscribeToDiscussions,
  type AgentDiscussionMessage,
} from "@/lib/cortex-capital-api";
import { useAuth } from "@/lib/auth";

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

// Tier-based agent access (client-side mirror of server config)
const TIER_AGENT_ACCESS: Record<string, string[]> = {
  free: ['cortex-reporter'],
  recovery: ['cortex-reporter', 'cortex-analyst', 'cortex-strategist'],
  scout: [
    'cortex-reporter', 'cortex-analyst', 'cortex-strategist',
    'cortex-momentum', 'cortex-day-trader', 'cortex-growth', 'cortex-value',
  ],
  operator: [
    'cortex-reporter', 'cortex-analyst', 'cortex-strategist', 'cortex-executor',
    'cortex-momentum', 'cortex-day-trader', 'cortex-options-strategist',
    'cortex-risk', 'cortex-growth', 'cortex-value',
  ],
  partner: [
    'cortex-reporter', 'cortex-analyst', 'cortex-strategist', 'cortex-executor',
    'cortex-momentum', 'cortex-day-trader', 'cortex-options-strategist',
    'cortex-risk', 'cortex-growth', 'cortex-value',
  ],
};

type UserTier = 'free' | 'recovery' | 'scout' | 'operator' | 'partner';

type TradingFloorShellProps = {
  context?: "demo" | "dashboard";
  initialShowDiscussions?: boolean;
  fullHeightClassName?: string;
  userTier?: UserTier; // Optional prop to override
};

export function TradingFloorShell({
  context = "demo",
  initialShowDiscussions = true,
  fullHeightClassName = "h-screen",
  userTier: propTier,
}: TradingFloorShellProps) {
  const { user, token } = useAuth();
  const [tier, setTier] = useState<UserTier>(propTier || (context === 'demo' ? 'operator' : 'free'));
  const [tierLoaded, setTierLoaded] = useState(!!propTier || context === 'demo');
  const [lockedAgents, setLockedAgents] = useState<Set<string>>(new Set());
  const hasTriggeredPortfolioDiscussion = useRef(false);
  
  const [agents, setAgents] = useState<OfficeAgent[]>(() =>
    getAllCortexAgents("working"),
  );
  const [speakingAgentId, setSpeakingAgentId] = useState<string | null>(null);
  const [showDiscussions, setShowDiscussions] = useState(initialShowDiscussions);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [showUpgradePrompt, setShowUpgradePrompt] = useState<string | null>(null);

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

  // Fetch user tier on mount (dashboard context only)
  useEffect(() => {
    if (context === 'demo' || propTier) return;
    
    async function fetchTier() {
      try {
        const res = await fetch('/api/user/tier');
        if (res.ok) {
          const data = await res.json();
          setTier(data.tier || 'free');
        }
      } catch (err) {
        console.error('Failed to fetch tier:', err);
      } finally {
        setTierLoaded(true);
      }
    }
    
    fetchTier();
  }, [context, propTier]);

  // Update locked agents when tier changes
  useEffect(() => {
    const visibleIds = TIER_AGENT_ACCESS[tier] || TIER_AGENT_ACCESS.free;
    const allIds = CORTEX_AGENTS.map(a => a.id);
    const locked = new Set(allIds.filter(id => !visibleIds.includes(id)));
    setLockedAgents(locked);
    
    // Update agents to show locked state (grayed out)
    setAgents(prev => prev.map(agent => ({
      ...agent,
      status: locked.has(agent.id) ? 'idle' : agent.status,
      // Add visual indicator for locked agents
      color: locked.has(agent.id) ? '#4B5563' : CORTEX_AGENTS.find(a => a.id === agent.id)?.color || agent.color,
    })));
  }, [tier]);

  // Check if agent message should be shown based on tier
  const canSeeAgent = useCallback((agentId: string): boolean => {
    const visibleIds = TIER_AGENT_ACCESS[tier] || TIER_AGENT_ACCESS.free;
    return visibleIds.includes(agentId);
  }, [tier]);

  useEffect(() => {
    const unsubscribe = subscribeToDiscussions(
      (message: AgentDiscussionMessage) => {
        if (!message?.agent) return;
        
        const agentRole = message.agent.toUpperCase();
        const agentId = AGENT_ROLE_MAP[agentRole] || `cortex-${message.agent.toLowerCase()}`;

        // Check if user can see this agent
        if (!canSeeAgent(agentId)) {
          // Show upgrade prompt briefly
          setShowUpgradePrompt(agentId);
          setTimeout(() => setShowUpgradePrompt(null), 3000);
          return; // Don't show the message
        }

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
  }, [canSeeAgent]);

  // Sims-like idle behavior - only for non-locked agents
  useEffect(() => {
    const activeAgentIds = agents.filter(a => !lockedAgents.has(a.id)).map(a => a.id);
    if (activeAgentIds.length === 0) return;
    
    const lastChange: Record<string, number> = {};
    activeAgentIds.forEach(id => { lastChange[id] = 0; });

    const assignActivity = (agentId: string) => {
      const now = Date.now();
      if (now - (lastChange[agentId] || 0) < 8000) return;
      lastChange[agentId] = now;

      const roll = Math.random();
      let activity: string;
      if (roll < 0.55) activity = 'desk';
      else if (roll < 0.70) activity = 'gym';
      else if (roll < 0.85) activity = 'phoneBooth';
      else activity = 'smsBooth';
      
      setAnimationState(prev => ({
        ...prev,
        gymHoldByAgentId: { ...prev.gymHoldByAgentId, [agentId]: activity === 'gym' },
        phoneBoothHoldByAgentId: { ...prev.phoneBoothHoldByAgentId, [agentId]: activity === 'phoneBooth' },
        smsBoothHoldByAgentId: { ...prev.smsBoothHoldByAgentId, [agentId]: activity === 'smsBooth' },
        deskHoldByAgentId: { ...prev.deskHoldByAgentId, [agentId]: activity === 'desk' },
      }));
    };

    activeAgentIds.forEach((id, i) => {
      setTimeout(() => assignActivity(id), 1000 + i * 1200);
    });

    const idleLoop = setInterval(() => {
      if (Math.random() < 0.5 && activeAgentIds.length > 0) {
        const agentId = activeAgentIds[Math.floor(Math.random() * activeAgentIds.length)];
        assignActivity(agentId);
      }
    }, 3000);

    return () => clearInterval(idleLoop);
  }, [agents, lockedAgents]);

  const triggerDiscussion = async (type: string, params?: Record<string, any>) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      await fetch(`${API_BASE}/api/fishtank/discussions/trigger`, {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          type, 
          userId: user?.id,
          params,
        }),
      });
    } catch (error) {
      console.error("Failed to trigger discussion:", error);
    }
  };

  // Auto-trigger portfolio discussion when user opens their dashboard
  useEffect(() => {
    if (context !== 'dashboard') return;
    if (hasTriggeredPortfolioDiscussion.current) return;
    if (!tierLoaded) return;
    
    // Only for paid tiers with agent access
    if (tier === 'free') return;
    
    // Wait a moment for the UI to settle, then trigger discussion
    const timer = setTimeout(() => {
      hasTriggeredPortfolioDiscussion.current = true;
      triggerDiscussion('portfolio_review', {
        risk_tolerance: 'moderate',
        horizon: 'medium',
        goals: ['Growth', 'Capital Preservation'],
      });
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [context, tierLoaded, tier, user?.id]);

  // Get tier badge info
  const getTierBadge = () => {
    const badges: Record<UserTier, { label: string; color: string; icon: string }> = {
      free: { label: 'Free', color: 'bg-gray-600', icon: '👁️' },
      recovery: { label: 'Recovery', color: 'bg-blue-600', icon: '📚' },
      scout: { label: 'Scout', color: 'bg-purple-600', icon: '🎯' },
      operator: { label: 'Operator', color: 'bg-green-600', icon: '⚡' },
      partner: { label: 'Partner', color: 'bg-amber-600', icon: '🤝' },
    };
    return badges[tier];
  };

  const tierBadge = getTierBadge();
  const visibleAgentCount = agents.filter(a => !lockedAgents.has(a.id)).length;
  const lockedAgentCount = lockedAgents.size;

  return (
    <div className={`${fullHeightClassName} flex overflow-hidden bg-background text-white`}>
      <div
        className={`relative h-full transition-all duration-300 ${showDiscussions ? "w-full xl:w-2/3" : "w-full"}`}
      >
        {/* Tier badge - top left */}
        {context === 'dashboard' && tierLoaded && (
          <div className="absolute left-4 top-4 z-30 flex items-center gap-2">
            <div className={`${tierBadge.color} rounded-full px-3 py-1 flex items-center gap-1.5`}>
              <span>{tierBadge.icon}</span>
              <span className="text-xs font-bold">{tierBadge.label}</span>
            </div>
            <div className="text-xs text-white/50">
              {visibleAgentCount} agents active
              {lockedAgentCount > 0 && ` • ${lockedAgentCount} locked`}
            </div>
          </div>
        )}

        {/* Upgrade prompt - shows when locked agent tries to speak */}
        {showUpgradePrompt && (
          <div className="absolute left-1/2 top-20 z-40 -translate-x-1/2 animate-fade-in">
            <div className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 shadow-2xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔒</span>
                <div>
                  <p className="text-sm font-semibold">Agent Locked</p>
                  <p className="text-xs text-white/80">Upgrade to see what {showUpgradePrompt.replace('cortex-', '').replace(/-/g, ' ')} is saying</p>
                </div>
                <a 
                  href="/pricing" 
                  className="ml-4 rounded-lg bg-white/20 px-3 py-1 text-xs font-bold hover:bg-white/30 transition"
                >
                  Upgrade
                </a>
              </div>
            </div>
          </div>
        )}

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
            <div className="ml-6 w-3 h-3 bg-black/50 rotate-45 -mt-1.5 border-r border-b border-white/10" />
          </div>
        )}

        {/* Chat toggle - bottom right */}
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
          <AgentDiscussionPanel maxMessages={50} filterByTier={tier} />
        </aside>
      )}
    </div>
  );
}
