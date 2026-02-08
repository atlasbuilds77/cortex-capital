/**
 * Outcome Learner - Extracts lessons from trade outcomes
 * 
 * Features:
 * - Runs every heartbeat
 * - Fetches recent trade results (48 hours)
 * - Calculates median engagement/PnL as baseline
 * - Strong performers (>2x median) → write lesson (confidence 0.7)
 * - Weak performers (<0.3x median) → write lesson (confidence 0.6)
 * - Max 3 lessons per agent per day
 */

import { TradeOutcome, LessonFromOutcome, Memory } from './types';

export class OutcomeLearner {
  private readonly lookbackHours = 48;
  private readonly maxLessonsPerAgentPerDay = 3;
  private readonly strongPerformerThreshold = 2.0; // >2x median
  private readonly weakPerformerThreshold = 0.3; // <0.3x median
  private readonly strongLessonConfidence = 0.7;
  private readonly weakLessonConfidence = 0.6;

  /**
   * Learn from recent trade outcomes
   * @returns Array of lessons learned
   */
  async learnFromOutcomes(): Promise<LessonFromOutcome[]> {
    // Fetch recent trade outcomes
    const recentOutcomes = await this.fetchRecentTradeOutcomes(this.lookbackHours);
    
    if (recentOutcomes.length === 0) {
      console.log('No recent trade outcomes to learn from');
      return [];
    }
    
    // Group outcomes by agent
    const outcomesByAgent = this.groupOutcomesByAgent(recentOutcomes);
    
    // Extract lessons from each agent's outcomes
    const allLessons: LessonFromOutcome[] = [];
    
    for (const [agentId, outcomes] of Object.entries(outcomesByAgent)) {
      // Check daily lesson limit
      if (await this.hasReachedDailyLessonLimit(agentId)) {
        console.log(`Agent ${agentId} has reached daily lesson limit`);
        continue;
      }
      
      const agentLessons = this.extractLessonsFromAgentOutcomes(agentId, outcomes);
      allLessons.push(...agentLessons);
      
      // Update lesson count for agent
      await this.updateAgentLessonCount(agentId, agentLessons.length);
    }
    
    return allLessons;
  }

  /**
   * Fetch recent trade outcomes (mock implementation)
   */
  private async fetchRecentTradeOutcomes(lookbackHours: number): Promise<TradeOutcome[]> {
    // In production, this would query the database
    // For now, return simulated data
    
    const now = new Date();
    const outcomes: TradeOutcome[] = [];
    
    // Simulate some trade outcomes
    const agents = ['atlas', 'sage', 'scout', 'growth', 'intel', 'observer'];
    // const tokens = ['SOL', 'BTC', 'ETH', 'AVAX', 'NEAR'];
    
    for (let i = 0; i < 15; i++) {
      const hoursAgo = Math.random() * lookbackHours;
      const timestamp = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
      
      const pnlPct = (Math.random() - 0.3) * 2; // -30% to +170%
      const engagementScore = 0.3 + Math.random() * 0.7; // 0.3-1.0
      
      outcomes.push({
        tradeId: `trade_${Date.now()}_${i}`,
        agentId: agents[Math.floor(Math.random() * agents.length)],
        entryPrice: 100 + Math.random() * 900,
        exitPrice: 100 + Math.random() * 900,
        pnl: pnlPct * 1000,
        pnlPct,
        holdTime: 30 + Math.random() * 1440, // 30min to 24h
        outcomeType: pnlPct > 0 ? 'win' : pnlPct < 0 ? 'loss' : 'breakeven',
        engagementScore,
        timestamp
      });
    }
    
    return outcomes;
  }

  /**
   * Group outcomes by agent
   */
  private groupOutcomesByAgent(outcomes: TradeOutcome[]): Record<string, TradeOutcome[]> {
    const grouped: Record<string, TradeOutcome[]> = {};
    
    for (const outcome of outcomes) {
      if (!grouped[outcome.agentId]) {
        grouped[outcome.agentId] = [];
      }
      grouped[outcome.agentId].push(outcome);
    }
    
    return grouped;
  }

  /**
   * Extract lessons from an agent's outcomes
   */
  private extractLessonsFromAgentOutcomes(
    agentId: string,
    outcomes: TradeOutcome[]
  ): LessonFromOutcome[] {
    if (outcomes.length < 3) {
      console.log(`Agent ${agentId} has only ${outcomes.length} outcomes, need at least 3 for meaningful analysis`);
      return [];
    }
    
    // Calculate medians
    const medianPnlPct = this.calculateMedian(outcomes.map(o => o.pnlPct));
    const medianEngagement = this.calculateMedian(outcomes.map(o => o.engagementScore));
    
    console.log(`Agent ${agentId} - Median PnL%: ${medianPnlPct.toFixed(2)}, Median Engagement: ${medianEngagement.toFixed(2)}`);
    
    // Identify strong and weak performers
    const lessons: LessonFromOutcome[] = [];
    
    for (const outcome of outcomes) {
      // Calculate performance score (combine PnL and engagement)
      const pnlScore = outcome.pnlPct / medianPnlPct;
      const engagementScore = outcome.engagementScore / medianEngagement;
      const performanceScore = (pnlScore + engagementScore) / 2;
      
      if (performanceScore > this.strongPerformerThreshold) {
        // Strong performer - extract positive lesson
        const lesson = this.createLessonFromStrongPerformer(outcome, performanceScore);
        lessons.push(lesson);
        
        console.log(`Strong performer detected: Trade ${outcome.tradeId}, Score: ${performanceScore.toFixed(2)}`);
      } else if (performanceScore < this.weakPerformerThreshold) {
        // Weak performer - extract cautionary lesson
        const lesson = this.createLessonFromWeakPerformer(outcome, performanceScore);
        lessons.push(lesson);
        
        console.log(`Weak performer detected: Trade ${outcome.tradeId}, Score: ${performanceScore.toFixed(2)}`);
      }
      
      // Limit lessons per agent from this batch
      if (lessons.length >= this.maxLessonsPerAgentPerDay) {
        break;
      }
    }
    
    return lessons;
  }

