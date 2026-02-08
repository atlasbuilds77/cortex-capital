/**
 * Relationship Drift
 * 
 * Applies affinity updates based on conversation interactions
 * Capped at ±0.03 per conversation
 */

export interface ConversationInteraction {
  agentA: string;
  agentB: string;
  interactionType: 'agreement' | 'disagreement' | 'support' | 'challenge' | 'neutral';
  strength: number; // 0-1
  turnNumber: number;
}

export interface RelationshipUpdate {
  agentA: string;
  agentB: string;
  oldAffinity: number;
  newAffinity: number;
  delta: number;
  reason: string;
}

export interface ConversationAnalysis {
  participants: string[];
  interactions: ConversationInteraction[];
  sentimentScore: number; // -1 to 1 overall sentiment
}

export function analyzeConversation(
  conversationHistory: Array<{
    speaker: string;
    message: string;
    turn: number;
  }>
): ConversationAnalysis {
  const participants = Array.from(new Set(conversationHistory.map(msg => msg.speaker)));
  const interactions: ConversationInteraction[] = [];
  
  // Simple analysis: look for agreement/disagreement patterns
  for (let i = 1; i < conversationHistory.length; i++) {
    const prevMsg = conversationHistory[i - 1];
    const currMsg = conversationHistory[i];
    
    if (prevMsg.speaker === currMsg.speaker) {
      continue; // Same speaker, not an interaction
    }
    
    const interaction = analyzeMessagePair(prevMsg, currMsg);
    if (interaction) {
      interactions.push(interaction);
    }
  }
  
  // Calculate overall sentiment
  const sentimentScore = calculateSentimentScore(interactions);
  
  return {
    participants,
    interactions,
    sentimentScore
  };
}

function analyzeMessagePair(
  prevMsg: { speaker: string; message: string; turn: number },
  currMsg: { speaker: string; message: string; turn: number }
): ConversationInteraction | null {
  const messageA = prevMsg.message.toLowerCase();
  const messageB = currMsg.message.toLowerCase();
  
  // Check for agreement indicators
  const agreementPhrases = ['agree', 'yes', 'correct', 'right', 'good point', 'exactly'];
  const disagreementPhrases = ['disagree', 'no', 'wrong', 'but', 'however', 'although'];
  const supportPhrases = ['support', 'help', 'assist', 'back', 'reinforce'];
  const challengePhrases = ['challenge', 'question', 'doubt', 'skeptical', 'concern'];
  
  let interactionType: ConversationInteraction['interactionType'] = 'neutral';
  let strength = 0.5;
  
  // Check agreement
  if (agreementPhrases.some(phrase => messageB.includes(phrase))) {
    interactionType = 'agreement';
    strength = 0.8;
  }
  // Check disagreement
  else if (disagreementPhrases.some(phrase => messageB.includes(phrase))) {
    interactionType = 'disagreement';
    strength = 0.7;
  }
  // Check support
  else if (supportPhrases.some(phrase => messageB.includes(phrase))) {
    interactionType = 'support';
    strength = 0.6;
  }
  // Check challenge
  else if (challengePhrases.some(phrase => messageB.includes(phrase))) {
    interactionType = 'challenge';
    strength = 0.6;
  }
  
  if (interactionType === 'neutral') {
    return null; // Skip neutral interactions
  }
  
  return {
    agentA: prevMsg.speaker,
    agentB: currMsg.speaker,
    interactionType,
    strength,
    turnNumber: currMsg.turn
  };
}

function calculateSentimentScore(interactions: ConversationInteraction[]): number {
  if (interactions.length === 0) {
    return 0;
  }
  
  let totalScore = 0;
  let totalStrength = 0;
  
  for (const interaction of interactions) {
    let score = 0;
    switch (interaction.interactionType) {
      case 'agreement':
      case 'support':
        score = 1;
        break;
      case 'disagreement':
      case 'challenge':
        score = -1;
        break;
      case 'neutral':
        score = 0;
        break;
    }
    
    totalScore += score * interaction.strength;
    totalStrength += interaction.strength;
  }
  
  return totalStrength > 0 ? totalScore / totalStrength : 0;
}

