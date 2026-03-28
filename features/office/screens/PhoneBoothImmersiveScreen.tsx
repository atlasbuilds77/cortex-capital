"use client";

import { useState, useRef, useEffect } from "react";
import { PhoneCall, Send, X, ArrowLeft } from "lucide-react";
import type { MockPhoneCallScenario } from "@/lib/office/call/types";

export type PhoneCallStep =
  | "dialing"
  | "ringing"
  | "speaking"
  | "reply"
  | "complete";

const AGENTS = [
  { id: "ANALYST", name: "Analyst", role: "Market Analyst", avatar: "📊", color: "#3B82F6" },
  { id: "STRATEGIST", name: "Strategist", role: "Chief Strategist", avatar: "🎯", color: "#8B5CF6" },
  { id: "DAY_TRADER", name: "Day Trader", role: "Day Trader", avatar: "⚡", color: "#F59E0B" },
  { id: "MOMENTUM", name: "Momentum", role: "Sector Rotation", avatar: "🚀", color: "#10B981" },
  { id: "OPTIONS_STRATEGIST", name: "Options Strategist", role: "Options Specialist", avatar: "📐", color: "#EC4899" },
  { id: "RISK", name: "Risk", role: "Risk Manager", avatar: "🛡️", color: "#EF4444" },
  { id: "EXECUTOR", name: "Executor", role: "Trade Executor", avatar: "🎬", color: "#6366F1" },
  { id: "GROWTH", name: "Growth", role: "Growth Advocate", avatar: "📈", color: "#22C55E" },
  { id: "VALUE", name: "Value", role: "Value Investor", avatar: "💎", color: "#0EA5E9" },
  { id: "REPORTER", name: "Reporter", role: "Market Reporter", avatar: "📰", color: "#F97316" },
];

const API_BASE = ""; // API is same-origin

interface ChatMessage {
  role: "user" | "agent";
  content: string;
  agentName?: string;
  avatar?: string;
}

function AgentChatScreen({ 
  agent, 
  onBack 
}: { 
  agent: typeof AGENTS[0]; 
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/phone-booth/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agent.id,
          userId: "demo-user",
          message: userMsg,
        }),
      });
      const data = await res.json();
      
      setMessages(prev => [...prev, {
        role: "agent",
        content: data.content || "...",
        agentName: agent.name,
        avatar: agent.avatar,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "agent",
        content: "Connection lost. Try again.",
        agentName: agent.name,
        avatar: agent.avatar,
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_top,#0f172a_0%,#050816_46%,#02030a_100%)] text-white flex flex-col">
      {/* Grid overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(56,189,248,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
      
      {/* Header */}
      <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b border-white/5">
        <button onClick={onBack} className="text-white/40 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2"
          style={{ borderColor: agent.color, backgroundColor: `${agent.color}20` }}
        >
          {agent.avatar}
        </div>
        <div>
          <div className="font-bold text-lg" style={{ color: agent.color }}>{agent.name}</div>
          <div className="text-xs text-white/40">{agent.role} • Online</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-white/30 uppercase tracking-widest">Live</span>
        </div>
      </div>

      {/* Messages */}
      <div className="relative z-10 flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-4">{agent.avatar}</div>
            <p className="text-white/30 text-sm">Ask {agent.name} anything about markets</p>
            <div className="flex flex-wrap gap-2 mt-4 max-w-md justify-center">
              {[
                "What are you watching today?",
                "What's your take on NVDA?",
                "Any setups you like?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/50 hover:bg-white/10 hover:text-white transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "agent" && (
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-1"
                style={{ backgroundColor: `${agent.color}20`, border: `1px solid ${agent.color}40` }}
              >
                {msg.avatar}
              </div>
            )}
            <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-blue-600/30 border border-blue-500/20 text-white"
                : "bg-white/5 border border-white/10 text-white/80"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
              style={{ backgroundColor: `${agent.color}20`, border: `1px solid ${agent.color}40` }}
            >
              {agent.avatar}
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="relative z-10 px-6 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder={`Message ${agent.name}...`}
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/20"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="text-white/40 hover:text-white disabled:opacity-20 transition-all"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function PhoneBoothImmersiveScreen({
  scenario,
  step,
  typedDigits,
}: {
  scenario: MockPhoneCallScenario;
  step: PhoneCallStep;
  typedDigits: string;
}) {
  const [selectedAgent, setSelectedAgent] = useState<typeof AGENTS[0] | null>(null);

  // If an agent is selected, show the chat
  if (selectedAgent) {
    return <AgentChatScreen agent={selectedAgent} onBack={() => setSelectedAgent(null)} />;
  }

  // Agent selection screen
  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_top,#0f172a_0%,#050816_46%,#02030a_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(56,189,248,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
      
      <div className="relative flex h-full flex-col items-center justify-center px-8 py-10">
        <div className="flex items-center gap-3 mb-8">
          <PhoneCall className="w-6 h-6 text-sky-400" />
          <h2 className="text-2xl font-bold tracking-tight">Phone Booth</h2>
        </div>
        <p className="text-white/40 text-sm mb-8">Pick an agent to talk to</p>
        
        <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
          {AGENTS.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              className="flex items-center gap-3 p-4 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 transition-all text-left group"
            >
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-xl border-2 group-hover:scale-110 transition-transform"
                style={{ borderColor: agent.color, backgroundColor: `${agent.color}15` }}
              >
                {agent.avatar}
              </div>
              <div>
                <div className="font-semibold text-sm text-white">{agent.name}</div>
                <div className="text-[11px] text-white/30">{agent.role}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
