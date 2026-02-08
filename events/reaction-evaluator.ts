// Reaction evaluator: checks patterns against new events, rolls probability, checks cooldown
import { Event, ReactionPattern, QueuedReaction } from './types';
import { ReactionUtils } from './reaction-utils';
import { ReactionMatrixManager } from './reaction-matrix-manager';

export class ReactionEvaluator {
  private db: any; // Database connection - to be injected
  private matrixManager: ReactionMatrixManager;
  private reactionUtils: ReactionUtils;
  
  constructor(db: any) {
    this.db = db;
    this.matrixManager = new ReactionMatrixManager(db);
    this.reactionUtils = new ReactionUtils();
  }
  
  /**
   * Evaluate reaction matrix against a new event
   * This is the main hook called by EventEmitter
   */
  async evaluateReactionMatrix(event: Event): Promise<QueuedReaction[]> {
    console.log(`🔍 Evaluating reactions for event: ${event.kind} - ${event.title}`);
    
    // Load reaction matrix
    const matrix = await this.matrixManager.getMatrix();
    
    // Find matching patterns
    const matchingPatterns = this.matrixManager.matchEvent(event, matrix.patterns);
    
    if (matchingPatterns.length === 0) {
      console.log('   No matching reaction patterns found');
      return [];
    }
    
    console.log(`   Found ${matchingPatterns.length} matching pattern(s)`);
    
    const queuedReactions: QueuedReaction[] = [];
    
    // Evaluate each matching pattern
    for (const pattern of matchingPatterns) {
      try {
        const queued = await this.evaluatePattern(event, pattern);
        if (queued) {
          queuedReactions.push(queued);
        }
      } catch (error) {
        console.error(`Failed to evaluate pattern for ${pattern.target}:`, error);
      }
    }
    
    // Clean up expired cooldowns periodically
    if (Math.random() < 0.1) { // 10% chance to clean up on each evaluation
      const cleaned = this.reactionUtils.cleanupExpiredCooldowns();
      if (cleaned > 0) {
        console.log(`   Cleaned up ${cleaned} expired cooldowns`);
      }
    }
    
    return queuedReactions;
  }
  
  /**
   * Evaluate a single pattern against an event
   */
  private async evaluatePattern(event: Event, pattern: ReactionPattern): Promise<QueuedReaction | null> {
    const sourceAgent = pattern.source === "*" ? event.agent_id : pattern.source;
    
    // 1. Check cooldown
    if (this.reactionUtils.checkReactionCooldown(sourceAgent, pattern.target, pattern.type)) {
      console.log(`   ⏸️  Cooldown active for ${sourceAgent} → ${pattern.target} (${pattern.type})`);
      return null;
    }
    
    // 2. Roll probability
    if (!this.reactionUtils.rollProbability(pattern.probability)) {
      console.log(`   🎲 Probability failed for ${sourceAgent} → ${pattern.target} (${pattern.probability * 100}% chance)`);
      return null;
    }
    
    // 3. Create queued reaction
    const queuedReaction: QueuedReaction = {
      source_agent: sourceAgent,
      target_agent: pattern.target,
      reaction_type: pattern.type,
      trigger_event_id: event.id!,
      status: 'queued',
      created_at: new Date()
    };
    
    try {
      // Write to ops_agent_reactions queue
      const [result] = await this.db('ops_agent_reactions')
        .insert(queuedReaction)
        .returning('*');
      
      console.log(`   ✅ Queued reaction: ${sourceAgent} → ${pattern.target} (${pattern.type})`);
      
      // 4. Set cooldown
      this.reactionUtils.setReactionCooldown(sourceAgent, pattern.target, pattern.type, pattern.cooldown);
      
      return result as QueuedReaction;
    } catch (error) {
      console.error(`Failed to queue reaction for ${pattern.target}:`, error);
      return null;
    }
  }
  
  /**
   * Get active cooldowns (for monitoring/debugging)
   */
  getActiveCooldowns() {
    return this.reactionUtils.getActiveCooldowns();
  }
  
  /**
   * Clear all cooldowns (for testing/reset)
   */
  clearAllCooldowns() {
    this.reactionUtils.clearAllCooldowns();
  }
  
  /**
   * Manually trigger a reaction (for testing/debugging)
   */
  async manuallyTriggerReaction(
    sourceAgent: string,
    targetAgent: string,
    reactionType: string,
    triggerEventId: string
  ): Promise<QueuedReaction> {
    const queuedReaction: QueuedReaction = {
      source_agent: sourceAgent,
      target_agent: targetAgent,
      reaction_type: reactionType,
      trigger_event_id: triggerEventId,
      status: 'queued',
      created_at: new Date()
    };
    
    const [result] = await this.db('ops_agent_reactions')
      .insert(queuedReaction)
      .returning('*');
    
    console.log(`🔧 Manually queued reaction: ${sourceAgent} → ${targetAgent} (${reactionType})`);
    
    return result as QueuedReaction;
  }
}