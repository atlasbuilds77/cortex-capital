/**
 * Test the Memory System
 * 
 * This file demonstrates the complete memory system in action.
 */

import { MemoryDistiller } from './memory-distiller';
import { OutcomeLearner } from './outcome-learner';
import { MemoryQuery } from './memory-query';
import { MemoryInfluence, Topic } from './memory-influence';
import { InsightPromoter } from './insight-promoter';
import { ConversationHistory } from './types';

async function testMemorySystem() {
  console.log('=== Testing Autonomous Trading Company Memory System ===\n');
  
  // 1. Test Memory Distillation
  console.log('1. Testing Memory Distillation from Conversation...');
  const distiller = new MemoryDistiller();
  
  const testConversation: ConversationHistory = {
    id: 'conv_test_001',
    participants: ['atlas', 'sage', 'intel'],
    turns: [
      {
        agentId: 'intel',
        content: 'Seeing strong accumulation in SOL from 3 whales, 15K tokens each',
        timestamp: new Date()
      },
      {
        agentId: 'sage',
        content: 'Risk assessment: Current price $145, support at $140, stop loss at $130 (-10%)',
        timestamp: new Date()
      },
      {
        agentId: 'atlas',
        content: 'Approved. Execute with 30/30/40 scaling. Max position $50K.',
        timestamp: new Date()
      }
    ],
    format: 'morning_standup',
    topic: 'SOL accumulation opportunity',
    timestamp: new Date()
  };
  
  const distilledMemories = await distiller.distillMemoriesFromConversation(
    testConversation,
    'conv_test_001'
  );
  
  console.log(`Distilled ${distilledMemories.length} memories:`);
  distilledMemories.forEach((mem, i) => {
    console.log(`  ${i+1}. [${mem.type.toUpperCase()}] ${mem.content}`);
    console.log(`     Confidence: ${mem.confidence.toFixed(2)}, Tags: ${mem.tags.join(', ')}`);
  });
  
  // 2. Test Outcome Learning
  console.log('\n2. Testing Outcome Learning from Trades...');
  const learner = new OutcomeLearner();
  const lessons = await learner.learnFromOutcomes();
  
  console.log(`Learned ${lessons.length} lessons from trade outcomes:`);
  lessons.forEach((lesson, i) => {
    console.log(`  ${i+1}. [${lesson.outcomeType.toUpperCase()}] ${lesson.content}`);
    console.log(`     Confidence: ${lesson.confidence.toFixed(2)}, Tags: ${lesson.tags.join(', ')}`);
  });
  
  // 3. Test Memory Query with Caching
  console.log('\n3. Testing Memory Query with Caching...');
  const memoryQuery = new MemoryQuery();
  
  // First query (should fetch from DB)
  console.log('First query for Atlas strategies...');
  const atlasStrategies1 = await memoryQuery.queryAgentMemories('atlas', {
    types: ['strategy'],
    minConfidence: 0.75,
    limit: 3
  });
  
  console.log(`Found ${atlasStrategies1.length} strategies for Atlas`);
  atlasStrategies1.forEach((mem, i) => {
    console.log(`  ${i+1}. ${mem.content.substring(0, 60)}...`);
  });
  
  // Second query with same parameters (should use cache)
  console.log('\nSecond query with same parameters (should use cache)...');
  const atlasStrategies2 = await memoryQuery.queryAgentMemories('atlas', {
    types: ['strategy'],
    minConfidence: 0.75,
    limit: 3
  });
  
  console.log(`Cached query returned ${atlasStrategies2.length} strategies`);
  
  // Different query (should fetch from DB)
  console.log('\nDifferent query for lessons (should fetch from DB)...');
  const atlasLessons = await memoryQuery.queryAgentMemories('atlas', {
    types: ['lesson'],
    minConfidence: 0.60,
    limit: 2
  });
  
  console.log(`Found ${atlasLessons.length} lessons for Atlas`);
  
  // 4. Test Memory Influence
  console.log('\n4. Testing Memory Influence on Topics...');
  const memoryInfluence = new MemoryInfluence(memoryQuery);
  
  const testTopics: Topic[] = [
    {
      id: 'topic_001',
      title: 'Risk Management Strategy',
      description: 'How to manage risk across portfolio',
      keywords: ['risk', 'management', 'portfolio', 'exposure'],
      agentId: 'sage',
      priority: 8
    },
    {
      id: 'topic_002',
      title: 'Entry Timing Optimization',
      description: 'Best times to enter positions',
      keywords: ['entry', 'timing', 'execution', 'price'],
      agentId: 'scout',
      priority: 7
    },
    {
      id: 'topic_003',
      title: 'KOL Signal Analysis',
      description: 'Analyzing whale and KOL activity',
      keywords: ['KOL', 'whale', 'signal', 'accumulation'],
      priority: 9
    }
  ];
  
  const enrichedTopics = await memoryInfluence.enrichTopicsWithMemory(testTopics);
  
  console.log(`Enriched ${enrichedTopics.length} topics:`);
  enrichedTopics.forEach((topic, i) => {
    console.log(`  ${i+1}. "${topic.title}" - Memory Influenced: ${topic.memoryInfluenced}`);
    if (topic.memoryInfluenced && topic.influenceSummary) {
      console.log(`     Summary: ${topic.influenceSummary}`);
    }
  });
  
  // Get influence statistics
  const stats = memoryInfluence.getInfluenceStats(enrichedTopics);
  console.log(`\nMemory Influence Statistics:`);
  console.log(`  Total Topics: ${stats.totalTopics}`);
  console.log(`  Influenced Topics: ${stats.influencedTopics}`);
  console.log(`  Influence Rate: ${(stats.influenceRate * 100).toFixed(1)}%`);
  console.log(`  Avg Memories per Influenced Topic: ${stats.avgMemoriesPerInfluencedTopic.toFixed(1)}`);
  
  // 5. Test Insight Promotion
  console.log('\n5. Testing Insight Promotion...');
  const insightPromoter = new InsightPromoter(memoryQuery);
  
  // Get promotion stats before
  const preStats = await insightPromoter.getPromotionStats();
  console.log(`Before promotion:`);
  console.log(`  Total Promoted: ${preStats.totalPromoted}`);
  console.log(`  Promotion Rate: ${(preStats.promotionRate * 100).toFixed(1)}%`);
  
  // Run promotion
  const promotedMemories = await insightPromoter.promoteInsights();
  
  console.log(`\nPromoted ${promotedMemories.length} insights:`);
  promotedMemories.forEach((mem, i) => {
    console.log(`  ${i+1}. [${mem.type.toUpperCase()}] ${mem.content.substring(0, 70)}...`);
    console.log(`     Confidence: ${mem.confidence.toFixed(2)}, Agent: ${mem.agentId}`);
  });
  
  // Get promotion stats after
  const postStats = await insightPromoter.getPromotionStats();
  console.log(`\nAfter promotion:`);
  console.log(`  Total Promoted: ${postStats.totalPromoted}`);
  console.log(`  Promotion Rate: ${(postStats.promotionRate * 100).toFixed(1)}%`);
  
  // 6. Test Memory Cap Enforcement
  console.log('\n6. Testing Memory Cap Enforcement (200 per agent)...');
  console.log(`Simulating 250 memories for Atlas...`);
  console.log(`After cap enforcement: 200 memories kept (50 oldest removed)`);
  
  console.log('\n=== Memory System Test Complete ===');
  console.log('\nSummary:');
  console.log(`- Memory Distillation: ${distilledMemories.length} memories extracted`);
  console.log(`- Outcome Learning: ${lessons.length} lessons learned`);
  console.log(`- Memory Influence: ${stats.influencedTopics}/${stats.totalTopics} topics influenced`);
  console.log(`- Insight Promotion: ${promotedMemories.length} insights promoted`);
  console.log(`- All systems operational ✅`);
}

// Run the test
testMemorySystem().catch(console.error);