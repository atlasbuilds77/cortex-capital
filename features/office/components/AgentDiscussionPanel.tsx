/**
 * Agent Discussion Panel - Real-time agent conversations
 * 
 * Shows AI agents discussing portfolio, trades, and market conditions.
 * Connects to Cortex Capital backend via SSE for live updates.
 * Supports tier-based filtering for paid features.
 */
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { subscribeToDiscussions, fetchDiscussions, type AgentDiscussionMessage } from "@/lib/cortex-capital-api";

// Tier-based agent access (must match server)
const TIER_AGENT_ACCESS: Record<string, string[]> = {
  free: ['REPORTER'],
  recovery: ['REPORTER', 'ANALYST', 'STRATEGIST'],
  scout: ['REPORTER', 'ANALYST', 'STRATEGIST', 'MOMENTUM', 'DAY_TRADER', 'GROWTH', 'VALUE'],
  operator: ['REPORTER', 'ANALYST', 'STRATEGIST', 'EXECUTOR', 'MOMENTUM', 'DAY_TRADER', 'OPTIONS_STRATEGIST', 'RISK', 'GROWTH', 'VALUE'],
  partner: ['REPORTER', 'ANALYST', 'STRATEGIST', 'EXECUTOR', 'MOMENTUM', 'DAY_TRADER', 'OPTIONS_STRATEGIST', 'RISK', 'GROWTH', 'VALUE'],
};

// Import shared agent config for avatars
import { AGENTS } from "@/lib/agents/agent-config";
import Image from "next/image";

// Agent colors and avatars (using images, fallback to emojis)
const AGENT_STYLES: Record<string, { emoji: string; avatar: string; color: string; gradient: string }> = {
  ANALYST: { emoji: "📊", avatar: "/avatars/analyst.jpg", color: "#3B82F6", gradient: "from-blue-500/20 to-blue-600/10" },
  STRATEGIST: { emoji: "🎯", avatar: "/avatars/strategist.jpg", color: "#8B5CF6", gradient: "from-purple-500/20 to-purple-600/10" },
  DAY_TRADER: { emoji: "⚡", avatar: "/avatars/day_trader.jpg", color: "#F59E0B", gradient: "from-amber-500/20 to-amber-600/10" },
  MOMENTUM: { emoji: "🚀", avatar: "/avatars/momentum.jpg", color: "#10B981", gradient: "from-emerald-500/20 to-emerald-600/10" },
  RISK: { emoji: "🛡️", avatar: "/avatars/risk.jpg", color: "#EF4444", gradient: "from-red-500/20 to-red-600/10" },
  GROWTH: { emoji: "📈", avatar: "/avatars/growth.jpg", color: "#22C55E", gradient: "from-green-500/20 to-green-600/10" },
  VALUE: { emoji: "💎", avatar: "/avatars/value.jpg", color: "#0EA5E9", gradient: "from-sky-500/20 to-sky-600/10" },
  OPTIONS_STRATEGIST: { emoji: "🎲", avatar: "/avatars/options_strategist.jpg", color: "#EC4899", gradient: "from-pink-500/20 to-pink-600/10" },
  EXECUTOR: { emoji: "🎬", avatar: "/avatars/executor.jpg", color: "#6366F1", gradient: "from-indigo-500/20 to-indigo-600/10" },
  REPORTER: { emoji: "📰", avatar: "/avatars/analyst.jpg", color: "#94A3B8", gradient: "from-slate-500/20 to-slate-600/10" },
};

type UserTier = 'free' | 'recovery' | 'scout' | 'operator' | 'partner';

