/**
 * Conversation Orchestrator
 * 
 * Turn-by-turn LLM calls with natural pacing
 * Speaker selection, response generation, and conversation management
 */

import { getAgentVoice, getAgentSystemPrompt, AGENT_VOICES } from './voices';
import { getFormat, selectParticipants, getRandomTopic } from './formats';
import { selectNextSpeaker, ConversationContext } from './speaker-selection';
import { deriveModifiersFromMemory, modifiersToPromptString, applyModifiersToResponse } from './voice-evolution';
import { analyzeConversation, calculateRelationshipDrift, applyRelationshipUpdates } from './relationship-drift';

export interface ConversationSession {
  id: string;
  format: string;
  participants: string[];
  topic: string;
  history: Array<{
    speaker: string;
    message: string;
    turn: number;
    timestamp: number;
  }>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  metadata: {
    maxTurns: number;
    temperature: number;
    isFormal: boolean;
  };
}

export interface OrchestratorConfig {
  maxResponseLength: number;
  minTurnDelayMs: number;
  maxTurnDelayMs: number;
  llmProvider: (prompt: string, temperature: number) => Promise<string>;
  memoryProvider: (agentId: string, topic: string) => Promise<any[]>;
  relationshipProvider: () => Promise<Record<string, Record<string, number>>>;
  relationshipUpdater: (updates: any[]) => Promise<void>;
  memoryDistiller: (conversation: ConversationSession) => Promise<void>;
  eventEmitter: (event: string, data: any) => Promise<void>;
}

export class ConversationOrchestrator {
  private config: OrchestratorConfig;
  
  constructor(config: OrchestratorConfig) {
    this.config = config;
  }
  
  async orchestrateConversation(session: ConversationSession): Promise<ConversationSession> {
    try {
      session.status = 'running';
      session.startedAt = Date.now();
      
      const format = getFormat(session.format);
      const relationships = await this.config.relationshipProvider();
      
      // Select participants if not already specified
      if (!session.participants || session.participants.length === 0) {
        session.participants = selectParticipants(format, Object.keys(AGENT_VOICES), relationships);
      }
      
      // Set topic if not specified
      if (!session.topic) {
        session.topic = getRandomTopic(format);
      }
      
      // Set metadata
      session.metadata = {
        maxTurns: Math.floor(Math.random() * (format.maxTurns - format.minTurns + 1)) + format.minTurns,
        temperature: format.temperature,
        isFormal: format.isFormal
      };
      
      console.log(`Starting conversation ${session.id}`);
      console.log(`Format: ${format.name}, Participants: ${session.participants.join(', ')}, Topic: ${session.topic}`);
      console.log(`Max turns: ${session.metadata.maxTurns}, Temperature: ${session.metadata.temperature}`);
      
      // Run conversation turns
      for (let turn = 1; turn <= session.metadata.maxTurns; turn++) {
        console.log(`\n--- Turn ${turn}/${session.metadata.maxTurns} ---`);
        
        // Select next speaker
        const context: ConversationContext = {
          participants: session.participants,
          history: session.history.map(h => ({
            speaker: h.speaker,
            turn: h.turn,
            timestamp: h.timestamp
          })),
          relationships,
          currentTurn: turn
        };
        
        const speaker = selectNextSpeaker(context);
        console.log(`Selected speaker: ${speaker}`);
        
        // Get memory modifiers for this speaker
        const memories = await this.config.memoryProvider(speaker, session.topic);
        const modifiers = deriveModifiersFromMemory(speaker, memories, session.topic);
        const modifierPrompts = modifiersToPromptString(modifiers);
        
        // Build conversation context for LLM
        const conversationContext = this.buildConversationContext(session, turn);
        const systemPrompt = getAgentSystemPrompt(speaker, modifierPrompts);
        const llmPrompt = this.buildLLMPrompt(systemPrompt, conversationContext, session.topic);
        
        // Generate response
        console.log(`Generating response for ${speaker}...`);
        const rawResponse = await this.config.llmProvider(llmPrompt, session.metadata.temperature);
        
        // Apply modifiers and enforce length limit
        const response = this.processResponse(rawResponse, speaker, modifiers);
        
        // Add to history
        const messageEntry = {
          speaker,
          message: response,
          turn,
          timestamp: Date.now()
        };
        
        session.history.push(messageEntry);
        console.log(`${speaker}: ${response}`);
        
        // Natural pacing delay
        if (turn < session.metadata.maxTurns) {
          const delay = Math.floor(
            Math.random() * (this.config.maxTurnDelayMs - this.config.minTurnDelayMs + 1)
          ) + this.config.minTurnDelayMs;
          
          console.log(`Waiting ${delay}ms before next turn...`);
          await this.delay(delay);
        }
      }
      
      // Conversation complete
      session.status = 'completed';
      session.completedAt = Date.now();
      
      console.log(`\nConversation ${session.id} completed in ${session.history.length} turns`);
      
      // Post-conversation processing
      await this.processPostConversation(session, relationships);
      
      return session;
      
    } catch (error) {
      console.error(`Error orchestrating conversation ${session.id}:`, error);
      session.status = 'failed';
      throw error;
    }
  }
  
