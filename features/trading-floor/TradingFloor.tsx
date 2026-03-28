/**
 * TRADING FLOOR - Wall Street Style Agent Visualization
 * 
 * A 2D/2.5D isometric trading floor where AI agents work, discuss, and trade.
 * Inspired by VoxYZ's pixel-art office but themed for finance.
 * 
 * Features:
 * - Agent avatars at desks
 * - Meeting pod for discussions
 * - Coffee area for breaks
 * - Ticker tape with live prices
 * - Trade execution animations
 * - Speech bubbles for discussions
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { 
  subscribeToDiscussions, 
  fetchDiscussions,
  fetchFishtankLive,
  type AgentDiscussionMessage 
} from "@/lib/cortex-capital-api";

// Agent definitions with positions on the floor
const FLOOR_AGENTS = [
  { 
    id: "atlas", 
    name: "ATLAS", 
    emoji: "⚡", 
    role: "General Manager", 
    color: "#F59E0B",
    desk: { x: 85, y: 75 },  // GM office - corner
    isGM: true
  },
  { 
    id: "analyst", 
    name: "ANALYST", 
    emoji: "📊", 
    role: "Market Analyst", 
    color: "#3B82F6",
    desk: { x: 15, y: 25 }
  },
  { 
    id: "strategist", 
    name: "STRATEGIST", 
    emoji: "🎯", 
    role: "Chief Strategist", 
    color: "#8B5CF6",
    desk: { x: 35, y: 25 }
  },
  { 
    id: "risk", 
    name: "RISK", 
    emoji: "🛡️", 
    role: "Risk Manager", 
    color: "#EF4444",
    desk: { x: 55, y: 25 }
  },
  { 
    id: "executor", 
    name: "EXECUTOR", 
    emoji: "🎬", 
    role: "Trade Executor", 
    color: "#6366F1",
    desk: { x: 15, y: 50 }
  },
  { 
    id: "momentum", 
    name: "MOMENTUM", 
    emoji: "🚀", 
    role: "Momentum Trader", 
    color: "#10B981",
    desk: { x: 35, y: 50 }
  },
  { 
    id: "growth", 
    name: "GROWTH", 
    emoji: "📈", 
    role: "Growth Advocate", 
    color: "#22C55E",
    desk: { x: 55, y: 50 }
  },
  { 
    id: "value", 
    name: "VALUE", 
    emoji: "💎", 
    role: "Value Investor", 
    color: "#0EA5E9",
    desk: { x: 15, y: 75 }
  },
];

// Meeting pod location
const MEETING_POD = { x: 75, y: 35, width: 20, height: 25 };
const COFFEE_AREA = { x: 75, y: 70, width: 15, height: 20 };

type AgentState = 'working' | 'discussing' | 'executing' | 'break' | 'alert' | 'idle';

interface AgentFloorState {
  id: string;
  state: AgentState;
  position: { x: number; y: number };
  targetPosition: { x: number; y: number };
  lastSpoke: Date | null;
  currentMessage: string | null;
  inMeeting: boolean;
}

// Ticker symbols
const TICKERS = ['SPY', 'QQQ', 'AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOGL', 'AMZN'];

function TickerTape({ prices }: { prices: Record<string, { price: number; change: number }> }) {
  return (
    <div className="bg-gray-900 border-b border-gray-700 py-2 overflow-hidden">
      <div className="flex animate-ticker whitespace-nowrap">
        {[...TICKERS, ...TICKERS].map((symbol, i) => {
          const data = prices[symbol] || { price: 0, change: 0 };
          const isUp = data.change >= 0;
          return (
            <span key={i} className="mx-6 font-mono text-sm">
              <span className="text-gray-400">{symbol}</span>
              <span className="text-white ml-2">${data.price.toFixed(2)}</span>
              <span className={`ml-2 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                {isUp ? '▲' : '▼'} {Math.abs(data.change).toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function AgentAvatar({ 
  agent, 
  state,
  message,
  onClick
}: { 
  agent: typeof FLOOR_AGENTS[0];
  state: AgentFloorState;
  message: string | null;
  onClick: () => void;
}) {
  const isSpeaking = state.state === 'discussing' && message;
  const isAlert = state.state === 'alert';
  const isBreak = state.state === 'break';
  const isExecuting = state.state === 'executing';
  
  return (
    <div 
      className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-700 cursor-pointer group"
      style={{ 
        left: `${state.position.x}%`, 
        top: `${state.position.y}%`,
        zIndex: isSpeaking ? 100 : 10
      }}
      onClick={onClick}
    >
      {/* Speech bubble */}
      {isSpeaking && message && (
        <div 
          className="absolute -top-20 left-1/2 transform -translate-x-1/2 w-56 p-3 rounded-lg text-xs text-white border z-50 animate-fade-in"
          style={{ 
            backgroundColor: `${agent.color}E0`,
            borderColor: agent.color
          }}
        >
          <div className="font-bold mb-1">{agent.name}</div>
          <div className="line-clamp-3 leading-relaxed">{message}</div>
          <div 
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full"
            style={{ borderColor: `${agent.color}E0 transparent transparent transparent`, borderWidth: '8px' }}
          />
        </div>
      )}

      {/* Desk (only at desk position) */}
      {state.state === 'working' && (
        <div 
          className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-16 h-10 rounded-sm opacity-30"
          style={{ backgroundColor: '#4a3728' }}
        />
      )}

      {/* Agent circle */}
      <div 
        className={`
          relative w-14 h-14 rounded-full flex items-center justify-center text-2xl
          border-3 transition-all duration-300
          ${isSpeaking ? 'animate-bounce-subtle ring-4 ring-opacity-50 scale-110' : ''}
          ${isAlert ? 'animate-pulse ring-4 ring-red-500' : ''}
          ${isBreak ? 'opacity-70' : ''}
          ${isExecuting ? 'ring-4 ring-green-400 animate-pulse' : ''}
          group-hover:scale-110
        `}
        style={{ 
          backgroundColor: `${agent.color}30`,
          borderColor: agent.color,
          borderWidth: '3px',
          boxShadow: isSpeaking ? `0 0 30px ${agent.color}80` : `0 4px 12px rgba(0,0,0,0.3)`
        }}
      >
        <span className="text-2xl">{agent.emoji}</span>
        
        {/* GM badge */}
        {agent.isGM && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-xs">
            👑
          </div>
        )}
        
        {/* Status indicator */}
        <div 
          className={`
            absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-900
            ${state.state === 'working' ? 'bg-green-400' : ''}
            ${state.state === 'discussing' ? 'bg-blue-400 animate-pulse' : ''}
            ${state.state === 'executing' ? 'bg-yellow-400 animate-ping' : ''}
            ${state.state === 'break' ? 'bg-gray-400' : ''}
            ${state.state === 'alert' ? 'bg-red-500 animate-ping' : ''}
            ${state.state === 'idle' ? 'bg-gray-500' : ''}
          `}
        />
      </div>
      
      {/* Name label */}
      <div 
        className="absolute -bottom-7 left-1/2 transform -translate-x-1/2 text-xs font-bold whitespace-nowrap px-2 py-0.5 rounded"
        style={{ color: agent.color, backgroundColor: 'rgba(0,0,0,0.5)' }}
      >
        {agent.name}
        {agent.isGM && <span className="ml-1 text-yellow-400">GM</span>}
      </div>
    </div>
  );
}

