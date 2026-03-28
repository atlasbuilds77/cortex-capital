/**
 * PHONE BOOTH - Direct Chat with Individual Agents
 * 
 * Users can "call" an agent via the phone booth in the 3D office.
 * Each conversation is private between the user and one agent.
 * The agent uses their soul + recall gate for context.
 */

import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { loadUserPreferences, generatePreferencesContext } from './user-preferences-context';
import { getMarketContextForAgents } from './data/market-data';
import { researchStock } from './data/research-engine';
import * as brokerService from '../services/broker-service';

const AGENTS: Record<string, { name: string; role: string; avatar: string; color: string }> = {
  ANALYST: { name: 'Analyst', role: 'Market Analyst', avatar: '📊', color: '#3B82F6' },
  STRATEGIST: { name: 'Strategist', role: 'Chief Strategist', avatar: '🎯', color: '#8B5CF6' },
  DAY_TRADER: { name: 'Day Trader', role: 'Day Trader', avatar: '⚡', color: '#F59E0B' },
  MOMENTUM: { name: 'Momentum', role: 'Momentum Specialist', avatar: '🚀', color: '#10B981' },
  OPTIONS_STRATEGIST: { name: 'Options Strategist', role: 'Options Specialist', avatar: '📐', color: '#EC4899' },
  RISK: { name: 'Risk', role: 'Risk Manager', avatar: '🛡️', color: '#EF4444' },
  EXECUTOR: { name: 'Executor', role: 'Trade Executor', avatar: '🎬', color: '#6366F1' },
  GROWTH: { name: 'Growth', role: 'Growth Advocate', avatar: '📈', color: '#22C55E' },
  VALUE: { name: 'Value', role: 'Value Investor', avatar: '💎', color: '#0EA5E9' },
  REPORTER: { name: 'Reporter', role: 'Market Reporter', avatar: '📰', color: '#F97316' },
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface PhoneBoothSession {
  agentId: string;
  userId: string;
  messages: ChatMessage[];
  startedAt: string;
}

// Active sessions
const sessions: Map<string, PhoneBoothSession> = new Map();

function getDeepSeekClient(): OpenAI {
  let apiKey = '';
  try {
    const creds = JSON.parse(fs.readFileSync('/Users/atlasbuilds/clawd/credentials.json', 'utf-8'));
    apiKey = creds.deepseek?.api_key || process.env.DEEPSEEK_API_KEY || '';
  } catch {
    apiKey = process.env.DEEPSEEK_API_KEY || '';
  }
  return new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com' });
}

function loadSoul(agentId: string): string {
  const agentName = agentId.toLowerCase().replace(/ /g, '_');
  const soulPath = path.join(__dirname, 'souls', `${agentName}.md`);
  try {
    if (fs.existsSync(soulPath)) {
      return fs.readFileSync(soulPath, 'utf-8');
    }
  } catch {}
  return '';
}

/**
 * Start or continue a phone booth conversation
 */
export async function phoneBoothChat(
  agentId: string,
  userId: string,
  userMessage: string
): Promise<{ agent: string; content: string; avatar: string; color: string }> {
  const sessionKey = `${userId}-${agentId}`;
  const agentInfo = AGENTS[agentId];
  
  if (!agentInfo) {
    throw new Error(`Unknown agent: ${agentId}`);
  }

  // Get or create session
  let session = sessions.get(sessionKey);
  if (!session) {
    session = {
      agentId,
      userId,
      messages: [],
      startedAt: new Date().toISOString(),
    };
    sessions.set(sessionKey, session);
  }

  // Add user message
  session.messages.push({ role: 'user', content: userMessage });

  // Build system prompt with soul + real data
  const soul = loadSoul(agentId);
  
  // Get user's portfolio and preferences
  let portfolioContext = '';
  let prefsContext = '';
  let marketContext = '';
  
  try {
    const portfolio = await brokerService.fetchUserPortfolio(userId);
    if (portfolio) {
      const positions = portfolio.positions.slice(0, 5).map(p => 
        `${p.symbol}: ${p.qty} @ $${p.currentPrice.toFixed(2)} (${p.unrealizedPnlPct >= 0 ? '+' : ''}${p.unrealizedPnlPct.toFixed(1)}%)`
      ).join(', ');
      portfolioContext = `\nUSER PORTFOLIO: $${portfolio.account.portfolioValue.toLocaleString()} total. Positions: ${positions}`;
    }
  } catch (e) {}
  
  try {
    const prefs = await loadUserPreferences(userId);
    if (prefs) {
      prefsContext = `\nUSER PROFILE: ${prefs.riskProfile} risk, goals: ${prefs.tradingGoals.join(', ') || 'growth'}`;
    }
  } catch (e) {}
  
  try {
    marketContext = await getMarketContextForAgents();
  } catch (e) {}

  // If user mentions a ticker, research it
  const tickerMatch = userMessage.match(/\b([A-Z]{1,5})\b/);
  let stockContext = '';
  if (tickerMatch && ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'TSLA', 'AMD', 'AMZN', 'SPY', 'QQQ'].includes(tickerMatch[1])) {
    try {
      const research = await researchStock(tickerMatch[1]);
      stockContext = `\n${tickerMatch[1]} NOW: $${research.price.toFixed(2)} (${research.changePercent >= 0 ? '+' : ''}${research.changePercent.toFixed(2)}%), sentiment: ${research.sentiment}`;
      if (research.news.length > 0) {
        stockContext += `, latest: "${research.news[0].title}"`;
      }
    } catch (e) {}
  }
  
  const systemPrompt = `You are ${agentInfo.name}, the ${agentInfo.role} at Cortex Capital.

${soul}
${marketContext}
${portfolioContext}
${prefsContext}
${stockContext}

You are having a private phone booth conversation with a client.
Be helpful, stay in character, and give specific actionable advice.
Keep responses conversational - 2-4 sentences unless they ask for detail.
Use the REAL market data and portfolio info above - never make up prices.
If they ask about something outside your role, suggest which agent they should talk to.
No markdown formatting.`;

  // Build message history (last 10 messages for context)
  const recentMessages = session.messages.slice(-10).map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  try {
    const client = getDeepSeekClient();
    const response = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        ...recentMessages,
      ],
      max_tokens: 200,
      temperature: 0.8,
    });

    const reply = response.choices[0]?.message?.content || 'Sorry, I got distracted. What was that?';

    // Add agent response to session
    session.messages.push({ role: 'assistant', content: reply });

    return {
      agent: agentInfo.name,
      content: reply,
      avatar: agentInfo.avatar,
      color: agentInfo.color,
    };
  } catch (error: any) {
    console.error(`[PhoneBooth] ${agentId} error:`, error.message);
    return {
      agent: agentInfo.name,
      content: `Sorry, I'm having connection issues. Try again in a moment.`,
      avatar: agentInfo.avatar,
      color: agentInfo.color,
    };
  }
}

/**
 * End a phone booth session
 */
export function endPhoneBoothSession(agentId: string, userId: string): void {
  const sessionKey = `${userId}-${agentId}`;
  sessions.delete(sessionKey);
}

/**
 * Get available agents for phone booth
 */
export function getAvailableAgents() {
  return Object.entries(AGENTS).map(([id, info]) => ({
    id,
    ...info,
    available: true, // Could check if agent is "busy" in a discussion
  }));
}

export { AGENTS }; export type { PhoneBoothSession };
