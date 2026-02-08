/**
 * Memory Influence Integration
 * Enriches trigger topics with agent memories (30% chance)
 */

import { TriggerLogger } from './trigger-utils';

interface MemoryEntry {
  id: string;
  agent_id: string;
  type: 'insight' | 'pattern' | 'strategy' | 'lesson' | 'preference';
  content: string;
  confidence: number;
  tags: string[];
  source_trace_id?: string;
  created_at: Date;
}

interface EnrichmentResult {
  usedMemory: boolean;
  memoryEntries?: MemoryEntry[];
  enrichedTopic?: string;
  confidenceBoost?: number;
}

export class MemoryEnricher {
  private logger = TriggerLogger.getInstance();
  private memoryCache: Map<string, { entries: MemoryEntry[]; timestamp: number }> = new Map();
  private cacheTtlMs = 5 * 60 * 1000; // 5 minutes cache

  /**
   * Enrich a topic with relevant agent memories (30% chance)
   */
  async enrichTopicWithMemory(
    topic: string,
    agentId?: string,
    memoryTypes: Array<MemoryEntry['type']> = ['strategy', 'lesson', 'pattern']
  ): Promise<EnrichmentResult> {
    // 30% chance to use memory enrichment
    const shouldEnrich = Math.random() < 0.3;
    
    if (!shouldEnrich) {
      this.logger.log('MemoryEnricher', false, `Skipped enrichment for topic: ${topic} (30% chance)`, { topic });
      return { usedMemory: false };
    }

    try {
      // Query relevant memories from database
      const memories = await this.queryRelevantMemories(topic, agentId, memoryTypes);
      
      if (memories.length === 0) {
        this.logger.log('MemoryEnricher', false, `No relevant memories found for topic: ${topic}`, { topic });
        return { usedMemory: false };
      }

      // Filter to high confidence memories (>= 0.6)
      const highConfidenceMemories = memories.filter(m => m.confidence >= 0.6);
      
      if (highConfidenceMemories.length === 0) {
        this.logger.log('MemoryEnricher', false, `No high-confidence memories for topic: ${topic}`, { topic });
        return { usedMemory: false };
      }

      // Select 1-3 most relevant memories
      const selectedMemories = this.selectMostRelevantMemories(highConfidenceMemories, topic, 3);
      
      // Create enriched topic with memory context
      const enrichedTopic = this.createEnrichedTopic(topic, selectedMemories);
      
      // Calculate confidence boost based on memory confidence
      const confidenceBoost = this.calculateConfidenceBoost(selectedMemories);

      this.logger.log('MemoryEnricher', true, `Enriched topic with ${selectedMemories.length} memories`, {
        topic,
        enrichedTopic,
        memoryCount: selectedMemories.length,
        confidenceBoost,
        memoryTypes: selectedMemories.map(m => m.type)
      });

      return {
        usedMemory: true,
        memoryEntries: selectedMemories,
        enrichedTopic,
        confidenceBoost
      };

    } catch (error) {
      console.error('Memory enrichment error:', error);
      this.logger.log('MemoryEnricher', false, `Error during enrichment: ${error.message}`, { topic, error: error.message });
      return { usedMemory: false };
    }
  }

  /**
   * Query relevant memories from ops_agent_memory table
   */
  private async queryRelevantMemories(
    topic: string,
    agentId?: string,
    memoryTypes: Array<MemoryEntry['type']> = ['strategy', 'lesson', 'pattern']
  ): Promise<MemoryEntry[]> {
    const cacheKey = `${topic}:${agentId || 'all'}:${memoryTypes.join(',')}`;
    const cached = this.memoryCache.get(cacheKey);
    
    // Return cached results if still valid
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return cached.entries;
    }

    // In a real implementation, this would query the database:
    // SELECT * FROM ops_agent_memory 
    // WHERE (agent_id = $1 OR $1 IS NULL)
    //   AND type = ANY($2)
    //   AND (tags @> ARRAY[$3] OR content ILIKE $4)
    //   AND confidence >= 0.6
    // ORDER BY confidence DESC, created_at DESC
    // LIMIT 20

    // For now, simulate database query with mock data
    const mockMemories = this.getMockMemories(topic, agentId, memoryTypes);
    
    // Cache the results
    this.memoryCache.set(cacheKey, {
      entries: mockMemories,
      timestamp: Date.now()
    });

