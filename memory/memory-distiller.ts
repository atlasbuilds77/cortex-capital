/**
 * Memory Distiller - Extracts insights/patterns/lessons from conversations
 * 
 * Features:
 * - LLM call to extract memories from conversation history
 * - Max 6 memories per conversation
 * - Min confidence 0.55 (drop below threshold)
 * - Idempotent dedup via source_trace_id
 */

import { ConversationHistory, DistilledMemory, Memory, MemoryType } from './types';

export class MemoryDistiller {
  private readonly maxMemoriesPerConversation = 6;
  private readonly minConfidence = 0.55;

  /**
   * Distill memories from a conversation
   * @param conversation The conversation history
   * @param sourceTraceId Unique ID for idempotent dedup (e.g., conversation_id)
   * @returns Array of distilled memories
   */
  async distillMemoriesFromConversation(
    conversation: ConversationHistory,
    sourceTraceId: string
  ): Promise<DistilledMemory[]> {
    // Check if we've already processed this conversation
    if (await this.isAlreadyProcessed(sourceTraceId)) {
      console.log(`Conversation ${sourceTraceId} already processed, skipping`);
      return [];
    }

    // Prepare conversation text for LLM
    const conversationText = this.formatConversationForLLM(conversation);
    
    // Call LLM to extract memories
    const rawMemories = await this.callLLMForMemoryExtraction(conversationText);
    
    // Filter and validate memories
    const validMemories = this.validateAndFilterMemories(rawMemories);
    
    // Mark as processed
    await this.markAsProcessed(sourceTraceId);
    
    return validMemories;
  }

  /**
   * Format conversation for LLM processing
   */
  private formatConversationForLLM(conversation: ConversationHistory): string {
    const lines: string[] = [];
    
    lines.push(`Conversation: ${conversation.id}`);
    lines.push(`Format: ${conversation.format}`);
    lines.push(`Participants: ${conversation.participants.join(', ')}`);
    if (conversation.topic) {
      lines.push(`Topic: ${conversation.topic}`);
    }
    lines.push('');
    lines.push('--- Conversation Turns ---');
    
    conversation.turns.forEach((turn) => {
      lines.push(`[${turn.agentId}]: ${turn.content}`);
    });
    
    lines.push('');
    lines.push('--- End Conversation ---');
    
    return lines.join('\n');
  }

  /**
   * Call LLM to extract memories from conversation
   */
  private async callLLMForMemoryExtraction(conversationText: string): Promise<DistilledMemory[]> {
    // This is a mock implementation - in production, this would call an actual LLM API
    // For now, we'll simulate the LLM response with some example memories
    
    // In production, would use this prompt for LLM:
    // `Analyze the following conversation between trading agents...`
    // For now, we simulate the response based on conversation content
    const simulatedMemories: DistilledMemory[] = this.simulateLLMResponse(conversationText);
    
    return simulatedMemories;
  }

  /**
   * Simulate LLM response for development/testing
   */
  private simulateLLMResponse(conversationText: string): DistilledMemory[] {
    // Extract some keywords from conversation to make simulated memories relevant
    const hasRiskDiscussion = conversationText.toLowerCase().includes('risk') || 
                             conversationText.toLowerCase().includes('stop loss');
    const hasWinDiscussion = conversationText.toLowerCase().includes('win') || 
                            conversationText.toLowerCase().includes('profit');
    const hasLossDiscussion = conversationText.toLowerCase().includes('loss') || 
                             conversationText.toLowerCase().includes('drawdown');
    const hasExecutionDiscussion = conversationText.toLowerCase().includes('execute') || 
                                  conversationText.toLowerCase().includes('fill');
    
    const memories: DistilledMemory[] = [];
    
    // Generate relevant simulated memories
    if (hasRiskDiscussion) {
      memories.push({
        content: "Stop losses at -30% provide enough room for volatility while protecting capital",
        type: 'strategy',
        confidence: 0.78,
        tags: ['risk-management', 'stop-loss', 'volatility'],
        reasoning: "Discussed in context of position sizing and risk tolerance"
      });
    }
    
    if (hasWinDiscussion) {
      memories.push({
        content: "KOL accumulation signals often lead to 30-50% pumps within 2-4 hours",
        type: 'pattern',
        confidence: 0.72,
        tags: ['KOL', 'signals', 'momentum'],
        reasoning: "Observed pattern from successful trades"
      });
    }
    
    if (hasLossDiscussion) {
      memories.push({
        content: "Chasing pumps after 50%+ move in less than 1 hour leads to losses",
        type: 'lesson',
        confidence: 0.68,
        tags: ['fomo', 'timing', 'entry'],
        reasoning: "Learned from failed trade analysis"
      });
    }
    
    if (hasExecutionDiscussion) {
      memories.push({
        content: "Prefer limit orders over market orders to control slippage",
        type: 'preference',
        confidence: 0.65,
        tags: ['execution', 'slippage', 'orders'],
        reasoning: "Based on execution quality analysis"
      });
    }
    
    // Add a generic insight if we have room
    if (memories.length < this.maxMemoriesPerConversation) {
      memories.push({
        content: "Weekend trading volume is 60% lower, making signals less reliable",
        type: 'insight',
        confidence: 0.82,
        tags: ['weekend', 'volume', 'reliability'],
        reasoning: "Statistical analysis of historical data"
      });
    }
    
    // Limit to max memories
    return memories.slice(0, this.maxMemoriesPerConversation);
  }

