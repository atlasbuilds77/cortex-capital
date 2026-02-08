// Mission Creator - Turns approved proposals into missions + steps
import { Proposal, Mission, MissionStep, StepKind, AgentId } from './types';

// Mock database functions
const mockDb = {
  createMission: async (mission: Omit<Mission, 'id' | 'created_at' | 'updated_at'>): Promise<Mission> => {
    // In real implementation: INSERT INTO ops_missions (...)
    return {
      ...mission,
      id: `mission_${Date.now()}`,
      created_at: new Date(),
      updated_at: new Date()
    };
  },
  
  createMissionStep: async (step: Omit<MissionStep, 'id' | 'created_at' | 'updated_at'>): Promise<MissionStep> => {
    // In real implementation: INSERT INTO ops_mission_steps (...)
    return {
      ...step,
      id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date(),
      updated_at: new Date()
    };
  },
  
  updateProposalStatus: async (proposalId: string, status: string): Promise<void> => {
    // In real implementation: UPDATE ops_trading_proposals SET status = $1 WHERE id = $2
    console.log(`Updating proposal ${proposalId} to status ${status}`);
  }
};

export class MissionCreator {
  /**
   * Create mission and steps from an approved proposal
   */
  async createMissionFromProposal(proposal: Proposal): Promise<{
    mission: Mission;
    steps: MissionStep[];
  }> {
    // Determine mission type based on step kinds
    const missionType = this.determineMissionType(proposal.proposed_steps);
    
    // Create mission
    const mission: Mission = await mockDb.createMission({
      title: proposal.title,
      status: 'approved',
      created_by: proposal.agent_id,
      mission_type: missionType,
      proposal_id: proposal.id
    });

    // Create steps
    const steps: MissionStep[] = [];
    for (const stepKind of proposal.proposed_steps) {
      const step = await mockDb.createMissionStep({
        mission_id: mission.id!,
        kind: stepKind as StepKind,
        status: 'queued',
        payload: this.createStepPayload(stepKind, proposal)
      });
      steps.push(step);
    }

    // Update proposal status
    await mockDb.updateProposalStatus(proposal.id!, 'accepted');

    return { mission, steps };
  }

  /**
   * Determine mission type based on step kinds
   */
  private determineMissionType(stepKinds: string[]): Mission['mission_type'] {
    if (stepKinds.includes('execute_trade')) {
      return 'entry';
    } else if (stepKinds.includes('close_position')) {
      return 'exit';
    } else if (stepKinds.includes('scale_position')) {
      return 'scale';
    } else if (stepKinds.includes('roundtable_conversation')) {
      return 'conversation';
    } else if (stepKinds.includes('analyze_signal')) {
      return 'analysis';
    }
    return 'analysis'; // default
  }

  /**
   * Create appropriate payload for each step kind
   */
  private createStepPayload(stepKind: string, proposal: Proposal): Record<string, any> {
    const basePayload = {
      proposal_id: proposal.id,
      agent_id: proposal.agent_id,
      title: proposal.title
    };

    switch (stepKind) {
      case 'execute_trade':
        return {
          ...basePayload,
          token: proposal.metadata?.token,
          entry_price: proposal.entry_price,
          size: proposal.metadata?.size,
          target: proposal.target,
          stop_loss: proposal.stop_loss,
          signal_type: proposal.signal_type
        };
      
      case 'close_position':
        return {
          ...basePayload,
          token: proposal.metadata?.token,
          reason: proposal.metadata?.close_reason || 'proposal_approved'
        };
      
      case 'scale_position':
        return {
          ...basePayload,
          token: proposal.metadata?.token,
          additional_size: proposal.metadata?.additional_size,
          current_price: proposal.metadata?.current_price,
          scale_direction: proposal.metadata?.scale_direction || 'add'
        };
      
      case 'analyze_signal':
        return {
          ...basePayload,
          signal_source: proposal.metadata?.signal_source,
          token: proposal.metadata?.token,
          confidence_threshold: proposal.metadata?.confidence_threshold || 0.60
        };
      
      case 'roundtable_conversation':
        return {
          ...basePayload,
          format: proposal.metadata?.format || 'debate',
          participants: proposal.metadata?.participants || ['atlas', 'sage'],
          topic: proposal.title
        };
      
      case 'calculate_risk':
        return {
          ...basePayload,
          token: proposal.metadata?.token,
          entry_price: proposal.entry_price,
          size: proposal.metadata?.size,
          portfolio_context: true
        };
      
      case 'monitor_position':
        return {
          ...basePayload,
          token: proposal.metadata?.token,
          check_interval_minutes: 5
        };
      
      default:
        return basePayload;
    }
  }

  /**
   * Create a simple mission with single step (for testing/quick proposals)
   */
  async createSimpleMission(
    title: string,
    agentId: AgentId,
    stepKind: StepKind,
    payload: Record<string, any>
  ): Promise<{ mission: Mission; step: MissionStep }> {
    const missionType = this.determineMissionType([stepKind]);
    
    const mission = await mockDb.createMission({
      title,
      status: 'approved',
      created_by: agentId,
      mission_type: missionType
    });

    const step = await mockDb.createMissionStep({
      mission_id: mission.id!,
      kind: stepKind,
      status: 'queued',
      payload
    });

    return { mission, step };
  }
}