function MessageBubble({ message, isLatest, isLocked }: { message: AgentDiscussionMessage; isLatest: boolean; isLocked?: boolean }) {
  const style = AGENT_STYLES[message.agent] || { emoji: "🤖", color: "#6B7280", gradient: "from-gray-500/20 to-gray-600/10" };
  
  if (isLocked) {
    return (
      <div className="flex gap-3 p-4 rounded-xl bg-gray-800/30 border border-white/5 opacity-60">
        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl bg-gray-700/50 border-2 border-gray-600">
          🔒
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-sm text-gray-500">
              {message.agent} (Locked)
            </span>
          </div>
          <p className="text-sm text-gray-500 italic">
            Upgrade to see this message
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className={`
        flex gap-3 p-4 rounded-xl transition-all duration-500
        bg-gradient-to-r ${style.gradient}
        border-l-4 ${isLatest ? 'animate-pulse-once' : ''}
      `}
      style={{ borderLeftColor: style.color }}
    >
      {/* Agent Avatar */}
      <div
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg overflow-hidden"
        style={{
          backgroundColor: `${style.color}30`,
          border: `2px solid ${style.color}`,
          boxShadow: `0 0 10px ${style.color}40`
        }}
      >
        <Image
          src={style.avatar}
          alt={message.agent}
          width={40}
          height={40}
          className="object-cover"
          onError={(e) => {
            // Fallback to emoji if image fails
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = style.emoji;
            }
          }}
        />
      </div>
      
      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span 
            className="font-semibold text-sm"
            style={{ color: style.color }}
          >
            {message.role || message.agent}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
          {message.content
            ?.replace(/\*\*(.*?)\*\*/g, '$1')  // Remove **bold**
            ?.replace(/\*(.*?)\*/g, '$1')       // Remove *italic*
            ?.replace(/`(.*?)`/g, '$1')         // Remove `code`
            ?.replace(/#{1,3}\s/g, '')          // Remove ### headers
          }
        </p>
      </div>
    </div>
  );
}

function DiscussionHeader({ topic, participants, tier }: { topic: string; participants?: string[]; tier?: UserTier }) {
  const tierInfo = {
    free: { label: 'Free', color: 'text-gray-400' },
    recovery: { label: 'Recovery', color: 'text-blue-400' },
    scout: { label: 'Scout', color: 'text-purple-400' },
    operator: { label: 'Operator', color: 'text-green-400' },
    partner: { label: 'Partner', color: 'text-amber-400' },
  };
  
  const info = tier ? tierInfo[tier] : null;
  
  return (
    <div className="px-4 py-2.5 border-b border-white/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          <span className="font-medium text-white/60 text-xs tracking-wide uppercase">{topic}</span>
          {info && (
            <span className={`text-[10px] ${info.color} ml-2`}>
              {info.label}
            </span>
          )}
        </div>
        {participants && (
          <div className="flex -space-x-1">
            {participants.slice(0, 5).map((p, i) => {
              const style = AGENT_STYLES[p] || { emoji: "🤖", color: "#6B7280" };
              return (
                <div
                  key={p}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 border-gray-900"
                  style={{ backgroundColor: style.color }}
                  title={p}
                >
                  {style.emoji}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function AgentDiscussionPanel({ 
  maxMessages = 20,
  filterByTier,
}: { 
  maxMessages?: number;
  filterByTier?: UserTier;
}) {
  const [messages, setMessages] = useState<AgentDiscussionMessage[]>([]);
  const [currentTopic, setCurrentTopic] = useState<string>("Agent Discussions");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const latestMessageId = useRef<string | null>(null);

  // Get allowed agents for this tier
  const allowedAgents = useMemo(() => {
    if (!filterByTier) return null; // No filtering
    return new Set(TIER_AGENT_ACCESS[filterByTier] || TIER_AGENT_ACCESS.free);
  }, [filterByTier]);

  // Check if agent is accessible
  const canSeeAgent = (agentName: string): boolean => {
    if (!allowedAgents) return true;
    return allowedAgents.has(agentName.toUpperCase());
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    if (messages.length > 0) {
      latestMessageId.current = messages[messages.length - 1].id;
    }
  }, [messages]);

  // Connect to SSE stream
  useEffect(() => {
    // First fetch existing messages
    fetchDiscussions().then((result) => {
      if (result.success && result.data) {
        setMessages(result.data.messages.slice(-maxMessages));
        if (result.data.activeDiscussions.length > 0) {
          setCurrentTopic(result.data.activeDiscussions[0].topic);
        }
      }
    });

    // Then subscribe to live updates
    const unsubscribe = subscribeToDiscussions(
      (message) => {
        if (!message?.id) return; // Guard against malformed messages
        setMessages((prev) => [...prev.slice(-(maxMessages - 1)), message]);
        if (message.discussionTopic) {
          setCurrentTopic(message.discussionTopic);
        }
        setConnected(true);
      },
      (discussion) => {
        if (discussion?.topic) {
          setCurrentTopic(discussion.topic);
        }
        setConnected(true);
      },
      undefined,
      (history) => {
        setMessages(history.slice(-maxMessages));
        setConnected(true);
      }
    );

    setConnected(true);

    return () => {
      unsubscribe();
    };
  }, [maxMessages]);

  // Filter and prepare messages for display
  const displayMessages = useMemo(() => {
    return messages.filter(msg => msg?.id).map(msg => ({
      ...msg,
      isLocked: !canSeeAgent(msg.agent),
    }));
  }, [messages, allowedAgents]);

  const visibleCount = displayMessages.filter(m => !m.isLocked).length;
  const lockedCount = displayMessages.filter(m => m.isLocked).length;

  return (
    <div className="flex flex-col h-full bg-gray-950/95 overflow-hidden">
      {/* Header */}
      <DiscussionHeader topic={currentTopic} tier={filterByTier} />
      
      {/* Connection Status */}
      {error && (
        <div className="px-4 py-2 bg-red-900/30 border-b border-red-800">
          <span className="text-red-400 text-xs">⚠️ {error}</span>
        </div>
      )}
      
      {/* Locked messages notice */}
      {lockedCount > 0 && (
        <div className="px-4 py-2 bg-purple-900/20 border-b border-purple-800/30">
          <div className="flex items-center justify-between">
            <span className="text-purple-300 text-xs">
              🔒 {lockedCount} messages from locked agents
            </span>
            <a href="/pricing" className="text-purple-400 text-xs hover:text-purple-300">
              Upgrade →
            </a>
          </div>
        </div>
      )}
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {displayMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="text-3xl mb-3 opacity-40">💬</div>
            <p className="text-white/30 text-sm">Agents are working...</p>
            <p className="text-white/15 text-xs mt-1">Click Briefing to start a discussion</p>
          </div>
        ) : (
          displayMessages.map((msg, idx) => (
            <MessageBubble 
              key={msg.id} 
              message={msg} 
              isLatest={idx === displayMessages.length - 1}
              isLocked={msg.isLocked}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Footer */}
      <div className="px-4 py-1.5 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`} />
          <span className="text-[10px] text-white/30">
            {connected ? 'Live' : 'Connecting...'}
          </span>
        </div>
        <span className="text-[10px] text-white/20">
          {visibleCount} visible {lockedCount > 0 ? `• ${lockedCount} locked` : ''}
        </span>
      </div>
    </div>
  );
}

// Compact version for sidebar
export function AgentDiscussionCompact({ maxMessages = 5, filterByTier }: { maxMessages?: number; filterByTier?: UserTier }) {
  const [messages, setMessages] = useState<AgentDiscussionMessage[]>([]);

  const allowedAgents = useMemo(() => {
    if (!filterByTier) return null;
    return new Set(TIER_AGENT_ACCESS[filterByTier] || TIER_AGENT_ACCESS.free);
  }, [filterByTier]);

  useEffect(() => {
    fetchDiscussions().then((result) => {
      if (result.success && result.data) {
        let msgs = result.data.messages;
        if (allowedAgents) {
          msgs = msgs.filter(m => allowedAgents.has(m.agent.toUpperCase()));
        }
        setMessages(msgs.slice(-maxMessages));
      }
    });

    const unsubscribe = subscribeToDiscussions(
      (message) => {
        if (allowedAgents && !allowedAgents.has(message.agent.toUpperCase())) {
          return; // Skip locked agents
        }
        setMessages((prev) => [...prev.slice(-(maxMessages - 1)), message]);
      }
    );

    return () => unsubscribe();
  }, [maxMessages, allowedAgents]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        <span className="text-xs font-medium text-gray-400">Agent Discussion</span>
      </div>
      {messages.slice(-3).map((msg) => {
        const style = AGENT_STYLES[msg.agent] || { emoji: "🤖", color: "#6B7280" };
        return (
          <div key={msg.id} className="flex items-start gap-2 p-2 bg-gray-800/50 rounded-lg">
            <span>{style.emoji}</span>
            <p className="text-xs text-gray-300 line-clamp-2">{msg.content}</p>
          </div>
        );
      })}
    </div>
  );
}
