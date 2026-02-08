/**
 * Memory Influence - Enriches topics with relevant memories
 * 
 * Features:
 * - enrichTopicWithMemory() - 30% chance
 * - Scan memory keywords vs available topics
 * - Return matched topic + memoryInfluenced flag
 */

import { Memory, MemoryQuery } from './memory-query';
import { MemoryType } from './types';

export interface Topic {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  agentId?: string;
  priority: number; // 1-10
}

export interface EnrichedTopic extends Topic {
  memoryInfluenced: boolean;
  influencingMemories?: Memory[];
  influenceSummary?: string;
}

export class MemoryInfluence {
  private readonly influenceProbability = 0.30; // 30% chance
  private readonly minConfidenceForInfluence = 0.60;
  private memoryQuery: MemoryQuery;

  constructor(memoryQuery: MemoryQuery) {
    this.memoryQuery = memoryQuery;
  }

  /**
   * Enrich a topic with relevant memories (30% chance)
   */
  async enrichTopicWithMemory(topic: Topic): Promise<EnrichedTopic> {
    // Check probability
    if (Math.random() > this.influenceProbability) {
      console.log(`Topic "${topic.title}" not influenced by memory (probability check)`);
      return {
        ...topic,
        memoryInfluenced: false
      };
    }

    // Fetch relevant memories for the agent (if specified) or all agents
    const memories = await this.fetchRelevantMemories(topic);
    
    if (memories.length === 0) {
      console.log(`No relevant memories found for topic "${topic.title}"`);
      return {
        ...topic,
        memoryInfluenced: false
      };
    }

    // Select the most relevant memories
    const influencingMemories = this.selectMostRelevantMemories(memories, topic);
    
    if (influencingMemories.length === 0) {
      return {
        ...topic,
        memoryInfluenced: false
      };
    }

    // Generate influence summary
    const influenceSummary = this.generateInfluenceSummary(influencingMemories, topic);
    
    console.log(`Topic "${topic.title}" enriched with ${influencingMemories.length} memories`);
    
    return {
      ...topic,
      memoryInfluenced: true,
      influencingMemories,
      influenceSummary
    };
  }

  /**
   * Fetch memories relevant to the topic
   */
  private async fetchRelevantMemories(topic: Topic): Promise<Memory[]> {
    const queryOptions = {
      minConfidence: this.minConfidenceForInfluence,
      types: ['strategy', 'lesson', 'pattern'] as MemoryType[], // Most relevant types for influence
      limit: 20
    };

    if (topic.agentId) {
      // Fetch memories for specific agent
      return await this.memoryQuery.queryAgentMemories(topic.agentId, queryOptions);
    } else {
      // Fetch memories from all agents
      const allAgents = ['atlas', 'sage', 'scout', 'growth', 'intel', 'observer'];
      const allMemories: Memory[] = [];
      
      for (const agentId of allAgents) {
        const agentMemories = await this.memoryQuery.queryAgentMemories(agentId, queryOptions);
        allMemories.push(...agentMemories);
      }
      
      return allMemories;
    }
  }

  /**
   * Select the most relevant memories for the topic
   */
  private selectMostRelevantMemories(memories: Memory[], topic: Topic): Memory[] {
    // Calculate relevance score for each memory
    const scoredMemories = memories.map(memory => ({
      memory,
      score: this.calculateRelevanceScore(memory, topic)
    }));
    
    // Filter by minimum relevance score
    const relevantMemories = scoredMemories.filter(item => item.score > 0.3);
    
    // Sort by relevance score (highest first)
    relevantMemories.sort((a, b) => b.score - a.score);
    
    // Take top 3 most relevant memories
    const topMemories = relevantMemories.slice(0, 3).map(item => item.memory);
    
    return topMemories;
  }

