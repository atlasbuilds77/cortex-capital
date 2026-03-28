// React hooks for consuming Cortex Capital data in the Fish Tank UI
"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  CortexPnL,
  CortexTrade,
  CortexAgentActivity,
} from "@/lib/cortex-capital-api";

/**
 * Poll interval for fetching data (milliseconds)
 */
const POLL_INTERVAL = 5000; // 5 seconds

/**
 * Hook for fetching live P&L from Cortex Capital
 */
export function useCortexPnL() {
  const [pnl, setPnl] = useState<CortexPnL | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPnL = useCallback(async () => {
    try {
      const response = await fetch("/api/cortex/pnl");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setPnl(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch P&L");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPnL();
    const interval = setInterval(fetchPnL, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchPnL]);

  return { pnl, loading, error, refetch: fetchPnL };
}

/**
 * Hook for fetching recent trades from Cortex Capital
 */
export function useCortexTrades(limit: number = 10) {
  const [trades, setTrades] = useState<CortexTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = useCallback(async () => {
    try {
      const response = await fetch(`/api/cortex/trades?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setTrades(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch trades");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchTrades]);

  return { trades, loading, error, refetch: fetchTrades };
}

/**
 * Hook for fetching agent activity from Cortex Capital
 */
export function useCortexActivity(limit: number = 20) {
  const [activity, setActivity] = useState<CortexAgentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/cortex/activity?limit=${limit}`,
        { method: "GET" }
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setActivity(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch activity"
      );
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  return { activity, loading, error, refetch: fetchActivity };
}

/**
 * Hook for checking Cortex Capital API health
 */
export function useCortexHealth() {
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch("/api/health");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setHealthy(data.status === "healthy");
      setVersion(data.version);
      setError(null);
    } catch (err) {
      setHealthy(false);
      setError(err instanceof Error ? err.message : "Health check failed");
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [checkHealth]);

  return { healthy, version, error, refetch: checkHealth };
}
