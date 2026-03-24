/**
 * LLM Agent Wrapper for Cortex Capital
 * 
 * Wraps each agent with LLM reasoning capabilities.
 * Loads SOUL.md as system prompt for personality.
 * Supports DeepSeek, GPT-4, Claude.
 */

import * as fs from 'fs';
import * as path from 'path';

// Types
interface LLMConfig {
  provider: 'deepseek' | 'openai' | 'anthropic';
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
}

interface AgentDecision {
  action: 'execute' | 'wait' | 'escalate' | 'skip';
  confidence: number; // 0-100
  reasoning: string;
  details?: Record<string, any>;
}

interface AgentContext {
  agentName: string;
  soul: string;
  portfolio?: any;
  marketData?: any;
  userProfile?: any;
  previousDecisions?: AgentDecision[];
}

// Load soul file for an agent
export function loadSoul(agentName: string): string {
  const soulPath = path.join(__dirname, 'SOULS', `${agentName}.soul.md`);
  
  if (!fs.existsSync(soulPath)) {
    console.warn(`Soul file not found for ${agentName}, using default`);
    return getDefaultSoul(agentName);
  }
  
  return fs.readFileSync(soulPath, 'utf-8');
}

function getDefaultSoul(agentName: string): string {
  return `# ${agentName}
You are ${agentName}, an AI agent for Cortex Capital.
Be precise, professional, and helpful.
Always explain your reasoning.
Never make up data - say when you're uncertain.`;
}

// Build system prompt from soul + context
function buildSystemPrompt(context: AgentContext): string {
  return `${context.soul}

---

## CURRENT CONTEXT

You are operating as ${context.agentName} for Cortex Capital.
Your decisions affect real money. Be precise and careful.

${context.portfolio ? `### Portfolio State\n${JSON.stringify(context.portfolio, null, 2)}` : ''}
${context.marketData ? `### Market Data\n${JSON.stringify(context.marketData, null, 2)}` : ''}
${context.userProfile ? `### User Profile\n${JSON.stringify(context.userProfile, null, 2)}` : ''}

## OUTPUT FORMAT

Respond with a JSON object:
{
  "action": "execute" | "wait" | "escalate" | "skip",
  "confidence": 0-100,
  "reasoning": "Your explanation",
  "details": { /* action-specific details */ }
}

Be direct. Be precise. Be ${context.agentName}.`;
}

// Call LLM API
async function callLLM(
  config: LLMConfig,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const { provider, model, apiKey, temperature = 0.3, maxTokens = 2000 } = config;
  
  if (provider === 'deepseek') {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature,
        max_tokens: maxTokens
      })
    });
    
    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content || '';
  }
  
  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature,
        max_tokens: maxTokens
      })
    });
    
    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content || '';
  }
  
  if (provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-3-sonnet-20240229',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ]
      })
    });
    
    const data = await response.json() as any;
    return data.content?.[0]?.text || '';
  }
  
  throw new Error(`Unknown provider: ${provider}`);
}

// Parse LLM response to structured decision
function parseDecision(response: string): AgentDecision {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        action: parsed.action || 'skip',
        confidence: parsed.confidence || 0,
        reasoning: parsed.reasoning || 'No reasoning provided',
        details: parsed.details
      };
    }
  } catch (e) {
    // If JSON parsing fails, extract what we can
  }
  
  // Fallback: couldn't parse
  return {
    action: 'escalate',
    confidence: 0,
    reasoning: `Failed to parse LLM response: ${response.substring(0, 200)}...`,
    details: { rawResponse: response }
  };
}

// Main wrapper class
export class LLMAgent {
  private agentName: string;
  private soul: string;
  private config: LLMConfig;
  
  constructor(agentName: string, config: LLMConfig) {
    this.agentName = agentName;
    this.soul = loadSoul(agentName);
    this.config = config;
  }
  
  async decide(
    task: string,
    context?: Partial<AgentContext>
  ): Promise<AgentDecision> {
    const fullContext: AgentContext = {
      agentName: this.agentName,
      soul: this.soul,
      ...context
    };
    
    const systemPrompt = buildSystemPrompt(fullContext);
    const response = await callLLM(this.config, systemPrompt, task);
    const decision = parseDecision(response);
    
    // Log decision for audit trail
    console.log(`[${this.agentName}] Decision:`, {
      task: task.substring(0, 100),
      action: decision.action,
      confidence: decision.confidence
    });
    
    return decision;
  }
  
  async chat(message: string): Promise<string> {
    const systemPrompt = `${this.soul}\n\nYou are ${this.agentName}. Respond naturally in character.`;
    return callLLM(this.config, systemPrompt, message);
  }
  
  // Get agent's soul/personality
  getSoul(): string {
    return this.soul;
  }
  
  // Update soul (for runtime personality adjustments)
  updateSoul(newSoul: string): void {
    this.soul = newSoul;
  }
}

// Factory function to create all agents
export function createAgentTeam(config: LLMConfig): Record<string, LLMAgent> {
  const agentNames = [
    'ANALYST',
    'STRATEGIST',
    'EXECUTOR',
    'REPORTER',
    'OPTIONS_STRATEGIST',
    'DAY_TRADER',
    'MOMENTUM'
  ];
  
  const team: Record<string, LLMAgent> = {};
  
  for (const name of agentNames) {
    team[name] = new LLMAgent(name, config);
  }
  
  return team;
}

// Example usage
async function demo() {
  const config: LLMConfig = {
    provider: 'deepseek',
    model: 'deepseek-chat',
    apiKey: process.env.DEEPSEEK_API_KEY || ''
  };
  
  const team = createAgentTeam(config);
  
  // Ask ANALYST to review a portfolio
  const decision = await team.ANALYST.decide(
    'Review this portfolio: 60% AAPL, 30% MSFT, 10% CASH. User is moderate risk profile.',
    {
      userProfile: { riskTolerance: 'moderate', age: 35 }
    }
  );
  
  console.log('ANALYST decision:', decision);
}

// Export for use
export { LLMConfig, AgentDecision, AgentContext };
