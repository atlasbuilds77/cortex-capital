"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { RetroOffice3D } from "@/features/retro-office/RetroOffice3D";
import type { OfficeAgent } from "@/features/retro-office/core/types";
import { CORTEX_AGENTS, toOfficeAgent, type CortexAgentConfig } from "@/agents/cortex-agents";
import { 
  BarChart2, 
  Crown, 
  Zap, 
  FileText, 
  Target, 
  TrendingUp, 
  Rocket,
  Bot
} from "lucide-react";

// Icon mapping for agents
const agentIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "bar-chart-2": BarChart2,
  "crown": Crown,
  "zap": Zap,
  "file-text": FileText,
  "target": Target,
  "trending-up": TrendingUp,
  "rocket": Rocket,
};

// Trade event type
interface TradeEvent {
  id: string;
  agent: string;
  agentName?: string;
  action: "BUY" | "SELL";
  symbol: string;
  pnl?: number;
  timestamp: string;
  displayUntil?: number; // Timestamp when notification should hide
}

// Agent activity state
interface AgentActivity {
  agentId: string;
  status: "idle" | "working" | "success" | "error";
  lastTrade?: TradeEvent;
  pnl: number;
}

// WebSocket message types
interface WSMessage {
  type: "init" | "trade" | "status";
  agents?: Record<string, any>;
  recentTrades?: TradeEvent[];
  totalPnL?: number;
  trade?: TradeEvent;
  agentState?: any;
  agentId?: string;
  status?: string;
}

const WS_URL = "ws://localhost:3004";
const HTTP_STATE_URL = "http://localhost:3004/state";

function AgentIcon({ iconName, className }: { iconName: string; className?: string }) {
  const IconComponent = agentIcons[iconName] || Bot;
  return <IconComponent className={className} />;
}

