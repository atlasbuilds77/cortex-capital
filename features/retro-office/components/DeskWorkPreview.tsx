"use client";

import type { OfficeAgent } from "@/features/retro-office/core/types";

type DeskWorkPreviewProps = {
  agent: OfficeAgent;
  deskIndex: number;
};

export function DeskWorkPreview({ agent, deskIndex }: DeskWorkPreviewProps) {
  // Generate work context based on agent status and desk
  const workContext = agent.status === 'working' 
    ? generateWorkContext(agent, deskIndex)
    : { primary: 'On break', details: [] };

  return (
    <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none">
      <div className="flex flex-col gap-2 bg-[#120e08]/95 backdrop-blur-sm border border-amber-800/30 rounded-lg px-4 py-3 shadow-xl max-w-sm">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div
              className="w-8 h-8 rounded-md"
              style={{ backgroundColor: agent.color }}
            />
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#120e08] ${
                agent.status === 'error'
                  ? 'bg-red-400'
                  : agent.status === 'working'
                    ? 'bg-green-400'
                    : 'bg-yellow-400'
              }`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-amber-100 truncate">
              {agent.name}
            </div>
            <div className="text-xs text-amber-400/80">
              Desk {deskIndex + 1} • {agent.item}
            </div>
          </div>
        </div>

        {agent.status === 'working' && (
          <div className="mt-2 space-y-1">
            <div className="text-xs font-semibold text-amber-200">
              {workContext.primary}
            </div>
            {workContext.details.length > 0 && (
              <div className="space-y-0.5">
                {workContext.details.map((detail, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-[10px] text-amber-400/70">
                    <span className="text-amber-500/50">•</span>
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function generateWorkContext(agent: OfficeAgent, deskIndex: number): { primary: string; details: string[] } {
  const contexts = [
    {
      primary: 'Watching: AAPL, TSLA, NVDA',
      details: ['Chart analysis on multiple timeframes', 'Monitoring volume patterns'],
    },
    {
      primary: 'Researching: Semiconductor sector',
      details: ['Reviewing earnings reports', 'Tracking supply chain news'],
    },
    {
      primary: 'Analyzing: SPY 0DTE opportunities',
      details: ['Gamma exposure calculations', 'IV crush scenarios'],
    },
    {
      primary: 'Scanning: Market microstructure',
      details: ['Order flow imbalances', 'Liquidity pool analysis'],
    },
    {
      primary: 'Building: Risk models',
      details: ['Portfolio correlation matrix', 'Tail risk hedging strategies'],
    },
    {
      primary: 'Executing: Volatility arbitrage',
      details: ['Cross-asset vol spreads', 'Gamma scalping setups'],
    },
  ];

  // Deterministic selection based on agent ID and desk
  const seed = agent.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + deskIndex;
  const index = seed % contexts.length;
  
  return contexts[index];
}
