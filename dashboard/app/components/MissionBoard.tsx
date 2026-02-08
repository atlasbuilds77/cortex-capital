'use client';

import { useState, useEffect } from 'react';

interface Proposal {
  id: string;
  title: string;
  agent_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

interface Mission {
  id: string;
  title: string;
  status: 'approved' | 'running' | 'succeeded' | 'failed';
  mission_type: string;
  created_by: string;
  progress?: number;
  pnl?: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  accepted: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  approved: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  running: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  succeeded: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const AGENT_COLORS: Record<string, string> = {
  atlas: '#4F46E5',
  sage: '#059669',
  scout: '#F59E0B',
  growth: '#8B5CF6',
  intel: '#EF4444',
  observer: '#6B7280',
};

export default function MissionBoard() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'proposals' | 'active' | 'completed'>('active');
  
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);
  
  const fetchData = async () => {
    try {
      const [proposalsRes, missionsRes] = await Promise.all([
        fetch('/api/proposals'),
        fetch('/api/missions'),
      ]);
      
      if (proposalsRes.ok) {
        const data = await proposalsRes.json();
        setProposals(data.proposals || []);
      }
      
      if (missionsRes.ok) {
        const data = await missionsRes.json();
        setMissions(data.missions || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };
  
  const activeMissions = missions.filter(m => ['approved', 'running'].includes(m.status));
  const completedMissions = missions.filter(m => ['succeeded', 'failed'].includes(m.status));
  const pendingProposals = proposals.filter(p => p.status === 'pending');
  
  if (loading) {
    return (
      <div className="bg-bg-card rounded-xl p-6 h-[500px] flex items-center justify-center card-glow">
        <div className="text-slate-500 animate-pulse">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="bg-bg-card rounded-xl p-4 h-[500px] flex flex-col card-glow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">📋 Mission Board</h2>
        <div className="flex gap-1">
          {[
            { id: 'proposals', label: 'Proposals', count: pendingProposals.length },
            { id: 'active', label: 'Active', count: activeMissions.length },
            { id: 'completed', label: 'Completed', count: completedMissions.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-white/20">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {activeTab === 'proposals' && (
          pendingProposals.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              <div className="text-4xl mb-2">📝</div>
              <p>No pending proposals</p>
            </div>
          ) : (
            pendingProposals.map(proposal => (
              <div key={proposal.id} className="p-3 bg-bg-hover rounded-lg border border-slate-700">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-sm">{proposal.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ 
                          backgroundColor: `${AGENT_COLORS[proposal.agent_id]}20`,
                          color: AGENT_COLORS[proposal.agent_id],
                        }}
                      >
                        {proposal.agent_id}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatTime(proposal.created_at)}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[proposal.status]}`}>
                    {proposal.status}
                  </span>
                </div>
              </div>
            ))
          )
        )}
        
        {activeTab === 'active' && (
          activeMissions.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              <div className="text-4xl mb-2">🎯</div>
              <p>No active missions</p>
            </div>
          ) : (
            activeMissions.map(mission => (
              <div key={mission.id} className="p-3 bg-bg-hover rounded-lg border border-slate-700">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{mission.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500 capitalize">
                        {mission.mission_type}
                      </span>
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ 
                          backgroundColor: `${AGENT_COLORS[mission.created_by]}20`,
                          color: AGENT_COLORS[mission.created_by],
                        }}
                      >
                        {mission.created_by}
                      </span>
                    </div>
                    {mission.progress !== undefined && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 transition-all duration-500"
                            style={{ width: `${mission.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[mission.status]}`}>
                    {mission.status}
                  </span>
                </div>
              </div>
            ))
          )
        )}
        
        {activeTab === 'completed' && (
          completedMissions.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              <div className="text-4xl mb-2">🏁</div>
              <p>No completed missions</p>
            </div>
          ) : (
            completedMissions.slice(-20).reverse().map(mission => (
              <div key={mission.id} className="p-3 bg-bg-hover rounded-lg border border-slate-700">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-sm">{mission.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500 capitalize">
                        {mission.mission_type}
                      </span>
                      {mission.pnl !== undefined && (
                        <span className={`text-xs font-mono ${mission.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {mission.pnl >= 0 ? '+' : ''}{mission.pnl.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[mission.status]}`}>
                    {mission.status === 'succeeded' ? '✓' : '✗'} {mission.status}
                  </span>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
