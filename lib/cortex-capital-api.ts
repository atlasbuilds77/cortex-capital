// Cortex Capital API Connector
// Fetches live data from Cortex Capital trading system at http://localhost:3001

/**
 * Agent activity from Cortex Capital
 */
export interface CortexAgentActivity {
  agentRole: string;
  activity: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Live P&L data from Cortex Capital
 */
export interface CortexPnL {
  totalPnL: number;
  todayPnL: number;
  weekPnL: number;
  openPositions: number;
  dayTrades: number;
  accountValue: number;
  buyingPower: number;
  timestamp: number;
}

/**
 * Trade notification from Cortex Capital
 */
export interface CortexTrade {
  id: string;
  agentRole: string;
  ticker: string;
  action: "BUY" | "SELL" | "CLOSE";
  quantity: number;
  price: number;
  timestamp: number;
  strategyType?: string;
  profit?: number;
}

/**
 * API Response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Cortex Capital API client configuration
 */
const CORTEX_API_BASE = process.env.NEXT_PUBLIC_CORTEX_API_URL || "";
const CORTEX_API_TIMEOUT = 5000; // 5 second timeout

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CORTEX_API_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

/**
 * Fetch agent activity from Cortex Capital
 */
export async function fetchAgentActivity(
  limit: number = 20
): Promise<ApiResponse<CortexAgentActivity[]>> {
  try {
    const response = await fetchWithTimeout(
      `${CORTEX_API_BASE}/api/activity?limit=${limit}`
    );

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("[CortexAPI] Activity fetch error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetch live P&L from Cortex Capital
 */
export async function fetchLivePnL(): Promise<ApiResponse<CortexPnL>> {
  try {
    const response = await fetchWithTimeout(`${CORTEX_API_BASE}/api/pnl`);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("[CortexAPI] P&L fetch error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetch recent trades from Cortex Capital
 */
export async function fetchRecentTrades(
  limit: number = 10
): Promise<ApiResponse<CortexTrade[]>> {
  try {
    const response = await fetchWithTimeout(
      `${CORTEX_API_BASE}/api/trades/recent?limit=${limit}`
    );

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("[CortexAPI] Trades fetch error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetch account status from Cortex Capital
 */
export async function fetchAccountStatus(): Promise<
  ApiResponse<{
    status: "active" | "suspended" | "error";
    message?: string;
    patternDayTrader: boolean;
    marginEnabled: boolean;
  }>
> {
  try {
    const response = await fetchWithTimeout(`${CORTEX_API_BASE}/api/account/status`);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("[CortexAPI] Account status fetch error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Agent discussion message
 */
export interface AgentDiscussionMessage {
  id: string;
  timestamp: string;
  agent: string;
  role: string;
  avatar: string;
  color: string;
  content: string;
  replyTo?: string;
  discussionId: string;
  discussionTopic: string;
}

/**
 * Discussion session
 */
export interface Discussion {
  id: string;
  topic: string;
  startedAt: string;
  participants: string[];
  messages: AgentDiscussionMessage[];
  status: 'active' | 'concluded';
  outcome?: string;
}

/**
 * Fetch recent agent discussions
 */
export async function fetchDiscussions(): Promise<ApiResponse<{
  messages: AgentDiscussionMessage[];
  activeDiscussions: Discussion[];
}>> {
  try {
    const response = await fetchWithTimeout(`${CORTEX_API_BASE}/api/fishtank/discussions`);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    console.error("[CortexAPI] Discussions fetch error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetch live fishtank data (positions, agents, P&L)
 */
export async function fetchFishtankLive(): Promise<ApiResponse<{
  account: { cash: number; portfolio_value: number; buying_power: number };
  daily_pnl: { value: number; percent: number };
  positions: Array<{
    symbol: string;
    qty: number;
    current_price: number;
    unrealized_pnl: number;
    unrealized_pnl_pct: number;
  }>;
  recent_activity: Array<{
    id: string;
    symbol: string;
    side: string;
    qty: string;
    status: string;
    time: string;
  }>;
  agents: Array<{
    id: string;
    name: string;
    emoji: string;
    status: string;
    lastAction: string;
  }>;
  is_paper: boolean;
  timestamp: string;
}>> {
  try {
    const response = await fetchWithTimeout(`${CORTEX_API_BASE}/api/fishtank/live`);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    console.error("[CortexAPI] Fishtank live fetch error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Subscribe to agent discussions via SSE
 */
export function subscribeToDiscussions(
  onMessage?: (message: AgentDiscussionMessage) => void,
  onDiscussionStart?: (discussion: Discussion) => void,
  onDiscussionEnd?: (discussion: Discussion) => void,
  onHistory?: (messages: AgentDiscussionMessage[]) => void
): () => void {
  // Pass token as query param since EventSource doesn't support headers
  const token = typeof window !== 'undefined' ? localStorage.getItem('cortex_token') : null;
  const url = token 
    ? `${CORTEX_API_BASE}/api/fishtank/discussions/stream?token=${encodeURIComponent(token)}`
    : `${CORTEX_API_BASE}/api/fishtank/discussions/stream`;
  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'message':
          // Message fields are spread into root (not nested under data.message)
          onMessage?.(data);
          break;
        case 'discussion_start':
          // Discussion fields are spread into root
          onDiscussionStart?.(data);
          break;
        case 'discussion_end':
          onDiscussionEnd?.(data);
          break;
        case 'history':
          onHistory?.(data.messages);
          break;
      }
    } catch (error) {
      console.error("[CortexAPI] SSE discussion parse error:", error);
    }
  };

  eventSource.onerror = (error) => {
    console.error("[CortexAPI] SSE discussion connection error:", error);
  };

  return () => {
    eventSource.close();
  };
}

/**
 * Health check - verify Cortex Capital API is reachable
 */
export async function checkCortexHealth(): Promise<
  ApiResponse<{ status: "healthy"; version: string; uptime: number }>
> {
  try {
    const response = await fetchWithTimeout(`${CORTEX_API_BASE}/health`);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("[CortexAPI] Health check error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

/**
 * Subscribe to real-time updates via Server-Sent Events (SSE)
 */
export function subscribeToCortexUpdates(
  onActivity?: (activity: CortexAgentActivity) => void,
  onTrade?: (trade: CortexTrade) => void,
  onPnL?: (pnl: CortexPnL) => void
): () => void {
  const eventSource = new EventSource(`${CORTEX_API_BASE}/api/events`);

  eventSource.addEventListener("activity", (event) => {
    if (onActivity) {
      try {
        const data = JSON.parse(event.data);
        onActivity(data);
      } catch (error) {
        console.error("[CortexAPI] SSE activity parse error:", error);
      }
    }
  });

  eventSource.addEventListener("trade", (event) => {
    if (onTrade) {
      try {
        const data = JSON.parse(event.data);
        onTrade(data);
      } catch (error) {
        console.error("[CortexAPI] SSE trade parse error:", error);
      }
    }
  });

  eventSource.addEventListener("pnl", (event) => {
    if (onPnL) {
      try {
        const data = JSON.parse(event.data);
        onPnL(data);
      } catch (error) {
        console.error("[CortexAPI] SSE pnl parse error:", error);
      }
    }
  });

  eventSource.onerror = (error) => {
    console.error("[CortexAPI] SSE connection error:", error);
  };

  // Return cleanup function
  return () => {
    eventSource.close();
  };
}

/**
 * Format P&L for display
 */
export function formatPnL(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Get color for P&L value
 */
export function getPnLColor(value: number): "green" | "red" | "gray" {
  if (value > 0) return "green";
  if (value < 0) return "red";
  return "gray";
}
