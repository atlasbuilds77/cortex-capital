// Main export file for the event system and reaction matrix
export * from './types';
export { EventEmitter } from './event-emitter';
export { ReactionMatrixManager } from './reaction-matrix-manager';
export { ReactionEvaluator } from './reaction-evaluator';
export { ReactionQueueProcessor } from './reaction-processor';
export { ReactionUtils } from './reaction-utils';

// Example usage and setup
export function createEventSystem(db: any, proposalService: any) {
  const matrixManager = new ReactionMatrixManager(db);
  const reactionEvaluator = new ReactionEvaluator(db);
  const eventEmitter = new EventEmitter(db, reactionEvaluator);
  const queueProcessor = new ReactionQueueProcessor(db, proposalService);
  
  return {
    matrixManager,
    reactionEvaluator,
    eventEmitter,
    queueProcessor
  };
}

// Example heartbeat integration
export async function runHeartbeatEventProcessing(
  db: any,
  proposalService: any
): Promise<{
  processed: number;
  failed: number;
  remaining: number;
  durationMs: number;
}> {
  const processor = new ReactionQueueProcessor(db, proposalService);
  return processor.processReactionQueue();
}