/**
 * COLLABORATIVE DAEMON - Cortex Capital Agent Discussions
 * 
 * Makes agents ACTUALLY TALK to each other using LLM calls.
 * Discussions are logged and streamed to the fishtank for clients to watch.
 * 
 * Cycles:
 * 1. Morning Briefing (market open) - All agents share outlook
 * 2. Trade Discussions - ANALYST presents → STRATEGIST debates → RISK validates
 * 3. Position Reviews - Active positions discussed every 15 min
 * 4. End of Day Recap - What worked, what didn't
 * 
 * Built: 2026-03-23
 */

import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { relationshipMatrix, AgentType, RelationshipEvent } from './relationship-matrix';
import { recallGate } from './recall-gate';
import { query } from '../db';
import { getMarketContextForAgents } from './data/market-data';
import { loadUserPreferences, generatePreferencesContext, UserPreferences } from './user-preferences-context';
import { getFullResearchContext } from './data/research-engine';
import { recallMemories, generateLearningSummary } from './learning/agent-memory';

// Agent definitions with personalities
const AGENTS = {
  ANALYST: {
    name: 'ANALYST',
    role: 'Market Analyst',
    personality: 'Data-driven, thorough, presents facts before opinions',
    avatar: '📊',
    color: '#3B82F6'
  },
  STRATEGIST: {
    name: 'STRATEGIST', 
    role: 'Chief Strategist',
    personality: 'Big picture thinker, challenges assumptions, risk-aware',
    avatar: '🎯',
    color: '#8B5CF6'
  },
  DAY_TRADER: {
    name: 'DAY_TRADER',
    role: 'Day Trader',
    personality: 'Action-oriented, quick decisions, momentum focused',
    avatar: '⚡',
    color: '#F59E0B'
  },
  MOMENTUM: {
    name: 'MOMENTUM',
    role: 'Momentum Specialist',
    personality: 'Trend follower, sector rotation expert, weekly horizon',
    avatar: '🚀',
    color: '#10B981'
  },
  OPTIONS_STRATEGIST: {
    name: 'OPTIONS_STRATEGIST',
    role: 'Options Specialist',
    personality: 'Greeks-focused, hedging expert, volatility trader',
    avatar: '📈',
    color: '#EC4899'
  },
  RISK: {
    name: 'RISK',
    role: 'Risk Manager',
    personality: 'Conservative, position sizing focused, drawdown aware',
    avatar: '🛡️',
    color: '#EF4444'
  },
  EXECUTOR: {
    name: 'EXECUTOR',
    role: 'Trade Executor',
    personality: 'Precise, timing focused, slippage conscious',
    avatar: '🎬',
    color: '#6366F1'
  },
  GROWTH: {
    name: 'GROWTH',
    role: 'Growth Advocate',
    personality: 'Bullish on opportunities, momentum plays, sector rotation, always looking for upside',
    avatar: '📈',
    color: '#22C55E'
  },
  VALUE: {
    name: 'VALUE',
    role: 'Value Investor',
    personality: 'Contrarian views, undervalued assets, dividend focus, patient capital',
    avatar: '💎',
    color: '#0EA5E9'
  }
};

// Message types for the fishtank
interface AgentMessage {
  id: string;
  timestamp: string;
  agent: string;
  role: string;
  avatar: string;
  color: string;
  content: string;
  replyTo?: string;
  discussionId: string;
  discussionTopic: string;
}

interface Discussion {
  id: string;
  topic: string;
  startedAt: string;
  participants: string[];
  messages: AgentMessage[];
  status: 'active' | 'concluded';
  outcome?: string;
}

// Event emitter for real-time streaming to fishtank
export const discussionEmitter = new EventEmitter();

class CollaborativeDaemon {
  private openai: OpenAI;
  private discussions: Discussion[] = [];
  private messageLog: AgentMessage[] = [];
  private isRunning = false;
  private logDir: string;

