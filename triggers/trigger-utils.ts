/**
 * Trigger Utilities - Cooldown helpers, logging, and shared types
 */

export interface ProposalTemplate {
  title: string;
  agent_id: string;
  signal_type: string;
  entry_price?: number;
  target?: number;
  stop_loss?: number;
  proposed_steps: any[];
  metadata?: Record<string, any>;
}

export interface TriggerResult {
  fired: boolean;
  proposal?: ProposalTemplate;
  triggerName: string;
  metadata?: Record<string, any>;
}

export interface CooldownState {
  lastFiredAt: Date;
  fireCount: number;
}

export interface TriggerConfig {
  name: string;
  cooldownMinutes: number;
  maxFiresPerHour?: number;
}

export class CooldownManager {
  private cooldownMap: Map<string, CooldownState> = new Map();
  private hourlyCountMap: Map<string, number> = new Map();

  /**
   * Check if a trigger can fire based on cooldown
   */
  canFire(triggerName: string, cooldownMinutes: number): boolean {
    const state = this.cooldownMap.get(triggerName);
    if (!state) return true;

    const now = new Date();
    const timeSinceLastFire = now.getTime() - state.lastFiredAt.getTime();
    const cooldownMs = cooldownMinutes * 60 * 1000;

    return timeSinceLastFire >= cooldownMs;
  }

  /**
   * Check hourly rate limit
   */
  canFireHourly(triggerName: string, maxPerHour: number = 10): boolean {
    const hourKey = `${triggerName}:${new Date().getHours()}`;
    const count = this.hourlyCountMap.get(hourKey) || 0;
    return count < maxPerHour;
  }

  /**
   * Record a trigger fire
   */
  recordFire(triggerName: string): void {
    const now = new Date();
    this.cooldownMap.set(triggerName, {
      lastFiredAt: now,
      fireCount: (this.cooldownMap.get(triggerName)?.fireCount || 0) + 1
    });

    // Update hourly count
    const hourKey = `${triggerName}:${now.getHours()}`;
    this.hourlyCountMap.set(hourKey, (this.hourlyCountMap.get(hourKey) || 0) + 1);

    // Clean up old hourly counts (keep last 24 hours)
    const twentyFourHoursAgo = now.getTime() - 24 * 60 * 60 * 1000;
    for (const [key] of this.hourlyCountMap.entries()) {
      const [, hourStr] = key.split(':');
      const hour = parseInt(hourStr);
      const hourTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour).getTime();
      if (hourTime < twentyFourHoursAgo) {
        this.hourlyCountMap.delete(key);
      }
    }
  }

  /**
   * Get time until next available fire
   */
  getTimeUntilNextFire(triggerName: string, cooldownMinutes: number): number {
    const state = this.cooldownMap.get(triggerName);
    if (!state) return 0;

    const now = new Date();
    const timeSinceLastFire = now.getTime() - state.lastFiredAt.getTime();
    const cooldownMs = cooldownMinutes * 60 * 1000;
    const timeRemaining = cooldownMs - timeSinceLastFire;

    return Math.max(0, timeRemaining);
  }

  /**
   * Clear cooldown for a trigger
   */
  clearCooldown(triggerName: string): void {
    this.cooldownMap.delete(triggerName);
  }

  /**
   * Get all cooldown states
   */
  getAllStates(): Record<string, CooldownState> {
    const result: Record<string, CooldownState> = {};
    for (const [key, value] of this.cooldownMap.entries()) {
      result[key] = { ...value };
    }
    return result;
  }
}

export class TriggerLogger {
  private static instance: TriggerLogger;
  private logs: Array<{
    timestamp: Date;
    triggerName: string;
    fired: boolean;
    message: string;
    metadata?: Record<string, any>;
  }> = [];

  private constructor() {}

  static getInstance(): TriggerLogger {
    if (!TriggerLogger.instance) {
      TriggerLogger.instance = new TriggerLogger();
    }
    return TriggerLogger.instance;
  }

  log(triggerName: string, fired: boolean, message: string, metadata?: Record<string, any>): void {
    const logEntry = {
      timestamp: new Date(),
      triggerName,
      fired,
      message,
      metadata
    };

    this.logs.push(logEntry);
    
    // Keep only last 1000 logs
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }

    // Console output for debugging
    const status = fired ? '🔥 FIRED' : '⏸️ SKIPPED';
    console.log(`[${logEntry.timestamp.toISOString()}] ${status} ${triggerName}: ${message}`);
  }

  getRecentLogs(limit: number = 50): Array<typeof this.logs[0]> {
    return this.logs.slice(-limit);
  }

  getStats(): {
    totalFires: number;
    totalSkips: number;
    fireRate: number;
    recentActivity: Array<{ triggerName: string; fires: number; skips: number }>;
  } {
    const totalFires = this.logs.filter(log => log.fired).length;
    const totalSkips = this.logs.filter(log => !log.fired).length;
    const total = totalFires + totalSkips;
    const fireRate = total > 0 ? totalFires / total : 0;

    // Group by trigger for recent activity (last 100 logs)
    const recentLogs = this.logs.slice(-100);
    const triggerStats = new Map<string, { fires: number; skips: number }>();
    
    for (const log of recentLogs) {
      const stats = triggerStats.get(log.triggerName) || { fires: 0, skips: 0 };
      if (log.fired) {
        stats.fires++;
      } else {
        stats.skips++;
      }
      triggerStats.set(log.triggerName, stats);
    }

    const recentActivity = Array.from(triggerStats.entries()).map(([triggerName, stats]) => ({
      triggerName,
      fires: stats.fires,
      skips: stats.skips
    }));

    return {
      totalFires,
      totalSkips,
      fireRate,
      recentActivity
    };
  }

  clear(): void {
    this.logs = [];
  }
}

/**
 * Helper to add jitter to scheduled triggers
 */
export function addJitter(baseIntervalMs: number, jitterPercent: number = 20): number {
  const jitterRange = (baseIntervalMs * jitterPercent) / 100;
  const jitter = (Math.random() * 2 - 1) * jitterRange; // -jitterRange to +jitterRange
  return Math.max(baseIntervalMs / 2, baseIntervalMs + jitter); // Don't go below half interval
}

/**
 * Helper to check if a trigger should skip based on probability
 */
export function shouldSkip(skipProbability: number): boolean {
  return Math.random() < skipProbability;
}

/**
 * Helper to rotate through topics for proactive triggers
 */
export function rotateTopic<T>(topics: T[], lastTopic?: T): T {
  if (!lastTopic || !topics.includes(lastTopic)) {
    return topics[Math.floor(Math.random() * topics.length)];
  }
  
  const currentIndex = topics.indexOf(lastTopic);
  const nextIndex = (currentIndex + 1) % topics.length;
  return topics[nextIndex];
}

/**
 * Budget timer for enforcing 4000ms max
 */
export class BudgetTimer {
  private startTime: number;
  private budgetMs: number;

  constructor(budgetMs: number = 4000) {
    this.startTime = Date.now();
    this.budgetMs = budgetMs;
  }

  get elapsed(): number {
    return Date.now() - this.startTime;
  }

  get remaining(): number {
    return Math.max(0, this.budgetMs - this.elapsed);
  }

  hasTimeRemaining(): boolean {
    return this.elapsed < this.budgetMs;
  }

  checkpoint(message: string): void {
    console.log(`[BudgetTimer] ${message} - Elapsed: ${this.elapsed}ms, Remaining: ${this.remaining}ms`);
  }
}