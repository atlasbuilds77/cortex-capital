// Reaction queue processor: runs every heartbeat, processes queued reactions
// Budget: 3000ms per heartbeat
import { QueuedReaction } from './types';

export class ReactionQueueProcessor {
  private db: any; // Database connection - to be injected
  private proposalService: any; // Proposal service - to be injected
  private readonly BUDGET_MS = 3000; // 3 second budget per heartbeat
  private readonly BATCH_SIZE = 10; // Process up to 10 reactions per heartbeat
  
  constructor(db: any, proposalService: any) {
    this.db = db;
    this.proposalService = proposalService;
  }
  
  /**
   * Process the reaction queue (called every heartbeat)
   * @returns Statistics about the processing run
   */
  async processReactionQueue(): Promise<{
    processed: number;
    failed: number;
    remaining: number;
    durationMs: number;
  }> {
    const startTime = Date.now();
    let processed = 0;
    let failed = 0;
    
    console.log('🔄 Processing reaction queue...');
    
    try {
      // Fetch queued reactions (oldest first)
      const queuedReactions = await this.db('ops_agent_reactions')
        .where({ status: 'queued' })
        .orderBy('created_at', 'asc')
        .limit(this.BATCH_SIZE);
      
      const totalQueued = queuedReactions.length;
      console.log(`   Found ${totalQueued} queued reaction(s)`);
      
      if (totalQueued === 0) {
        return {
          processed: 0,
          failed: 0,
          remaining: 0,
          durationMs: Date.now() - startTime
        };
      }
      
      // Process each reaction
      for (const reaction of queuedReactions) {
        // Check budget
        if (Date.now() - startTime > this.BUDGET_MS) {
          console.log(`   ⏰ Budget exceeded (${this.BUDGET_MS}ms), stopping`);
          break;
        }
        
        try {
          await this.processSingleReaction(reaction);
          processed++;
        } catch (error) {
          console.error(`   ❌ Failed to process reaction ${reaction.id}:`, error);
          await this.markReactionAsFailed(reaction.id, error);
          failed++;
        }
      }
      
      // Get remaining count
      const remainingResult = await this.db('ops_agent_reactions')
        .where({ status: 'queued' })
        .count('* as count')
        .first();
      
      const remaining = parseInt(remainingResult?.count || '0');
      
      const durationMs = Date.now() - startTime;
      
      console.log(`   ✅ Processed ${processed}/${totalQueued} reactions in ${durationMs}ms`);
      if (failed > 0) {
        console.log(`   ❌ ${failed} reaction(s) failed`);
      }
      console.log(`   📊 ${remaining} reaction(s) remaining in queue`);
      
      return {
        processed,
        failed,
        remaining,
        durationMs
      };
      
    } catch (error) {
      console.error('Failed to process reaction queue:', error);
      return {
        processed: 0,
        failed: 0,
        remaining: 0,
        durationMs: Date.now() - startTime
      };
    }
  }
  
  /**
   * Process a single queued reaction
   */
  private async processSingleReaction(reaction: QueuedReaction): Promise<void> {
    console.log(`   🔄 Processing reaction ${reaction.id}: ${reaction.source_agent} → ${reaction.target_agent} (${reaction.reaction_type})`);
    
    // Get the trigger event
    const triggerEvent = await this.db('ops_agent_events')
      .where({ id: reaction.trigger_event_id })
      .first();
    
    if (!triggerEvent) {
      throw new Error(`Trigger event ${reaction.trigger_event_id} not found`);
    }
    
    // Create proposal based on reaction type
    const proposal = await this.createProposalFromReaction(reaction, triggerEvent);
    
    // Submit proposal via proposal-service
    await this.proposalService.createProposal(proposal);
    
    // Mark reaction as processed
    await this.markReactionAsProcessed(reaction.id);
    
    console.log(`   ✅ Reaction ${reaction.id} processed, proposal created`);
  }
  