  /**
   * Calculate relevance score between memory and topic
   */
  private calculateRelevanceScore(memory: Memory, topic: Topic): number {
    let score = 0;
    
    // 1. Check keyword matches in memory content
    const memoryText = memory.content.toLowerCase();
    const topicKeywords = topic.keywords.map(kw => kw.toLowerCase());
    
    let keywordMatches = 0;
    for (const keyword of topicKeywords) {
      if (memoryText.includes(keyword)) {
        keywordMatches++;
      }
    }
    
    score += (keywordMatches / topicKeywords.length) * 0.5;
    
    // 2. Check tag matches
    const memoryTags = memory.tags.map((tag: string) => tag.toLowerCase());
    let tagMatches = 0;
    for (const keyword of topicKeywords) {
      if (memoryTags.includes(keyword)) {
        tagMatches++;
      }
    }
    
    score += (tagMatches / topicKeywords.length) * 0.3;
    
    // 3. Boost score based on memory confidence
    score += memory.confidence * 0.2;
    
    // 4. Boost score for promoted memories
    if (memory.promoted) {
      score += 0.1;
    }
    
    // 5. Penalize old memories (beyond 30 days)
    const memoryAgeDays = (Date.now() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (memoryAgeDays > 30) {
      score *= 0.7; // 30% penalty for old memories
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Generate a summary of how memories influence the topic
   */
  private generateInfluenceSummary(memories: Memory[], _topic: Topic): string {
    if (memories.length === 0) {
      return 'No memory influence';
    }
    
    const memoryTypes = memories.map(m => m.type);
    const uniqueTypes = [...new Set(memoryTypes)];
    
    const typeDescriptions: Record<string, string> = {
      strategy: 'strategic approaches',
      lesson: 'lessons learned',
      pattern: 'observed patterns',
      insight: 'key insights',
      preference: 'operational preferences'
    };
    
    const typesText = uniqueTypes.map(type => typeDescriptions[type] || type).join(' and ');
    
    // Extract key themes from memories
    const themes = this.extractCommonThemes(memories);
    
    let summary = `This topic is influenced by ${typesText} from past experience. `;
    
    if (themes.length > 0) {
      summary += `Key themes include: ${themes.join(', ')}. `;
    }
    
    // Add specific influence based on memory count
    if (memories.length === 1) {
      summary += `One strong memory suggests: "${memories[0].content.substring(0, 100)}..."`;
    } else {
      summary += `${memories.length} relevant memories provide context and guidance.`;
    }
    
    return summary;
  }

  /**
   * Extract common themes from a set of memories
   */
  private extractCommonThemes(memories: Memory[]): string[] {
    const themeFrequency: Record<string, number> = {};
    
    // Common trading themes to look for
    const commonThemes = [
      'risk management', 'entry timing', 'exit strategy', 'position sizing',
      'market timing', 'volatility', 'momentum', 'trend following',
      'mean reversion', 'breakout', 'support resistance', 'volume analysis'
    ];
    
    // Check each memory for themes
    for (const memory of memories) {
      const memoryText = memory.content.toLowerCase();
      
      for (const theme of commonThemes) {
        if (memoryText.includes(theme.toLowerCase())) {
          themeFrequency[theme] = (themeFrequency[theme] || 0) + 1;
        }
      }
      
      // Also check tags
      for (const tag of memory.tags) {
        const tagLower = tag.toLowerCase();
        for (const theme of commonThemes) {
          if (tagLower.includes(theme.toLowerCase()) || theme.toLowerCase().includes(tagLower)) {
            themeFrequency[theme] = (themeFrequency[theme] || 0) + 1;
          }
        }
      }
    }
    
    // Return themes that appear in at least 2 memories
    return Object.entries(themeFrequency)
      .filter(([_, count]) => count >= 2)
      .map(([theme, _]) => theme)
      .slice(0, 5); // Max 5 themes
  }

  /**
   * Batch enrich multiple topics
   */
  async enrichTopicsWithMemory(topics: Topic[]): Promise<EnrichedTopic[]> {
    const enrichedTopics: EnrichedTopic[] = [];
    
    for (const topic of topics) {
      const enriched = await this.enrichTopicWithMemory(topic);
      enrichedTopics.push(enriched);
    }
    
    // Calculate statistics
    const influencedCount = enrichedTopics.filter(t => t.memoryInfluenced).length;
    const influenceRate = influencedCount / enrichedTopics.length;
    
    console.log(`Memory influence applied to ${topics.length} topics: ${influencedCount} influenced (${(influenceRate * 100).toFixed(1)}%)`);
    
    return enrichedTopics;
  }

  /**
   * Get influence statistics
   */
  getInfluenceStats(topics: EnrichedTopic[]): {
    totalTopics: number;
    influencedTopics: number;
    influenceRate: number;
    avgMemoriesPerInfluencedTopic: number;
  } {
    const influencedTopics = topics.filter(t => t.memoryInfluenced);
    const totalMemories = influencedTopics.reduce(
      (sum, topic) => sum + (topic.influencingMemories?.length || 0), 
      0
    );
    
    return {
      totalTopics: topics.length,
      influencedTopics: influencedTopics.length,
      influenceRate: influencedTopics.length / topics.length,
      avgMemoriesPerInfluencedTopic: influencedTopics.length > 0 
        ? totalMemories / influencedTopics.length 
        : 0
    };
  }
}