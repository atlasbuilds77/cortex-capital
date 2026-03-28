// Cortex Capital - RecallGate
// Agent Memory & Context Injection System
// Each agent maintains persistent memory, learns from outcomes, and recalls relevant context

import fs from 'fs';
import path from 'path';

const MEMORY_DIR = path.join(__dirname, 'data', 'memory');
const MAX_RECALL_TOKENS = 500; // ~375 words max for context injection

export interface TradeCall {
  date: string;
  symbol: string;
  direction: 'long' | 'short' | 'neutral';
  outcome?: 'win' | 'loss' | 'pending';
  confidence: number; // 0-100
  reasoning?: string;
}

export interface Insight {
  date: string;
  content: string;
  source: string; // 'discussion', 'trade_result', 'market_event'
}

export interface WinRate {
  total: number;
  wins: number;
  losses: number;
}

export interface BestSetup {
  pattern: string;
  winRate: number;
  count: number;
}

export interface DiscussionSummary {
  date: string;
  topic: string;
  participants: string[];
  keyPoints: string[];
}

export interface AgentMemory {
  tradeCalls: TradeCall[];
  insights: Insight[];
  winRate: WinRate;
  bestSetups: BestSetup[];
  lastNDiscussions: DiscussionSummary[];
}

export interface RecallResult {
  relevantTrades: TradeCall[];
  relevantInsights: Insight[];
  stats: {
    winRate: number;
    totalTrades: number;
    recentPerformance: string;
  };
  bestSetups: BestSetup[];
  estimatedTokens: number;
}

class RecallGate {
  private memoryCache: Map<string, AgentMemory> = new Map();

  constructor() {
    this.ensureMemoryDir();
  }

  private ensureMemoryDir(): void {
    if (!fs.existsSync(MEMORY_DIR)) {
      fs.mkdirSync(MEMORY_DIR, { recursive: true });
    }
  }

  private getMemoryPath(agentName: string): string {
    return path.join(MEMORY_DIR, `${agentName.toLowerCase()}.json`);
  }

  private loadMemory(agentName: string): AgentMemory {
    // Check cache first
    if (this.memoryCache.has(agentName)) {
      return this.memoryCache.get(agentName)!;
    }

    const memoryPath = this.getMemoryPath(agentName);
    
    // Initialize empty memory if file doesn't exist
    if (!fs.existsSync(memoryPath)) {
      const emptyMemory: AgentMemory = {
        tradeCalls: [],
        insights: [],
        winRate: { total: 0, wins: 0, losses: 0 },
        bestSetups: [],
        lastNDiscussions: [],
      };
      this.saveMemory(agentName, emptyMemory);
      return emptyMemory;
    }

    try {
      const data = fs.readFileSync(memoryPath, 'utf-8');
      const memory = JSON.parse(data) as AgentMemory;
      this.memoryCache.set(agentName, memory);
      return memory;
    } catch (error) {
      console.error(`[RecallGate] Failed to load memory for ${agentName}:`, error);
      // Return empty memory on error
      const emptyMemory: AgentMemory = {
        tradeCalls: [],
        insights: [],
        winRate: { total: 0, wins: 0, losses: 0 },
        bestSetups: [],
        lastNDiscussions: [],
      };
      return emptyMemory;
    }
  }