  /**
   * Create a proposal from a reaction
   */
  private async createProposalFromReaction(
    reaction: QueuedReaction,
    triggerEvent: any
  ): Promise<any> {
    const baseProposal = {
      agent_id: reaction.target_agent,
      title: this.generateProposalTitle(reaction, triggerEvent),
      summary: this.generateProposalSummary(reaction, triggerEvent),
      metadata: {
        reaction_id: reaction.id,
        trigger_event_id: reaction.trigger_event_id,
        source_agent: reaction.source_agent,
        reaction_type: reaction.reaction_type,
        trigger_event: {
          kind: triggerEvent.kind,
          title: triggerEvent.title,
          tags: triggerEvent.tags
        }
      }
    };
    
    // Add reaction-type-specific details
    switch (reaction.reaction_type) {
      case 'diagnose':
        return {
          ...baseProposal,
          signal_type: 'analysis',
          proposed_steps: [
            {
              kind: 'analyze',
              payload: {
                analysis_type: 'post_mortem',
                focus: 'failure_analysis',
                event_context: triggerEvent.summary
              }
            }
          ]
        };
        
      case 'evaluate':
        return {
          ...baseProposal,
          signal_type: 'evaluation',
          proposed_steps: [
            {
              kind: 'analyze_signal',
              payload: {
                signal_source: 'high_confidence_event',
                event_context: triggerEvent.summary,
                confidence: triggerEvent.metadata?.confidence || 0.8
              }
            }
          ]
        };
        
      case 'analyze':
        return {
          ...baseProposal,
          signal_type: 'performance_analysis',
          proposed_steps: [
            {
              kind: 'analyze',
              payload: {
                analysis_type: 'execution_quality',
                focus: 'trade_execution',
                event_context: triggerEvent.summary
              }
            }
          ]
        };
        
      case 'review':
        return {
          ...baseProposal,
          signal_type: 'risk_review',
          proposed_steps: [
            {
              kind: 'calculate_risk',
              payload: {
                review_type: 'risk_assessment',
                focus: 'warning_validation',
                event_context: triggerEvent.summary
              }
            }
          ]
        };
        
      case 'propose_strategy':
        return {
          ...baseProposal,
          signal_type: 'strategy_development',
          proposed_steps: [
            {
              kind: 'analyze',
              payload: {
                analysis_type: 'pattern_application',
                focus: 'strategy_formulation',
                event_context: triggerEvent.summary,
                insight_type: triggerEvent.tags.find(t => t !== 'insight') || 'general'
              }
            }
          ]
        };
        
      case 'alert':
        return {
          ...baseProposal,
          signal_type: 'system_alert',
          proposed_steps: [
            {
              kind: 'monitor_position', // Using monitor as generic check
              payload: {
                alert_type: 'rule_violation',
                focus: 'compliance_check',
                event_context: triggerEvent.summary,
                error_type: triggerEvent.tags.find(t => t !== 'error') || 'general'
              }
            }
          ]
        };
        
      default:
        // Generic proposal for unknown reaction types
        return {
          ...baseProposal,
          signal_type: 'reaction',
          proposed_steps: [
            {
              kind: 'analyze',
              payload: {
                analysis_type: 'reaction_response',
                focus: 'event_response',
                event_context: triggerEvent.summary
              }
            }
          ]
        };
    }
  }
  
  /**
   * Generate proposal title based on reaction
   */
  private generateProposalTitle(reaction: QueuedReaction, triggerEvent: any): string {
    const agentNames: Record<string, string> = {
      'atlas': 'ATLAS',
      'sage': 'SAGE',
      'scout': 'SCOUT',
      'growth': 'GROWTH',
      'intel': 'INTEL',
      'observer': 'OBSERVER'
    };
    
    const sourceName = agentNames[reaction.source_agent] || reaction.source_agent;
    const targetName = agentNames[reaction.target_agent] || reaction.target_agent;
    
    switch (reaction.reaction_type) {
      case 'diagnose':
        return `${targetName}: Diagnose ${triggerEvent.title}`;
      case 'evaluate':
        return `${targetName}: Evaluate ${triggerEvent.title}`;
      case 'analyze':
        return `${targetName}: Analyze ${triggerEvent.title}`;
      case 'review':
        return `${targetName}: Review ${triggerEvent.title}`;
      case 'propose_strategy':
        return `${targetName}: Propose strategy based on ${triggerEvent.title}`;
      case 'alert':
        return `${targetName}: Alert - ${triggerEvent.title}`;
      default:
        return `${targetName}: Respond to ${triggerEvent.title}`;
    }
  }
  
  /**
   * Generate proposal summary based on reaction
   */
  private generateProposalSummary(reaction: QueuedReaction, triggerEvent: any): string {
    return `${reaction.source_agent} triggered a ${reaction.reaction_type} reaction to event: "${triggerEvent.title}". ${triggerEvent.summary}`;
  }
  
  /**
   * Mark reaction as processed
   */
  private async markReactionAsProcessed(reactionId: string): Promise<void> {
    await this.db('ops_agent_reactions')
      .where({ id: reactionId })
      .update({
        status: 'processed',
        processed_at: new Date()
      });
  }
  
  /**
   * Mark reaction as failed
   */
  private async markReactionAsFailed(reactionId: string, error: any): Promise<void> {
    await this.db('ops_agent_reactions')
      .where({ id: reactionId })
      .update({
        status: 'failed',
        processed_at: new Date(),
        metadata: { error: error.message || String(error) }
      });
  }
  
  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    queued: number;
    processed: number;
    failed: number;
    total: number;
  }> {
    const stats = await this.db('ops_agent_reactions')
      .select('status')
      .count('* as count')
      .groupBy('status');
    
    const result = {
      queued: 0,
      processed: 0,
      failed: 0,
      total: 0
    };
    
    for (const stat of stats) {
      const count = parseInt(stat.count);
      result.total += count;
      
      switch (stat.status) {
        case 'queued':
          result.queued = count;
          break;
        case 'processed':
          result.processed = count;
          break;
        case 'failed':
          result.failed = count;
          break;
      }
    }
    
    return result;
  }
  
  /**
   * Retry failed reactions (manual intervention)
   */
  async retryFailedReactions(limit: number = 5): Promise<number> {
    const failedReactions = await this.db('ops_agent_reactions')
      .where({ status: 'failed' })
      .orderBy('created_at', 'asc')
      .limit(limit);
    
    let retried = 0;
    
    for (const reaction of failedReactions) {
      try {
        // Reset status to queued
        await this.db('ops_agent_reactions')
          .where({ id: reaction.id })
          .update({
            status: 'queued',
            processed_at: null,
            metadata: null
          });
        
        retried++;
        console.log(`   🔄 Retrying failed reaction ${reaction.id}`);
      } catch (error) {
        console.error(`   ❌ Failed to retry reaction ${reaction.id}:`, error);
      }
    }
    
    return retried;
  }
}