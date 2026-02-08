/**
 * Insight Promoter - Promotes high-value memories to permanent storage
 * 
 * Features:
 * - Runs every heartbeat
 * - Find high-confidence memories (>0.80)
 * - Multiple upvotes or repeated patterns
 * - Promote to permanent storage
 */

import { Memory, MemoryQuery } from './memory-query';
import { InsightPromotionCandidate } from './types';

export class InsightPromoter {
  private readonly minConfidenceForPromotion = 0.80;
  private readonly minUpvotesForPromotion = 3;
  // private readonly minAccessCountForPromotion = 5;
  private memoryQuery: MemoryQuery;

  constructor(memoryQuery: MemoryQuery) {
    this.memoryQuery = memoryQuery;
  }

  /**
   * Promote high-value insights to permanent storage
   * Runs every heartbeat
   */
  async promoteInsights(): Promise<Memory[]> {
    console.log('Starting insight promotion scan...');
    
    // Get all agents
    const agents = ['atlas', 'sage', 'scout', 'growth', 'intel', 'observer'];
    const allPromotedMemories: Memory[] = [];
    
    for (const agentId of agents) {
      const promoted = await this.promoteInsightsForAgent(agentId);
      allPromotedMemories.push(...promoted);
    }
    
    console.log(`Promoted ${allPromotedMemories.length} insights total`);
    return allPromotedMemories;
  }

  /**
   * Promote insights for a specific agent
   */
  private async promoteInsightsForAgent(agentId: string): Promise<Memory[]> {
    // Fetch high-confidence memories for this agent
    const memories = await this.memoryQuery.queryAgentMemories(agentId, {
      minConfidence: this.minConfidenceForPromotion,
      promotedOnly: false // Get non-promoted memories
    });
    
    if (memories.length === 0) {
      return [];
    }
    
    // Identify promotion candidates
    const candidates = this.identifyPromotionCandidates(memories);
    
    if (candidates.length === 0) {
      return [];
    }
    
    // Promote the top candidates
    const promotedMemories = await this.promoteCandidates(candidates);
    
    console.log(`Agent ${agentId}: Promoted ${promotedMemories.length} insights`);
    
    return promotedMemories;
  }

  /**
   * Identify memories that should be promoted
   */
  private identifyPromotionCandidates(memories: Memory[]): InsightPromotionCandidate[] {
    const candidates: InsightPromotionCandidate[] = [];
    
    for (const memory of memories) {
      // Skip already promoted memories
      if (memory.promoted) {
        continue;
      }
      
      const promotionScore = this.calculatePromotionScore(memory);
      const reasons = this.getPromotionReasons(memory, promotionScore);
      
      if (promotionScore > 0.7) { // Minimum threshold for consideration
        candidates.push({
          memory,
          promotionScore,
          reasons
        });
      }
    }
    
    // Sort by promotion score (highest first)
    candidates.sort((a, b) => b.promotionScore - a.promotionScore);
    
    return candidates;
  }

