'use client';

import { useState, useEffect, useRef } from 'react';
import OfficeView from './components/OfficeView';
import LiveFeed from './components/LiveFeed';
import MissionBoard from './components/MissionBoard';
import MemoryWall from './components/MemoryWall';
import StatsPanel from './components/StatsPanel';
import { ErrorBoundary } from './components/ErrorBoundary';

interface SSEEvent {
  type: string;
  data: any;
  timestamp: number;
}

export default function Dashboard() {
  const MAX_EVENTS = 100;
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'office' | 'feed' | 'missions' | 'memory'>('office');
  const eventBufferRef = useRef<SSEEvent[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Connect to SSE stream
    const eventSource = new EventSource('/api/events');
    
    eventSource.onopen = () => {
      console.log('SSE Connected');
      setConnected(true);
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        eventBufferRef.current.push({ ...data, timestamp: Date.now() });
        
        // Batch updates every 500ms to prevent memory leak
        if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = setTimeout(() => {
          setEvents(prev => {
            const merged = [...prev, ...eventBufferRef.current];
            eventBufferRef.current = [];
            return merged.slice(-MAX_EVENTS); // Keep only last 100 events
          });
        }, 500);
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };
    
    eventSource.onerror = () => {
      console.log('SSE Error - Reconnecting...');
      setConnected(false);
    };
    
    return () => {
      if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
      eventSource.close();
    };
  }, []);
  
  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">🏢 Autonomous Trading Co.</h1>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 status-dot' : 'bg-red-400'}`} />
            {connected ? 'Live' : 'Connecting...'}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">
            {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </header>
      
      {/* Navigation */}
      <nav className="flex gap-2 mb-6">
        {[
          { id: 'office', label: '🏢 Office', emoji: '🏢' },
          { id: 'feed', label: '💬 Feed', emoji: '💬' },
          { id: 'missions', label: '📋 Missions', emoji: '📋' },
          { id: 'memory', label: '🧠 Memory', emoji: '🧠' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      
      {/* Main Content */}
      <div className="grid grid-cols-12 gap-4">
        {/* Main Panel (8 cols) */}
        <div className="col-span-8">
          <ErrorBoundary>
            {activeTab === 'office' && <OfficeView events={events} />}
            {activeTab === 'feed' && <LiveFeed events={events} />}
            {activeTab === 'missions' && <MissionBoard />}
            {activeTab === 'memory' && <MemoryWall />}
          </ErrorBoundary>
        </div>
        
        {/* Side Panel (4 cols) */}
        <div className="col-span-4">
          <ErrorBoundary>
            <StatsPanel />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
