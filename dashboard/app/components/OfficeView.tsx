'use client';

import { useState, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  role: string;
  color: string;
  emoji: string;
  position: { x: number; y: number };
  state: 'idle' | 'walking' | 'chatting' | 'working' | 'celebrating';
  lastMessage?: string;
}

interface Props {
  events: any[];
}

const AGENTS: Agent[] = [
  { id: 'atlas', name: 'Atlas', role: 'Coordinator', color: '#4F46E5', emoji: '👔', position: { x: 50, y: 40 }, state: 'working' },
  { id: 'sage', name: 'Sage', role: 'Risk Manager', color: '#059669', emoji: '🛡️', position: { x: 20, y: 30 }, state: 'idle' },
  { id: 'scout', name: 'Scout', role: 'Executor', color: '#F59E0B', emoji: '⚡', position: { x: 80, y: 35 }, state: 'idle' },
  { id: 'growth', name: 'Growth', role: 'Analyst', color: '#8B5CF6', emoji: '📊', position: { x: 35, y: 70 }, state: 'idle' },
  { id: 'intel', name: 'Intel', role: 'Research', color: '#EF4444', emoji: '🔍', position: { x: 65, y: 65 }, state: 'idle' },
  { id: 'observer', name: 'Observer', role: 'QA', color: '#6B7280', emoji: '👁️', position: { x: 10, y: 60 }, state: 'idle' },
];

export default function OfficeView({ events }: Props) {
  const [agents, setAgents] = useState<Agent[]>(AGENTS);
  const [speechBubbles, setSpeechBubbles] = useState<Record<string, string>>({});
  const [tradeFlash, setTradeFlash] = useState<'win' | 'loss' | null>(null);
  
  // Process events to update agent states
  useEffect(() => {
    const latestEvent = events[events.length - 1];
    if (!latestEvent) return;
    
    // Update agent states based on events
    if (latestEvent.type === 'conversation_turn') {
      const agentId = latestEvent.data?.speaker;
      const message = latestEvent.data?.message;
      if (agentId && message) {
        setSpeechBubbles(prev => ({ ...prev, [agentId]: message }));
        setAgents(prev => prev.map(a => 
          a.id === agentId ? { ...a, state: 'chatting' } : a
        ));
        
        // Clear bubble after 5 seconds
        setTimeout(() => {
          setSpeechBubbles(prev => {
            const { [agentId]: _, ...rest } = prev;
            return rest;
          });
          setAgents(prev => prev.map(a => 
            a.id === agentId ? { ...a, state: 'idle' } : a
          ));
        }, 5000);
      }
    }
    
    if (latestEvent.type === 'trade_executed') {
      setAgents(prev => prev.map(a => 
        a.id === 'scout' ? { ...a, state: 'working' } : a
      ));
      setTimeout(() => {
        setAgents(prev => prev.map(a => 
          a.id === 'scout' ? { ...a, state: 'idle' } : a
        ));
      }, 2000);
    }
    
    if (latestEvent.type === 'trade_closed') {
      const isWin = latestEvent.data?.pnl > 0;
      setTradeFlash(isWin ? 'win' : 'loss');
      setAgents(prev => prev.map(a => ({ ...a, state: isWin ? 'celebrating' : 'idle' })));
      
      setTimeout(() => {
        setTradeFlash(null);
        setAgents(prev => prev.map(a => ({ ...a, state: 'idle' })));
      }, 3000);
    }
  }, [events]);
  
  return (
    <div className="relative bg-bg-card rounded-xl p-6 h-[500px] overflow-hidden card-glow">
      {/* Trade flash overlay */}
      {tradeFlash && (
        <div className={`absolute inset-0 z-10 pointer-events-none transition-opacity ${
          tradeFlash === 'win' ? 'bg-green-500/10' : 'bg-red-500/10'
        }`} />
      )}
      
      {/* Office background */}
      <div className="absolute inset-0 opacity-10">
        {/* Grid pattern for floor */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2" style={{
          backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          transform: 'perspective(300px) rotateX(60deg)',
          transformOrigin: 'bottom',
        }} />
      </div>
      
      {/* Desks */}
      <div className="absolute" style={{ left: '40%', top: '35%', transform: 'translate(-50%, -50%)' }}>
        <div className="w-32 h-8 bg-slate-700 rounded-lg border-2 border-slate-600" />
        <div className="flex justify-center gap-2 mt-1">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <div className="w-3 h-3 bg-blue-500 rounded-full" />
        </div>
      </div>
      
      <div className="absolute" style={{ left: '70%', top: '50%', transform: 'translate(-50%, -50%)' }}>
        <div className="w-32 h-8 bg-slate-700 rounded-lg border-2 border-slate-600" />
        <div className="flex justify-center gap-2 mt-1">
          <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
        </div>
      </div>
      
      {/* Agents */}
      {agents.map(agent => (
        <div 
          key={agent.id}
          className="absolute transition-all duration-500 ease-out"
          style={{ 
            left: `${agent.position.x}%`, 
            top: `${agent.position.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Speech bubble */}
          {speechBubbles[agent.id] && (
            <div className="speech-bubble absolute -top-16 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              {speechBubbles[agent.id].substring(0, 50)}
              {speechBubbles[agent.id].length > 50 && '...'}
            </div>
          )}
          
          {/* Agent avatar */}
          <div 
            className={`
              relative w-12 h-12 rounded-full flex items-center justify-center text-2xl
              transition-transform duration-300
              ${agent.state === 'chatting' ? 'animate-bounce-slow' : ''}
              ${agent.state === 'working' ? 'animate-pulse' : ''}
              ${agent.state === 'celebrating' ? 'animate-wiggle' : ''}
            `}
            style={{ 
              backgroundColor: agent.color,
              boxShadow: `0 0 20px ${agent.color}40`,
            }}
          >
            {agent.emoji}
            
            {/* Status indicator */}
            <div className={`
              absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-bg-card
              ${agent.state === 'idle' ? 'bg-slate-500' : ''}
              ${agent.state === 'working' ? 'bg-amber-500 animate-pulse' : ''}
              ${agent.state === 'chatting' ? 'bg-blue-500 animate-pulse' : ''}
              ${agent.state === 'celebrating' ? 'bg-green-500 animate-pulse' : ''}
            `} />
          </div>
          
          {/* Name tag */}
          <div className="text-center mt-2">
            <div className="text-sm font-semibold" style={{ color: agent.color }}>
              {agent.name}
            </div>
            <div className="text-xs text-slate-500">{agent.role}</div>
          </div>
        </div>
      ))}
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 flex gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-slate-500" /> Idle
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" /> Working
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500" /> Chatting
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" /> Celebrating
        </div>
      </div>
    </div>
  );
}