    return mockMemories;
  }

  /**
   * Select most relevant memories based on topic relevance
   */
  private selectMostRelevantMemories(
    memories: MemoryEntry[],
    topic: string,
    maxCount: number
  ): MemoryEntry[] {
    // Score each memory based on relevance to topic
    const scoredMemories = memories.map(memory => ({
      memory,
      score: this.calculateRelevanceScore(memory, topic)
    }));

    // Sort by score (descending) and take top N
    return scoredMemories
      .sort((a, b) => b.score - a.score)
      .slice(0, maxCount)
      .map(item => item.memory);
  }

  /**
   * Calculate relevance score between memory and topic
   */
  private calculateRelevanceScore(memory: MemoryEntry, topic: string): number {
    let score = memory.confidence * 0.7; // Base score from confidence
    
    // Boost if topic appears in tags
    const topicWords = topic.toLowerCase().split(/\s+/);
    const tagMatches = memory.tags.filter(tag => 
      topicWords.some(word => tag.toLowerCase().includes(word))
    ).length;
    
    score += (tagMatches / Math.max(1, memory.tags.length)) * 0.2;
    
    // Boost if topic appears in content
    const contentMatch = topicWords.some(word => 
      memory.content.toLowerCase().includes(word)
    ) ? 0.1 : 0;
    
    score += contentMatch;
    
    return Math.min(1, score);
  }

  /**
   * Create enriched topic string with memory context
   */
  private createEnrichedTopic(topic: string, memories: MemoryEntry[]): string {
    if (memories.length === 0) return topic;
    
    const memorySummaries = memories.map(memory => {
      const typeEmoji = {
        insight: '💡',
        pattern: '📊',
        strategy: '🎯',
        lesson: '📚',
        preference: '⭐'
      }[memory.type];
      
      return `${typeEmoji} ${memory.content.substring(0, 100)}${memory.content.length > 100 ? '...' : ''}`;
    }).join(' | ');
    
    return `${topic} [Memory context: ${memorySummaries}]`;
  }

  /**
   * Calculate confidence boost from memories
   */
  private calculateConfidenceBoost(memories: MemoryEntry[]): number {
    if (memories.length === 0) return 0;
    
    const avgConfidence = memories.reduce((sum, m) => sum + m.confidence, 0) / memories.length;
    
    // Boost ranges from 0.05 to 0.20 based on average confidence
    return Math.min(0.20, avgConfidence * 0.25);
  }

  /**
   * Get success rate tracking for memory influence
   */
  getSuccessRate(): {
    totalAttempts: number;
    successfulEnrichments: number;
    successRate: number;
    averageConfidenceBoost: number;
    mostUsedMemoryTypes: Record<string, number>;
  } {
    const logs = this.logger.getRecentLogs(1000);
    const memoryLogs = logs.filter(log => log.triggerName === 'MemoryEnricher');
    
    const totalAttempts = memoryLogs.length;
    const successfulEnrichments = memoryLogs.filter(log => log.fired).length;
    const successRate = totalAttempts > 0 ? successfulEnrichments / totalAttempts : 0;
    
    // Calculate average confidence boost from successful enrichments
    const successfulLogs = memoryLogs.filter(log => log.fired);
    const totalBoost = successfulLogs.reduce((sum, log) => 
      sum + (log.metadata?.confidenceBoost || 0), 0);
    const averageConfidenceBoost = successfulLogs.length > 0 ? totalBoost / successfulLogs.length : 0;
    
    // Count memory types used
    const memoryTypeCounts: Record<string, number> = {};
    successfulLogs.forEach(log => {
      const types = log.metadata?.memoryTypes || [];
      types.forEach(type => {
        memoryTypeCounts[type] = (memoryTypeCounts[type] || 0) + 1;
      });
    });
    
    return {
      totalAttempts,
      successfulEnrichments,
      successRate,
      averageConfidenceBoost,
      mostUsedMemoryTypes: memoryTypeCounts
    };
  }

  /**
   * Clear memory cache
   */
  clearCache(): void {
    this.memoryCache.clear();
  }

  /**
   * Mock data for development
   */
  private getMockMemories(
    topic: string,
    agentId?: string,
    memoryTypes: Array<MemoryEntry['type']> = ['strategy', 'lesson', 'pattern']
  ): MemoryEntry[] {
    // Sample memories based on common trading topics
    const allMemories: MemoryEntry[] = [
      {
        id: '1',
        agent_id: 'sage',
        type: 'lesson',
        content: 'Stop losses at -30% prevent catastrophic losses but may be too tight for volatile tokens',
        confidence: 0.75,
        tags: ['stop_loss', 'risk_management', 'volatility'],
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        id: '2',
        agent_id: 'growth',
        type: 'pattern',
        content: 'KOL accumulation signals typically lead to 30-50% pumps within 2-4 hours',
        confidence: 0.82,
        tags: ['KOL', 'accumulation', 'pump_pattern'],
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000)
      },
      {
        id: '3',
        agent_id: 'atlas',
        type: 'strategy',
        content: 'Scale in 3 tranches (30/30/40) beats all-in entries for risk-adjusted returns',
        confidence: 0.88,
        tags: ['scaling', 'entry_strategy', 'risk_adjusted'],
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000)
      },
      {
        id: '4',
        agent_id: 'intel',
        type: 'insight',
        content: 'Weekend volume drops 60%, making signals less reliable',
        confidence: 0.68,
        tags: ['weekend', 'volume', 'signal_reliability'],
        created_at: new Date(Date.now() - 48 * 60 * 60 * 1000)
      },
      {
        id: '5',
        agent_id: 'observer',
        type: 'preference',
        content: 'Prefer 1DTE options over 0DTE for overnight holds',
        confidence: 0.72,
        tags: ['options', 'holding_period', 'overnight'],
        created_at: new Date(Date.now() - 36 * 60 * 60 * 1000)
      },
      {
        id: '6',
        agent_id: 'sage',
        type: 'lesson',
        content: 'Don\'t chase pumps after 50%+ move in less than 1 hour',
        confidence: 0.85,
        tags: ['chasing', 'pump', 'fomo'],
        created_at: new Date(Date.now() - 72 * 60 * 60 * 1000)
      }
    ];

    // Filter by agent if specified
    let filtered = agentId 
      ? allMemories.filter(m => m.agent_id === agentId)
      : allMemories;

    // Filter by memory types
    filtered = filtered.filter(m => memoryTypes.includes(m.type));

    // Filter by topic relevance
    const topicWords = topic.toLowerCase().split(/\s+/);
    filtered = filtered.filter(memory => {
      // Check if topic appears in tags or content
      const inTags = memory.tags.some(tag => 
        topicWords.some(word => tag.toLowerCase().includes(word))
      );
      const inContent = topicWords.some(word => 
        memory.content.toLowerCase().includes(word)
      );
      return inTags || inContent;
    });

    return filtered;
  }
}

// Singleton instance
export const memoryEnricher = new MemoryEnricher();