export default function TradingFloorPage() {
  const [agents, setAgents] = useState<OfficeAgent[]>([]);
  const [activities, setActivities] = useState<Map<string, AgentActivity>>(new Map());
  const [recentTrades, setRecentTrades] = useState<TradeEvent[]>([]);
  const [visibleNotifications, setVisibleNotifications] = useState<TradeEvent[]>([]);
  const [totalPnL, setTotalPnL] = useState(0);
  const [connected, setConnected] = useState(false);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-dismiss notifications after 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setVisibleNotifications((prev) => 
        prev.filter((n) => (n.displayUntil || 0) > now)
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize agents on mount
  useEffect(() => {
    const initialAgents = CORTEX_AGENTS.map((config) => toOfficeAgent(config, "idle"));
    setAgents(initialAgents);
    
    // Initialize activity map
    const initialActivities = new Map<string, AgentActivity>();
    CORTEX_AGENTS.forEach((config) => {
      initialActivities.set(config.id, {
        agentId: config.id,
        status: "idle",
        pnl: 0,
      });
    });
    setActivities(initialActivities);
  }, []);

  // Connect to WebSocket
  useEffect(() => {
    let mounted = true;

    const connect = () => {
      if (!mounted) return;
      
      setWsStatus("connecting");
      
      // Try HTTP first to get initial state
      fetch(HTTP_STATE_URL)
        .then(res => res.json())
        .then(data => {
          if (!mounted) return;
          if (data.recentTrades) setRecentTrades(data.recentTrades);
          if (data.totalPnL) setTotalPnL(data.totalPnL);
          if (data.agents) {
            const newActivities = new Map<string, AgentActivity>();
            Object.entries(data.agents).forEach(([id, state]: [string, any]) => {
              newActivities.set(id, {
                agentId: id,
                status: state.status || "idle",
                pnl: state.pnl || 0,
                lastTrade: state.lastTrade,
              });
            });
            setActivities(newActivities);
          }
        })
        .catch(() => {
          // HTTP failed, will try WS
        });

      // Connect WebSocket
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!mounted) return;
          console.log("[FishTank] Connected to Cortex Bridge");
          setWsStatus("connected");
          setConnected(true);
        };

        ws.onmessage = (event) => {
          if (!mounted) return;
          try {
            const msg: WSMessage = JSON.parse(event.data);
            handleWSMessage(msg);
          } catch (err) {
            console.error("[FishTank] Parse error:", err);
          }
        };

        ws.onclose = () => {
          if (!mounted) return;
          console.log("[FishTank] Disconnected from Cortex Bridge");
          setWsStatus("disconnected");
          // Reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          console.log("[FishTank] WebSocket error, falling back to simulation");
          setWsStatus("disconnected");
        };
      } catch (err) {
        console.log("[FishTank] WebSocket not available, using simulation");
        setWsStatus("disconnected");
        setConnected(true); // Enable simulation mode
      }
    };

    const handleWSMessage = (msg: WSMessage) => {
      switch (msg.type) {
        case "init":
          if (msg.recentTrades) setRecentTrades(msg.recentTrades);
          if (msg.totalPnL !== undefined) setTotalPnL(msg.totalPnL);
          break;

        case "trade":
          if (msg.trade) {
            // Add trade to list
            setRecentTrades((prev) => [msg.trade!, ...prev].slice(0, 20));
            
            // Add to visible notifications with 8 second expiry
            const notificationTrade = {
              ...msg.trade,
              displayUntil: Date.now() + 8000,
            };
            setVisibleNotifications((prev) => [notificationTrade, ...prev].slice(0, 5));
            
            // Update total P&L
            if (msg.totalPnL !== undefined) setTotalPnL(msg.totalPnL);

            // Update agent status
            if (msg.agentState) {
              const agentId = msg.trade.agent;
              setAgents((prev) =>
                prev.map((agent) =>
                  agent.id === agentId
                    ? { ...agent, status: "working" as const }
                    : agent
                )
              );
              
              setActivities((prev) => {
                const newMap = new Map(prev);
                newMap.set(agentId, {
                  agentId,
                  status: "working",
                  pnl: msg.agentState.pnl || 0,
                  lastTrade: msg.trade,
                });
                return newMap;
              });
            }
          }
          break;

        case "status":
          if (msg.agentId) {
            setAgents((prev) =>
              prev.map((agent) =>
                agent.id === msg.agentId
                  ? { ...agent, status: (msg.status || "idle") as "idle" | "working" }
                  : agent
              )
            );
            
            setActivities((prev) => {
              const newMap = new Map(prev);
              const current = newMap.get(msg.agentId!);
              if (current) {
                newMap.set(msg.agentId!, {
                  ...current,
                  status: (msg.status || "idle") as "idle" | "working" | "success" | "error",
                });
              }
              return newMap;
            });
          }
          break;
      }
    };

    connect();

    return () => {
      mounted = false;
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  // Fallback simulation when WebSocket is not available
  useEffect(() => {
    if (wsStatus !== "disconnected") return;
    if (!connected) {
      setConnected(true);
    }

    const simulateTrade = () => {
      const randomAgent = CORTEX_AGENTS[Math.floor(Math.random() * CORTEX_AGENTS.length)];
      const actions: ("BUY" | "SELL")[] = ["BUY", "SELL"];
      const symbols = ["SPY", "QQQ", "AAPL", "NVDA", "TSLA", "AMD", "META", "GOOGL"];
      const action = actions[Math.floor(Math.random() * actions.length)];
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const pnl = Math.round((Math.random() - 0.4) * 500 * 100) / 100;

      const trade: TradeEvent = {
        id: `trade-${Date.now()}`,
        agent: randomAgent.id,
        agentName: randomAgent.name,
        action,
        symbol: action === "BUY" ? `${symbol} Call` : `${symbol} Put`,
        pnl,
        timestamp: new Date().toISOString(),
      };

      setAgents((prev) =>
        prev.map((agent) =>
          agent.id === randomAgent.id
            ? { ...agent, status: "working" as const }
            : agent
        )
      );

      setActivities((prev) => {
        const newMap = new Map(prev);
        const current = newMap.get(randomAgent.id);
        if (current) {
          newMap.set(randomAgent.id, {
            ...current,
            status: pnl >= 0 ? "success" : "error",
            lastTrade: trade,
            pnl: current.pnl + (pnl || 0),
          });
        }
        return newMap;
      });

      setRecentTrades((prev) => [trade, ...prev].slice(0, 20));
      
      // Add to visible notifications with 8 second expiry
      const notificationTrade = {
        ...trade,
        displayUntil: Date.now() + 8000,
      };
      setVisibleNotifications((prev) => [notificationTrade, ...prev].slice(0, 5));
      
      setTotalPnL((prev) => prev + (pnl || 0));

      setTimeout(() => {
        setAgents((prev) =>
          prev.map((agent) =>
            agent.id === randomAgent.id
              ? { ...agent, status: "idle" as const }
              : agent
          )
        );
        setActivities((prevAct) => {
          const newMap = new Map(prevAct);
          const current = newMap.get(randomAgent.id);
          if (current) {
            newMap.set(randomAgent.id, { ...current, status: "idle" });
          }
          return newMap;
        });
      }, 2000);
    };

    const interval = setInterval(() => {
      if (Math.random() > 0.3) simulateTrade();
    }, 4000 + Math.random() * 4000);

    const initialTimeout = setTimeout(simulateTrade, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, [wsStatus, connected]);

  // Build desk assignments for office
  const deskAssignmentByDeskUid = CORTEX_AGENTS.reduce((acc, config) => {
    const deskUid = `desk-${config.desk.x}-${config.desk.y}`;
    acc[deskUid] = config.id;
    return acc;
  }, {} as Record<string, string>);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getAgentIcon = (agentId: string) => {
    const agent = CORTEX_AGENTS.find((a) => a.id === agentId);
    return agent?.icon || "bot";
  };

  const getAgentName = (agentId: string) => {
    const agent = CORTEX_AGENTS.find((a) => a.id === agentId);
    return agent?.name || agentId;
  };

  return (
    <div className="h-screen w-screen bg-slate-950 flex">
      {/* Main 3D View */}
      <div className="flex-1 relative">
        <RetroOffice3D
          agents={agents}
          deskAssignmentByDeskUid={deskAssignmentByDeskUid}
          officeTitle="Cortex Capital Trading Floor"
          officeTitleLoaded={true}
          gatewayStatus={wsStatus === "connected" ? "connected" : "disconnected"}
        />

        {/* Overlay: Total P&L */}
        <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-xl rounded-xl border border-purple-500/20 p-4">
          <div className="text-sm text-gray-400 mb-1">Total P&L</div>
          <div
            className={`text-3xl font-bold ${
              totalPnL >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
          </div>
          <div className={`text-xs mt-1 ${wsStatus === "connected" ? "text-green-400" : "text-yellow-400"}`}>
            {wsStatus === "connected" ? "Live" : wsStatus === "connecting" ? "Connecting..." : "Demo Mode"}
          </div>
        </div>

        {/* Overlay: Title */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl rounded-xl border border-purple-500/20 px-6 py-3">
          <h1 className="text-xl font-bold text-purple-400">
            CORTEX CAPITAL FISH TANK
          </h1>
          <p className="text-xs text-gray-400 text-center">
            7 AI Agents Trading {wsStatus === "connected" ? "Live" : "Demo"}
          </p>
        </div>

        {/* Floating trade notifications - auto-dismiss after 8 seconds */}
        <div className="absolute top-20 left-4 space-y-2 max-w-sm">
          {visibleNotifications.slice(0, 3).map((trade, i) => (
            <div
              key={trade.id}
              className={`
                bg-slate-900/90 backdrop-blur-xl rounded-lg border p-3
                transition-all duration-500 animate-slide-in
                ${trade.pnl && trade.pnl >= 0 ? "border-green-500/30" : "border-red-500/30"}
                ${i === 0 ? "scale-100 opacity-100" : i === 1 ? "scale-95 opacity-70" : "scale-90 opacity-40"}
              `}
            >
              <div className="flex items-center gap-2 text-sm">
                <AgentIcon iconName={getAgentIcon(trade.agent)} className="w-4 h-4 text-purple-400" />
                <span className="font-medium">{trade.agentName || getAgentName(trade.agent)}</span>
                <span
                  className={`font-bold ${
                    trade.action === "BUY" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {trade.action}
                </span>
                <span className="text-gray-300">{trade.symbol}</span>
              </div>
              {trade.pnl !== undefined && (
                <div
                  className={`text-lg font-bold mt-1 ${
                    trade.pnl >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right Sidebar: Activity Feed */}
      <div className="w-80 bg-slate-900 border-l border-purple-500/20 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-purple-500/20">
          <h2 className="text-lg font-bold text-white">Live Activity</h2>
          <p className="text-xs text-gray-400">Real-time agent trading feed</p>
        </div>

        {/* Agent Status Grid */}
        <div className="p-4 border-b border-purple-500/20">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">AGENTS</h3>
          <div className="grid grid-cols-2 gap-2">
            {CORTEX_AGENTS.map((config) => {
              const activity = activities.get(config.id);
              return (
                <div
                  key={config.id}
                  className={`
                    p-2 rounded-lg border transition-all
                    ${
                      activity?.status === "working"
                        ? "border-yellow-500/50 bg-yellow-500/10 animate-pulse"
                        : activity?.status === "success"
                        ? "border-green-500/50 bg-green-500/10"
                        : activity?.status === "error"
                        ? "border-red-500/50 bg-red-500/10"
                        : "border-gray-700 bg-slate-800/50"
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <AgentIcon iconName={config.icon} className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-medium text-white truncate">
                      {config.name}
                    </span>
                  </div>
                  <div
                    className={`text-xs mt-1 font-mono ${
                      (activity?.pnl || 0) >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {(activity?.pnl || 0) >= 0 ? "+" : ""}$
                    {(activity?.pnl || 0).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trade History */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">RECENT TRADES</h3>
          <div className="space-y-2">
            {recentTrades.map((trade) => (
              <div
                key={trade.id}
                className="p-3 rounded-lg bg-slate-800/50 border border-gray-700"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <AgentIcon iconName={getAgentIcon(trade.agent)} className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-white">
                      {trade.agentName || getAgentName(trade.agent)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatTime(trade.timestamp)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold ${
                        trade.action === "BUY" ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {trade.action}
                    </span>
                    <span className="text-sm text-gray-300">{trade.symbol}</span>
                  </div>
                  {trade.pnl !== undefined && (
                    <span
                      className={`text-sm font-bold ${
                        trade.pnl >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {recentTrades.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                Waiting for trades...
              </div>
            )}
          </div>
        </div>

        {/* Footer Stats */}
        <div className="p-4 border-t border-purple-500/20 bg-slate-800/50">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-gray-400">Trades</div>
              <div className="text-lg font-bold text-white">{recentTrades.length}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Win Rate</div>
              <div className="text-lg font-bold text-green-400">
                {recentTrades.length > 0
                  ? Math.round(
                      (recentTrades.filter((t) => (t.pnl || 0) > 0).length /
                        recentTrades.length) *
                        100
                    )
                  : 0}
                %
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Active</div>
              <div className="text-lg font-bold text-yellow-400">
                {Array.from(activities.values()).filter(a => a.status === "working").length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
