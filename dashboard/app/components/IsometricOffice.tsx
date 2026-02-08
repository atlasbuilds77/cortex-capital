'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AgentData {
  id: string;
  name: string;
  role: string;
  color: string;
  avatar: string;
  state: 'idle' | 'working' | 'away';
  eventCount: number;
  memoryCount: number;
  lastMessage: string | null;
  lastActive: string | null;
}

interface AgentSummary {
  totalTrades7d: number;
  winRate7d: number;
  totalPnl7d: number;
}

type AnimState = 'idle' | 'walking' | 'working' | 'celebrating' | 'stressed';
type Direction = 'left' | 'right';

interface CharacterConfig {
  id: string;
  name: string;
  role: string;
  color: string;
  avatar: string;
  type: 'agent' | 'team';
  homeRow: number;
  homeCol: number;
  behavior: 'desk' | 'roamer' | 'coordinator';
}

interface CharacterState {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  path: { x: number; y: number }[];
  pathIndex: number;
  animState: AnimState;
  direction: Direction;
  bobPhase: number;
  idleTimer: number;
  config: CharacterConfig;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
  life: number;
  maxLife: number;
  speed: number;
  size: number;
}

interface OfficeEvent {
  type: 'trade_signal' | 'trade_execute' | 'big_win' | 'risk_alert' | 'data_flow';
  from?: string;
  to?: string;
  timestamp: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TILE_W = 160;
const TILE_H = 80;
const GRID_COLS = 6;
const GRID_ROWS = 6;
const OFFICE_W = 800;
const OFFICE_H = 550;
const MOVE_SPEED = 1.2;
const ROUNDTABLE = { row: 2, col: 3 };

// All 13 characters
const ALL_CHARACTERS: CharacterConfig[] = [
  // 10 AI Agents
  { id: 'atlas',    name: 'Atlas',    role: 'Coordinator',     color: '#6366f1', avatar: '/agent-avatars/agent-02.png', type: 'agent', homeRow: 2, homeCol: 2, behavior: 'desk' },
  { id: 'sage',     name: 'Sage',     role: 'Risk Manager',    color: '#10b981', avatar: '/agent-avatars/agent-05.jpg', type: 'agent', homeRow: 1, homeCol: 0, behavior: 'desk' },
  { id: 'scout',    name: 'Scout',    role: 'Executor',        color: '#f59e0b', avatar: '/agent-avatars/agent-04.jpg', type: 'agent', homeRow: 0, homeCol: 1, behavior: 'desk' },
  { id: 'growth',   name: 'Growth',   role: 'Analytics',       color: '#8b5cf6', avatar: '/agent-avatars/agent-07.jpg', type: 'agent', homeRow: 2, homeCol: 4, behavior: 'desk' },
  { id: 'intel',    name: 'Intel',    role: 'Intelligence',    color: '#ef4444', avatar: '/agent-avatars/agent-03.jpg', type: 'agent', homeRow: 0, homeCol: 3, behavior: 'desk' },
  { id: 'observer', name: 'Observer', role: 'Quality Control', color: '#94a3b8', avatar: '/agent-avatars/agent-08.png', type: 'agent', homeRow: 3, homeCol: 0, behavior: 'desk' },
  { id: 'xalt',     name: 'X-Alt',    role: 'Twitter Intel',   color: '#06b6d4', avatar: '/agent-avatars/agent-09.jpg', type: 'agent', homeRow: 0, homeCol: 5, behavior: 'desk' },
  { id: 'content',  name: 'Content',  role: 'Content Creator', color: '#f97316', avatar: '/agent-avatars/agent-01.jpg', type: 'agent', homeRow: 3, homeCol: 2, behavior: 'desk' },
  { id: 'social',   name: 'Social',   role: 'Community',       color: '#22c55e', avatar: '/agent-avatars/agent-06.jpg', type: 'agent', homeRow: 3, homeCol: 4, behavior: 'desk' },
  { id: 'creative', name: 'Creative', role: 'Design',          color: '#ec4899', avatar: '/agent-avatars/agent-10.jpg', type: 'agent', homeRow: 4, homeCol: 3, behavior: 'desk' },
  // 3 Team Members
  { id: 'atlas-human', name: 'Atlas ⚡', role: 'Tactical Titan', color: '#3b82f6', avatar: '/team-avatars/atlas.jpg', type: 'team', homeRow: 2, homeCol: 3, behavior: 'coordinator' },
  { id: 'orion',       name: 'Orion',    role: 'Creative Builder', color: '#a855f7', avatar: '/team-avatars/orion.jpg', type: 'team', homeRow: 1, homeCol: 2, behavior: 'roamer' },
  { id: 'carlos',      name: 'Carlos',   role: 'War Machine',     color: '#f43f5e', avatar: '/team-avatars/carlos.jpg', type: 'team', homeRow: 1, homeCol: 4, behavior: 'roamer' },
];

// ─── Isometric Helpers ──────────────────────────────────────────────────────

function gridToIso(row: number, col: number): { x: number; y: number } {
  return {
    x: (col - row) * (TILE_W / 2) + OFFICE_W / 2,
    y: (col + row) * (TILE_H / 2) + 60,
  };
}

// Simple A* pathfinding on isometric grid
function findPath(
  startRow: number, startCol: number,
  endRow: number, endCol: number,
): { x: number; y: number }[] {
  // Direct path with waypoints (simplified A* for smooth movement)
  const steps: { x: number; y: number }[] = [];
  const dr = endRow - startRow;
  const dc = endCol - startCol;
  const dist = Math.max(Math.abs(dr), Math.abs(dc));
  if (dist === 0) return [];
  
  for (let i = 1; i <= dist; i++) {
    const r = startRow + Math.round((dr * i) / dist);
    const c = startCol + Math.round((dc * i) / dist);
    const iso = gridToIso(r, c);
    steps.push(iso);
  }
  return steps;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

function useAnimationLoop(callback: (dt: number) => void) {
  const cbRef = useRef(callback);
  cbRef.current = callback;
  const lastRef = useRef(0);

  useEffect(() => {
    let raf: number;
    const loop = (time: number) => {
      const dt = lastRef.current ? Math.min((time - lastRef.current) / 1000, 0.1) : 0.016;
      lastRef.current = time;
      cbRef.current(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}

// ─── Character Component ────────────────────────────────────────────────────

function Character({
  state,
  onClick,
  selected,
}: {
  state: CharacterState;
  onClick: () => void;
  selected: boolean;
}) {
  const { config, animState, direction, bobPhase, x, y } = state;
  const isWalking = animState === 'walking';
  const isCelebrating = animState === 'celebrating';
  const isStressed = animState === 'stressed';
  const isWorking = animState === 'working';

  // Walking bob offset
  const walkBob = isWalking ? Math.sin(bobPhase * 8) * 3 : 0;
  const celebrateBob = isCelebrating ? Math.abs(Math.sin(bobPhase * 6)) * -8 : 0;
  const stressShake = isStressed ? Math.sin(bobPhase * 15) * 2 : 0;
  const workPulse = isWorking ? Math.sin(bobPhase * 3) * 0.5 : 0;

  const avatarSize = config.type === 'team' ? 52 : 44;
  const borderWidth = config.type === 'team' ? 3 : 2;

  return (
    <button
      onClick={onClick}
      className="absolute group focus:outline-none"
      style={{
        left: `${x}px`,
        top: `${y + walkBob + celebrateBob}px`,
        transform: `translate(-50%, -50%) scaleX(${direction === 'left' ? -1 : 1})`,
        zIndex: Math.floor(y) + 100,
        transition: 'filter 0.3s',
        filter: selected ? `drop-shadow(0 0 12px ${config.color})` : 'none',
      }}
    >
      {/* Shadow */}
      <div
        className="absolute rounded-full opacity-30"
        style={{
          width: avatarSize * 0.8,
          height: avatarSize * 0.3,
          left: '50%',
          top: avatarSize / 2 + 8,
          transform: 'translateX(-50%)',
          background: `radial-gradient(ellipse, ${config.color}66 0%, transparent 70%)`,
        }}
      />

      {/* Desk indicator (when at home and working) */}
      {(animState === 'working' || animState === 'idle') && config.behavior === 'desk' && (
        <div
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-60"
          style={{
            width: 80,
            height: 20,
            background: `linear-gradient(135deg, ${config.color}15 0%, ${config.color}08 100%)`,
            border: `1px solid ${config.color}22`,
            borderRadius: 2,
            transform: `translateX(-50%) perspective(100px) rotateX(60deg)`,
          }}
        />
      )}

      {/* Glow */}
      <div
        className="absolute rounded-full blur-xl transition-opacity duration-500"
        style={{
          width: avatarSize + 20,
          height: avatarSize + 20,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: config.color,
          opacity: isWorking ? 0.25 + workPulse * 0.1 : isCelebrating ? 0.4 : 0.1,
        }}
      />

      {/* Avatar */}
      <div
        className="relative rounded-full overflow-hidden"
        style={{
          width: avatarSize,
          height: avatarSize,
          border: `${borderWidth}px solid ${config.color}`,
          boxShadow: `0 0 ${isWorking ? 15 : 8}px ${config.color}55`,
          transform: `translateX(${stressShake}px) rotate(${isWalking ? Math.sin(bobPhase * 6) * 3 : 0}deg)`,
        }}
      >
        <Image
          src={config.avatar}
          alt={config.name}
          fill
          className="object-cover"
          sizes={`${avatarSize}px`}
        />

        {/* Working overlay */}
        {isWorking && (
          <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/5 animate-pulse" />
        )}
      </div>

      {/* Status indicator dots */}
      <div className="absolute -top-1 -right-1">
        <div
          className={`w-3 h-3 rounded-full border border-slate-900 ${
            animState === 'working' ? 'bg-green-500' :
            animState === 'celebrating' ? 'bg-yellow-400 animate-ping' :
            animState === 'stressed' ? 'bg-red-500' :
            animState === 'walking' ? 'bg-blue-400' :
            'bg-slate-500'
          }`}
        />
      </div>

      {/* Celebration particles */}
      {isCelebrating && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-sm animate-bounce">
          🎉
        </div>
      )}

      {/* Stress indicator */}
      {isStressed && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-sm">
          😰
        </div>
      )}

      {/* Phone indicator for Carlos */}
      {config.id === 'carlos' && (animState === 'walking' || animState === 'working') && (
        <div className="absolute -top-1 -left-2 text-xs">📱</div>
      )}

      {/* Laptop indicator for Orion */}
      {config.id === 'orion' && animState === 'walking' && (
        <div className="absolute -top-1 -left-2 text-xs">💻</div>
      )}

      {/* Name label */}
      <div className="mt-1 text-center pointer-events-none" style={{ transform: `scaleX(${direction === 'left' ? -1 : 1})` }}>
        <div className="text-[10px] font-bold tracking-wide whitespace-nowrap" style={{ color: config.color }}>
          {config.name}
        </div>
        <div className="text-[8px] text-slate-500">{config.role}</div>
      </div>

      {/* Tooltip on hover */}
      <div
        className="absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
        style={{ transform: `translateX(-50%) scaleX(${direction === 'left' ? -1 : 1})` }}
      >
        <div className="bg-slate-800/95 border border-slate-700 rounded-lg px-3 py-2 text-xs whitespace-nowrap backdrop-blur-sm">
          <div className="font-semibold" style={{ color: config.color }}>{config.name}</div>
          <div className="text-slate-400 capitalize">{animState} · {config.type === 'team' ? 'Team' : 'AI Agent'}</div>
        </div>
      </div>
    </button>
  );
}

// ─── Particle Effects ───────────────────────────────────────────────────────

function ParticleLayer({ particles }: { particles: Particle[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            opacity: (p.life / p.maxLife) * 0.8,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
}

// ─── Data Stream Lines ──────────────────────────────────────────────────────

function DataStreams({ characters }: { characters: CharacterState[] }) {
  const atlas = characters.find(c => c.id === 'atlas');
  if (!atlas) return null;

  const agents = characters.filter(c => c.config.type === 'agent' && c.id !== 'atlas');

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {agents.map(agent => {
        const isActive = agent.animState === 'working';
        return (
          <line
            key={agent.id}
            x1={atlas.x}
            y1={atlas.y}
            x2={agent.x}
            y2={agent.y}
            stroke={agent.config.color}
            strokeWidth={isActive ? 1.5 : 0.5}
            strokeDasharray={isActive ? '6 4' : '2 8'}
            opacity={isActive ? 0.3 : 0.08}
            filter="url(#glow)"
          >
            {isActive && (
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="-20"
                dur="1s"
                repeatCount="indefinite"
              />
            )}
          </line>
        );
      })}
    </svg>
  );
}

// ─── Isometric Floor ────────────────────────────────────────────────────────

function IsometricFloor() {
  const tiles: JSX.Element[] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const { x, y } = gridToIso(r, c);
      const isRoundtable = r === ROUNDTABLE.row && c === ROUNDTABLE.col;
      tiles.push(
        <div
          key={`${r}-${c}`}
          className="absolute"
          style={{
            left: x,
            top: y,
            width: TILE_W,
            height: TILE_H,
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
          }}
        >
          <div
            className="w-full h-full"
            style={{
              background: isRoundtable
                ? 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0.03) 100%)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
              border: isRoundtable
                ? '1px solid rgba(99,102,241,0.15)'
                : '1px solid rgba(255,255,255,0.03)',
              clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            }}
          />
        </div>
      );
    }
  }

  return <>{tiles}</>;
}

// ─── Roundtable ─────────────────────────────────────────────────────────────

function Roundtable() {
  const { x, y } = gridToIso(ROUNDTABLE.row, ROUNDTABLE.col);
  return (
    <div
      className="absolute"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)', zIndex: 50 }}
    >
      <div
        className="w-20 h-10 rounded-full opacity-40"
        style={{
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.3) 0%, rgba(99,102,241,0.05) 70%)',
          border: '1px solid rgba(99,102,241,0.2)',
        }}
      />
    </div>
  );
}

