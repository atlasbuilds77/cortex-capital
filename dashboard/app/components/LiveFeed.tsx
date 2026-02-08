'use client';

import { useRef, useEffect } from 'react';

interface Props {
  events: any[];
}

const AGENT_COLORS: Record<string, string> = {
  atlas: '#4F46E5',
  sage: '#059669',
  scout: '#F59E0B',
  growth: '#8B5CF6',
  intel: '#EF4444',
  observer: '#6B7280',
  system: '#64748B',
};

const AGENT_EMOJIS: Record<string, string> = {
  atlas: '👔',
  sage: '🛡️',
  scout: '⚡',
  growth: '📊',
  intel: '🔍',
  observer: '👁️',
  system: '🤖',
};

export default function LiveFeed({ events }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);
  
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };
  
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'conversation_turn': return '💬';
      case 'trade_executed': return '⚡';
      case 'trade_closed': return '🏁';
      case 'proposal_created': return '📝';
      case 'proposal_approved': return '✅';
      case 'proposal_rejected': return '❌';
      case 'trigger_fired': return '🔥';
      case 'memory_created': return '🧠';
      case 'roundtable_started': return '🗣️';
      case 'roundtable_completed': return '✨';
      default: return '📌';
    }
  };
  
  const renderEvent = (event: any, index: number) => {
    const agentId = event.data?.agent_id || event.data?.speaker || 'system';
    const color = AGENT_COLORS[agentId] || AGENT_COLORS.system;
    const emoji = AGENT_EMOJIS[agentId] || '🤖';
    
    // Conversation turn - special formatting
    if (event.type === 'conversation_turn') {
      return (
        <div key={index} className="flex gap-3 p-3 bg-bg-hover rounded-lg">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg"
            style={{ backgroundColor: color }}
          >
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold capitalize" style={{ color }}>
                {agentId}
              </span>
              <span className="text-xs text-slate-500">
                {formatTime(event.timestamp)}
              </span>
            </div>
            <p className="text-sm text-slate-300">{event.data?.message}</p>
          </div>
        </div>
      );
    }
    
    // Trade events - highlighted
    if (event.type === 'trade_executed' || event.type === 'trade_closed') {
      const isWin = event.data?.pnl > 0;
      const bgColor = event.type === 'trade_closed' 
        ? (isWin ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30')
        : 'bg-amber-500/10 border-amber-500/30';
      
      return (
        <div key={index} className={`flex gap-3 p-3 rounded-lg border ${bgColor}`}>
          <div className="text-2xl">{getEventIcon(event.type)}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">
                {event.type === 'trade_executed' ? 'Trade Executed' : 'Trade Closed'}
              </span>
              <span className="text-xs text-slate-500">
                {formatTime(event.timestamp)}
              </span>
            </div>
            <p className="text-sm text-slate-300">{event.data?.title || event.data?.summary}</p>
            {event.data?.pnl !== undefined && (
              <div className={`text-sm font-mono mt-1 ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                P&L: {isWin ? '+' : ''}{event.data.pnl.toFixed(2)} ({isWin ? '+' : ''}{event.data.pnl_pct?.toFixed(1)}%)
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Default event format
    return (
      <div key={index} className="flex gap-3 p-2 rounded-lg hover:bg-bg-hover transition-colors">
        <div className="text-lg">{getEventIcon(event.type)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-300 capitalize">
              {event.type.replace(/_/g, ' ')}
            </span>
            <span className="text-xs text-slate-500">
              {formatTime(event.timestamp)}
            </span>
          </div>
          {event.data?.title && (
            <p className="text-xs text-slate-400 truncate">{event.data.title}</p>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="bg-bg-card rounded-xl p-4 h-[500px] flex flex-col card-glow">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        💬 Live Feed
        <span className="text-xs text-slate-500 font-normal">
          {events.length} events
        </span>
      </h2>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 pr-2"
      >
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="text-center">
              <div className="text-4xl mb-2">📡</div>
              <p>Waiting for events...</p>
            </div>
          </div>
        ) : (
          events.map(renderEvent)
        )}
      </div>
    </div>
  );
}
