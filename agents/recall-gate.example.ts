// RecallGate Usage Examples
// How to integrate memory/recall into Cortex Capital agents

import { recallGate } from './recall-gate';

// ========== EXAMPLE 1: Before Agent Speaks ==========
// Call recall() to get relevant memories, inject into prompt

async function agentSpeaks(agentName: string, context: string) {
  // 1. Recall relevant memories
  const memories = recallGate.recall(agentName, context);

  // 2. Build context injection
  const memoryContext = `
[AGENT MEMORY - ${agentName}]
Win Rate: ${memories.stats.winRate.toFixed(1)}% (${memories.stats.totalTrades} total trades, ${memories.stats.recentPerformance})

Recent Relevant Trades:
${memories.relevantTrades.map(t => 
  `- ${t.date} ${t.symbol} ${t.direction.toUpperCase()} → ${t.outcome || 'pending'} (${t.confidence}% confident)`
).join('\n')}

Key Insights:
${memories.relevantInsights.map(i => `- ${i.content}`).join('\n')}

Best Setups:
${memories.bestSetups.map(s => 
  `- ${s.pattern} (${(s.winRate * 100).toFixed(1)}% win rate, ${s.count} trades)`
).join('\n')}

[END MEMORY - Tokens: ~${memories.estimatedTokens}]
`;

  // 3. Inject into agent prompt
  const fullPrompt = `${memoryContext}\n\nCurrent Context: ${context}`;

  // 4. Agent processes with memory context
  console.log('Agent prompt with memory:', fullPrompt);
  
  // ... rest of agent logic
}

// ========== EXAMPLE 2: After Trade Outcome ==========
// Store trade calls and outcomes

function recordTradeOutcome(agentName: string, symbol: string, direction: 'long' | 'short', outcome: 'win' | 'loss', confidence: number) {
  recallGate.remember(agentName, {
    tradeCall: {
      date: new Date().toISOString(),
      symbol,
      direction,
      outcome,
      confidence,
      reasoning: 'Breakout above resistance with strong volume', // captured from agent's original call
    },
  });

  console.log(`[RecallGate] Stored ${outcome} for ${agentName} on ${symbol}`);
}

// ========== EXAMPLE 3: Store Insights ==========
// When an agent learns something important

function agentLearns(agentName: string, insight: string, source: string) {
  recallGate.remember(agentName, {
    insight: {
      date: new Date().toISOString(),
      content: insight,
      source,
    },
  });

  console.log(`[RecallGate] ${agentName} learned: ${insight}`);
}

// ========== EXAMPLE 4: After Collaborative Discussion ==========
// Store discussion summaries

function recordDiscussion(participants: string[], topic: string, keyPoints: string[]) {
  const summary = {
    date: new Date().toISOString(),
    topic,
    participants,
    keyPoints,
  };

  // Store for all participants
  participants.forEach(agent => {
    recallGate.remember(agent, { discussion: summary });
  });

  console.log(`[RecallGate] Stored discussion for ${participants.join(', ')}`);
}

// ========== EXAMPLE 5: Daily Summary ==========
// Get end-of-day summary for an agent

function printDailySummary(agentName: string) {
  const summary = recallGate.summarizeDay(agentName);
  console.log(summary);
}

// ========== EXAMPLE 6: Agent Stats ==========
// Get overall performance stats

function printAgentStats(agentName: string) {
  const stats = recallGate.getAgentStats(agentName);
  
  console.log(`
${agentName} Stats:
- Win Rate: ${stats.winRatePct.toFixed(1)}% (${stats.winRate.wins}W ${stats.winRate.losses}L)
- Total Insights: ${stats.totalInsights}
- Recent Discussions: ${stats.recentDiscussions.length}

Top Setups:
${stats.bestSetups.map(s => 
  `  - ${s.pattern.substring(0, 60)} (${(s.winRate * 100).toFixed(1)}% WR, ${s.count}x)`
).join('\n')}
  `);
}

// ========== FULL WORKFLOW EXAMPLE ==========

async function fullWorkflowExample() {
  const agentName = 'strategist';
  
  // 1. Before agent speaks - recall relevant memories
  const context = 'SPY showing bullish divergence on RSI, what do you think?';
  const memories = recallGate.recall(agentName, context);
  
  console.log(`Recalled ${memories.relevantTrades.length} trades, ${memories.relevantInsights.length} insights`);
  
  // 2. Agent makes a call (simulated)
  const tradeCall = {
    date: new Date().toISOString(),
    symbol: 'SPY',
    direction: 'long' as const,
    outcome: 'pending' as const,
    confidence: 75,
    reasoning: 'Bullish divergence on RSI with volume confirmation',
  };
  
  recallGate.remember(agentName, { tradeCall });
  
  // 3. Later, outcome is known
  recallGate.remember(agentName, {
    tradeCall: {
      ...tradeCall,
      outcome: 'win',
    },
  });
  
  // 4. Agent learns something
  recallGate.remember(agentName, {
    insight: {
      date: new Date().toISOString(),
      content: 'RSI divergence + volume confirmation = high probability setup',
      source: 'trade_result',
    },
  });
  
  // 5. Print stats
  printAgentStats(agentName);
  
  // 6. Daily summary
  printDailySummary(agentName);
}

// Run example
// fullWorkflowExample();
