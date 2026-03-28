/**
 * Agent Discussion Panel - Real-time agent conversations
 * 
 * Shows AI agents discussing portfolio, trades, and market conditions.
 * Connects to Cortex Capital backend via SSE for live updates.
 */
"use client";

import { useState, useEffect, useRef } from "react";
import { subscribeToDiscussions, fetchDiscussions, type AgentDiscussionMessage } from "@/lib/cortex-capital-api";

// Agent colors and emojis
const AGENT_STYLES: Record<string, { emoji: string; color: string; gradient: string }> = {
  ANALYST: { emoji: "📊", color: "#3B82F6", gradient: "from-blue-500/20 to-blue-600/10" },
  STRATEGIST: { emoji: "🎯", color: "#8B5CF6", gradient: "from-purple-500/20 to-purple-600/10" },
  DAY_TRADER: { emoji: "⚡", color: "#F59E0B", gradient: "from-amber-500/20 to-amber-600/10" },
  MOMENTUM: { emoji: "🚀", color: "#10B981", gradient: "from-emerald-500/20 to-emerald-600/10" },
  RISK: { emoji: "🛡️", color: "#EF4444", gradient: "from-red-500/20 to-red-600/10" },
  GROWTH: { emoji: "📈", color: "#22C55E", gradient: "from-green-500/20 to-green-600/10" },
  VALUE: { emoji: "💎", color: "#0EA5E9", gradient: "from-sky-500/20 to-sky-600/10" },
  OPTIONS_STRATEGIST: { emoji: "🎲", color: "#EC4899", gradient: "from-pink-500/20 to-pink-600/10" },
  EXECUTOR: { emoji: "🎬", color: "#6366F1", gradient: "from-indigo-500/20 to-indigo-600/10" },
};

function MessageBubble({ message, isLatest }: { message: AgentDiscussionMessage; isLatest: boolean }) {
  const style = AGENT_STYLES[message.agent] || { emoji: "🤖", color: "#6B7280", gradient: "from-gray-500/20 to-gray-600/10" };
  
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
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg"
        style={{ 
          backgroundColor: `${style.color}30`,
          border: `2px solid ${style.color}`,
          boxShadow: `0 0 10px ${style.color}40`
        }}
      >
        {style.emoji}
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
          {message.content}
        </p>
      </div>
    </div>
  );
}

function DiscussionHeader({ topic, participants }: { topic: string; participants?: string[] }) {
  return (
    <div className="px-4 py-2.5 border-b border-white/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          <span className="font-medium text-white/60 text-xs tracking-wide uppercase">{topic}</span>
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

export function AgentDiscussionPanel({ maxMessages = 20 }: { maxMessages?: number }) {
  const [messages, setMessages] = useState<AgentDiscussionMessage[]>([]);
  const [currentTopic, setCurrentTopic] = useState<string>("Agent Discussions");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const latestMessageId = useRef<string | null>(null);

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

  return (
    <div className="flex flex-col h-full bg-gray-950/95 overflow-hidden">
      {/* Header */}
      <DiscussionHeader topic={currentTopic} />
      
      {/* Connection Status */}
      {error && (
        <div className="px-4 py-2 bg-red-900/30 border-b border-red-800">
          <span className="text-red-400 text-xs">⚠️ {error}</span>
        </div>
      )}
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="text-3xl mb-3 opacity-40">💬</div>
            <p className="text-white/30 text-sm">Agents are working...</p>
            <p className="text-white/15 text-xs mt-1">Click Briefing to start a discussion</p>
          </div>
        ) : (
          messages.filter(msg => msg?.id).map((msg, idx) => (
            <MessageBubble 
              key={msg.id} 
              message={msg} 
              isLatest={idx === messages.length - 1}
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
          {messages.length}
        </span>
      </div>
    </div>
  );
}

// Compact version for sidebar
export function AgentDiscussionCompact({ maxMessages = 5 }: { maxMessages?: number }) {
  const [messages, setMessages] = useState<AgentDiscussionMessage[]>([]);

  useEffect(() => {
    fetchDiscussions().then((result) => {
      if (result.success && result.data) {
        setMessages(result.data.messages.slice(-maxMessages));
      }
    });

    const unsubscribe = subscribeToDiscussions(
      (message) => {
        setMessages((prev) => [...prev.slice(-(maxMessages - 1)), message]);
      }
    );

    return () => unsubscribe();
  }, [maxMessages]);

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
