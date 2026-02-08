// Example usage of the event system and reaction matrix
// This demonstrates the complete flow from event emission to reaction processing

import { createEventSystem } from './index';

// Mock database and proposal service (in real implementation, these would be actual connections)
const mockDb = {
  // Mock knex-like interface
  async insert(data: any) {
    console.log('📝 DB Insert:', data);
    return [{ id: 'mock-id', ...data, created_at: new Date() }];
  },
  async where(conditions: any) {
    console.log('🔍 DB Query:', conditions);
    return this;
  },
  async first() {
    return { id: 'mock-event-id', kind: 'trade', title: 'Mock Event' };
  },
  async update(data: any) {
    console.log('🔄 DB Update:', data);
    return [1];
  },
  async select() {
    return this;
  },
  async count() {
    return this;
  },
  async groupBy() {
    return this;
  },
  async orderBy() {
    return this;
  },
  async limit() {
    return this;
  }
};

const mockProposalService = {
  async createProposal(proposal: any) {
    console.log('📋 Proposal Created:', proposal.title);
    return { id: 'mock-proposal-id', ...proposal };
  }
};

async function runExample() {
  console.log('🚀 Starting Event System Example\n');
  
  // Create the event system
  const { eventEmitter, queueProcessor } = createEventSystem(mockDb, mockProposalService);
  
  // ===== EXAMPLE 1: Big Loss Trade =====
  console.log('📉 EXAMPLE 1: Big Loss Trade');
  console.log('='.repeat(50));
  
  try {
    // Scout reports a big loss
    const lossEvent = await eventEmitter.emitTradeEvent(
      'scout',
      'trade_loss_001',
      'SOL Trade Closed at Big Loss',
      'Sold 10 SOL at $120 (-35% loss), stop loss hit',
      -0.35 // PnL = -35%
    );
    
    console.log(`\nEvent emitted: ${lossEvent.title}`);
    console.log(`Tags: ${lossEvent.tags.join(', ')}`);
    console.log(`→ Should trigger: SAGE diagnose (probability 1.0, cooldown 60min)`);
  } catch (error) {
    console.error('Error in example 1:', error);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // ===== EXAMPLE 2: High Confidence Signal =====
  console.log('📈 EXAMPLE 2: High Confidence Signal');
  console.log('='.repeat(50));
  
  try {
    // Intel finds a high confidence signal
    const signalEvent = await eventEmitter.emitSignalEvent(
      'intel',
      'Strong Accumulation: ARB',
      '5 whales bought 2M ARB in last hour, funding rate positive',
      0.85 // 85% confidence
    );
    
    console.log(`\nEvent emitted: ${signalEvent.title}`);
    console.log(`Tags: ${signalEvent.tags.join(', ')}`);
    console.log(`→ Should trigger: ATLAS evaluate (probability 0.8, cooldown 30min)`);
    console.log(`   (80% chance - might not trigger this time)`);
  } catch (error) {
    console.error('Error in example 2:', error);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // ===== EXAMPLE 3: Trade Execution =====
  console.log('⚡ EXAMPLE 3: Trade Execution');
  console.log('='.repeat(50));
  
  try {
    // Scout executes a trade
    const executionEvent = await eventEmitter.emitExecutionEvent(
      'scout',
      'Trade Executed: ETH',
      'Bought 5 ETH at $3,450 via Jupiter swap',
      { exchange: 'jupiter', slippage: '0.5%' }
    );
    
    console.log(`\nEvent emitted: ${executionEvent.title}`);
    console.log(`Tags: ${executionEvent.tags.join(', ')}`);
    console.log(`→ Should trigger: GROWTH analyze (probability 0.3, cooldown 120min)`);
    console.log(`   (30% chance - low probability makes it feel organic)`);
  } catch (error) {
    console.error('Error in example 3:', error);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // ===== EXAMPLE 4: Risk Warning =====
  console.log('⚠️  EXAMPLE 4: Risk Warning');
  console.log('='.repeat(50));
  
  try {
    // Sage detects high risk
    const riskEvent = await eventEmitter.emitRiskEvent(
      'sage',
      'Portfolio Correlation Alert',
      'BTC and ETH positions have 0.92 correlation, diversification low',
      'high'
    );
    
    console.log(`\nEvent emitted: ${riskEvent.title}`);
    console.log(`Tags: ${riskEvent.tags.join(', ')}`);
    console.log(`→ Should trigger: ATLAS review (probability 1.0, cooldown 15min)`);
  } catch (error) {
    console.error('Error in example 4:', error);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // ===== EXAMPLE 5: Insight Discovery =====
  console.log '💡 EXAMPLE 5: Insight Discovery';
  console.log('='.repeat(50));
  
  try {
    // Growth discovers a pattern
    const insightEvent = await eventEmitter.emitInsightEvent(
      'growth',
      'Weekend Volume Pattern',
      'Volume drops 60% on weekends, signal reliability decreases proportionally',
      'pattern'
    );
    
    console.log(`\nEvent emitted: ${insightEvent.title}`);
    console.log(`Tags: ${insightEvent.tags.join(', ')}`);
    console.log(`→ Should trigger: ATLAS propose_strategy (probability 0.6, cooldown 180min)`);
    console.log(`   (60% chance - insights often lead to strategy changes)`);
  } catch (error) {
    console.error('Error in example 5:', error);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // ===== EXAMPLE 6: Error/Rule Violation =====
  console.log('❌ EXAMPLE 6: Rule Violation');
  console.log('='.repeat(50));
  
  try {
    // Observer detects a rule violation
    const errorEvent = await eventEmitter.emitErrorEvent(
      'observer',
      'Daily Trade Limit Exceeded',
      'Attempted 9th trade today, limit is 8 trades',
      'rule_violation'
    );
    
    console.log(`\nEvent emitted: ${errorEvent.title}`);
    console.log(`Tags: ${errorEvent.tags.join(', ')}`);
    console.log(`→ Should trigger: ATLAS alert (probability 1.0, cooldown 5min)`);
  } catch (error) {
    console.error('Error in example 6:', error);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // ===== PROCESS REACTION QUEUE =====
  console.log('🔄 Processing Reaction Queue (Heartbeat)');
  console.log('='.repeat(50));
  
  try {
    // Simulate heartbeat processing
    const stats = await queueProcessor.processReactionQueue();
    
    console.log(`\nQueue Processing Results:`);
    console.log(`- Processed: ${stats.processed} reactions`);
    console.log(`- Failed: ${stats.failed} reactions`);
    console.log(`- Remaining: ${stats.remaining} in queue`);
    console.log(`- Duration: ${stats.durationMs}ms`);
    
    console.log('\nNote: With mock database, reactions are queued but not actually processed.');
    console.log('In production, this would create real proposals for agents.');
  } catch (error) {
    console.error('Error processing queue:', error);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Example Complete!');
  console.log('\nKey Takeaways:');
  console.log('1. Events with tags trigger pattern matching');
  console.log('2. Probability rolls create organic behavior (not every event triggers)');
  console.log('3. Cooldowns prevent spam (per source-target-type)');
  console.log('4. Queue processed every heartbeat (3000ms budget)');
  console.log('5. Creates emergent agent interactions');
}

// Run the example
runExample().catch(console.error);