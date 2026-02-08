// Event emitter for the autonomous trading company
// Writes events to ops_agent_events and triggers reaction evaluation
import { Event } from './types';

export class EventEmitter {
  private db: any; // Database connection - to be injected
  private reactionEvaluator: any; // ReactionEvaluator instance - to be injected
  
  constructor(db: any, reactionEvaluator: any) {
    this.db = db;
    this.reactionEvaluator = reactionEvaluator;
  }
  
  /**
   * Emit an event and write to ops_agent_events
   * @param agentId The agent who generated the event
   * @param kind Event kind/category
   * @param title Event title
   * @param summary Event summary/description
   * @param tags Array of tags for pattern matching
   * @param metadata Optional metadata
   * @param tradeId Optional trade ID if related to a trade
   * @param pnl Optional P&L if trade-related
   * @returns The created event record
   */
  async emitEvent(
    agentId: string,
    kind: string,
    title: string,
    summary: string,
    tags: string[],
    metadata?: Record<string, any>,
    tradeId?: string,
    pnl?: number
  ): Promise<Event> {
    const event: Event = {
      agent_id: agentId,
      kind,
      title,
      summary,
      tags,
      metadata,
      trade_id: tradeId,
      pnl,
      created_at: new Date()
    };
    
    try {
      // Write to ops_agent_events table
      const [result] = await this.db('ops_agent_events').insert(event).returning('*');
      const createdEvent = result as Event;
      
      console.log(`📝 Event emitted: ${kind} - ${title} by ${agentId}`);
      
      // Trigger reaction evaluation
      await this.reactionEvaluator.evaluateReactionMatrix(createdEvent);
      
      return createdEvent;
    } catch (error) {
      console.error('Failed to emit event:', error);
      throw error;
    }
  }
  
  /**
   * Helper method for common event types
   */
  
  async emitTradeEvent(
    agentId: string,
    tradeId: string,
    title: string,
    summary: string,
    pnl?: number,
    metadata?: Record<string, any>
  ): Promise<Event> {
    const tags = ['trade'];
    if (pnl !== undefined) {
      if (pnl > 0.5) tags.push('big_win');
      if (pnl < -0.3) tags.push('big_loss');
    }
    
    return this.emitEvent(
      agentId,
      'trade',
      title,
      summary,
      tags,
      metadata,
      tradeId,
      pnl
    );
  }
  
  async emitSignalEvent(
    agentId: string,
    title: string,
    summary: string,
    confidence: number,
    metadata?: Record<string, any>
  ): Promise<Event> {
    const tags = ['signal'];
    if (confidence > 0.8) tags.push('high_confidence');
    
    return this.emitEvent(
      agentId,
      'signal',
      title,
      summary,
      tags,
      { ...metadata, confidence },
      undefined,
      undefined
    );
  }
  
  async emitRiskEvent(
    agentId: string,
    title: string,
    summary: string,
    severity: 'low' | 'medium' | 'high',
    metadata?: Record<string, any>
  ): Promise<Event> {
    const tags = ['risk'];
    if (severity === 'high') tags.push('warning');
    
    return this.emitEvent(
      agentId,
      'risk',
      title,
      summary,
      tags,
      { ...metadata, severity },
      undefined,
      undefined
    );
  }
  
  async emitExecutionEvent(
    agentId: string,
    title: string,
    summary: string,
    metadata?: Record<string, any>
  ): Promise<Event> {
    return this.emitEvent(
      agentId,
      'execution',
      title,
      summary,
      ['trade', 'executed'],
      metadata,
      undefined,
      undefined
    );
  }
  
  async emitInsightEvent(
    agentId: string,
    title: string,
    summary: string,
    insightType: string,
    metadata?: Record<string, any>
  ): Promise<Event> {
    return this.emitEvent(
      agentId,
      'insight',
      title,
      summary,
      ['insight', insightType],
      metadata,
      undefined,
      undefined
    );
  }
  
  async emitErrorEvent(
    agentId: string,
    title: string,
    summary: string,
    errorType: string,
    metadata?: Record<string, any>
  ): Promise<Event> {
    return this.emitEvent(
      agentId,
      'error',
      title,
      summary,
      ['error', errorType],
      metadata,
      undefined,
      undefined
    );
  }
}