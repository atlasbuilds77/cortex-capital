/**
 * USER UNIVERSE - Per-User Agent Instances
 * 
 * Each user gets their own "universe" of 7 agents.
 * Same base souls, but unique:
 * - Memory (what they've discussed with this user)
 * - Relationships (how agents feel about each other in this universe)
 * - Trade history (what they've traded for this user)
 * - Personality drift (agents evolve based on user's trading style)
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, 'data', 'universes');

interface UserUniverse {
  userId: string;
  tier: 'free' | 'scout' | 'operator' | 'partner';
  createdAt: string;
  agentMemory: Record<string, any[]>; // Per-agent memory
  tradeHistory: any[];
  preferences: {
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    sectors: string[];
    tradingStyle: string;
  };
  personalityOverrides: Record<string, string>; // Partner-tier custom tuning
}

/**
 * Get or create a user's universe
 */
export function getUserUniverse(userId: string): UserUniverse {
  const filePath = path.join(DATA_DIR, `${userId}.json`);
  
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch {}

  // Create new universe
  const universe: UserUniverse = {
    userId,
    tier: 'free',
    createdAt: new Date().toISOString(),
    agentMemory: {
      ANALYST: [],
      STRATEGIST: [],
      DAY_TRADER: [],
      MOMENTUM: [],
      RISK: [],
      EXECUTOR: [],
      REPORTER: [],
    },
    tradeHistory: [],
    preferences: {
      riskTolerance: 'moderate',
      sectors: [],
      tradingStyle: 'balanced',
    },
    personalityOverrides: {},
  };

  saveUserUniverse(universe);
  return universe;
}

/**
 * Save a user's universe
 */
export function saveUserUniverse(universe: UserUniverse): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const filePath = path.join(DATA_DIR, `${universe.userId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(universe, null, 2));
  } catch (error: any) {
    console.error('Failed to save universe:', error.message);
  }
}

/**
 * Add a memory to an agent in a user's universe
 */
export function addAgentMemory(
  userId: string,
  agentId: string,
  memory: { type: string; content: string; timestamp?: string }
): void {
  const universe = getUserUniverse(userId);
  if (!universe.agentMemory[agentId]) {
    universe.agentMemory[agentId] = [];
  }
  
  universe.agentMemory[agentId].push({
    ...memory,
    timestamp: memory.timestamp || new Date().toISOString(),
  });

  // Keep last 50 memories per agent
  if (universe.agentMemory[agentId].length > 50) {
    universe.agentMemory[agentId] = universe.agentMemory[agentId].slice(-50);
  }

  saveUserUniverse(universe);
}

/**
 * Get agent context for a specific user (injected into agent prompts)
 */
export function getUserAgentContext(userId: string, agentId: string): string {
  const universe = getUserUniverse(userId);
  
  const memories = universe.agentMemory[agentId] || [];
  const recentMemories = memories.slice(-5);
  
  let context = '';
  
  if (universe.preferences.riskTolerance) {
    context += `Client risk tolerance: ${universe.preferences.riskTolerance}. `;
  }
  
  if (universe.preferences.sectors.length > 0) {
    context += `Client interests: ${universe.preferences.sectors.join(', ')}. `;
  }

  if (recentMemories.length > 0) {
    context += `\nRecent interactions with this client:\n`;
    recentMemories.forEach(m => {
      context += `- ${m.content}\n`;
    });
  }

  if (universe.tradeHistory.length > 0) {
    const lastTrades = universe.tradeHistory.slice(-3);
    context += `\nRecent trades for this client:\n`;
    lastTrades.forEach(t => {
      context += `- ${t.symbol} ${t.direction} (${t.outcome || 'pending'})\n`;
    });
  }

  // Partner tier gets custom personality overrides
  if (universe.tier === 'partner' && universe.personalityOverrides[agentId]) {
    context += `\nCustom tuning: ${universe.personalityOverrides[agentId]}`;
  }

  return context;
}

/**
 * Update user tier
 */
export function updateUserTier(userId: string, tier: UserUniverse['tier']): void {
  const universe = getUserUniverse(userId);
  universe.tier = tier;
  saveUserUniverse(universe);
}

/**
 * Set custom personality override (Partner tier only)
 */
export function setAgentPersonality(
  userId: string,
  agentId: string,
  override: string
): boolean {
  const universe = getUserUniverse(userId);
  if (universe.tier !== 'partner') {
    return false; // Only partner tier can customize
  }
  universe.personalityOverrides[agentId] = override;
  saveUserUniverse(universe);
  return true;
}

/**
 * Log a trade in the user's universe
 */
export function logUserTrade(
  userId: string,
  trade: { symbol: string; direction: string; entry: number; outcome?: string }
): void {
  const universe = getUserUniverse(userId);
  universe.tradeHistory.push({
    ...trade,
    timestamp: new Date().toISOString(),
  });
  
  // Keep last 100 trades
  if (universe.tradeHistory.length > 100) {
    universe.tradeHistory = universe.tradeHistory.slice(-100);
  }
  
  saveUserUniverse(universe);
}

/**
 * List all universes (admin)
 */
export function listUniverses(): string[] {
  try {
    if (!fs.existsSync(DATA_DIR)) return [];
    return fs.readdirSync(DATA_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch {
    return [];
  }
}
