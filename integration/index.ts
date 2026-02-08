/**
 * Integration Module - Main Entry Point
 * Exports all integration components for use by workers and the dashboard
 */

export * from './config';
export * from './db-adapter';
export { Heartbeat, heartbeat } from './heartbeat';

// Re-export types
export type {
  Proposal,
  Mission,
  MissionStep,
  TradeOutcome,
  AgentMemory,
  AgentEvent,
  Position,
  AgentReaction,
} from './db-adapter';

// Quick start helper
export async function runHeartbeat() {
  const { heartbeat } = await import('./heartbeat');
  return heartbeat.run();
}

// Worker factory
export async function startWorker(type: 'crypto' | 'options' | 'futures') {
  switch (type) {
    case 'crypto':
      const { start: startCrypto } = await import('../workers/crypto-worker');
      return startCrypto();
    case 'options':
      const { start: startOptions } = await import('../workers/options-worker');
      return startOptions();
    case 'futures':
      const { start: startFutures } = await import('../workers/futures-worker');
      return startFutures();
    default:
      throw new Error(`Unknown worker type: ${type}`);
  }
}
