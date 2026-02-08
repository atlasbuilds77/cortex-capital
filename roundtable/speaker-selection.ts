/**
 * Speaker Selection
 * 
 * Weighted selection based on:
 * - Affinity (high affinity → more likely to respond)
 * - Recency penalty (just spoke → lower weight)
 * - 20% jitter (randomness)
 */

export interface SpeakerWeight {
  agentId: string;
  weight: number;
  components: {
    affinity: number;
    recency: number;
    jitter: number;
  };
}

export interface ConversationContext {
  participants: string[];
  history: Array<{
    speaker: string;
    turn: number;
    timestamp: number;
  }>;
  relationships: Record<string, Record<string, number>>;
  currentTurn: number;
}

export function calculateSpeakerWeights(
  context: ConversationContext
): SpeakerWeight[] {
  const { participants, history, relationships, currentTurn } = context;
  
  return participants.map(agentId => {
    // Base affinity weight: average affinity with other participants
    const affinityWeight = calculateAffinityWeight(agentId, participants, relationships);
    
    // Recency penalty: reduce weight if recently spoke
    const recencyWeight = calculateRecencyWeight(agentId, history, currentTurn);
    
    // Jitter: 20% randomness
    const jitterWeight = 0.2 * Math.random();
    
    // Combined weight (affinity 60%, recency 20%, jitter 20%)
    const totalWeight = (0.6 * affinityWeight) + (0.2 * recencyWeight) + (0.2 * jitterWeight);
    
    return {
      agentId,
      weight: totalWeight,
      components: {
        affinity: affinityWeight,
        recency: recencyWeight,
        jitter: jitterWeight
      }
    };
  });
}

function calculateAffinityWeight(
  agentId: string,
  participants: string[],
  relationships: Record<string, Record<string, number>>
): number {
  const otherParticipants = participants.filter(id => id !== agentId);
  if (otherParticipants.length === 0) {
    return 1.0; // Only participant
  }
  
  let totalAffinity = 0;
  let count = 0;
  
  for (const otherId of otherParticipants) {
    const affinity = relationships[agentId]?.[otherId] || 0.5;
    totalAffinity += affinity;
    count++;
  }
  
  // Normalize to 0-1 range (affinity is already 0.1-0.95)
  return totalAffinity / count;
}

function calculateRecencyWeight(
  agentId: string,
  history: Array<{ speaker: string; turn: number; timestamp: number }>,
  currentTurn: number
): number {
  // Find when this agent last spoke
  const agentTurns = history
    .filter(entry => entry.speaker === agentId)
    .map(entry => entry.turn)
    .sort((a, b) => b - a); // Most recent first
  
  if (agentTurns.length === 0) {
    return 1.0; // Hasn't spoken yet, high weight
  }
  
  const lastSpokeTurn = agentTurns[0];
  const turnsSinceLastSpoke = currentTurn - lastSpokeTurn;
  
  // Exponential decay: weight increases with time since last spoke
  // After 3 turns, weight is near 1.0 again
  const decayRate = 0.5;
  const weight = 1.0 - Math.exp(-decayRate * turnsSinceLastSpoke);
  
  return Math.max(0.1, Math.min(1.0, weight));
}

export function selectNextSpeaker(
  context: ConversationContext
): string {
  const weights = calculateSpeakerWeights(context);
  
  // Debug logging (can be removed in production)
  console.log('Speaker weights:', weights.map(w => ({
    agent: w.agentId,
    weight: w.weight.toFixed(3),
    components: {
      affinity: w.components.affinity.toFixed(3),
      recency: w.components.recency.toFixed(3),
      jitter: w.components.jitter.toFixed(3)
    }
  })));
  
  // Weighted random selection
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const weight of weights) {
    random -= weight.weight;
    if (random <= 0) {
      return weight.agentId;
    }
  }
  
  // Fallback: first participant
  return context.participants[0];
}

export function validateWeights(weights: SpeakerWeight[]): boolean {
  // Check that weights are reasonable
  return weights.every(w => 
    w.weight >= 0 && 
    w.weight <= 2 && // Allow some overflow for debugging
    !isNaN(w.weight)
  );
}