  constructor() {
    // Use DeepSeek for cheap LLM calls
    const apiKey = this.getDeepSeekKey();
    this.openai = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com'
    });
    
    this.logDir = path.join(__dirname, '../.discussions');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getDeepSeekKey(): string {
    try {
      const credsPath = '/Users/atlasbuilds/clawd/credentials.json';
      const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
      return creds.deepseek?.api_key || process.env.DEEPSEEK_API_KEY || '';
    } catch {
      return process.env.DEEPSEEK_API_KEY || '';
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Make an agent "speak" using LLM
   */
  private async agentSpeak(
    agent: keyof typeof AGENTS,
    context: string,
    replyTo?: AgentMessage
  ): Promise<string> {
    const agentInfo = AGENTS[agent];
    const soul = this.loadAgentSoul(agent);
    
    // Get agent memories via recall gate + learning system
    let memoryContext = '';
    try {
      const memories = recallGate.recall(agent.toLowerCase(), context);
      if (memories) {
        memoryContext = `\n[YOUR MEMORIES]\n${memories}\n[/YOUR MEMORIES]\nUse these memories to inform your response. Reference past calls when relevant.`;
      }
      
      // Add learned patterns from trade outcomes
      const learnedMemories = await recallMemories(agent, context, 5);
      if (learnedMemories.length > 0) {
        const learningSummary = learnedMemories.map(m => `- ${m.content}`).join('\n');
        memoryContext += `\n[LEARNED FROM EXPERIENCE]\n${learningSummary}\n[/LEARNED]`;
      }
    } catch {}

    // Get relationship context for this agent
    let relationshipContext = '';
    try {
      const agentType = agent as AgentType;
      const relationships = relationshipMatrix.getAgentRelationships(agentType);
      if (relationships && relationships.length > 0) {
        const relSummary = relationships
          .filter(r => r.label !== 'Cordial') // Only mention non-neutral relationships
          .slice(0, 3)
          .map(r => `${(r as any).agent || r.partner}: ${r.label} (${r.score}/100)`)
          .join(', ');
        if (relSummary) {
          relationshipContext = `\nYour current relationships: ${relSummary}. Let these influence your tone subtly.`;
        }
      }
    } catch {}

    const systemPrompt = `You are ${agentInfo.name}, the ${agentInfo.role} at Cortex Capital, an AI-powered hedge fund.

Personality: ${agentInfo.personality}

${soul ? `Your detailed personality and approach:\n${soul}\n` : ''}${relationshipContext}${memoryContext}

RULES:
- Keep responses concise (2-4 sentences max)
- Stay in character
- Be specific with numbers when discussing trades
- Reference what other agents said when replying
- Sound natural, like a real trader in a team meeting
- Do NOT ask for "required action" or request additional data
- Do NOT use markdown formatting (no **, *, #, or \`)
- Work with the data provided - if limited, acknowledge and give general guidance
- You are having a DISCUSSION, not requesting tasks`;

    const userPrompt = replyTo 
      ? `${replyTo.agent} said: "${replyTo.content}"\n\nRespond to this in context of: ${context}`
      : context;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 150,
        temperature: 0.8
      });

      return response.choices[0]?.message?.content || 'No response';
    } catch (error: any) {
      console.error(`[${agent}] LLM error:`, error.message);
      return `[Error: ${error.message}]`;
    }
  }

  private loadAgentSoul(agent: string): string | null {
    try {
      const agentName = agent.toLowerCase().replace(/ /g, '_');
      const soulPath = path.join(__dirname, 'souls', `${agentName}.md`);
      if (fs.existsSync(soulPath)) {
        return fs.readFileSync(soulPath, 'utf-8').slice(0, 2000); // First 2000 chars for full personality
      }
    } catch {}
    return null;
  }

  /**
   * Create and emit a message
   */
  private createMessage(
    agent: keyof typeof AGENTS,
    content: string,
    discussion: Discussion,
    replyTo?: AgentMessage
  ): AgentMessage {
    const agentInfo = AGENTS[agent];
    const message: AgentMessage = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      agent: agentInfo.name,
      role: agentInfo.role,
      avatar: agentInfo.avatar,
      color: agentInfo.color,
      content,
      replyTo: replyTo?.id,
      discussionId: discussion.id,
      discussionTopic: discussion.topic
    };

    discussion.messages.push(message);
    this.messageLog.push(message);
    
    // Emit for real-time streaming
    discussionEmitter.emit('message', message);
    
    // Log to file
    this.logMessage(message);
    
    console.log(`${agentInfo.avatar} [${agentInfo.name}]: ${content}`);
    
    return message;
  }

  private logMessage(message: AgentMessage) {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logDir, `${today}.jsonl`);
    fs.appendFileSync(logFile, JSON.stringify(message) + '\n');
  }

  /**
   * Run a multi-agent discussion on a topic
   */
  async runDiscussion(
    topic: string,
    participants: (keyof typeof AGENTS)[],
    context: string,
    rounds: number = 2,
    userId?: string
  ): Promise<Discussion> {
    // Inject real market data and user preferences
    let enrichedContext = context;
    
    try {
      const marketContext = await getMarketContextForAgents();
      enrichedContext = `${marketContext}\n\n${context}`;
    } catch (err) {
      console.error('[CollaborativeDaemon] Failed to get market data:', err);
    }

    if (userId) {
      try {
        const prefs = await loadUserPreferences(userId);
        if (prefs) {
          const prefsContext = generatePreferencesContext(prefs);
          enrichedContext = `USER PREFERENCES:\n${prefsContext}\n\n${enrichedContext}`;
          
          // Add research for user's sectors and positions
          try {
            // Extract position symbols from context if available
            const positionMatches = context.match(/([A-Z]{1,5}):/g) || [];
            const positions = positionMatches.map(m => m.replace(':', '')).slice(0, 5);
            
            const researchContext = await getFullResearchContext(
              prefs.sectorInterests || ['Technology', 'Healthcare'],
              positions
            );
            enrichedContext = `LIVE RESEARCH:\n${researchContext}\n\n${enrichedContext}`;
          } catch (researchErr) {
            console.error('[CollaborativeDaemon] Research failed:', researchErr);
          }
        }
      } catch (err) {
        console.error('[CollaborativeDaemon] Failed to load user preferences:', err);
      }
    }
    const discussion: Discussion = {
      id: this.generateId(),
      topic,
      startedAt: new Date().toISOString(),
      participants: participants.map(p => AGENTS[p].name),
      messages: [],
      status: 'active'
    };

    this.discussions.push(discussion);
    discussionEmitter.emit('discussion_start', discussion);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`DISCUSSION: ${topic}`);
    console.log(`Participants: ${participants.join(', ')}`);
    console.log(`${'='.repeat(60)}\n`);

    // First agent kicks off with enriched context
    const firstAgent = participants[0];
    const firstContent = await this.agentSpeak(firstAgent, enrichedContext);
    let lastMessage = this.createMessage(firstAgent, firstContent, discussion);

    // Others respond in rounds
    for (let round = 0; round < rounds; round++) {
      for (let i = 1; i < participants.length; i++) {
        const agent = participants[i];
        
        // Build context from previous messages
        const recentMessages = discussion.messages.slice(-3)
          .map(m => `${m.agent}: ${m.content}`)
          .join('\n');
        
        const responseContext = `Topic: ${topic}\n\nRecent discussion:\n${recentMessages}\n\nAdd your perspective.`;
        
        const content = await this.agentSpeak(agent, responseContext, lastMessage);
        lastMessage = this.createMessage(agent, content, discussion, lastMessage);
        
        // Small delay for readability
        await new Promise(r => setTimeout(r, 500));
      }
    }

    discussion.status = 'concluded';
    discussionEmitter.emit('discussion_end', discussion);
    
    // Persist to database
    try {
      await query(
        `INSERT INTO agent_discussions (id, discussion_type, messages, started_at, completed_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (id) DO UPDATE SET messages = $3, completed_at = NOW()`,
        [
          discussion.id,
          topic.toLowerCase().replace(/\s+/g, '_'),
          JSON.stringify(discussion.messages),
          discussion.startedAt,
        ]
      );
      console.log(`[CollaborativeDaemon] Saved discussion ${discussion.id} to database`);
    } catch (err) {
      console.error('[CollaborativeDaemon] Failed to save discussion:', err);
    }
    
    return discussion;
  }

  /**
   * Morning briefing - all agents share market outlook
   */
  async morningBriefing(): Promise<Discussion> {
    const marketContext = `It's the start of the trading day. Share your outlook for today based on:
- Pre-market futures action
- Key levels to watch
- Potential setups you're watching
- Risk factors to be aware of`;

    return this.runDiscussion(
      'Morning Market Briefing',
      ['ANALYST', 'STRATEGIST', 'DAY_TRADER', 'MOMENTUM', 'OPTIONS_STRATEGIST', 'RISK', 'GROWTH', 'VALUE'],
      marketContext,
      1
    );
  }

  /**
   * Trade idea discussion
   */
  async discussTradeIdea(
    symbol: string,
    direction: 'long' | 'short',
    thesis: string
  ): Promise<Discussion> {
    const context = `Evaluate this trade idea:
Symbol: ${symbol}
Direction: ${direction.toUpperCase()}
Thesis: ${thesis}

Discuss entry, targets, stop loss, and position sizing.`;

    return this.runDiscussion(
      `Trade Idea: ${symbol} ${direction.toUpperCase()}`,
      ['ANALYST', 'STRATEGIST', 'OPTIONS_STRATEGIST', 'RISK', 'EXECUTOR'],
      context,
      2
    );
  }

  /**
   * Position review
   */
  async reviewPosition(
    symbol: string,
    entry: number,
    current: number,
    pnl: number
  ): Promise<Discussion> {
    const pnlPct = ((current - entry) / entry * 100).toFixed(2);
    const context = `Review this open position:
Symbol: ${symbol}
Entry: $${entry}
Current: $${current}
P&L: ${pnl >= 0 ? '+' : ''}$${pnl} (${pnlPct}%)

Should we hold, add, trim, or exit?`;

    return this.runDiscussion(
      `Position Review: ${symbol} (${pnlPct}%)`,
      ['DAY_TRADER', 'STRATEGIST', 'RISK'],
      context,
      1
    );
  }

  /**
   * End of day recap
   */
  async endOfDayRecap(
    totalPnl: number,
    trades: number,
    winRate: number
  ): Promise<Discussion> {
    const context = `End of day review:
Total P&L: ${totalPnl >= 0 ? '+' : ''}$${totalPnl}
Trades: ${trades}
Win Rate: ${winRate}%

What worked today? What didn't? What to improve tomorrow?`;

    return this.runDiscussion(
      'End of Day Recap',
      ['STRATEGIST', 'DAY_TRADER', 'RISK', 'ANALYST'],
      context,
      1
    );
  }

  /**
   * Get recent messages for fishtank display
   */
  getRecentMessages(limit: number = 50): AgentMessage[] {
    return this.messageLog.slice(-limit);
  }

  /**
   * Get active discussions
   */
  getActiveDiscussions(): Discussion[] {
    return this.discussions.filter(d => d.status === 'active');
  }

  /**
   * Start the daemon loop
   */
  async start() {
    this.isRunning = true;
    console.log('\n🧠 Collaborative Daemon started');
    console.log('Agents will discuss market conditions and trades in real-time.\n');

    // Initial briefing
    await this.morningBriefing();

    // Main loop - periodic discussions
    while (this.isRunning) {
      await new Promise(r => setTimeout(r, 15 * 60 * 1000)); // 15 min

      if (!this.isRunning) break;

      // Random discussion type
      const discussionTypes = [
        () => this.discussTradeIdea('QQQ', 'long', 'Momentum breakout above resistance'),
        () => this.discussTradeIdea('SPY', 'short', 'Rejection at key resistance level'),
        () => this.reviewPosition('NVDA', 890, 905, 1500),
        () => this.runDiscussion(
          'Investment Opportunities Discussion',
          ['GROWTH', 'VALUE', 'STRATEGIST', 'RISK'],
          'Review current portfolio allocation. GROWTH: identify momentum opportunities and sector rotations. VALUE: find undervalued names with strong fundamentals. STRATEGIST: weigh both perspectives. RISK: keep position sizing in check.',
          2
        ),
        () => this.runDiscussion(
          'Options Strategy Review',
          ['OPTIONS_STRATEGIST', 'ANALYST', 'RISK', 'EXECUTOR'],
          'Review any open options positions. Check theta decay, DTE, strike distance from current price. Flag anything that needs attention. Suggest hedges or adjustments.',
          2
        ),
      ];

      const randomDiscussion = discussionTypes[Math.floor(Math.random() * discussionTypes.length)];
      await randomDiscussion();
    }
  }

  stop() {
    this.isRunning = false;
    console.log('\n🧠 Collaborative Daemon stopped');
  }
}

// Export singleton
export const collaborativeDaemon = new CollaborativeDaemon();

// CLI entry point
if (require.main === module) {
  console.log('Starting Cortex Capital Collaborative Daemon...\n');
  
  collaborativeDaemon.start().catch(console.error);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, stopping...');
    collaborativeDaemon.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, stopping...');
    collaborativeDaemon.stop();
    process.exit(0);
  });
}
