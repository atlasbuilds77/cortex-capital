/**
 * Memory Query - Optimized memory queries with caching
 * 
 * Features:
 * - queryAgentMemories(agentId, types, minConfidence, limit)
 * - Memory cache per heartbeat (avoid duplicate queries)
 * - Filter by tags, confidence, recency
 * - 200 memory cap per agent (oldest get overwritten)
 */

import { Memory, MemoryQueryOptions, MemoryCache, MemoryType } from './types';

export { Memory, MemoryQueryOptions, MemoryCache, MemoryType };

export class MemoryQuery {
  private readonly memoryCapPerAgent = 200;
  private cache: MemoryCache = {};
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Query memories for an agent with caching
   */
  async queryAgentMemories(
    agentId: string,
    options: MemoryQueryOptions = {}
  ): Promise<Memory[]> {
    // Check cache first
    const cacheKey = this.generateCacheKey(agentId, options);
    const cached = this.getFromCache(agentId, cacheKey);
    
    if (cached) {
      console.log(`Using cached memories for agent ${agentId}`);
      return cached;
    }
    
    // Fetch from database
    const allMemories = await this.fetchAgentMemoriesFromDB(agentId);
    
    // Apply memory cap (remove oldest if over limit)
    const cappedMemories = this.applyMemoryCap(allMemories);
    
    // Filter memories based on options
    const filteredMemories = this.filterMemories(cappedMemories, options);
    
    // Update cache
    this.updateCache(agentId, cacheKey, filteredMemories);
    
    return filteredMemories;
  }

  /**
   * Generate cache key from query options
   */
  private generateCacheKey(agentId: string, options: MemoryQueryOptions): string {
    const parts = [
      agentId,
      options.types?.sort().join(',') || 'all',
      options.minConfidence?.toString() || '0',
      options.maxConfidence?.toString() || '1',
      options.tags?.sort().join(',') || 'all',
      options.limit?.toString() || 'none',
      options.sortBy || 'recency',
      options.promotedOnly ? 'promoted' : 'all'
    ];
    
    return parts.join('|');
  }

  /**
   * Get memories from cache
   */
  private getFromCache(agentId: string, cacheKey: string): Memory[] | null {
    const agentCache = this.cache[agentId];
    
    if (!agentCache) {
      return null;
    }
    
    // Check if cache is stale
    const now = Date.now();
    if (now - agentCache.lastQueryTime > this.cacheTTL) {
      delete this.cache[agentId];
      return null;
    }
    
    // Check if query matches cached query
    if (agentCache.queryHash !== cacheKey) {
      return null;
    }
    
    return agentCache.memories;
  }

  /**
   * Update cache with new query results
   */
  private updateCache(agentId: string, cacheKey: string, memories: Memory[]): void {
    this.cache[agentId] = {
      memories,
      lastQueryTime: Date.now(),
      queryHash: cacheKey
    };
  }

  /**
   * Fetch memories from database (mock implementation)
   */
  private async fetchAgentMemoriesFromDB(agentId: string): Promise<Memory[]> {
    // In production, this would query the database
    // For now, return simulated data
    
    const memories: Memory[] = [];
    const now = new Date();
    const memoryTypes: MemoryType[] = ['insight', 'pattern', 'strategy', 'preference', 'lesson'];
    
    // Generate simulated memories
    for (let i = 0; i < 50; i++) {
      const hoursAgo = Math.random() * 720; // Up to 30 days
      const createdAt = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
      
      const type = memoryTypes[Math.floor(Math.random() * memoryTypes.length)];
      const confidence = this.getConfidenceForType(type);
      
      memories.push({
        id: `mem_${agentId}_${Date.now()}_${i}`,
        agentId,
        type,
        content: this.generateMemoryContent(type, agentId),
        confidence,
        tags: this.generateTagsForType(type),
        sourceTraceId: `source_${Math.floor(Math.random() * 1000)}`,
        createdAt,
        upvotes: Math.floor(Math.random() * 5),
        downvotes: Math.floor(Math.random() * 2),
        promoted: Math.random() > 0.8, // 20% promoted
        lastAccessedAt: new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000)
      });
    }
    