  /**
   * Create lesson from strong performer
   */
  private createLessonFromStrongPerformer(
    outcome: TradeOutcome,
    _performanceScore: number
  ): LessonFromOutcome {
    const tags = ['strong-performer', 'best-practice'];
    
    // Generate lesson content based on outcome characteristics
    let content: string;
    
    if (outcome.engagementScore > 0.8) {
      content = `Active monitoring and management (engagement: ${(outcome.engagementScore * 100).toFixed(0)}%) leads to strong performance (+${(outcome.pnlPct * 100).toFixed(1)}% PnL)`;
      tags.push('active-management', 'monitoring');
    } else if (outcome.holdTime < 60) {
      content = `Quick trades (<1 hour) with precise timing can yield high returns (+${(outcome.pnlPct * 100).toFixed(1)}% in ${outcome.holdTime.toFixed(0)}min)`;
      tags.push('short-term', 'timing');
    } else {
      content = `This trade approach yielded +${(outcome.pnlPct * 100).toFixed(1)}% return with ${(outcome.engagementScore * 100).toFixed(0)}% engagement - worth repeating`;
      tags.push('repeatable', 'profitable');
    }
    
    return {
      content,
      confidence: this.strongLessonConfidence,
      tags,
      sourceTradeId: outcome.tradeId,
      outcomeType: 'strong'
    };
  }

  /**
   * Create lesson from weak performer
   */
  private createLessonFromWeakPerformer(
    outcome: TradeOutcome,
    _performanceScore: number
  ): LessonFromOutcome {
    const tags = ['weak-performer', 'caution'];
    
    // Generate lesson content based on outcome characteristics
    let content: string;
    
    if (outcome.pnlPct < -0.2) {
      content = `Large losses (-${(Math.abs(outcome.pnlPct) * 100).toFixed(1)}%) occurred with ${(outcome.engagementScore * 100).toFixed(0)}% engagement - need better risk controls`;
      tags.push('large-loss', 'risk-control');
    } else if (outcome.engagementScore < 0.4) {
      content = `Low engagement (${(outcome.engagementScore * 100).toFixed(0)}%) contributed to poor performance (${(outcome.pnlPct * 100).toFixed(1)}% PnL)`;
      tags.push('low-engagement', 'attention');
    } else if (outcome.holdTime > 720) {
      content = `Extended hold time (${(outcome.holdTime / 60).toFixed(1)} hours) didn't improve outcome (${(outcome.pnlPct * 100).toFixed(1)}% PnL)`;
      tags.push('long-hold', 'timing');
    } else {
      content = `This approach resulted in ${(outcome.pnlPct * 100).toFixed(1)}% return with ${(outcome.engagementScore * 100).toFixed(0)}% engagement - avoid similar setups`;
      tags.push('avoid', 'unprofitable');
    }
    
    return {
      content,
      confidence: this.weakLessonConfidence,
      tags,
      sourceTradeId: outcome.tradeId,
      outcomeType: 'weak'
    };
  }

  /**
   * Calculate median of array
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    } else {
      return sorted[middle];
    }
  }

  /**
   * Check if agent has reached daily lesson limit
   */
  private async hasReachedDailyLessonLimit(agentId: string): Promise<boolean> {
    // In production, this would check a database
    // For now, use simple in-memory tracking
    const dailyCounts = this.getDailyLessonCounts();
    const today = new Date().toDateString();
    const key = `${agentId}_${today}`;
    
    return (dailyCounts[key] || 0) >= this.maxLessonsPerAgentPerDay;
  }

  /**
   * Update agent's lesson count for today
   */
  private async updateAgentLessonCount(agentId: string, lessonCount: number): Promise<void> {
    const dailyCounts = this.getDailyLessonCounts();
    const today = new Date().toDateString();
    const key = `${agentId}_${today}`;
    
    dailyCounts[key] = (dailyCounts[key] || 0) + lessonCount;
  }

  /**
   * Get daily lesson counts (mock implementation)
   */
  private getDailyLessonCounts(): Record<string, number> {
    if (!(global as any).dailyLessonCounts) {
      (global as any).dailyLessonCounts = {};
    }
    return (global as any).dailyLessonCounts;
  }

  /**
   * Convert lessons to database-ready Memory objects
   */
  convertLessonsToMemoryObjects(lessons: LessonFromOutcome[], agentId: string): Memory[] {
    const now = new Date();
    
    return lessons.map((lesson, index) => ({
      id: `lesson_${lesson.sourceTradeId}_${Date.now()}_${index}`,
      agentId,
      type: 'lesson',
      content: lesson.content,
      confidence: lesson.confidence,
      tags: lesson.tags,
      sourceTraceId: lesson.sourceTradeId,
      createdAt: now,
      upvotes: 0,
      downvotes: 0,
      promoted: false,
      lastAccessedAt: now
    }));
  }
}