function MeetingPod({ agents, active }: { agents: string[]; active: boolean }) {
  return (
    <div 
      className={`
        absolute rounded-xl border-2 transition-all duration-500
        ${active ? 'border-blue-500 bg-blue-900/20' : 'border-gray-700 bg-gray-800/30'}
      `}
      style={{
        left: `${MEETING_POD.x - MEETING_POD.width/2}%`,
        top: `${MEETING_POD.y - MEETING_POD.height/2}%`,
        width: `${MEETING_POD.width}%`,
        height: `${MEETING_POD.height}%`
      }}
    >
      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 font-medium">
        {active ? '🗣️ MEETING IN PROGRESS' : 'MEETING POD'}
      </div>
      {active && (
        <div className="absolute inset-0 rounded-xl animate-pulse-slow" 
          style={{ boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)' }} 
        />
      )}
    </div>
  );
}

function CoffeeArea({ occupants }: { occupants: string[] }) {
  return (
    <div 
      className="absolute rounded-lg border border-gray-700 bg-gray-800/20 flex items-center justify-center"
      style={{
        left: `${COFFEE_AREA.x - COFFEE_AREA.width/2}%`,
        top: `${COFFEE_AREA.y - COFFEE_AREA.height/2}%`,
        width: `${COFFEE_AREA.width}%`,
        height: `${COFFEE_AREA.height}%`
      }}
    >
      <span className="text-2xl">☕</span>
      {occupants.length > 0 && (
        <div className="absolute -top-5 text-xs text-gray-500">
          {occupants.length} on break
        </div>
      )}
    </div>
  );
}

function TradeLog({ trades }: { trades: Array<{ symbol: string; action: string; qty: number; price: number; time: Date }> }) {
  return (
    <div className="bg-gray-900 border-t border-gray-700 py-2 px-4">
      <div className="flex items-center gap-4 text-xs font-mono overflow-x-auto">
        <span className="text-gray-500 flex-shrink-0">TRADE LOG:</span>
        {trades.slice(0, 5).map((trade, i) => (
          <span key={i} className="flex-shrink-0">
            <span className={trade.action === 'BUY' ? 'text-green-400' : 'text-red-400'}>
              {trade.action}
            </span>
            <span className="text-white ml-1">{trade.qty} {trade.symbol}</span>
            <span className="text-gray-400 ml-1">@ ${trade.price.toFixed(2)}</span>
          </span>
        ))}
        {trades.length === 0 && <span className="text-gray-600">No recent trades</span>}
      </div>
    </div>
  );
}

export function TradingFloor() {
  // Agent states
  const [agentStates, setAgentStates] = useState<Record<string, AgentFloorState>>(() => {
    const initial: Record<string, AgentFloorState> = {};
    FLOOR_AGENTS.forEach(agent => {
      initial[agent.id] = {
        id: agent.id,
        state: 'working',
        position: { ...agent.desk },
        targetPosition: { ...agent.desk },
        lastSpoke: null,
        currentMessage: null,
        inMeeting: false
      };
    });
    return initial;
  });

  // Discussion messages
  const [messages, setMessages] = useState<AgentDiscussionMessage[]>([]);
  const [activeMeeting, setActiveMeeting] = useState(false);
  const [meetingParticipants, setMeetingParticipants] = useState<string[]>([]);
  
  // Market data
  const [prices, setPrices] = useState<Record<string, { price: number; change: number }>>({
    SPY: { price: 485.23, change: 0.45 },
    QQQ: { price: 412.87, change: 0.62 },
    AAPL: { price: 178.32, change: -0.12 },
    NVDA: { price: 892.45, change: 2.31 },
    TSLA: { price: 245.67, change: -1.23 },
    MSFT: { price: 412.89, change: 0.87 },
    GOOGL: { price: 156.78, change: 0.34 },
    AMZN: { price: 178.90, change: 0.56 }
  });

  const [trades, setTrades] = useState<Array<{ symbol: string; action: string; qty: number; price: number; time: Date }>>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Subscribe to discussions
  useEffect(() => {
    // Fetch initial
    fetchDiscussions().then(result => {
      if (result.success && result.data) {
        setMessages(result.data.messages);
      }
    });

    // Subscribe to live updates
    const unsubscribe = subscribeToDiscussions(
      (message) => {
        setMessages(prev => [...prev.slice(-50), message]);
        
        // Update agent state when they speak
        const agentId = message.agent.toLowerCase();
        setAgentStates(prev => {
          const updated = { ...prev };
          if (updated[agentId]) {
            updated[agentId] = {
              ...updated[agentId],
              state: 'discussing',
              currentMessage: message.content,
              lastSpoke: new Date()
            };
          }
          return updated;
        });

        // Clear speaking state after 5 seconds
        setTimeout(() => {
          setAgentStates(prev => {
            const updated = { ...prev };
            if (updated[agentId]) {
              updated[agentId] = {
                ...updated[agentId],
                state: 'working',
                currentMessage: null
              };
            }
            return updated;
          });
        }, 5000);
      },
      (discussion) => {
        // Discussion started - move participants to meeting pod
        setActiveMeeting(true);
        setMeetingParticipants(discussion.participants.map(p => p.toLowerCase()));
        
        discussion.participants.forEach(p => {
          const agentId = p.toLowerCase();
          setAgentStates(prev => {
            const updated = { ...prev };
            if (updated[agentId]) {
              updated[agentId] = {
                ...updated[agentId],
                position: { x: MEETING_POD.x + (Math.random() - 0.5) * 10, y: MEETING_POD.y + (Math.random() - 0.5) * 10 },
                inMeeting: true
              };
            }
            return updated;
          });
        });
      },
      (discussion) => {
        // Discussion ended - return to desks
        setActiveMeeting(false);
        setMeetingParticipants([]);
        
        FLOOR_AGENTS.forEach(agent => {
          setAgentStates(prev => {
            const updated = { ...prev };
            updated[agent.id] = {
              ...updated[agent.id],
              position: { ...agent.desk },
              inMeeting: false,
              state: 'working'
            };
            return updated;
          });
        });
      }
    );

    return () => unsubscribe();
  }, []);

  // Random break simulation
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly send an agent on break
      const agents = FLOOR_AGENTS.filter(a => !a.isGM);
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      
      if (Math.random() < 0.1) { // 10% chance every 30 seconds
        setAgentStates(prev => {
          const updated = { ...prev };
          if (updated[randomAgent.id] && updated[randomAgent.id].state === 'working') {
            updated[randomAgent.id] = {
              ...updated[randomAgent.id],
              state: 'break',
              position: { x: COFFEE_AREA.x, y: COFFEE_AREA.y }
            };
          }
          return updated;
        });

        // Return from break after 20-40 seconds
        setTimeout(() => {
          setAgentStates(prev => {
            const updated = { ...prev };
            const agent = FLOOR_AGENTS.find(a => a.id === randomAgent.id);
            if (updated[randomAgent.id] && agent) {
              updated[randomAgent.id] = {
                ...updated[randomAgent.id],
                state: 'working',
                position: { ...agent.desk }
              };
            }
            return updated;
          });
        }, 20000 + Math.random() * 20000);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Ticker tape */}
      <TickerTape prices={prices} />
      
      {/* Main floor */}
      <div className="flex-1 relative overflow-hidden">
        {/* Floor background */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
          }}
        >
          {/* Grid pattern */}
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}
          />
        </div>

        {/* Meeting pod */}
        <MeetingPod agents={meetingParticipants} active={activeMeeting} />
        
        {/* Coffee area */}
        <CoffeeArea occupants={Object.values(agentStates).filter(s => s.state === 'break').map(s => s.id)} />

        {/* Agents */}
        {FLOOR_AGENTS.map(agent => (
          <AgentAvatar
            key={agent.id}
            agent={agent}
            state={agentStates[agent.id]}
            message={agentStates[agent.id]?.currentMessage || null}
            onClick={() => setSelectedAgent(agent.id)}
          />
        ))}

        {/* Floor label */}
        <div className="absolute top-4 left-4 text-gray-500 text-sm font-medium">
          CORTEX CAPITAL • TRADING FLOOR
        </div>

        {/* Live indicator */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-gray-400 text-sm">LIVE</span>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 flex gap-4 text-xs text-gray-500">
          <span><span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-1" /> Working</span>
          <span><span className="inline-block w-2 h-2 bg-blue-400 rounded-full mr-1" /> Discussing</span>
          <span><span className="inline-block w-2 h-2 bg-yellow-400 rounded-full mr-1" /> Executing</span>
          <span><span className="inline-block w-2 h-2 bg-gray-400 rounded-full mr-1" /> Break</span>
        </div>
      </div>
      
      {/* Trade log */}
      <TradeLog trades={trades} />

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 30s linear infinite;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 1s ease-in-out infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px) translateX(-50%); }
          to { opacity: 1; transform: translateY(0) translateX(-50%); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default TradingFloor;