  private buildConversationContext(session: ConversationSession, currentTurn: number): string {
    if (session.history.length === 0) {
      return `Starting conversation about: ${session.topic}`;
    }
    
    const recentHistory = session.history.slice(-5); // Last 5 messages for context
    const contextLines = recentHistory.map(entry => 
      `${entry.speaker.toUpperCase()} (turn ${entry.turn}): ${entry.message}`
    );
    
    return `Recent conversation:\n${contextLines.join('\n')}\n\nCurrent topic: ${session.topic}`;
  }
  
  private buildLLMPrompt(
    systemPrompt: string,
    conversationContext: string,
    topic: string
  ): string {
    return `${systemPrompt}

${conversationContext}

You are now speaking in the conversation. Keep your response concise (max 120 characters). Be authentic to your role.

Respond now:`;
  }
  
  private processResponse(
    rawResponse: string,
    speaker: string,
    modifiers: any[]
  ): string {
    // Clean up response
    let response = rawResponse.trim();
    
    // Remove any quotation marks if they wrap the entire response
    if ((response.startsWith('"') && response.endsWith('"')) ||
        (response.startsWith("'") && response.endsWith("'"))) {
      response = response.slice(1, -1);
    }
    
    // Apply voice modifiers
    response = applyModifiersToResponse(response, modifiers);
    
    // Enforce character limit
    if (response.length > this.config.maxResponseLength) {
      response = response.substring(0, this.config.maxResponseLength - 3) + '...';
    }
    
    // Ensure it's not empty
    if (!response || response.trim().length === 0) {
      response = "[No response generated]";
    }
    
    return response;
  }
  
  private async processPostConversation(
    session: ConversationSession,
    relationships: Record<string, Record<string, number>>
  ): Promise<void> {
    console.log('Starting post-conversation processing...');
    
    try {
      // 1. Memory distillation
      console.log('Distilling memories...');
      await this.config.memoryDistiller(session);
      
      // 2. Relationship drift
      console.log('Calculating relationship drift...');
      const analysis = analyzeConversation(session.history);
      const updates = calculateRelationshipDrift(analysis, relationships);
      
      if (updates.length > 0) {
        console.log(`Applying ${updates.length} relationship updates:`);
        updates.forEach(update => {
          console.log(`  ${update.agentA} ↔ ${update.agentB}: ${update.oldAffinity.toFixed(3)} → ${update.newAffinity.toFixed(3)} (Δ${update.delta > 0 ? '+' : ''}${update.delta.toFixed(3)})`);
        });
        
        await this.config.relationshipUpdater(updates);
      }
      
      // 3. Action item extraction (only for formal conversations)
      if (session.metadata.isFormal) {
        console.log('Extracting action items...');
        const actionItems = this.extractActionItems(session);
        if (actionItems.length > 0) {
          console.log(`Found ${actionItems.length} action items:`, actionItems);
          await this.config.eventEmitter('action_items_extracted', {
            conversationId: session.id,
            actionItems
          });
        }
      }
      
      // 4. Event emission
      console.log('Emitting conversation completion event...');
      await this.config.eventEmitter('conversation_completed', {
        conversationId: session.id,
        format: session.format,
        participants: session.participants,
        turnCount: session.history.length,
        durationMs: session.completedAt! - session.startedAt!
      });
      
      console.log('Post-conversation processing complete');
      
    } catch (error) {
      console.error('Error in post-conversation processing:', error);
      // Don't fail the entire conversation if post-processing fails
    }
  }
  
  private extractActionItems(session: ConversationSession): string[] {
    const actionItems: string[] = [];
    const actionKeywords = [
      'should', 'need to', 'must', 'will', 'going to',
      'action:', 'task:', 'todo:', 'next step'
    ];
    
    // Scan conversation for action items
    for (const entry of session.history) {
      const message = entry.message.toLowerCase();
      
      // Check for action keywords
      if (actionKeywords.some(keyword => message.includes(keyword))) {
        // Extract the action item (simplified)
        const sentences = entry.message.split(/[.!?]+/);
        for (const sentence of sentences) {
          const trimmed = sentence.trim();
          if (trimmed && actionKeywords.some(keyword => trimmed.toLowerCase().includes(keyword))) {
            // Limit length and add
            if (trimmed.length <= 100 && actionItems.length < 3) {
              actionItems.push(`${entry.speaker.toUpperCase()}: ${trimmed}`);
            }
          }
        }
      }
    }
    
    // Deduplicate and limit
    const uniqueItems = Array.from(new Set(actionItems));
    return uniqueItems.slice(0, 3); // Max 3 per day as specified
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Utility method to create a new session
  static createSession(
    format: string,
    participants?: string[],
    topic?: string
  ): ConversationSession {
    return {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      format,
      participants: participants || [],
      topic: topic || '',
      history: [],
      status: 'pending',
      createdAt: Date.now(),
      metadata: {
        maxTurns: 0,
        temperature: 0.6,
        isFormal: false
      }
    };
  }
}