    return memories;
  }

  /**
   * Apply memory cap - remove oldest memories if over limit
   */
  private applyMemoryCap(memories: Memory[]): Memory[] {
    if (memories.length <= this.memoryCapPerAgent) {
      return memories;
    }
    
    // Sort by creation date (oldest first)
    const sorted = [...memories].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    // Keep only the most recent memories
    const capped = sorted.slice(-this.memoryCapPerAgent);
    
    console.log(`Applied memory cap: kept ${capped.length} most recent memories, removed ${sorted.length - capped.length} oldest`);
    
    return capped;
  }

  /**
   * Filter memories based on query options
   */
  private filterMemories(memories: Memory[], options: MemoryQueryOptions): Memory[] {
    let filtered = [...memories];
    
    // Filter by type
    if (options.types && options.types.length > 0) {
      filtered = filtered.filter(memory => options.types!.includes(memory.type));
    }
    
    // Filter by confidence
    if (options.minConfidence !== undefined) {
      filtered = filtered.filter(memory => memory.confidence >= options.minConfidence!);
    }
    
    if (options.maxConfidence !== undefined) {
      filtered = filtered.filter(memory => memory.confidence <= options.maxConfidence!);
    }
    
    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      filtered = filtered.filter(memory => 
        options.tags!.some(tag => memory.tags.includes(tag))
      );
    }
    
    // Filter by promoted status
    if (options.promotedOnly) {
      filtered = filtered.filter(memory => memory.promoted);
    }
    
    // Sort
    if (options.sortBy) {
      filtered.sort((a, b) => {
        switch (options.sortBy) {
          case 'confidence':
            return b.confidence - a.confidence;
          case 'relevance':
            // Simple relevance score: confidence + (upvotes * 0.1) - (downvotes * 0.2)
            const scoreA = a.confidence + (a.upvotes * 0.1) - (a.downvotes * 0.2);
            const scoreB = b.confidence + (b.upvotes * 0.1) - (b.downvotes * 0.2);
            return scoreB - scoreA;
          case 'recency':
          default:
            return b.createdAt.getTime() - a.createdAt.getTime();
        }
      });
    }
    
    // Apply limit
    if (options.limit && options.limit > 0) {
      filtered = filtered.slice(0, options.limit);
    }
    
    // Apply offset
    if (options.offset && options.offset > 0) {
      filtered = filtered.slice(options.offset);
    }
    
    // Update last accessed time for returned memories
    filtered.forEach(memory => {
      memory.lastAccessedAt = new Date();
    });
    
    return filtered;
  }

  /**
   * Clear cache for an agent or all agents
   */
  clearCache(agentId?: string): void {
    if (agentId) {
      delete this.cache[agentId];
      console.log(`Cleared cache for agent ${agentId}`);
    } else {
      this.cache = {};
      console.log('Cleared all memory caches');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { totalAgents: number; cacheHits: number } {
    // In production, track actual hits/misses
    // For now, return basic stats
    return {
      totalAgents: Object.keys(this.cache).length,
      cacheHits: 0 // Would track in production
    };
  }

  /**
   * Helper: Generate confidence score based on memory type
   */
  private getConfidenceForType(type: MemoryType): number {
    const ranges: Record<MemoryType, { min: number; max: number }> = {
      insight: { min: 0.65, max: 0.85 },
      pattern: { min: 0.70, max: 0.90 },
      strategy: { min: 0.75, max: 0.90 },
      preference: { min: 0.60, max: 0.80 },
      lesson: { min: 0.55, max: 0.75 }
    };
    
    const range = ranges[type];
    return range.min + Math.random() * (range.max - range.min);
  }

  /**
   * Helper: Generate memory content based on type
   */
  private generateMemoryContent(type: MemoryType, _agentId: string): string {
    const contents: Record<MemoryType, string[]> = {
      insight: [
        "KOL accumulation signals often precede 30-50% price moves",
        "Weekend trading volume drops by 60%, reducing signal reliability",
        "Morning gap fills frequently occur within first 2 hours of trading",
        "High social sentiment correlates with short-term volatility spikes"
      ],
      pattern: [
        "Pump and dump patterns typically complete within 4-6 hours",
        "Support levels hold 70% of the time on first retest",
        "Volume precedes price - spikes often signal imminent moves",
        "Fibonacci retracement levels at 0.618 frequently act as reversal points"
      ],
      strategy: [
        "Scale in with 30/30/40 tranches reduces entry risk",
        "Trailing stop losses at 20% below highest point lock in profits",
        "Diversify across 3-5 uncorrelated assets to reduce portfolio risk",
        "Take partial profits at 25% gains to secure returns"
      ],
      preference: [
        "Prefer limit orders over market orders to control slippage",
        "Favor 1-hour timeframes for entry signals over 15-minute charts",
        "Use RSI divergence as confirmation, not primary signal",
        "Check multiple timeframes (1h, 4h, daily) before entering"
      ],
      lesson: [
        "Don't chase pumps after 50%+ move in less than 1 hour",
        "Avoid trading during major news events without clear edge",
        "Cut losses quickly - losing trades rarely turn profitable",
        "Overtrading leads to fatigue and poor decision making"
      ]
    };
    
    const typeContents = contents[type];
    return typeContents[Math.floor(Math.random() * typeContents.length)];
  }

  /**
   * Helper: Generate tags based on memory type
   */
  private generateTagsForType(type: MemoryType): string[] {
    const baseTags: Record<MemoryType, string[]> = {
      insight: ['discovery', 'analysis', 'observation'],
      pattern: ['recurring', 'historical', 'statistical'],
      strategy: ['approach', 'methodology', 'systematic'],
      preference: ['operational', 'choice', 'bias'],
      lesson: ['learned', 'experience', 'correction']
    };
    
    const additionalTags = [
      'trading', 'crypto', 'risk', 'execution', 'timing',
      'entry', 'exit', 'management', 'monitoring', 'performance'
    ];
    
    const tags = [...baseTags[type]];
    
    // Add 1-3 random additional tags
    const numAdditional = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numAdditional; i++) {
      const randomTag = additionalTags[Math.floor(Math.random() * additionalTags.length)];
      if (!tags.includes(randomTag)) {
        tags.push(randomTag);
      }
    }
    
    return tags;
  }
}