import type { RenderAgent } from "./types";

// Trading thought phrases for thought bubbles
export const TRADING_THOUGHTS = [
  "NVDA looking strong...",
  "Time to trim winners?",
  "Volume picking up...",
  "Momentum shift incoming?",
  "Risk/reward looking good",
  "Watch the support level",
  "Breaking out nicely",
  "Need to review positions",
  "Markets rotating...",
  "Time to rebalance?",
  "Volatility expanding",
  "Feeling bullish today",
  "Could use a coffee...",
  "What's the fed saying?",
  "Checking the Greeks",
];

// Small talk phrases when agents bump into each other
export const SMALL_TALK_PHRASES = [
  "Hey!",
  "What's up?",
  "See the market today?",
  "Coffee break?",
  "How's it going?",
  "Catch you later",
  "Nice weather",
  "Busy day huh",
  "Getting lunch?",
  "Working late?",
];

/**
 * Determine agent mood based on market conditions and time
 */
export function determineAgentMood(params: {
  marketTrend?: "up" | "down" | "flat";
  volatility?: "high" | "low";
  timeOfDay?: Date;
}): "happy" | "frustrated" | "sleepy" | "excited" | "neutral" {
  const { marketTrend, volatility, timeOfDay } = params;

  // Check if it's lunch hour (11:30am-1pm EST)
  if (timeOfDay) {
    const hour = timeOfDay.getHours();
    const minute = timeOfDay.getMinutes();
    const estHour = hour - 5; // Convert to EST (rough approximation)
    if (
      (estHour === 11 && minute >= 30) ||
      estHour === 12 ||
      (estHour === 13 && minute === 0)
    ) {
      return "sleepy";
    }
  }

  // Market-based moods
  if (marketTrend === "up") {
    return volatility === "high" ? "excited" : "happy";
  }

  if (marketTrend === "down") {
    return "frustrated";
  }

  // Low volatility during trading hours
  if (volatility === "low") {
    return "sleepy";
  }

  return "neutral";
}

/**
 * Get random trading thought
 */
export function getRandomTradingThought(): string {
  return TRADING_THOUGHTS[Math.floor(Math.random() * TRADING_THOUGHTS.length)];
}

/**
 * Get random small talk phrase
 */
export function getRandomSmallTalk(): string {
  return SMALL_TALK_PHRASES[
    Math.floor(Math.random() * SMALL_TALK_PHRASES.length)
  ];
}

/**
 * Apply mood-based animation modifiers to agent
 */
export function applyMoodModifiers(agent: RenderAgent): {
  walkSpeedMultiplier: number;
  shouldJump: boolean;
  shouldYawn: boolean;
} {
  const mood = agent.mood ?? "neutral";

  switch (mood) {
    case "happy":
      return {
        walkSpeedMultiplier: 1.15,
        shouldJump: Math.random() < 0.001, // 0.1% chance per frame
        shouldYawn: false,
      };

    case "excited":
      return {
        walkSpeedMultiplier: 1.3,
        shouldJump: Math.random() < 0.002, // 0.2% chance
        shouldYawn: false,
      };

    case "frustrated":
      return {
        walkSpeedMultiplier: 0.85,
        shouldJump: false,
        shouldYawn: false,
      };

    case "sleepy":
      return {
        walkSpeedMultiplier: 0.7,
        shouldJump: false,
        shouldYawn: Math.random() < 0.0015, // 0.15% chance
      };

    default:
      return {
        walkSpeedMultiplier: 1.0,
        shouldJump: false,
        shouldYawn: false,
      };
  }
}

/**
 * Check if agent should show thought bubble
 * Only when idle/standing
 */
export function shouldShowThoughtBubble(
  agent: RenderAgent,
  now: number,
): boolean {
  if (agent.state !== "standing" && agent.state !== "away") {
    return false;
  }

  // Already showing thought
  if (agent.thoughtUntil && now < agent.thoughtUntil) {
    return true;
  }

  // 0.2% chance per frame when standing
  return Math.random() < 0.002;
}

/**
 * Check if agent should check phone
 * 10% chance when idle
 */
export function shouldCheckPhone(agent: RenderAgent, now: number): boolean {
  if (agent.state !== "standing" && agent.state !== "away") {
    return false;
  }

  // Already checking phone
  if (agent.phoneCheckUntil && now < agent.phoneCheckUntil) {
    return false;
  }

  // 10% chance when transitioning to standing
  return Math.random() < 0.1;
}

/**
 * Trigger celebration animation
 */
export function triggerCelebration(agent: RenderAgent, now: number): void {
  agent.state = "celebrating";
  agent.moodUntil = now + 2000; // 2 seconds
  agent.mood = "excited";
}

/**
 * Check if nearby agents should celebrate together
 */
export function findNearbyAgentsForCelebration(
  celebratingAgent: RenderAgent,
  allAgents: RenderAgent[],
  maxDistance: number = 150,
): RenderAgent[] {
  return allAgents.filter((other) => {
    if (other.id === celebratingAgent.id) return false;
    if (other.state === "sitting" || other.state === "working_out")
      return false;

    const distance = Math.hypot(
      other.x - celebratingAgent.x,
      other.y - celebratingAgent.y,
    );

    return distance < maxDistance;
  });
}