  private saveMemory(agentName: string, memory: AgentMemory): void {
    const memoryPath = this.getMemoryPath(agentName);
    try {
      fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2), 'utf-8');
      this.memoryCache.set(agentName, memory);
    } catch (error) {
      console.error(`[RecallGate] Failed to save memory for ${agentName}:`, error);
    }
  }

  /**
   * Recall relevant memories for the current context
   * Called BEFORE an agent speaks to inject context into their prompt
   */
  recall(agentName: string, context: string): RecallResult {
    const memory = this.loadMemory(agentName);
    const keywords = this.extractKeywords(context);

    // Find relevant trades (recent + keyword matches)
    const relevantTrades = memory.tradeCalls
      .filter(trade => {
        // Always include pending trades
        if (trade.outcome === 'pending') return true;
        
        // Include if symbol matches context
        if (keywords.some(kw => trade.symbol.toLowerCase().includes(kw))) return true;
        
        // Include if reasoning matches keywords
        if (trade.reasoning && keywords.some(kw => 
          trade.reasoning!.toLowerCase().includes(kw)
        )) return true;

        return false;
      })
      .slice(-10); // Last 10 relevant trades

    // Find relevant insights (keyword matches)
    const relevantInsights = memory.insights
      .filter(insight => 
        keywords.some(kw => insight.content.toLowerCase().includes(kw))
      )
      .slice(-5); // Last 5 relevant insights

    // Calculate stats
    const winRatePct = memory.winRate.total > 0 
      ? (memory.winRate.wins / memory.winRate.total) * 100 
      : 0;

    const recentTrades = memory.tradeCalls.slice(-10);
    const recentWins = recentTrades.filter(t => t.outcome === 'win').length;
    const recentTotal = recentTrades.filter(t => t.outcome !== 'pending').length;
    const recentPerformance = recentTotal > 0
      ? `${recentWins}/${recentTotal} recent`
      : 'no recent trades';

    // Estimate tokens (rough: ~4 chars per token)
    const estimatedTokens = this.estimateTokens({
      relevantTrades,
      relevantInsights,
      stats: { winRate: winRatePct, totalTrades: memory.winRate.total, recentPerformance },
      bestSetups: memory.bestSetups.slice(0, 3),
      estimatedTokens: 0,
    });

    // Trim if over budget
    let result: RecallResult = {
      relevantTrades,
      relevantInsights,
      stats: {
        winRate: winRatePct,
        totalTrades: memory.winRate.total,
        recentPerformance,
      },
      bestSetups: memory.bestSetups.slice(0, 3),
      estimatedTokens,
    };

    if (estimatedTokens > MAX_RECALL_TOKENS) {
      result = this.trimToTokenBudget(result);
    }

    return result;
  }

  /**
   * Store a new memory for an agent
   */
  remember(agentName: string, memory: {
    tradeCall?: TradeCall;
    insight?: Insight;
    discussion?: DiscussionSummary;
  }): void {
    const agentMemory = this.loadMemory(agentName);

    if (memory.tradeCall) {
      agentMemory.tradeCalls.push(memory.tradeCall);
      
      // Update win rate if outcome is known
      if (memory.tradeCall.outcome === 'win') {
        agentMemory.winRate.total++;
        agentMemory.winRate.wins++;
      } else if (memory.tradeCall.outcome === 'loss') {
        agentMemory.winRate.total++;
        agentMemory.winRate.losses++;
      }

      // Update best setups
      if (memory.tradeCall.reasoning && memory.tradeCall.outcome !== 'pending') {
        this.updateBestSetups(agentMemory, memory.tradeCall);
      }
    }

    if (memory.insight) {
      agentMemory.insights.push(memory.insight);
    }

    if (memory.discussion) {
      agentMemory.lastNDiscussions.unshift(memory.discussion);
      agentMemory.lastNDiscussions = agentMemory.lastNDiscussions.slice(0, 5);
    }

    this.saveMemory(agentName, agentMemory);
  }

  /**
   * Get agent stats (win rate, best setups, etc)
   */
  getAgentStats(agentName: string): {
    winRate: WinRate;
    winRatePct: number;
    bestSetups: BestSetup[];
    totalInsights: number;
    recentDiscussions: DiscussionSummary[];
  } {
    const memory = this.loadMemory(agentName);
    const winRatePct = memory.winRate.total > 0
      ? (memory.winRate.wins / memory.winRate.total) * 100
      : 0;

    return {
      winRate: memory.winRate,
      winRatePct,
      bestSetups: memory.bestSetups,
      totalInsights: memory.insights.length,
      recentDiscussions: memory.lastNDiscussions,
    };
  }

  /**
   * Summarize today's activity for an agent
   */
  summarizeDay(agentName: string): string {
    const memory = this.loadMemory(agentName);
    const today = new Date().toISOString().split('T')[0];

    const todayTrades = memory.tradeCalls.filter(t => t.date.startsWith(today));
    const todayInsights = memory.insights.filter(i => i.date.startsWith(today));
    const todayDiscussions = memory.lastNDiscussions.filter(d => d.date.startsWith(today));

    const wins = todayTrades.filter(t => t.outcome === 'win').length;
    const losses = todayTrades.filter(t => t.outcome === 'loss').length;
    const pending = todayTrades.filter(t => t.outcome === 'pending').length;

    let summary = `📊 ${agentName} - ${today}\n\n`;
    summary += `Trades: ${todayTrades.length} (${wins}W ${losses}L ${pending}P)\n`;
    summary += `Insights: ${todayInsights.length}\n`;
    summary += `Discussions: ${todayDiscussions.length}\n`;

    if (todayTrades.length > 0) {
      summary += `\nTrade Calls:\n`;
      todayTrades.forEach(t => {
        const outcome = t.outcome === 'pending' ? '⏳' : t.outcome === 'win' ? '✅' : '❌';
        summary += `  ${outcome} ${t.symbol} ${t.direction.toUpperCase()} (${t.confidence}% confident)\n`;
      });
    }

    if (todayInsights.length > 0) {
      summary += `\nKey Insights:\n`;
      todayInsights.forEach(i => {
        summary += `  • ${i.content.substring(0, 80)}...\n`;
      });
    }

    return summary;
  }

  // ========== PRIVATE HELPERS ==========

  private extractKeywords(context: string): string[] {
    // Simple keyword extraction (lowercase, remove common words)
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'is', 'are', 'was', 'were', 'what', 'how', 'why']);
    
    return context
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Top 10 keywords
  }

  private updateBestSetups(memory: AgentMemory, trade: TradeCall): void {
    if (!trade.reasoning) return;

    // Extract pattern from reasoning (simple heuristic: first sentence)
    const pattern = trade.reasoning.split('.')[0].substring(0, 100);

    // Find existing setup or create new one
    let setup = memory.bestSetups.find(s => s.pattern === pattern);
    
    if (!setup) {
      setup = { pattern, winRate: 0, count: 0 };
      memory.bestSetups.push(setup);
    }

    // Update win rate
    const isWin = trade.outcome === 'win';
    setup.count++;
    setup.winRate = ((setup.winRate * (setup.count - 1)) + (isWin ? 1 : 0)) / setup.count;

    // Sort by win rate and keep top 10
    memory.bestSetups.sort((a, b) => b.winRate - a.winRate);
    memory.bestSetups = memory.bestSetups.slice(0, 10);
  }

  private estimateTokens(result: RecallResult): number {
    const json = JSON.stringify(result);
    return Math.ceil(json.length / 4); // Rough estimate: 4 chars per token
  }

  private trimToTokenBudget(result: RecallResult): RecallResult {
    // Trim trades first
    while (result.relevantTrades.length > 0 && this.estimateTokens(result) > MAX_RECALL_TOKENS) {
      result.relevantTrades.pop();
    }

    // Then trim insights
    while (result.relevantInsights.length > 0 && this.estimateTokens(result) > MAX_RECALL_TOKENS) {
      result.relevantInsights.pop();
    }

    // Finally trim best setups
    while (result.bestSetups.length > 0 && this.estimateTokens(result) > MAX_RECALL_TOKENS) {
      result.bestSetups.pop();
    }

    result.estimatedTokens = this.estimateTokens(result);
    return result;
  }
}

// Export singleton instance
export const recallGate = new RecallGate();

// Export types and class
export { RecallGate };
