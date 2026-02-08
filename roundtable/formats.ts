/**
 * Conversation Formats
 * 
 * 6 conversation formats with participant ranges, turn limits, and temperature settings
 */

export interface ConversationFormat {
  id: string;
  name: string;
  description: string;
  minParticipants: number;
  maxParticipants: number;
  minTurns: number;
  maxTurns: number;
  temperature: number;
  requiredAgents: string[]; // Agents that must participate
  optionalAgents: string[]; // Agents that can fill remaining slots
  purpose: string;
  schedule: string;
  probability: number; // 0-1 chance of occurring when scheduled
  isFormal: boolean; // Whether action items can be extracted
}

export const CONVERSATION_FORMATS: Record<string, ConversationFormat> = {
  morning_standup: {
    id: 'morning_standup',
    name: 'Morning Standup',
    description: 'Daily alignment on strategy and opportunities',
    minParticipants: 4,
    maxParticipants: 6,
    minTurns: 6,
    maxTurns: 12,
    temperature: 0.6,
    requiredAgents: ['atlas', 'sage', 'intel'],
    optionalAgents: ['scout', 'growth', 'observer'],
    purpose: 'Align on day\'s strategy, surface opportunities, review overnight developments',
    schedule: 'Market open (6:30 AM PST)',
    probability: 1.0,
    isFormal: true
  },
  position_review: {
    id: 'position_review',
    name: 'Position Review',
    description: 'Review open positions, decide hold/exit/scale',
    minParticipants: 3,
    maxParticipants: 4,
    minTurns: 4,
    maxTurns: 8,
    temperature: 0.5,
    requiredAgents: ['atlas', 'sage', 'scout'],
    optionalAgents: ['growth'],
    purpose: 'Review open positions, assess risk, make exit/scale decisions',
    schedule: 'Midday (11:00 AM PST)',
    probability: 0.8,
    isFormal: true
  },
  post_mortem: {
    id: 'post_mortem',
    name: 'Post-Mortem',
    description: 'Analyze day\'s trades, extract lessons',
    minParticipants: 4,
    maxParticipants: 5,
    minTurns: 8,
    maxTurns: 15,
    temperature: 0.7,
    requiredAgents: ['atlas', 'sage', 'scout', 'growth'],
    optionalAgents: ['intel'],
    purpose: 'Analyze completed trades, extract lessons learned, identify patterns',
    schedule: 'Market close (1:30 PM PST)',
    probability: 1.0,
    isFormal: true
  },
  debate: {
    id: 'debate',
    name: 'Debate',
    description: 'Argue different trade perspectives',
    minParticipants: 2,
    maxParticipants: 3,
    minTurns: 6,
    maxTurns: 10,
    temperature: 0.8,
    requiredAgents: [], // Selected based on low affinity
    optionalAgents: ['atlas', 'sage', 'intel', 'growth'],
    purpose: 'Healthy conflict, explore opposing viewpoints, prevent groupthink',
    schedule: 'Ad-hoc (when affinity < 0.4)',
    probability: 0.6,
    isFormal: false
  },
  strategy_session: {
    id: 'strategy_session',
    name: 'Strategy Session',
    description: 'Deep dive on approach, adjust systems',
    minParticipants: 3,
    maxParticipants: 4,
    minTurns: 10,
    maxTurns: 16,
    temperature: 0.65,
    requiredAgents: ['atlas', 'sage', 'growth'],
    optionalAgents: ['intel'],
    purpose: 'Strategic planning, system optimization, long-term approach',
    schedule: 'Weekly (Sunday evening)',
    probability: 1.0,
    isFormal: true
  },
  watercooler: {
    id: 'watercooler',
    name: 'Watercooler',
    description: 'Informal chat, surprising insights',
    minParticipants: 2,
    maxParticipants: 3,
    minTurns: 3,
    maxTurns: 6,
    temperature: 0.9,
    requiredAgents: [], // Random selection
    optionalAgents: ['atlas', 'sage', 'scout', 'growth', 'intel', 'observer'],
    purpose: 'Casual conversation, unexpected insights, relationship building',
    schedule: 'Evening (6:00 PM PST)',
    probability: 0.4,
    isFormal: false
  }
};

