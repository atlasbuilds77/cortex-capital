// Cortex Capital API Client for Fish Tank
// Fetches live Alpaca paper trading data

const API_BASE = process.env.NEXT_PUBLIC_CORTEX_API || 'http://localhost:3001';

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  status: 'monitoring' | 'planning' | 'ready' | 'idle' | 'scanning' | 'analyzing' | 'executing';
  lastAction: string;
}

export interface Position {
  symbol: string;
  qty: number;
  current_price: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
}

export interface Activity {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  qty: string;
  status: string;
  time: string;
}

export interface FishTankData {
  account: {
    cash: number;
    portfolio_value: number;
    buying_power: number;
  };
  daily_pnl: {
    value: number;
    percent: number;
  };
  positions: Position[];
  recent_activity: Activity[];
  agents: Agent[];
  is_paper: boolean;
  timestamp: string;
}

export async function fetchFishTankData(): Promise<FishTankData | null> {
  try {
    const response = await fetch(`${API_BASE}/api/fishtank/live`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const json = await response.json();
    
    if (!json.success) {
      throw new Error(json.error || 'Unknown error');
    }
    
    return json.data;
  } catch (error) {
    console.error('[FishTank] Failed to fetch data:', error);
    return null;
  }
}

// Format currency
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Format percentage
export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

// Format time ago
export function timeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  
  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHr > 0) return `${diffHr}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return 'just now';
}
