/**
 * Voice Evolution
 * 
 * Derives voice modifiers from agent memory
 * Influences agent responses based on recent learnings and experiences
 */

export interface MemoryEntry {
  id: string;
  agentId: string;
  type: 'insight' | 'pattern' | 'strategy' | 'preference' | 'lesson';
  content: string;
  confidence: number; // 0-1
  tags: string[];
  timestamp: number;
  sourceTraceId?: string;
}

export interface VoiceModifier {
  type: 'emphasis' | 'caution' | 'optimism' | 'skepticism' | 'urgency';
  strength: number; // 0-1
  sourceMemoryId: string;
  expiration?: number; // Optional timestamp when modifier expires
}

export function deriveModifiersFromMemory(
  agentId: string,
  memories: MemoryEntry[],
  conversationTopic: string
): VoiceModifier[] {
  const relevantMemories = filterRelevantMemories(memories, agentId, conversationTopic);
  const modifiers: VoiceModifier[] = [];
  
  for (const memory of relevantMemories) {
    const modifier = createModifierFromMemory(memory);
    if (modifier) {
      modifiers.push(modifier);
    }
  }
  
  // Limit to top 3 most relevant/confident modifiers
  return modifiers
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3);
}

function filterRelevantMemories(
  memories: MemoryEntry[],
  agentId: string,
  conversationTopic: string
): MemoryEntry[] {
  // First filter by agent
  const agentMemories = memories.filter(m => m.agentId === agentId);
  
  // Extract keywords from topic
  const topicKeywords = extractKeywords(conversationTopic.toLowerCase());
  
  // Score each memory for relevance
  const scoredMemories = agentMemories.map(memory => {
    let score = 0;
    
    // Base score from confidence
    score += memory.confidence * 0.3;
    
    // Recency bonus (last 24 hours)
    const ageHours = (Date.now() - memory.timestamp) / (1000 * 60 * 60);
    if (ageHours < 24) {
      score += 0.2 * (1 - ageHours / 24);
    }
    
    // Tag matching
    const memoryKeywords = new Set([
      ...memory.tags.map(t => t.toLowerCase()),
      ...extractKeywords(memory.content.toLowerCase())
    ]);
    
    const matchingKeywords = topicKeywords.filter(kw => 
      Array.from(memoryKeywords).some(mk => mk.includes(kw) || kw.includes(mk))
    );
    
    score += (matchingKeywords.length / Math.max(1, topicKeywords.length)) * 0.5;
    
    return { memory, score };
  });
  
  // Return top 5 most relevant memories
  return scoredMemories
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(sm => sm.memory);
}

function extractKeywords(text: string): string[] {
  // Simple keyword extraction - in production would use NLP
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'can', 'could', 'may', 'might', 'must', 'shall'
  ]);
  
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => 
      word.length > 2 && 
      !stopWords.has(word) &&
      !/^\d+$/.test(word)
    );
  
  // Return unique words
  return Array.from(new Set(words));
}

function createModifierFromMemory(memory: MemoryEntry): VoiceModifier | null {
  // Map memory type to modifier type
  const typeMapping: Record<MemoryEntry['type'], VoiceModifier['type']> = {
    insight: 'optimism',
    pattern: 'emphasis',
    strategy: 'emphasis',
    preference: 'caution',
    lesson: 'caution'
  };
  
  const modifierType = typeMapping[memory.type];
  if (!modifierType) {
    return null;
  }
  
  // Strength based on confidence and recency
  const ageDays = (Date.now() - memory.timestamp) / (1000 * 60 * 60 * 24);
  const recencyFactor = Math.max(0, 1 - (ageDays / 30)); // Decay over 30 days
  const strength = memory.confidence * recencyFactor;
  
  // Only include if strength is significant
  if (strength < 0.3) {
    return null;
  }
  
  return {
    type: modifierType,
    strength,
    sourceMemoryId: memory.id,
    expiration: memory.timestamp + (30 * 24 * 60 * 60 * 1000) // 30 days from creation
  };
}

export function modifiersToPromptString(modifiers: VoiceModifier[]): string[] {
  return modifiers.map(modifier => {
    switch (modifier.type) {
      case 'emphasis':
        return `Emphasize learnings from recent experience (confidence: ${modifier.strength.toFixed(2)})`;
      case 'caution':
        return `Exercise caution based on past lessons (confidence: ${modifier.strength.toFixed(2)})`;
      case 'optimism':
        return `Be optimistic about patterns you've identified (confidence: ${modifier.strength.toFixed(2)})`;
      case 'skepticism':
        return `Apply healthy skepticism from past experiences (confidence: ${modifier.strength.toFixed(2)})`;
      case 'urgency':
        return `Respond with urgency given recent market developments (confidence: ${modifier.strength.toFixed(2)})`;
      default:
        return `Influenced by recent memory (confidence: ${modifier.strength.toFixed(2)})`;
    }
  });
}

export function applyModifiersToResponse(
  response: string,
  modifiers: VoiceModifier[]
): string {
  // Simple modifier application - in production would use more sophisticated NLP
  let modifiedResponse = response;
  
  for (const modifier of modifiers) {
    if (modifier.strength > 0.7) {
      // Strong modifier - add emphasis
      switch (modifier.type) {
        case 'emphasis':
          if (!modifiedResponse.includes('!') && !modifiedResponse.endsWith('.')) {
            modifiedResponse += '!';
          }
          break;
        case 'caution':
          if (!modifiedResponse.toLowerCase().includes('caution') && 
              !modifiedResponse.toLowerCase().includes('careful')) {
            modifiedResponse = `[Caution advised] ${modifiedResponse}`;
          }
          break;
        case 'urgency':
          if (!modifiedResponse.toLowerCase().includes('urgent') && 
              !modifiedResponse.toLowerCase().includes('immediate')) {
            modifiedResponse = `[Urgent] ${modifiedResponse}`;
          }
          break;
      }
    }
  }
  
  // Ensure response stays within character limit
  if (modifiedResponse.length > 120) {
    modifiedResponse = modifiedResponse.substring(0, 117) + '...';
  }
  
  return modifiedResponse;
}