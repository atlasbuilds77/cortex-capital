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

import { OfficeErrorBoundary } from "@/features/retro-office/ErrorBoundary";

const RetroOffice3DInner = dynamic(
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

// Wrap with error boundary to catch crashes
const RetroOffice3D = (props: any) => (
  <OfficeErrorBoundary>
    <RetroOffice3DInner {...props} />
  </OfficeErrorBoundary>
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
  const [standupMeeting, setStandupMeeting] = useState<{
    id: string;
    phase: 'gathering' | 'in_progress' | 'complete';
    participantOrder: string[];
    arrivedAgentIds: string[];
    currentSpeakerAgentId: string | null;
  } | null>(null);

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
  // Wait for auth context to be ready (token synced from cookie if needed)
  useEffect(() => {
    if (context === 'demo' || propTier) return;
    if (!token) {
      // Auth context still loading or not logged in
      setTierLoaded(true);
      return;
    }
    
    async function fetchTier() {
      try {
        const res = await fetch('/api/user/tier', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          console.log('Fetched tier:', data.tier, 'user:', data.user?.email);
          setTier(data.tier || 'free');
        }
      } catch (err) {
        console.error('Failed to fetch tier:', err);
      } finally {
        setTierLoaded(true);
      }
    }
    
    fetchTier();
  }, [context, propTier, token]);

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

  // Sims-like idle behavior - make agents feel ALIVE
  useEffect(() => {
    const activeAgentIds = agents.filter(a => !lockedAgents.has(a.id)).map(a => a.id);
    if (activeAgentIds.length === 0) return;
    
    // Track each agent's current activity and duration
    const agentState: Record<string, { activity: string; since: number; duration: number }> = {};
    
    // Initialize - spread agents across activities
    activeAgentIds.forEach((id, i) => {
      const activities = ['desk', 'desk', 'desk', 'gym', 'phoneBooth', 'smsBooth', 'desk', 'desk'];
      const activity = activities[i % activities.length];
      const duration = 10000 + Math.random() * 20000; // 10-30 seconds per activity
      agentState[id] = { activity, since: Date.now(), duration };
    });

    const applyActivity = (agentId: string, activity: string) => {
      setAnimationState(prev => ({
        ...prev,
        gymHoldByAgentId: { ...prev.gymHoldByAgentId, [agentId]: activity === 'gym' },
        phoneBoothHoldByAgentId: { ...prev.phoneBoothHoldByAgentId, [agentId]: activity === 'phoneBooth' },
        smsBoothHoldByAgentId: { ...prev.smsBoothHoldByAgentId, [agentId]: activity === 'smsBooth' },
        deskHoldByAgentId: { ...prev.deskHoldByAgentId, [agentId]: activity === 'desk' },
        workingUntilByAgentId: { 
          ...prev.workingUntilByAgentId, 
          [agentId]: activity === 'desk' ? Date.now() + 30000 : 0 
        },
      }));
      
      // Also update agent status for visual feedback
      setAgents(prev => prev.map(a => 
        a.id === agentId 
          ? { ...a, status: activity === 'desk' ? 'working' : 'idle' }
          : a
      ));
    };

    // Initial assignment with stagger
    activeAgentIds.forEach((id, i) => {
      setTimeout(() => {
        applyActivity(id, agentState[id].activity);
      }, 500 + i * 300);
    });

    // Main simulation loop - check every 2 seconds
    const simLoop = setInterval(() => {
      const now = Date.now();
      
      activeAgentIds.forEach(agentId => {
        const state = agentState[agentId];
        if (!state) return;
        
        // Check if agent should switch activities
        if (now - state.since > state.duration) {
          // Pick new activity (weighted: desk is most common)
          const roll = Math.random();
          let newActivity: string;
          
          // Don't pick the same activity twice in a row (usually)
          if (roll < 0.50) {
            newActivity = 'desk'; // 50% chance desk
          } else if (roll < 0.65) {
            newActivity = state.activity === 'gym' ? 'desk' : 'gym'; // 15% gym
          } else if (roll < 0.80) {
            newActivity = state.activity === 'phoneBooth' ? 'desk' : 'phoneBooth'; // 15% phone
          } else if (roll < 0.92) {
            newActivity = state.activity === 'smsBooth' ? 'desk' : 'smsBooth'; // 12% SMS
          } else {
            // 8% chance to just wander (clear all holds briefly)
            newActivity = 'wander';
          }
          
          // Update state
          agentState[agentId] = {
            activity: newActivity,
            since: now,
            duration: newActivity === 'wander' 
              ? 3000 + Math.random() * 5000  // Wander for 3-8 seconds
              : 12000 + Math.random() * 25000 // Normal activity 12-37 seconds
          };
          
          // Apply the activity
          if (newActivity === 'wander') {
            // Clear all holds - agent will walk around
            setAnimationState(prev => ({
              ...prev,
              gymHoldByAgentId: { ...prev.gymHoldByAgentId, [agentId]: false },
              phoneBoothHoldByAgentId: { ...prev.phoneBoothHoldByAgentId, [agentId]: false },
              smsBoothHoldByAgentId: { ...prev.smsBoothHoldByAgentId, [agentId]: false },
              deskHoldByAgentId: { ...prev.deskHoldByAgentId, [agentId]: false },
            }));
          } else {
            applyActivity(agentId, newActivity);
          }
        }
      });
    }, 2000);

    return () => clearInterval(simLoop);
  }, [agents.length, lockedAgents.size]); // Only re-run if agent count changes

  const [discussionLoading, setDiscussionLoading] = useState<string | null>(null);

  const triggerDiscussion = async (type: string, params?: Record<string, any>) => {
    try {
      setDiscussionLoading(type);
      // Auto-open the discussion panel
      setShowDiscussions(true);
      
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
    } finally {
      // Keep loading for a bit while agents start responding
      setTimeout(() => setDiscussionLoading(null), 2000);
    }
  };

  // Auto-trigger disabled - users can click Ask Agents buttons if they want a discussion
  // The auto-briefings were too spammy, especially for empty portfolios
  // useEffect(() => {
  //   if (context !== 'dashboard') return;
  //   if (hasTriggeredPortfolioDiscussion.current) return;
  //   if (!tierLoaded) return;
  //   if (tier === 'free') return;
  //   const timer = setTimeout(() => {
  //     hasTriggeredPortfolioDiscussion.current = true;
  //     triggerDiscussion('portfolio_review', {});
  //   }, 3000);
  //   return () => clearTimeout(timer);
  // }, [context, tierLoaded, tier, user?.id]);

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
        {/* Tier badge - below title on mobile, top left on desktop */}
        {context === 'dashboard' && tierLoaded && (
          <div className="absolute left-1/2 -translate-x-1/2 top-16 md:left-4 md:translate-x-0 md:top-4 z-30 flex items-center gap-2">
            <div className={`${tierBadge.color} rounded-full px-2 py-0.5 md:px-3 md:py-1 flex items-center gap-1`}>
              <span className="text-xs">{tierBadge.icon}</span>
              <span className="text-[10px] md:text-xs font-bold">{tierBadge.label}</span>
            </div>
            <div className="hidden md:block text-xs text-white/50">
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

        {/* Quick Actions - bottom left on mobile, top right on desktop */}
        {context === 'dashboard' && tier !== 'free' && (
          <div className="absolute left-4 bottom-14 md:bottom-auto md:right-4 md:left-auto md:top-20 z-30 flex flex-row md:flex-col gap-1.5">
            <button
              onClick={() => triggerDiscussion('portfolio_review')}
              disabled={discussionLoading !== null}
              className={`flex items-center gap-1 rounded-md bg-black/50 px-2 py-1.5 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white hover:bg-black/60 transition-all text-[10px] ${discussionLoading === 'portfolio_review' ? 'animate-pulse border-purple-500/50' : ''}`}
            >
              {discussionLoading === 'portfolio_review' ? '⏳' : '📊'}
              <span className="hidden md:inline">Review</span>
            </button>
            <button
              onClick={() => triggerDiscussion('portfolio_risk')}
              disabled={discussionLoading !== null}
              className={`flex items-center gap-1 rounded-md bg-black/50 px-2 py-1.5 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white hover:bg-black/60 transition-all text-[10px] ${discussionLoading === 'portfolio_risk' ? 'animate-pulse border-purple-500/50' : ''}`}
            >
              {discussionLoading === 'portfolio_risk' ? '⏳' : '🛡️'}
              <span className="hidden md:inline">Risk</span>
            </button>
            <button
              onClick={() => triggerDiscussion('portfolio_opportunities')}
              disabled={discussionLoading !== null}
              className={`flex items-center gap-1 rounded-md bg-black/50 px-2 py-1.5 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white hover:bg-black/60 transition-all text-[10px] ${discussionLoading === 'portfolio_opportunities' ? 'animate-pulse border-purple-500/50' : ''}`}
            >
              {discussionLoading === 'portfolio_opportunities' ? '⏳' : '🚀'}
              <span className="hidden md:inline">Ideas</span>
            </button>
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
          onStandupStartRequested={() => {
            // Round table clicked - gather agents and trigger discussion
            const discussingAgents = ['cortex-analyst', 'cortex-strategist', 'cortex-risk', 'cortex-momentum'];
            
            // Start gathering phase - agents walk to table
            setStandupMeeting({
              id: `meeting-${Date.now()}`,
              phase: 'gathering',
              participantOrder: discussingAgents,
              arrivedAgentIds: [],
              currentSpeakerAgentId: null,
            });
            
            // After 2s, mark as in_progress and trigger discussion
            setTimeout(() => {
              setStandupMeeting(prev => prev ? {
                ...prev,
                phase: 'in_progress',
                arrivedAgentIds: discussingAgents,
                currentSpeakerAgentId: 'cortex-analyst',
              } : null);
              triggerDiscussion('portfolio_review');
            }, 2000);
            
            // End meeting after 30s
            setTimeout(() => {
              setStandupMeeting(null);
            }, 30000);
          }}
          standupMeeting={standupMeeting as any}
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
