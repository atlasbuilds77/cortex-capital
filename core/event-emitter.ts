// Event Emitter - Write events to ops_agent_events
import { AgentEvent, AgentId } from './types';

// Mock database functions
const mockDb = {
  createEvent: async (event: Omit<AgentEvent, 'id' | 'created_at'>): Promise<AgentEvent> => {
    // In real implementation: INSERT INTO ops_agent_events (...)
    console.log(`Event emitted: ${event.kind} - ${event.title}`);
    return {
      ...event,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date()
    };
  },
  
  getRecentEvents: async (limit: number = 10): Promise<AgentEvent[]> => {
    // In real implementation: SELECT * FROM ops_agent_events ORDER BY created_at DESC LIMIT $1
    return [];
  }
};

export class EventEmitter {
  /**
   * Emit a proposal-related event
   */
  async emitProposalEvent(
    agentId: AgentId,
    proposalId: string,
    eventKind: string,
    title: string,
    summary: string,
    tags: string[] = [],
    metadata: Record<string, any> = {}
  ): Promise<AgentEvent> {
    const event: Omit<AgentEvent, 'id' | 'created_at'> = {
      agent_id: agentId,
      kind: eventKind,
      title,
      summary,
      tags: ['proposal', ...tags],
      ...metadata
    };

    return await mockDb.createEvent(event);
  }

  /**
   * Emit proposal created event
   */
  async emitProposalCreated(
    agentId: AgentId,
    proposalId: string,
    title: string,
    stepKinds: string[]
  ): Promise<AgentEvent> {
    return await this.emitProposalEvent(
      agentId,
      proposalId,
      'proposal_created',
      `Proposal created: ${title}`,
      `Agent ${agentId} created proposal with steps: ${stepKinds.join(', ')}`,
      ['creation']
    );
  }

  /**
   * Emit proposal auto-approved event
   */
  async emitProposalAutoApproved(
    agentId: AgentId,
    proposalId: string,
    title: string,
    missionId: string
  ): Promise<AgentEvent> {
    return await this.emitProposalEvent(
      agentId,
      proposalId,
      'proposal_auto_approved',
      `Proposal auto-approved: ${title}`,
      `Proposal auto-approved and created mission ${missionId}`,
      ['auto_approval', 'success']
    );
  }

  /**
   * Emit proposal pending review event
   */
  async emitProposalPendingReview(
    agentId: AgentId,
    proposalId: string,
    title: string,
    reason: string
  ): Promise<AgentEvent> {
    return await this.emitProposalEvent(
      agentId,
      proposalId,
      'proposal_pending_review',
      `Proposal pending review: ${title}`,
      `Proposal requires roundtable review: ${reason}`,
      ['pending', 'roundtable_required']
    );
  }

  /**
   * Emit proposal rejected by gate event
   */
  async emitProposalRejected(
    agentId: AgentId,
    proposalId: string,
    title: string,
    reason: string,
    gateName: string
  ): Promise<AgentEvent> {
    return await this.emitProposalEvent(
      agentId,
      proposalId,
      'proposal_rejected',
      `Proposal rejected: ${title}`,
      `Proposal rejected by ${gateName} gate: ${reason}`,
      ['rejected', 'gate_failed'],
      { gate_name: gateName, rejection_reason: reason }
    );
  }

  /**
   * Emit cap gate passed event
   */
  async emitCapGatePassed(
    stepKind: string,
    proposalId: string,
    details: Record<string, any> = {}
  ): Promise<AgentEvent> {
    return await mockDb.createEvent({
      agent_id: 'observer' as AgentId,
      kind: 'cap_gate_passed',
      title: `Cap gate passed: ${stepKind}`,
      summary: `Proposal ${proposalId} passed ${stepKind} cap gate checks`,
      tags: ['cap_gate', 'validation', 'success'],
      ...details
    });
  }

  /**
   * Emit cap gate failed event
   */
  async emitCapGateFailed(
    stepKind: string,
    proposalId: string,
    reason: string,
    details: Record<string, any> = {}
  ): Promise<AgentEvent> {
    return await mockDb.createEvent({
      agent_id: 'observer' as AgentId,
      kind: 'cap_gate_failed',
      title: `Cap gate failed: ${stepKind}`,
      summary: `Proposal ${proposalId} failed ${stepKind} cap gate: ${reason}`,
      tags: ['cap_gate', 'validation', 'failure'],
      ...details
    });
  }

  /**
   * Emit mission created event
   */
  async emitMissionCreated(
    missionId: string,
    proposalId: string,
    stepCount: number,
    agentId: AgentId
  ): Promise<AgentEvent> {
    return await mockDb.createEvent({
      agent_id: agentId,
      kind: 'mission_created',
      title: `Mission created: ${missionId}`,
      summary: `Mission created from proposal ${proposalId} with ${stepCount} steps`,
      tags: ['mission', 'creation', 'success']
    });
  }

  /**
   * Get recent events for monitoring
   */
  async getRecentEvents(limit: number = 20): Promise<AgentEvent[]> {
    return await mockDb.getRecentEvents(limit);
  }
}