export function getFormat(formatId: string): ConversationFormat {
  const format = CONVERSATION_FORMATS[formatId];
  if (!format) {
    throw new Error(`Unknown conversation format: ${formatId}`);
  }
  return format;
}

export function selectParticipants(
  format: ConversationFormat,
  availableAgents: string[],
  relationships: Record<string, Record<string, number>>
): string[] {
  const participants = new Set<string>();
  
  // Add required agents
  format.requiredAgents.forEach(agent => {
    if (availableAgents.includes(agent)) {
      participants.add(agent);
    }
  });
  
  // For debate format, select agents with low affinity
  if (format.id === 'debate') {
    return selectDebateParticipants(availableAgents, relationships, format.maxParticipants);
  }
  
  // Fill remaining slots with optional agents
  const remainingSlots = format.maxParticipants - participants.size;
  if (remainingSlots > 0) {
    const optionalCandidates = format.optionalAgents
      .filter(agent => availableAgents.includes(agent) && !participants.has(agent));
    
    // Shuffle and select
    const shuffled = [...optionalCandidates].sort(() => Math.random() - 0.5);
    shuffled.slice(0, remainingSlots).forEach(agent => participants.add(agent));
  }
  
  // Ensure we have minimum participants
  if (participants.size < format.minParticipants) {
    const missing = format.minParticipants - participants.size;
    const allAvailable = availableAgents.filter(agent => !participants.has(agent));
    const shuffled = [...allAvailable].sort(() => Math.random() - 0.5);
    shuffled.slice(0, missing).forEach(agent => participants.add(agent));
  }
  
  return Array.from(participants);
}

function selectDebateParticipants(
  availableAgents: string[],
  relationships: Record<string, Record<string, number>>,
  maxParticipants: number
): string[] {
  // Find pairs with lowest affinity
  const pairs: Array<{agents: [string, string], avgAffinity: number}> = [];
  
  for (let i = 0; i < availableAgents.length; i++) {
    for (let j = i + 1; j < availableAgents.length; j++) {
      const a = availableAgents[i];
      const b = availableAgents[j];
      const affinity = relationships[a]?.[b] || 0.5;
      pairs.push({
        agents: [a, b],
        avgAffinity: affinity
      });
    }
  }
  
  // Sort by lowest affinity (most tension)
  pairs.sort((a, b) => a.avgAffinity - b.avgAffinity);
  
  if (pairs.length === 0) {
    // Fallback: random selection
    const shuffled = [...availableAgents].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(maxParticipants, shuffled.length));
  }
  
  const selectedPair = pairs[0].agents;
  
  // Add third agent if needed and available
  if (maxParticipants > 2 && availableAgents.length > 2) {
    // Find agent with moderate affinity to both (to mediate)
    const candidates = availableAgents.filter(
      agent => !selectedPair.includes(agent)
    );
    
    if (candidates.length > 0) {
      const mediator = candidates[0]; // Simple selection for now
      return [...selectedPair, mediator];
    }
  }
  
  return selectedPair;
}

export function getRandomTopic(format: ConversationFormat): string {
  const topics: Record<string, string[]> = {
    morning_standup: [
      "Overnight market developments",
      "Today's key opportunities",
      "Risk assessment for the day",
      "Position adjustments needed",
      "Market sentiment analysis"
    ],
    position_review: [
      "Current open positions status",
      "Stop-loss adjustments",
      "Take-profit targets",
      "Position sizing review",
      "Correlation risk assessment"
    ],
    post_mortem: [
      "Today's trade performance analysis",
      "Lessons from wins and losses",
      "Execution quality review",
      "Pattern identification",
      "System improvements needed"
    ],
    debate: [
      "Aggressive vs conservative approach",
      "Technical vs fundamental signals",
      "Short-term vs long-term holds",
      "Manual vs automated execution",
      "Risk tolerance debate"
    ],
    strategy_session: [
      "Weekly performance review",
      "Strategy optimization",
      "New market opportunities",
      "System rule adjustments",
      "Long-term positioning"
    ],
    watercooler: [
      "Market rumors and gossip",
      "Interesting chart patterns",
      "Whale activity observations",
      "Trading psychology insights",
      "Random market thoughts"
    ]
  };
  
  const formatTopics = topics[format.id] || ["General discussion"];
  return formatTopics[Math.floor(Math.random() * formatTopics.length)];
}