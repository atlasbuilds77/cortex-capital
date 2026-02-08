/**
 * Heartbeat - Main Loop Orchestrator
 * Runs every 5 minutes, coordinates all system operations
 * Budget: 15 seconds max per heartbeat
 */

import { config } from './config';
import * as db from './db-adapter';
import { logger } from '../utils/logger';

const log = logger.child('Heartbeat');

// Import from existing modules (these are the Spark outputs)
// Note: Paths would be resolved at runtime
const { reactiveTriggers } = require('../triggers/reactive-triggers');
const { OutcomeLearner, InsightPromoter, MemoryQuery } = require('../memory');
const { ReactionQueueProcessor, EventEmitter } = require('../events');
const { ProposalService } = require('../core/proposal-service');

// Timeout wrapper
function withTimeout<T>(promise: Promise<T>, ms: number, name: string): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error(`${name} timed out after ${ms}ms`)), ms)
    ),
  ]).catch(error => {
    console.error(`[Heartbeat] ${name} failed:`, error.message);
    return null;
  });
}

interface HeartbeatResult {
  timestamp: Date;
  durationMs: number;
  operations: {
    evaluateTriggers: { success: boolean; fired: number; durationMs: number };
    processReactionQueue: { success: boolean; processed: number; durationMs: number };
    promoteInsights: { success: boolean; promoted: number; durationMs: number };
    learnFromOutcomes: { success: boolean; lessons: number; durationMs: number };
    recoverStaleSteps: { success: boolean; recovered: number; durationMs: number };
    recoverStaleRoundtables: { success: boolean; recovered: number; durationMs: number };
  };
  errors: string[];
}

export class Heartbeat {
  private proposalService: any;
  private outcomeLearner: any;
  private insightPromoter: any;
  private memoryQuery: any;
  private reactionProcessor: any;
  private eventEmitter: any;
  private isRunning: boolean = false;
  private runStartTime: number | null = null;
  private lastRun: Date | null = null;
  private readonly MAX_HEARTBEAT_DURATION = 60000; // 60 seconds

  constructor() {
    // Initialize components
    this.proposalService = new ProposalService();
    this.outcomeLearner = new OutcomeLearner();
    this.memoryQuery = new MemoryQuery();
    this.insightPromoter = new InsightPromoter(this.memoryQuery);
    this.reactionProcessor = new ReactionQueueProcessor(db, this.proposalService);
    this.eventEmitter = new EventEmitter(db, null);
  }