  /**
   * Validate and filter memories based on confidence and other criteria
   */
  private validateAndFilterMemories(memories: DistilledMemory[]): DistilledMemory[] {
    return memories.filter(memory => {
      // Check minimum confidence
      if (memory.confidence < this.minConfidence) {
        console.log(`Dropping memory with confidence ${memory.confidence} below threshold ${this.minConfidence}: ${memory.content}`);
        return false;
      }
      
      // Validate memory type
      const validTypes: MemoryType[] = ['insight', 'pattern', 'strategy', 'preference', 'lesson'];
      if (!validTypes.includes(memory.type)) {
        console.log(`Invalid memory type: ${memory.type}`);
        return false;
      }
      
      // Validate confidence ranges based on type
      const typeConfidenceRanges: Record<MemoryType, { min: number; max: number }> = {
        insight: { min: 0.65, max: 0.85 },
        pattern: { min: 0.70, max: 0.90 },
        strategy: { min: 0.75, max: 0.90 },
        preference: { min: 0.60, max: 0.80 },
        lesson: { min: 0.55, max: 0.75 }
      };
      
      const range = typeConfidenceRanges[memory.type];
      if (memory.confidence < range.min || memory.confidence > range.max) {
        console.log(`Memory confidence ${memory.confidence} outside valid range for type ${memory.type}: ${range.min}-${range.max}`);
        // Adjust to within range
        memory.confidence = Math.max(range.min, Math.min(range.max, memory.confidence));
      }
      
      return true;
    });
  }

  /**
   * Check if conversation has already been processed
   */
  private async isAlreadyProcessed(sourceTraceId: string): Promise<boolean> {
    // In production, this would check a database or cache
    // For now, we'll use a simple in-memory cache
    const processedIds = this.getProcessedIds();
    return processedIds.has(sourceTraceId);
  }

  /**
   * Mark conversation as processed
   */
  private async markAsProcessed(sourceTraceId: string): Promise<void> {
    const processedIds = this.getProcessedIds();
    processedIds.add(sourceTraceId);
    // In production, persist to database
  }

  /**
   * Get processed IDs (mock implementation)
   */
  private getProcessedIds(): Set<string> {
    // In production, this would read from a database
    // For now, use module-level cache
    if (!(global as any).processedConversationIds) {
      (global as any).processedConversationIds = new Set<string>();
    }
    return (global as any).processedConversationIds;
  }

  /**
   * Convert distilled memories to database-ready Memory objects
   */
  convertToMemoryObjects(
    distilledMemories: DistilledMemory[],
    agentId: string,
    sourceTraceId: string
  ): Memory[] {
    const now = new Date();
    
    return distilledMemories.map((distilled, index) => ({
      id: `${sourceTraceId}_${index}_${Date.now()}`,
      agentId,
      type: distilled.type,
      content: distilled.content,
      confidence: distilled.confidence,
      tags: distilled.tags,
      sourceTraceId,
      createdAt: now,
      upvotes: 0,
      downvotes: 0,
      promoted: false,
      lastAccessedAt: now
    }));
  }
}