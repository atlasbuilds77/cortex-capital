// Cortex Capital - DeepSeek API Integration
// For agent discussions and analysis

import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Get API key from credentials (injected via environment or direct import)
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';

export interface DeepSeekMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface DeepSeekRequest {
  model: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AgentDiscussionRequest {
  prompt: string;
  agentRoles: string[];
  temperature?: number;
  maxTokensPerResponse?: number;
}

export interface AgentMessage {
  agent: string;
  role: string;
  content: string;
  timestamp: string;
}

/**
 * DeepSeek API client for Cortex Capital
 */
export class DeepSeekClient {
  private client: AxiosInstance;
  private model: string;

  constructor(apiKey: string = DEEPSEEK_API_KEY, baseUrl: string = DEEPSEEK_BASE_URL) {
    if (!apiKey) {
      throw new Error('DeepSeek API key is required');
    }

    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    this.model = 'deepseek-chat';
  }

  /**
   * Generate a single completion
   */
  async generateCompletion(
    messages: DeepSeekMessage[],
    temperature: number = 0.7,
    maxTokens: number = 1000
  ): Promise<string> {
    try {
      const request: DeepSeekRequest = {
        model: this.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      };

      const response = await this.client.post<DeepSeekResponse>('/chat/completions', request);
      
      if (response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content;
      }

      throw new Error('No completion returned from DeepSeek');
    } catch (error) {
      console.error('DeepSeek API error:', error);
      throw error;
    }
  }

  /**
   * Generate a multi-agent discussion
   * Each agent responds in sequence based on the prompt and previous responses
   */
  async generateAgentDiscussion(
    request: AgentDiscussionRequest
  ): Promise<AgentMessage[]> {
    const {
      prompt,
      agentRoles = ['ANALYST', 'RISK', 'STRATEGIST', 'EXECUTOR'],
      temperature = 0.7,
      maxTokensPerResponse = 500,
    } = request;

    const messages: AgentMessage[] = [];
    const conversationHistory: DeepSeekMessage[] = [
      {
        role: 'system',
        content: `You are participating in a portfolio discussion with multiple agents. Each agent has a specific role and perspective. Respond concisely and professionally from your assigned role.`
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    for (const agentRole of agentRoles) {
      // Add agent-specific context
      const agentContext: DeepSeekMessage[] = [
        ...conversationHistory,
        {
          role: 'system',
          content: `You are the ${agentRole} agent. Respond from this perspective.`
        }
      ];

      try {
        const response = await this.generateCompletion(
          agentContext,
          temperature,
          maxTokensPerResponse
        );

        const agentMessage: AgentMessage = {
          agent: agentRole,
          role: this.getAgentRoleDescription(agentRole),
          content: response.trim(),
          timestamp: new Date().toISOString(),
        };

        messages.push(agentMessage);

        // Add this response to conversation history for next agent
        conversationHistory.push({
          role: 'assistant',
          content: response
        });

      } catch (error) {
        console.error(`Error generating response for ${agentRole}:`, error);
        // Add a fallback message if API fails
        messages.push({
          agent: agentRole,
          role: this.getAgentRoleDescription(agentRole),
          content: this.getFallbackResponse(agentRole),
          timestamp: new Date().toISOString(),
        });
      }
    }

    return messages;
  }

  /**
   * Get role description for each agent type
   */
  private getAgentRoleDescription(agent: string): string {
    const descriptions: Record<string, string> = {
      'ANALYST': 'Portfolio Analyst',
      'RISK': 'Risk Manager',
      'STRATEGIST': 'Strategic Advisor',
      'EXECUTOR': 'Trade Executor',
    };

    return descriptions[agent] || agent;
  }

  /**
   * Fallback responses if API fails
   */
  private getFallbackResponse(agent: string): string {
    const fallbacks: Record<string, string> = {
      'ANALYST': 'Analyzing portfolio data...',
      'RISK': 'Assessing risk exposure...',
      'STRATEGIST': 'Developing strategic recommendations...',
      'EXECUTOR': 'Ready to execute trades based on consensus.',
    };

    return fallbacks[agent] || 'Processing...';
  }
}

// Singleton instance for easy import
let deepSeekInstance: DeepSeekClient | null = null;

export function getDeepSeekClient(): DeepSeekClient {
  if (!deepSeekInstance) {
    // Try to get API key from environment or use a placeholder
    // In production, this should be properly configured
    const apiKey = process.env.DEEPSEEK_API_KEY || '';
    deepSeekInstance = new DeepSeekClient(apiKey);
  }
  return deepSeekInstance;
}