  /**
   * Calculate promotion score for a memory
   */
  private calculatePromotionScore(memory: Memory): number {
    let score = 0;
    
    // 1. Base score from confidence (normalized above min threshold)
    const confidenceScore = (memory.confidence - this.minConfidenceForPromotion) / (1 - this.minConfidenceForPromotion);
    score += confidenceScore * 0.4;
    
    // 2. Upvote score
    const upvoteScore = Math.min(memory.upvotes / this.minUpvotesForPromotion, 1);
    score += upvoteScore * 0.3;
    
    // 3. Engagement score (based on last accessed)
    const daysSinceCreation = (Date.now() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const accessAgeScore = daysSinceCreation < 7 ? 1.0 : 
                          daysSinceCreation < 30 ? 0.7 : 
                          daysSinceCreation < 90 ? 0.4 : 0.2;
    score += accessAgeScore * 0.2;
    
    // 4. Type bonus (some types are more valuable)
    const typeBonuses: Record<string, number> = {
      strategy: 0.15,
      pattern: 0.10,
      insight: 0.10,
      lesson: 0.05,
      preference: 0.0
    };
    score += typeBonuses[memory.type] || 0;
    
    // 5. Downvote penalty
    const downvotePenalty = Math.min(memory.downvotes * 0.1, 0.3);
    score -= downvotePenalty;
    
    return Math.max(0, Math.min(score, 1.0));
  }

  /**
   * Get reasons for promotion
   */
  private getPromotionReasons(memory: Memory, _promotionScore: number): string[] {
    const reasons: string[] = [];
    
    if (memory.confidence >= 0.90) {
      reasons.push('Very high confidence');
    } else if (memory.confidence >= 0.85) {
      reasons.push('High confidence');
    }
    
    if (memory.upvotes >= this.minUpvotesForPromotion) {
      reasons.push(`Multiple upvotes (${memory.upvotes})`);
    }
    
    // Check for recent activity
    const daysSinceCreation = (Date.now() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation < 3) {
      reasons.push('Recently created');
    }
    
    // Type-specific reasons
    if (memory.type === 'strategy') {
      reasons.push('Strategic importance');
    } else if (memory.type === 'pattern') {
      reasons.push('Recurring pattern');
    } else if (memory.type === 'lesson') {
      reasons.push('Valuable lesson');
    }
    
    // Check for unique or rare tags
    const valuableTags = ['risk-management', 'best-practice', 'profitable', 'repeatable'];
    const hasValuableTag = memory.tags.some(tag => valuableTags.includes(tag));
    if (hasValuableTag) {
      reasons.push('Contains valuable tags');
    }
    
    return reasons;
  }

  /**
   * Promote candidate memories
   */
  private async promoteCandidates(candidates: InsightPromotionCandidate[]): Promise<Memory[]> {
    const promotedMemories: Memory[] = [];
    
    // Limit promotions per run to avoid overwhelming the system
    const maxPromotionsPerRun = 5;
    const candidatesToPromote = candidates.slice(0, maxPromotionsPerRun);
    
    for (const candidate of candidatesToPromote) {
      try {
        const promoted = await this.promoteMemory(candidate.memory);
        promotedMemories.push(promoted);
        
        console.log(`Promoted memory: "${candidate.memory.content.substring(0, 80)}..."`);
        console.log(`  Score: ${candidate.promotionScore.toFixed(2)}, Reasons: ${candidate.reasons.join(', ')}`);
      } catch (error) {
        console.error(`Failed to promote memory ${candidate.memory.id}:`, error);
      }
    }
    
    return promotedMemories;
  }

  /**
   * Promote a single memory to permanent storage
   */
  private async promoteMemory(memory: Memory): Promise<Memory> {
    // In production, this would update the database
    // For now, update the in-memory object
    
    const promotedMemory: Memory = {
      ...memory,
      promoted: true,
      lastAccessedAt: new Date()
    };
    
    // In a real implementation, we would:
    // 1. Update the memory in the database with promoted=true
    // 2. Possibly copy to a separate "permanent insights" table
    // 3. Log the promotion event
    // 4. Notify relevant agents
    
    // Simulate database update
    await this.simulateDatabaseUpdate(promotedMemory);
    
    return promotedMemory;
  }

  /**
   * Simulate database update (mock implementation)
   */
  private async simulateDatabaseUpdate(memory: Memory): Promise<void> {
    // In production, this would be a database update
    // For now, just log
    console.log(`[DB] Updated memory ${memory.id}: promoted=true`);
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Get promotion statistics
   */
  async getPromotionStats(): Promise<{
    totalPromoted: number;
    byAgent: Record<string, number>;
    byType: Record<string, number>;
    promotionRate: number;
  }> {
    const agents = ['atlas', 'sage', 'scout', 'growth', 'intel', 'observer'];
    const stats = {
      totalPromoted: 0,
      byAgent: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      promotionRate: 0
    };
    
    let totalMemories = 0;
    
    for (const agentId of agents) {
      // Get all memories for agent
      const memories = await this.memoryQuery.queryAgentMemories(agentId, {});
      totalMemories += memories.length;
      
      // Count promoted memories
      const promoted = memories.filter(m => m.promoted);
      stats.byAgent[agentId] = promoted.length;
      stats.totalPromoted += promoted.length;
      
      // Count by type
      for (const memory of promoted) {
        stats.byType[memory.type] = (stats.byType[memory.type] || 0) + 1;
      }
    }
    
    // Calculate promotion rate
    stats.promotionRate = totalMemories > 0 ? stats.totalPromoted / totalMemories : 0;
    
    return stats;
  }

  /**
   * Manually promote a specific memory (for testing/debugging)
   */
  async manuallyPromoteMemory(memoryId: string, agentId: string): Promise<Memory | null> {
    // Fetch the memory
    const memories = await this.memoryQuery.queryAgentMemories(agentId, {});
    const memory = memories.find(m => m.id === memoryId);
    
    if (!memory) {
      console.error(`Memory ${memoryId} not found for agent ${agentId}`);
      return null;
    }
    
    if (memory.promoted) {
      console.log(`Memory ${memoryId} is already promoted`);
      return memory;
    }
    
    // Promote it
    return await this.promoteMemory(memory);
  }
}