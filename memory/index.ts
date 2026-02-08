/**
 * Memory System & Learning Module
 * Main entry point - exports all components
 */

// Core components
export { MemoryDistiller } from './memory-distiller';
export { OutcomeLearner } from './outcome-learner';
export { MemoryQuery } from './memory-query';
export { MemoryInfluence } from './memory-influence';
export { InsightPromoter } from './insight-promoter';

// Types
export * from './types';

// Re-export Topic from memory-influence
export type { Topic, EnrichedTopic } from './memory-influence';

/**
 * Quick Start Example:
 * 
 * ```typescript
 * import { 
 *   MemoryDistiller, 
 *   OutcomeLearner, 
 *   MemoryQuery,
 *   MemoryInfluence,
 *   InsightPromoter 
 * } from './memory';
 * 
 * // Initialize
 * const distiller = new MemoryDistiller();
 * const learner = new OutcomeLearner();
 * const memoryQuery = new MemoryQuery();
 * const influence = new MemoryInfluence(memoryQuery);
 * const promoter = new InsightPromoter(memoryQuery);
 * 
 * // Use in heartbeat loop
 * async function heartbeat() {
 *   const lessons = await learner.learnFromOutcomes();
 *   const promoted = await promoter.promoteInsights();
 *   return { lessons, promoted };
 * }
 * ```
 */