/**
 * Example Usage of Roundtable Conversation System
 * 
 * Demonstrates:
 * 1. Sample conversation output (6-8 turns)
 * 2. Speaker selection weight calculation
 * 3. Relationship drift application logic
 */

import { ConversationOrchestrator, ConversationSession } from './orchestrator';
import { calculateSpeakerWeights } from './speaker-selection';
import { analyzeConversation, calculateRelationshipDrift } from './relationship-drift';

// Mock LLM provider for example
const mockLLMProvider = async (prompt: string, temperature: number): Promise<string> => {
  // Simulate different responses based on speaker detected in prompt
  if (prompt.includes('ATLAS')) {
    const responses = [
      "Market looks volatile. What's our edge today?",
      "Agree. Need strict risk management.",
      "Let's focus on high-probability setups only.",
      "Position sizing is critical here."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  } else if (prompt.includes('SAGE')) {
    const responses = [
      "Exposure already high. Need stop-losses.",
      "Probability favors caution today.",
      "Max drawdown scenario: -15% if wrong.",
      "Risk-reward doesn't justify aggression."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  } else if (prompt.includes('INTEL')) {
    const responses = [
      "Seeing whale accumulation in SOL.",
      "Signal detected: oversold bounce likely.",
      "Opportunity alert: BTC showing strength.",
      "Market scan shows bullish divergence."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  } else if (prompt.includes('SCOUT')) {
    const responses = [
      "Ready to execute. Watching for fills.",
      "Position updated: size 100 at $45.20.",
      "Execution complete, minimal slippage.",
      "Market data confirms entry levels."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  return "Analyzing the situation...";
};

// Mock providers
const mockProviders = {
  llmProvider: mockLLMProvider,
  memoryProvider: async () => [],
  relationshipProvider: async () => ({
    atlas: { sage: 0.80, intel: 0.35, scout: 0.60 },
    sage: { atlas: 0.80, intel: 0.30, scout: 0.50 },
    intel: { atlas: 0.35, sage: 0.30, scout: 0.75 },
    scout: { atlas: 0.60, sage: 0.50, intel: 0.75 }
  }),
  relationshipUpdater: async () => {},
  memoryDistiller: async () => {},
  eventEmitter: async () => {}
};

async function runExample() {
  console.log('=== AUTONOMOUS TRADING COMPANY - ROUNDTABLE EXAMPLE ===\n');
  
  // 1. Create orchestrator
  const orchestrator = new ConversationOrchestrator({
    maxResponseLength: 120,
    minTurnDelayMs: 100, // Faster for example
    maxTurnDelayMs: 300,
    ...mockProviders
  });
  
  // 2. Create a morning standup session
  const session = ConversationOrchestrator.createSession(
    'morning_standup',
    ['atlas', 'sage', 'intel', 'scout'],
    'Market volatility and opportunity assessment'
  );
  
  console.log('1. SAMPLE CONVERSATION OUTPUT (6 turns)\n');
  console.log(`Format: Morning Standup`);
  console.log(`Participants: ${session.participants.join(', ')}`);
  console.log(`Topic: ${session.topic}\n`);
  
  // 3. Simulate a conversation (6 turns)
  const relationships = await mockProviders.relationshipProvider();
  
  for (let turn = 1; turn <= 6; turn++) {
    // Simulate speaker selection
    const context = {
      participants: session.participants,
      history: session.history.map(h => ({
        speaker: h.speaker,
        turn: h.turn,
        timestamp: h.timestamp
      })),
      relationships,
      currentTurn: turn
    };
    
    // Calculate weights for this turn
    const weights = calculateSpeakerWeights(context);
    
    // Select speaker (simplified - using highest weight for example)
    const speaker = weights.reduce((prev, current) => 
      prev.weight > current.weight ? prev : current
    ).agentId;
    
    // Generate mock response
    const response = await mockLLMProvider(
      `${speaker.toUpperCase()}: ${session.topic}`,
      0.6
    );
    
    // Add to history
    session.history.push({
      speaker,
      message: response,
      turn,
      timestamp: Date.now()
    });
    
    // Display turn
    console.log(`Turn ${turn} (${speaker.toUpperCase()}): ${response}`);
    
    // Show weights for this turn
    console.log(`  Weights: ${weights.map(w => 
      `${w.agentId}:${w.weight.toFixed(3)}`
    ).join(', ')}`);
  }
  
  console.log('\n2. SPEAKER SELECTION WEIGHT CALCULATION\n');
  
  // Show detailed weight calculation for last turn
  const lastContext = {
    participants: session.participants,
    history: session.history.map(h => ({
      speaker: h.speaker,
      turn: h.turn,
      timestamp: h.timestamp
    })),
    relationships,
    currentTurn: 7 // Next turn
  };
  
  const lastWeights = calculateSpeakerWeights(lastContext);
  
  lastWeights.forEach(weight => {
    console.log(`${weight.agentId.toUpperCase()}:`);
    console.log(`  Total weight: ${weight.weight.toFixed(3)}`);
    console.log(`  Components:`);
    console.log(`    Affinity: ${weight.components.affinity.toFixed(3)}`);
    console.log(`    Recency: ${weight.components.recency.toFixed(3)}`);
    console.log(`    Jitter: ${weight.components.jitter.toFixed(3)}`);
    
    // Explain recency calculation
    const lastSpokeTurn = session.history
      .filter(h => h.speaker === weight.agentId)
      .map(h => h.turn)
      .sort((a, b) => b - a)[0] || 0;
    
    const turnsSince = 7 - lastSpokeTurn;
    console.log(`    Last spoke: turn ${lastSpokeTurn} (${turnsSince} turns ago)`);
    console.log();
  });
  
  console.log('3. RELATIONSHIP DRIFT APPLICATION LOGIC\n');
  
  // Analyze conversation for relationship drift
  const analysis = analyzeConversation(session.history);
  const updates = calculateRelationshipDrift(analysis, relationships);
  
  console.log('Conversation Analysis:');
  console.log(`  Participants: ${analysis.participants.join(', ')}`);
  console.log(`  Interactions: ${analysis.interactions.length}`);
  console.log(`  Sentiment Score: ${analysis.sentimentScore.toFixed(3)}`);
  
  console.log('\nRelationship Updates (capped at ±0.03):');
  
  updates.forEach(update => {
    console.log(`  ${update.agentA.toUpperCase()} ↔ ${update.agentB.toUpperCase()}:`);
    console.log(`    Old: ${update.oldAffinity.toFixed(3)}`);
    console.log(`    New: ${update.newAffinity.toFixed(3)}`);
    console.log(`    Delta: ${update.delta > 0 ? '+' : ''}${update.delta.toFixed(3)}`);
    console.log(`    Reason: ${update.reason}`);
    console.log();
  });
  
  // Show interaction analysis
  console.log('Interaction Analysis:');
  analysis.interactions.forEach(interaction => {
    console.log(`  Turn ${interaction.turnNumber}: ${interaction.agentA} → ${interaction.agentB}`);
    console.log(`    Type: ${interaction.interactionType}, Strength: ${interaction.strength.toFixed(2)}`);
  });
  
  console.log('\n=== EXAMPLE COMPLETE ===');
  
  // Summary
  console.log('\nSUMMARY:');
  console.log(`- Conversation: ${session.history.length} turns`);
  console.log(`- Speakers: ${Array.from(new Set(session.history.map(h => h.speaker))).join(', ')}`);
  console.log(`- Relationship changes: ${updates.length} pairs updated`);
  console.log(`- Max drift applied: ${Math.max(...updates.map(u => Math.abs(u.delta))).toFixed(3)}`);
}

// Run the example
runExample().catch(console.error);