  /**
   * Run one heartbeat cycle
   */
  async run(): Promise<HeartbeatResult> {
    // Check if stuck (deadlock protection)
    if (this.isRunning && this.runStartTime) {
      const runDuration = Date.now() - this.runStartTime;
      if (runDuration > this.MAX_HEARTBEAT_DURATION) {
        log.error('DEADLOCK: Forcing reset', { runDuration, maxDuration: this.MAX_HEARTBEAT_DURATION });
        this.isRunning = false;
        this.runStartTime = null;
      }
    }
    
    if (this.isRunning) {
      log.info('Already running, skipping');
      return this.createEmptyResult('Already running');
    }

    this.isRunning = true;
    this.runStartTime = Date.now();
    const startTime = Date.now();
    const errors: string[] = [];
    const result: HeartbeatResult = {
      timestamp: new Date(),
      durationMs: 0,
      operations: {
        evaluateTriggers: { success: false, fired: 0, durationMs: 0 },
        processReactionQueue: { success: false, processed: 0, durationMs: 0 },
        promoteInsights: { success: false, promoted: 0, durationMs: 0 },
        learnFromOutcomes: { success: false, lessons: 0, durationMs: 0 },
        recoverStaleSteps: { success: false, recovered: 0, durationMs: 0 },
        recoverStaleRoundtables: { success: false, recovered: 0, durationMs: 0 },
      },
      errors: [],
    };

    console.log('[Heartbeat] Starting...');

    try {
      // 1. Evaluate Triggers (4000ms budget)
      const triggerStart = Date.now();
      const triggerResult = await withTimeout(
        this.evaluateTriggers(),
        config.heartbeat.operationTimeouts.evaluateTriggers,
        'evaluateTriggers'
      );
      result.operations.evaluateTriggers = {
        success: triggerResult !== null,
        fired: triggerResult?.fired || 0,
        durationMs: Date.now() - triggerStart,
      };
      if (!triggerResult) errors.push('evaluateTriggers timeout');

      // 2. Process Reaction Queue (3000ms budget)
      const reactionStart = Date.now();
      const reactionResult = await withTimeout(
        this.processReactionQueue(),
        config.heartbeat.operationTimeouts.processReactionQueue,
        'processReactionQueue'
      );
      result.operations.processReactionQueue = {
        success: reactionResult !== null,
        processed: reactionResult?.processed || 0,
        durationMs: Date.now() - reactionStart,
      };
      if (!reactionResult) errors.push('processReactionQueue timeout');

      // 3. Promote Insights (2000ms budget)
      const promoteStart = Date.now();
      const promoteResult = await withTimeout(
        this.promoteInsights(),
        config.heartbeat.operationTimeouts.promoteInsights,
        'promoteInsights'
      );
      result.operations.promoteInsights = {
        success: promoteResult !== null,
        promoted: promoteResult?.promoted || 0,
        durationMs: Date.now() - promoteStart,
      };
      if (!promoteResult) errors.push('promoteInsights timeout');

      // 4. Learn from Outcomes (3000ms budget)
      const learnStart = Date.now();
      const learnResult = await withTimeout(
        this.learnFromOutcomes(),
        config.heartbeat.operationTimeouts.learnFromOutcomes,
        'learnFromOutcomes'
      );
      result.operations.learnFromOutcomes = {
        success: learnResult !== null,
        lessons: learnResult?.lessons || 0,
        durationMs: Date.now() - learnStart,
      };
      if (!learnResult) errors.push('learnFromOutcomes timeout');

      // 5. Recover Stale Steps (2000ms budget)
      const staleStepsStart = Date.now();
      const staleStepsResult = await withTimeout(
        this.recoverStaleSteps(),
        config.heartbeat.operationTimeouts.recoverStaleSteps,
        'recoverStaleSteps'
      );
      result.operations.recoverStaleSteps = {
        success: staleStepsResult !== null,
        recovered: staleStepsResult?.recovered || 0,
        durationMs: Date.now() - staleStepsStart,
      };
      if (!staleStepsResult) errors.push('recoverStaleSteps timeout');

      // 6. Recover Stale Roundtables (1000ms budget)
      const staleRoundtablesStart = Date.now();
      const staleRoundtablesResult = await withTimeout(
        this.recoverStaleRoundtables(),
        config.heartbeat.operationTimeouts.recoverStaleRoundtables,
        'recoverStaleRoundtables'
      );
      result.operations.recoverStaleRoundtables = {
        success: staleRoundtablesResult !== null,
        recovered: staleRoundtablesResult?.recovered || 0,
        durationMs: Date.now() - staleRoundtablesStart,
      };
      if (!staleRoundtablesResult) errors.push('recoverStaleRoundtables timeout');

    } catch (error) {
      console.error('[Heartbeat] Fatal error:', error);
      errors.push(`Fatal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.isRunning = false;
      this.runStartTime = null;
      this.lastRun = new Date();
    }

    result.durationMs = Date.now() - startTime;
    result.errors = errors;

    // Log action run
    await db.logActionRun(
      'heartbeat',
      result.durationMs,
      errors.length === 0 ? 'success' : 'error',
      errors
    ).catch(e => console.error('Failed to log action run:', e));

    console.log(`[Heartbeat] Completed in ${result.durationMs}ms with ${errors.length} errors`);
    this.logResult(result);

    return result;
  }

  /**
   * 1. Evaluate all triggers (reactive + proactive)
   */
  private async evaluateTriggers(): Promise<{ fired: number }> {
    let fired = 0;

    // Get recent trade outcomes for reactive triggers
    const outcomes = await db.getUnprocessedOutcomes();
    for (const outcome of outcomes.slice(0, 5)) { // Limit to 5 per heartbeat
      // Check big win
      if (outcome.pnl_percent && outcome.pnl_percent > 50) {
        const result = await reactiveTriggers.checkTradeBigWin({
          id: outcome.trade_id,
          entry_price: outcome.entry_price,
          exit_price: outcome.exit_price,
          pnl: outcome.pnl,
          pnl_pct: outcome.pnl_percent,
          outcome_type: outcome.outcome_type,
          token: outcome.token || 'unknown',
        });
        if (result.fired && result.proposal) {
          await this.proposalService.createProposalAndMaybeAutoApprove(
            result.proposal.agent_id,
            result.proposal.title,
            result.proposal.proposed_steps.map((s: any) => s.kind),
            result.proposal.metadata
          );
          fired++;
        }
      }

      // Check big loss
      if (outcome.pnl_percent && outcome.pnl_percent < -30) {
        const result = await reactiveTriggers.checkTradeBigLoss({
          id: outcome.trade_id,
          entry_price: outcome.entry_price,
          exit_price: outcome.exit_price,
          pnl: outcome.pnl,
          pnl_pct: outcome.pnl_percent,
          outcome_type: outcome.outcome_type,
          token: outcome.token || 'unknown',
        });
        if (result.fired && result.proposal) {
          await this.proposalService.createProposalAndMaybeAutoApprove(
            result.proposal.agent_id,
            result.proposal.title,
            result.proposal.proposed_steps.map((s: any) => s.kind),
            result.proposal.metadata
          );
          fired++;
        }
      }
    }

    // Get open positions for risk triggers
    const positions = await db.getOpenPositions();
    for (const position of positions) {
      // Check position at risk
      const result = await reactiveTriggers.checkPositionAtRisk({
        id: position.id,
        token: position.token,
        entry_price: position.entry_price,
        current_price: position.current_price,
        size: position.size,
        unrealized_pnl: position.unrealized_pnl,
        stop_loss: position.stop_loss,
        take_profit: position.take_profit,
        status: position.status,
      });
      if (result.fired && result.proposal) {
        await this.proposalService.createProposalAndMaybeAutoApprove(
          result.proposal.agent_id,
          result.proposal.title,
          result.proposal.proposed_steps.map((s: any) => s.kind),
          result.proposal.metadata
        );
        fired++;
      }

      // Check stop loss hit
      if (position.stop_loss && position.current_price <= position.stop_loss) {
        const slResult = await reactiveTriggers.checkStopLossHit(position);
        if (slResult.fired && slResult.proposal) {
          await this.proposalService.createProposalAndMaybeAutoApprove(
            slResult.proposal.agent_id,
            slResult.proposal.title,
            slResult.proposal.proposed_steps.map((s: any) => s.kind),
            slResult.proposal.metadata
          );
          fired++;
        }
      }
    }

    // Check max positions
    const maxPosResult = await reactiveTriggers.checkMaxPositionsReached(positions);
    if (maxPosResult.fired && maxPosResult.proposal) {
      await this.proposalService.createProposalAndMaybeAutoApprove(
        maxPosResult.proposal.agent_id,
        maxPosResult.proposal.title,
        maxPosResult.proposal.proposed_steps.map((s: any) => s.kind),
        maxPosResult.proposal.metadata
      );
      fired++;
    }

    console.log(`[Heartbeat] evaluateTriggers: ${fired} triggers fired`);
    return { fired };
  }

  /**
   * 2. Process reaction queue
   */
  private async processReactionQueue(): Promise<{ processed: number }> {
    const reactions = await db.getQueuedReactions(10);
    let processed = 0;

    for (const reaction of reactions) {
      try {
        // Create proposal from reaction
        await this.proposalService.createProposalAndMaybeAutoApprove(
          reaction.target_agent,
          `React to ${reaction.source_agent}: ${reaction.reaction_type}`,
          ['analyze'],
          {
            source_agent: reaction.source_agent,
            reaction_type: reaction.reaction_type,
            trigger_event_id: reaction.trigger_event_id,
            ...reaction.metadata,
          }
        );
        await db.markReactionProcessed(reaction.id!);
        processed++;
      } catch (error) {
        console.error(`Failed to process reaction ${reaction.id}:`, error);
      }
    }

    console.log(`[Heartbeat] processReactionQueue: ${processed} reactions processed`);
    return { processed };
  }

  /**
   * 3. Promote high-confidence insights
   */
  private async promoteInsights(): Promise<{ promoted: number }> {
    const memories = await db.getHighConfidenceMemories(0.80);
    let promoted = 0;

    for (const memory of memories.slice(0, 5)) { // Limit to 5 per heartbeat
      try {
        await db.promoteMemory(memory.id!);
        promoted++;
      } catch (error) {
        console.error(`Failed to promote memory ${memory.id}:`, error);
      }
    }

    console.log(`[Heartbeat] promoteInsights: ${promoted} insights promoted`);
    return { promoted };
  }

  /**
   * 4. Learn from trade outcomes
   */
  private async learnFromOutcomes(): Promise<{ lessons: number }> {
    const outcomes = await db.getUnprocessedOutcomes();
    let lessons = 0;

    for (const outcome of outcomes.slice(0, 5)) { // Limit to 5 per heartbeat
      try {
        // Generate lesson based on outcome
        const lessonContent = this.generateLesson(outcome);
        if (lessonContent) {
          await db.createMemory({
            agent_id: outcome.outcome_type === 'win' ? 'growth' : 'sage',
            type: 'lesson',
            content: lessonContent,
            confidence: Math.min(0.9, 0.5 + Math.abs(outcome.pnl_percent) / 100),
            tags: [
              outcome.outcome_type,
              outcome.market || 'unknown',
              outcome.token || 'unknown',
            ],
            source_trace_id: outcome.id,
          });
          lessons++;
        }
      } catch (error) {
        console.error(`Failed to learn from outcome ${outcome.id}:`, error);
      }
    }

    console.log(`[Heartbeat] learnFromOutcomes: ${lessons} lessons created`);
    return { lessons };
  }

  /**
   * 5. Recover stale steps
   */
  private async recoverStaleSteps(): Promise<{ recovered: number }> {
    const staleSteps = await db.getStaleSteps(30); // 30 minutes
    let recovered = 0;

    for (const step of staleSteps) {
      try {
        await db.failStep(step.id!, 'Timed out after 30 minutes');
        
        // Check if mission should be failed
        // (simplified - in production would check all steps)
        await db.updateMissionStatus(step.mission_id, 'failed');
        
        recovered++;
      } catch (error) {
        console.error(`Failed to recover step ${step.id}:`, error);
      }
    }

    console.log(`[Heartbeat] recoverStaleSteps: ${recovered} steps recovered`);
    return { recovered };
  }

  /**
   * 6. Recover stale roundtables
   */
  private async recoverStaleRoundtables(): Promise<{ recovered: number }> {
    const staleRoundtables = await db.getStaleRoundtables(60); // 60 minutes
    let recovered = 0;

    for (const roundtable of staleRoundtables) {
      try {
        await db.markRoundtableFailed(roundtable.id, 'Timed out after 60 minutes');
        recovered++;
      } catch (error) {
        console.error(`Failed to recover roundtable ${roundtable.id}:`, error);
      }
    }

    console.log(`[Heartbeat] recoverStaleRoundtables: ${recovered} roundtables recovered`);
    return { recovered };
  }

  /**
   * Generate a lesson string from trade outcome
   */
  private generateLesson(outcome: db.TradeOutcome): string | null {
    const pnlPct = outcome.pnl_percent;
    const token = outcome.token || 'position';
    const holdTime = outcome.hold_time_seconds ? Math.round(outcome.hold_time_seconds / 60) : null;

    if (outcome.outcome_type === 'win' && pnlPct > 30) {
      return `Strong win on ${token} (+${pnlPct.toFixed(1)}%)${holdTime ? ` in ${holdTime}min` : ''}. Analyze entry timing and position sizing that led to this success.`;
    } else if (outcome.outcome_type === 'loss' && pnlPct < -20) {
      return `Loss on ${token} (${pnlPct.toFixed(1)}%)${holdTime ? ` after ${holdTime}min` : ''}. Review stop-loss discipline and entry conditions.`;
    } else if (outcome.outcome_type === 'win') {
      return `Profitable trade on ${token} (+${pnlPct.toFixed(1)}%). Note conditions for future reference.`;
    } else if (outcome.outcome_type === 'loss') {
      return `Loss on ${token} (${pnlPct.toFixed(1)}%). Evaluate risk management.`;
    }
    return null;
  }

  /**
   * Log result summary
   */
  private logResult(result: HeartbeatResult): void {
    console.log('=== Heartbeat Summary ===');
    console.log(`Duration: ${result.durationMs}ms`);
    console.log(`Triggers fired: ${result.operations.evaluateTriggers.fired}`);
    console.log(`Reactions processed: ${result.operations.processReactionQueue.processed}`);
    console.log(`Insights promoted: ${result.operations.promoteInsights.promoted}`);
    console.log(`Lessons learned: ${result.operations.learnFromOutcomes.lessons}`);
    console.log(`Stale steps recovered: ${result.operations.recoverStaleSteps.recovered}`);
    console.log(`Stale roundtables recovered: ${result.operations.recoverStaleRoundtables.recovered}`);
    if (result.errors.length > 0) {
      console.log(`Errors: ${result.errors.join(', ')}`);
    }
    console.log('========================');
  }

  /**
   * Create empty result for skipped runs
   */
  private createEmptyResult(reason: string): HeartbeatResult {
    return {
      timestamp: new Date(),
      durationMs: 0,
      operations: {
        evaluateTriggers: { success: false, fired: 0, durationMs: 0 },
        processReactionQueue: { success: false, processed: 0, durationMs: 0 },
        promoteInsights: { success: false, promoted: 0, durationMs: 0 },
        learnFromOutcomes: { success: false, lessons: 0, durationMs: 0 },
        recoverStaleSteps: { success: false, recovered: 0, durationMs: 0 },
        recoverStaleRoundtables: { success: false, recovered: 0, durationMs: 0 },
      },
      errors: [reason],
    };
  }

  /**
   * Get last run info
   */
  getStatus(): { lastRun: Date | null; isRunning: boolean } {
    return { lastRun: this.lastRun, isRunning: this.isRunning };
  }
}

// Singleton export
export const heartbeat = new Heartbeat();

// CLI runner
if (require.main === module) {
  console.log('Running heartbeat manually...');
  heartbeat.run()
    .then(result => {
      console.log('Heartbeat complete:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Heartbeat failed:', error);
      process.exit(1);
    });
}