export function calculateRelationshipDrift(
  analysis: ConversationAnalysis,
  currentRelationships: Record<string, Record<string, number>>
): RelationshipUpdate[] {
  const updates: RelationshipUpdate[] = [];
  const { participants, interactions, sentimentScore } = analysis;
  
  // Calculate drift for each participant pair
  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      const agentA = participants[i];
      const agentB = participants[j];
      
      const oldAffinity = currentRelationships[agentA]?.[agentB] || 0.5;
      const drift = calculatePairDrift(agentA, agentB, interactions, sentimentScore);
      
      // Apply cap of ±0.03
      const cappedDrift = Math.max(-0.03, Math.min(0.03, drift));
      const newAffinity = Math.max(0.1, Math.min(0.95, oldAffinity + cappedDrift));
      
      // Only record if there's actual change
      if (Math.abs(cappedDrift) > 0.001) {
        updates.push({
          agentA,
          agentB,
          oldAffinity,
          newAffinity,
          delta: cappedDrift,
          reason: getDriftReason(cappedDrift, interactions.filter(i => 
            (i.agentA === agentA && i.agentB === agentB) || 
            (i.agentA === agentB && i.agentB === agentA)
          ))
        });
      }
    }
  }
  
  return updates;
}

function calculatePairDrift(
  agentA: string,
  agentB: string,
  interactions: ConversationInteraction[],
  overallSentiment: number
): number {
  // Get interactions between this pair
  const pairInteractions = interactions.filter(i => 
    (i.agentA === agentA && i.agentB === agentB) || 
    (i.agentA === agentB && i.agentB === agentA)
  );
  
  if (pairInteractions.length === 0) {
    // No direct interactions - small drift based on overall sentiment
    return overallSentiment * 0.01;
  }
  
  // Calculate drift from interactions
  let totalDrift = 0;
  let interactionCount = 0;
  
  for (const interaction of pairInteractions) {
    let interactionDrift = 0;
    
    switch (interaction.interactionType) {
      case 'agreement':
        interactionDrift = 0.02 * interaction.strength;
        break;
      case 'support':
        interactionDrift = 0.015 * interaction.strength;
        break;
      case 'disagreement':
        interactionDrift = -0.01 * interaction.strength;
        break;
      case 'challenge':
        interactionDrift = -0.005 * interaction.strength; // Healthy challenge
        break;
      case 'neutral':
        interactionDrift = 0;
        break;
    }
    
    totalDrift += interactionDrift;
    interactionCount++;
  }
  
  // Average the drift
  const averageDrift = interactionCount > 0 ? totalDrift / interactionCount : 0;
  
  // Apply overall sentiment as a modifier
  return averageDrift * (1 + overallSentiment * 0.5);
}

function getDriftReason(
  drift: number,
  relevantInteractions: ConversationInteraction[]
): string {
  if (relevantInteractions.length === 0) {
    return drift > 0 ? 'Positive overall conversation tone' : 'Neutral or slightly negative tone';
  }
  
  const interactionTypes = relevantInteractions.map(i => i.interactionType);
  
  if (interactionTypes.includes('agreement')) {
    return 'Multiple agreements during conversation';
  } else if (interactionTypes.includes('disagreement')) {
    return 'Disagreements created tension';
  } else if (interactionTypes.includes('support')) {
    return 'Supportive interactions strengthened bond';
  } else if (interactionTypes.includes('challenge')) {
    return 'Healthy challenges maintained professional distance';
  }
  
  return 'General conversation dynamics';
}

export function applyRelationshipUpdates(
  currentRelationships: Record<string, Record<string, number>>,
  updates: RelationshipUpdate[]
): Record<string, Record<string, number>> {
  const newRelationships = JSON.parse(JSON.stringify(currentRelationships));
  
  for (const update of updates) {
    // Ensure both directions are updated
    if (!newRelationships[update.agentA]) {
      newRelationships[update.agentA] = {};
    }
    if (!newRelationships[update.agentB]) {
      newRelationships[update.agentB] = {};
    }
    
    newRelationships[update.agentA][update.agentB] = update.newAffinity;
    newRelationships[update.agentB][update.agentA] = update.newAffinity;
  }
  
  return newRelationships;
}