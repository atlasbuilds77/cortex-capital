'use client';

import { useState, useEffect } from 'react';

interface Memory {
  id: string;
  agent_id: string;
  type: 'insight' | 'pattern' | 'strategy' | 'preference' | 'lesson';
  content: string;
  confidence: number;
  tags: string[];
  promoted: boolean;
  created_at: string;
}

const MEMORY_TYPE_ICONS: Record<string, string> = {
  insight: '💡',
  pattern: '🔄',
  strategy: '🎯',
  preference: '⚙️',
  lesson: '📚',
};

const MEMORY_TYPE_COLORS: Record<string, string> = {
  insight: 'border-yellow-500/30 bg-yellow-500/10',
  pattern: 'border-blue-500/30 bg-blue-500/10',
  strategy: 'border-purple-500/30 bg-purple-500/10',
  preference: 'border-slate-500/30 bg-slate-500/10',
  lesson: 'border-green-500/30 bg-green-500/10',
};

const AGENT_COLORS: Record<string, string> = {
  atlas: '#4F46E5',
  sage: '#059669',
  scout: '#F59E0B',
  growth: '#8B5CF6',
  intel: '#EF4444',
  observer: '#6B7280',
};

export default function MemoryWall() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    type: string | null;
    agent: string | null;
  }>({ type: null, agent: null });
  
  useEffect(() => {
    fetchMemories();
    const interval = setInterval(fetchMemories, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);
  
  const fetchMemories = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        // For now, use mock data since we don't have a memories endpoint yet
        setMemories(data.recentMemories || []);
      }
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const filteredMemories = memories.filter(m => {
    if (filter.type && m.type !== filter.type) return false;
    if (filter.agent && m.agent_id !== filter.agent) return false;
    return true;
  });
  
  const confidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-slate-400';
  };
  
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffHours < 1) return 'Recent';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };
  
  if (loading) {
    return (
      <div className="bg-bg-card rounded-xl p-6 h-[500px] flex items-center justify-center card-glow">
        <div className="text-slate-500 animate-pulse">Loading memories...</div>
      </div>
    );
  }
  
  return (
    <div className="bg-bg-card rounded-xl p-4 h-[500px] flex flex-col card-glow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">🧠 Memory Wall</h2>
        <div className="text-xs text-slate-500">
          {filteredMemories.length} memories
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="flex gap-1">
          {Object.keys(MEMORY_TYPE_ICONS).map(type => (
            <button
              key={type}
              onClick={() => setFilter(f => ({ ...f, type: f.type === type ? null : type }))}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filter.type === type
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {MEMORY_TYPE_ICONS[type]} {type}
            </button>
          ))}
        </div>
      </div>
      
      {/* Memories grid */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {filteredMemories.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <div className="text-4xl mb-2">🧠</div>
            <p>No memories yet</p>
            <p className="text-xs mt-1">Agents will learn from trade outcomes</p>
          </div>
        ) : (
          filteredMemories.map(memory => (
            <div 
              key={memory.id} 
              className={`p-3 rounded-lg border ${MEMORY_TYPE_COLORS[memory.type]} relative`}
            >
              {memory.promoted && (
                <div className="absolute -top-2 -right-2 text-lg" title="Promoted">
                  ⭐
                </div>
              )}
              
              <div className="flex items-start gap-2">
                <div className="text-xl">{MEMORY_TYPE_ICONS[memory.type]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full capitalize"
                      style={{ 
                        backgroundColor: `${AGENT_COLORS[memory.agent_id]}20`,
                        color: AGENT_COLORS[memory.agent_id],
                      }}
                    >
                      {memory.agent_id}
                    </span>
                    <span className={`text-xs ${confidenceColor(memory.confidence)}`}>
                      {Math.round(memory.confidence * 100)}% conf
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatTime(memory.created_at)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-slate-300">{memory.content}</p>
                  
                  {memory.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {memory.tags.slice(0, 5).map((tag, i) => (
                        <span 
                          key={i}
                          className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Legend */}
      <div className="flex gap-3 mt-4 text-xs text-slate-500 flex-wrap">
        {Object.entries(MEMORY_TYPE_ICONS).map(([type, icon]) => (
          <div key={type} className="flex items-center gap-1">
            <span>{icon}</span>
            <span className="capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