// ─── Decorations ────────────────────────────────────────────────────────────

function Decorations() {
  const items = [
    { emoji: '🌿', row: -0.5, col: 0, opacity: 0.4 },
    { emoji: '🌿', row: -0.5, col: 5, opacity: 0.4 },
    { emoji: '🌴', row: 4.5, col: 0, opacity: 0.3 },
    { emoji: '🖥️', row: 4.5, col: 5, opacity: 0.25 },
    { emoji: '📡', row: -0.5, col: 3, opacity: 0.2 },
    { emoji: '⚡', row: 5, col: 3, opacity: 0.2 },
  ];

  return (
    <>
      {items.map((item, i) => {
        const { x, y } = gridToIso(item.row, item.col);
        return (
          <div
            key={i}
            className="absolute text-lg pointer-events-none"
            style={{ left: x, top: y, opacity: item.opacity, zIndex: 2, transform: 'translate(-50%, -50%)' }}
          >
            {item.emoji}
          </div>
        );
      })}
    </>
  );
}

// ─── Detail Panel ───────────────────────────────────────────────────────────

function DetailPanel({
  character,
  agentData,
  onClose,
}: {
  character: CharacterState;
  agentData?: AgentData;
  onClose: () => void;
}) {
  const { config, animState } = character;
  return (
    <div className="bg-slate-800/90 backdrop-blur-md border border-slate-700 rounded-xl p-4 w-full max-w-sm animate-slideIn">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-full overflow-hidden border-2" style={{ borderColor: config.color }}>
            <Image src={config.avatar} alt={config.name} fill className="object-cover" sizes="48px" />
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: config.color }}>{config.name}</h3>
            <p className="text-xs text-slate-400">{config.role}</p>
            <p className="text-[10px] text-slate-500 capitalize mt-0.5">
              {config.type === 'team' ? '👤 Team Member' : '🤖 AI Agent'} · {animState}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
      </div>

      {agentData && (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-slate-900/50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold" style={{ color: config.color }}>{agentData.eventCount}</div>
              <div className="text-[10px] text-slate-500">Events 24h</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold" style={{ color: config.color }}>{agentData.memoryCount}</div>
              <div className="text-[10px] text-slate-500">Memories</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold capitalize" style={{ color: config.color }}>{agentData.state}</div>
              <div className="text-[10px] text-slate-500">Status</div>
            </div>
          </div>
          {agentData.lastMessage && (
            <div className="bg-slate-900/50 rounded-lg p-2">
              <div className="text-[10px] text-slate-500 mb-1">Last Message</div>
              <div className="text-xs text-slate-300">&ldquo;{agentData.lastMessage}&rdquo;</div>
            </div>
          )}
        </>
      )}

      {config.type === 'team' && (
        <div className="bg-slate-900/50 rounded-lg p-2">
          <div className="text-[10px] text-slate-500 mb-1">Role</div>
          <div className="text-xs text-slate-300">
            {config.id === 'atlas-human' && 'Strategic coordinator at the roundtable. Oversees all AI agents and trading operations.'}
            {config.id === 'orion' && 'Creative visionary walking the floor, checking on agents and inspiring the team.'}
            {config.id === 'carlos' && 'Business strategist on the phone, coordinating deals and selling the vision.'}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mobile View ────────────────────────────────────────────────────────────

function MobileView({
  characters,
  agents,
  onSelect,
  selectedId,
}: {
  characters: CharacterState[];
  agents: AgentData[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  const selectedChar = characters.find(c => c.id === selectedId);
  const selectedAgent = agents.find(a => a.id === selectedId);

  return (
    <div className="space-y-3 p-4">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        🏢 <span>Cortex Capital Office</span>
        <span className="ml-2 flex items-center gap-1.5 px-2 py-0.5 bg-green-500/15 rounded-full text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400">Live</span>
        </span>
      </h2>

      {/* Team Members */}
      <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Team</div>
      <div className="grid grid-cols-3 gap-2">
        {characters.filter(c => c.config.type === 'team').map(char => (
          <button
            key={char.id}
            onClick={() => onSelect(char.id)}
            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${
              selectedId === char.id ? 'border-opacity-60 bg-slate-800/80' : 'border-slate-800 bg-slate-900/50'
            }`}
            style={{ borderColor: selectedId === char.id ? char.config.color : undefined }}
          >
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2" style={{ borderColor: char.config.color }}>
              <Image src={char.config.avatar} alt={char.config.name} fill className="object-cover" sizes="48px" />
            </div>
            <div className="text-[10px] font-bold" style={{ color: char.config.color }}>{char.config.name}</div>
          </button>
        ))}
      </div>

      {/* AI Agents */}
      <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-2">AI Agents</div>
      <div className="grid grid-cols-2 gap-2">
        {characters.filter(c => c.config.type === 'agent').map(char => {
          const agent = agents.find(a => a.id === char.id);
          return (
            <button
              key={char.id}
              onClick={() => onSelect(char.id)}
              className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                selectedId === char.id ? 'border-opacity-60 bg-slate-800/80' : 'border-slate-800 bg-slate-900/50'
              }`}
              style={{ borderColor: selectedId === char.id ? char.config.color : undefined }}
            >
              <div className="relative w-10 h-10 rounded-full overflow-hidden border flex-shrink-0" style={{ borderColor: char.config.color }}>
                <Image src={char.config.avatar} alt={char.config.name} fill className="object-cover" sizes="40px" />
                <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-900 ${
                  char.animState === 'working' ? 'bg-green-500' : char.animState === 'walking' ? 'bg-blue-400' : 'bg-slate-500'
                }`} />
              </div>
              <div className="text-left min-w-0">
                <div className="text-xs font-bold truncate" style={{ color: char.config.color }}>{char.config.name}</div>
                <div className="text-[10px] text-slate-500 truncate">{char.config.role}</div>
                {agent && <div className="text-[9px] text-slate-600">{agent.eventCount} events</div>}
              </div>
            </button>
          );
        })}
      </div>

      {selectedChar && (
        <DetailPanel
          character={selectedChar}
          agentData={selectedAgent}
          onClose={() => onSelect(selectedChar.id)}
        />
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function IsometricOffice() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [summary, setSummary] = useState<AgentSummary | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [characters, setCharacters] = useState<CharacterState[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [events, setEvents] = useState<OfficeEvent[]>([]);
  const particleIdRef = useRef(0);
  const tickRef = useRef(0);

  // Initialize characters
  useEffect(() => {
    const initial: CharacterState[] = ALL_CHARACTERS.map(config => {
      const iso = gridToIso(config.homeRow, config.homeCol);
      return {
        id: config.id,
        x: iso.x,
        y: iso.y,
        targetX: iso.x,
        targetY: iso.y,
        path: [],
        pathIndex: 0,
        animState: config.behavior === 'roamer' ? 'walking' : 'idle',
        direction: 'right' as Direction,
        bobPhase: Math.random() * Math.PI * 2,
        idleTimer: Math.random() * 5 + 2,
        config,
      };
    });
    setCharacters(initial);
  }, []);

  // Fetch agent data
  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setAgents(data.agents);
      setSummary(data.summary);
    } catch (err) {
      console.error('Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 15000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  // Generate simulated events for visual life
  useEffect(() => {
    const interval = setInterval(() => {
      const eventTypes: OfficeEvent['type'][] = ['trade_signal', 'trade_execute', 'big_win', 'risk_alert', 'data_flow'];
      const agentIds = ALL_CHARACTERS.filter(c => c.type === 'agent').map(c => c.id);
      const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];

      let event: OfficeEvent;
      switch (type) {
        case 'trade_signal':
          event = { type, from: 'intel', to: 'atlas', timestamp: Date.now() };
          break;
        case 'trade_execute':
          event = { type, from: 'atlas', to: 'scout', timestamp: Date.now() };
          break;
        case 'big_win':
          event = { type, timestamp: Date.now() };
          break;
        case 'risk_alert':
          event = { type, from: 'sage', timestamp: Date.now() };
          break;
        default:
          event = {
            type: 'data_flow',
            from: agentIds[Math.floor(Math.random() * agentIds.length)],
            to: 'atlas',
            timestamp: Date.now(),
          };
      }
      setEvents(prev => [...prev.slice(-10), event]);
    }, 4000 + Math.random() * 6000);
    return () => clearInterval(interval);
  }, []);

  // Spawn particles for events
  useEffect(() => {
    if (events.length === 0) return;
    const event = events[events.length - 1];

    setCharacters(prev => {
      const next = [...prev];
      const fromChar = next.find(c => c.id === event.from);
      const toChar = next.find(c => c.id === event.to);

      if (event.type === 'big_win') {
        // Everyone celebrates
        next.forEach(c => {
          c.animState = 'celebrating';
          c.idleTimer = 3;
        });
      } else if (event.type === 'risk_alert' && fromChar) {
        fromChar.animState = 'stressed';
        fromChar.idleTimer = 4;
      } else if (event.type === 'trade_signal' && fromChar && toChar) {
        // Intel walks to Atlas
        const path = findPath(
          fromChar.config.homeRow, fromChar.config.homeCol,
          toChar.config.homeRow, toChar.config.homeCol,
        );
        if (path.length > 0) {
          fromChar.path = path;
          fromChar.pathIndex = 0;
          fromChar.animState = 'walking';
          fromChar.targetX = path[0].x;
          fromChar.targetY = path[0].y;
        }
      } else if (event.type === 'trade_execute' && toChar) {
        // Scout rushes to desk
        const home = gridToIso(toChar.config.homeRow, toChar.config.homeCol);
        toChar.animState = 'working';
        toChar.targetX = home.x;
        toChar.targetY = home.y;
        toChar.idleTimer = 5;
      }

      return next;
    });

    // Spawn particles between from and to
    if (event.from && event.to) {
      setCharacters(curr => {
        const fromC = curr.find(c => c.id === event.from);
        const toC = curr.find(c => c.id === event.to);
        if (fromC && toC) {
          const newParticles: Particle[] = [];
          const color = fromC.config.color;
          for (let i = 0; i < 8; i++) {
            newParticles.push({
              id: particleIdRef.current++,
              x: fromC.x + (Math.random() - 0.5) * 20,
              y: fromC.y + (Math.random() - 0.5) * 20,
              targetX: toC.x + (Math.random() - 0.5) * 20,
              targetY: toC.y + (Math.random() - 0.5) * 20,
              color,
              life: 1,
              maxLife: 1,
              speed: 0.8 + Math.random() * 0.4,
              size: 2 + Math.random() * 3,
            });
          }
          setParticles(prev => [...prev, ...newParticles]);
        }
        return curr;
      });
    }
  }, [events]);

  // Main animation loop
  useAnimationLoop((dt) => {
    tickRef.current += dt;

    setCharacters(prev => {
      const next = prev.map(char => {
        const c = { ...char };
        c.bobPhase += dt;

        // ── Roamer behavior (Orion walks around, Carlos moves between desks)
        if (c.config.behavior === 'roamer' && c.animState !== 'celebrating') {
          if (c.path.length === 0 || c.pathIndex >= c.path.length) {
            c.idleTimer -= dt;
            if (c.idleTimer <= 0) {
              // Pick a random agent to visit
              const targets = ALL_CHARACTERS.filter(t => t.id !== c.id);
              const target = targets[Math.floor(Math.random() * targets.length)];
              const path = findPath(
                c.config.homeRow, c.config.homeCol,
                target.homeRow, target.homeCol,
              );
              if (path.length > 0) {
                c.path = path;
                c.pathIndex = 0;
                c.animState = 'walking';
                c.targetX = path[0].x;
                c.targetY = path[0].y;
              }
              c.idleTimer = 3 + Math.random() * 5;
            } else if (c.animState === 'walking') {
              c.animState = 'idle';
            }
          }
        }

        // ── Desk agent idle behavior
        if (c.config.behavior === 'desk' && c.animState !== 'celebrating' && c.animState !== 'stressed') {
          c.idleTimer -= dt;
          if (c.idleTimer <= 0 && c.path.length === 0) {
            // Randomly switch between idle and working
            const agentData = agents.find(a => a.id === c.id);
            if (agentData?.state === 'working') {
              c.animState = 'working';
            } else {
              c.animState = Math.random() > 0.5 ? 'working' : 'idle';
            }
            c.idleTimer = 3 + Math.random() * 8;
          }
        }

        // ── Coordinator (atlas-human stays near roundtable)
        if (c.config.behavior === 'coordinator' && c.animState !== 'celebrating') {
          c.idleTimer -= dt;
          if (c.idleTimer <= 0 && c.path.length === 0) {
            c.animState = Math.random() > 0.3 ? 'working' : 'idle';
            c.idleTimer = 4 + Math.random() * 6;
          }
        }

        // ── Move along path
        if (c.path.length > 0 && c.pathIndex < c.path.length) {
          const target = c.path[c.pathIndex];
          const dx = target.x - c.x;
          const dy = target.y - c.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 3) {
            c.x = target.x;
            c.y = target.y;
            c.pathIndex++;
            if (c.pathIndex >= c.path.length) {
              c.path = [];
              c.pathIndex = 0;
              c.animState = c.config.behavior === 'roamer' ? 'idle' : 'working';
              c.idleTimer = 2 + Math.random() * 4;
              // Return home after visiting
              if (c.config.behavior !== 'roamer') {
                const home = gridToIso(c.config.homeRow, c.config.homeCol);
                setTimeout(() => {
                  setCharacters(cs => cs.map(ch => {
                    if (ch.id !== c.id) return ch;
                    const path = findPath(
                      Math.round(c.config.homeRow + (c.y - home.y) / TILE_H),
                      Math.round(c.config.homeCol + (c.x - home.x) / TILE_W),
                      c.config.homeRow,
                      c.config.homeCol,
                    );
                    return { ...ch, path, pathIndex: 0, animState: 'walking' as AnimState };
                  }));
                }, 2000);
              }
            } else {
              c.targetX = c.path[c.pathIndex].x;
              c.targetY = c.path[c.pathIndex].y;
            }
          } else {
            const speed = MOVE_SPEED * (c.config.id === 'scout' ? 1.8 : 1);
            c.x += (dx / dist) * speed;
            c.y += (dy / dist) * speed;
            c.direction = dx > 0 ? 'right' : 'left';
            c.animState = 'walking';
          }
        }

        // ── Celebration timeout
        if (c.animState === 'celebrating' || c.animState === 'stressed') {
          c.idleTimer -= dt;
          if (c.idleTimer <= 0) {
            c.animState = 'idle';
            c.idleTimer = 3 + Math.random() * 4;
          }
        }

        return c;
      });
      return next;
    });

    // Update particles
    setParticles(prev => {
      return prev
        .map(p => {
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          return {
            ...p,
            x: p.x + (dx / Math.max(dist, 1)) * p.speed * 2,
            y: p.y + (dy / Math.max(dist, 1)) * p.speed * 2,
            life: p.life - dt * p.speed,
          };
        })
        .filter(p => p.life > 0);
    });

    // Ambient particles (constant data flow)
    if (Math.random() < dt * 2) {
      const agentChars = ALL_CHARACTERS.filter(c => c.type === 'agent' && c.id !== 'atlas');
      const src = agentChars[Math.floor(Math.random() * agentChars.length)];
      const srcIso = gridToIso(src.homeRow, src.homeCol);
      const atlasIso = gridToIso(2, 2);
      setParticles(prev => [...prev.slice(-50), {
        id: particleIdRef.current++,
        x: srcIso.x + (Math.random() - 0.5) * 30,
        y: srcIso.y + (Math.random() - 0.5) * 15,
        targetX: atlasIso.x + (Math.random() - 0.5) * 20,
        targetY: atlasIso.y + (Math.random() - 0.5) * 10,
        color: src.color,
        life: 1,
        maxLife: 1,
        speed: 0.3 + Math.random() * 0.3,
        size: 1.5 + Math.random() * 1.5,
      }]);
    }
  });

  // Sync agent data states
  useEffect(() => {
    if (agents.length === 0) return;
    setCharacters(prev => prev.map(c => {
      const agentData = agents.find(a => a.id === c.id);
      if (!agentData || c.animState === 'walking' || c.animState === 'celebrating' || c.animState === 'stressed') return c;
      if (agentData.state === 'working' && c.animState === 'idle') {
        return { ...c, animState: 'working' as AnimState };
      }
      return c;
    }));
  }, [agents]);

  // Responsive
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleSelect = (id: string) => {
    setSelectedId(prev => prev === id ? null : id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-slate-500 animate-pulse">Loading office...</div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <MobileView
        characters={characters}
        agents={agents}
        onSelect={handleSelect}
        selectedId={selectedId}
      />
    );
  }

  const selectedChar = characters.find(c => c.id === selectedId);
  const selectedAgent = agents.find(a => a.id === selectedId);

  return (
    <div className="relative w-full h-full min-h-[650px] overflow-hidden select-none bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-indigo-500/[0.03] blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[200px] rounded-full bg-cyan-500/[0.02] blur-3xl" />
      </div>

      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white/90">🏢 Cortex Capital</h2>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/15 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400">Live</span>
          </div>
          <div className="text-[10px] text-slate-600 ml-2">
            {characters.filter(c => c.animState === 'working').length} working ·{' '}
            {characters.filter(c => c.animState === 'walking').length} moving ·{' '}
            13 characters
          </div>
        </div>
        {summary && (
          <div className="flex items-center gap-4 text-xs">
            <div className="text-slate-400">
              <span className="text-white font-semibold">{summary.totalTrades7d}</span> trades (7d)
            </div>
            <div className="text-slate-400">
              Win rate: <span className="text-green-400 font-semibold">{summary.winRate7d}%</span>
            </div>
            <div className={`font-semibold ${summary.totalPnl7d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {summary.totalPnl7d >= 0 ? '+' : ''}{summary.totalPnl7d.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* Isometric office */}
      <div className="absolute inset-0 flex items-center justify-center pt-8">
        <div className="relative" style={{ width: OFFICE_W, height: OFFICE_H }}>
          {/* Floor tiles */}
          <IsometricFloor />

          {/* Decorations */}
          <Decorations />

          {/* Roundtable */}
          <Roundtable />

          {/* Data stream lines */}
          <DataStreams characters={characters} />

          {/* Particles */}
          <ParticleLayer particles={particles} />

          {/* Characters */}
          {characters.map(char => (
            <Character
              key={char.id}
              state={char}
              onClick={() => handleSelect(char.id)}
              selected={selectedId === char.id}
            />
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {selectedChar && (
        <div className="absolute top-16 right-4 z-30">
          <DetailPanel
            character={selectedChar}
            agentData={selectedAgent}
            onClose={() => setSelectedId(null)}
          />
        </div>
      )}

      {/* Event log */}
      <div className="absolute bottom-4 right-4 z-20 max-w-xs">
        <div className="space-y-1">
          {events.slice(-3).map((evt, i) => (
            <div key={i} className="text-[10px] text-slate-600 bg-slate-900/50 rounded px-2 py-1 backdrop-blur-sm">
              {evt.type === 'trade_signal' && '📡 Trade signal detected'}
              {evt.type === 'trade_execute' && '⚡ Executing trade'}
              {evt.type === 'big_win' && '🎉 Big win! Team celebrating'}
              {evt.type === 'risk_alert' && '🔴 Risk alert triggered'}
              {evt.type === 'data_flow' && `📊 Data flowing: ${evt.from} → ${evt.to}`}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex gap-3 text-[10px] text-slate-500 z-20">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Working</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400" /> Walking</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400" /> Celebrating</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Stressed</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-500" /> Idle</div>
      </div>
    </div>
  );
}
