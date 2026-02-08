// Proposal Service - THE HUB of the entire system
// Single entry point for ALL proposals
import { z } from 'zod';
import { 
  Proposal, 
  CreateProposalResult, 
  AgentId, 
  StepKind 
} from './types';
import { CapGates } from './cap-gates';
import { PolicyEngine } from './policy-engine';
import { MissionCreator } from './mission-creator';
import { EventEmitter } from './event-emitter';

// Input validation schemas
const ProposalInputSchema = z.object({
  agentId: z.enum(['atlas', 'sage', 'scout', 'growth', 'intel', 'observer', 'x-alt', 'content', 'social', 'creative']),
  title: z.string().min(1).max(255),
  proposedSteps: z.array(
    z.enum(['execute_trade', 'close_position', 'scale_position', 'analyze_signal', 
            'calculate_risk', 'monitor_position', 'roundtable_conversation', 
            'create_content', 'post_social', 'design_asset'])
  ).min(1).max(20),
  metadata: z.record(z.any()).optional(),
});

// Mock database functions
const mockDb = {
  createProposal: async (proposal: Omit<Proposal, 'id' | 'created_at' | 'updated_at'>): Promise<Proposal> => {
    // In real implementation: INSERT INTO ops_trading_proposals (...)
    return {
      ...proposal,
      id: `proposal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date(),
      updated_at: new Date()
    };
  }
};

export class ProposalService {
  private capGates: CapGates;
  private policyEngine: PolicyEngine;
  private missionCreator: MissionCreator;
  private eventEmitter: EventEmitter;

  constructor() {
    this.capGates = new CapGates();
    this.policyEngine = new PolicyEngine();
    this.missionCreator = new MissionCreator();
    this.eventEmitter = new EventEmitter();
  }

  /**
   * SINGLE ENTRY POINT for ALL proposals
   * 1. Validate proposal
   * 2. Check cap gates for each step kind
   * 3. Evaluate auto-approval policy
   * 4. Either auto-approve and create mission, or mark as pending
   * 5. Emit events for all actions
   */
  async createProposalAndMaybeAutoApprove(
    agentId: AgentId,
    title: string,
    proposedSteps: StepKind[],
    metadata: Record<string, any> = {}
  ): Promise<CreateProposalResult> {
    try {
      // 1. Validate inputs
      const validated = ProposalInputSchema.safeParse({
        agentId,
        title,
        proposedSteps,
        metadata,
      });
      
      if (!validated.success) {
        const errorMessages = validated.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        return {
          success: false,
          error: `Validation error: ${errorMessages}`
        };
      }
      
      // Use validated data
      const validData = validated.data;

      // 2. Create proposal record
      const proposal: Proposal = await mockDb.createProposal({
        agent_id: agentId,
        title,
        signal_type: metadata.signal_type,
        entry_price: metadata.entry_price,
        target: metadata.target,
        stop_loss: metadata.stop_loss,
        status: 'pending',
        proposed_steps: proposedSteps,
        metadata
      });

      // Emit proposal created event
      await this.eventEmitter.emitProposalCreated(
        agentId,
        proposal.id!,
        title,
        proposedSteps
      );

      // 3. Check cap gates for each step kind
      const gateResults = await this.checkAllCapGates(proposedSteps, metadata);
      const failedGate = gateResults.find(result => !result.allowed);
      
      if (failedGate) {
        // Emit rejection event
        await this.eventEmitter.emitProposalRejected(
          agentId,
          proposal.id!,
          title,
          failedGate.reason || 'Cap gate check failed',
          failedGate.stepKind
        );

        // Update proposal status
        // In real implementation: UPDATE ops_trading_proposals SET status = 'rejected' WHERE id = $1
        console.log(`Proposal ${proposal.id} rejected by ${failedGate.stepKind} gate: ${failedGate.reason}`);

        return {
          success: false,
          proposal,
          error: `Cap gate failed for ${failedGate.stepKind}: ${failedGate.reason}`
        };
      }

      // Emit all gates passed event
      for (const result of gateResults) {
        await this.eventEmitter.emitCapGatePassed(
          result.stepKind,
          proposal.id!,
          { limit: result.limit, current: result.current }
        );
      }

      // 4. Evaluate auto-approval policy
      const shouldAutoApprove = await this.policyEngine.evaluateAutoApprove(proposedSteps);
      
      if (shouldAutoApprove) {
        // 5. Auto-approve and create mission
        return await this.autoApproveAndCreateMission(proposal);
      } else {
        // 6. Mark as pending (requires roundtable)
        return await this.markAsPendingReview(proposal);
      }

    } catch (error) {
      console.error('Error in createProposalAndMaybeAutoApprove:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check all cap gates for a list of step kinds
   */
  private async checkAllCapGates(
    stepKinds: StepKind[],
    metadata: Record<string, any>
  ): Promise<Array<{ stepKind: string; allowed: boolean; reason?: string; limit?: number; current?: number }>> {
    const results = [];
    
    for (const stepKind of stepKinds) {
      const result = await this.capGates.checkGate(stepKind, metadata);
      results.push({
        stepKind,
        allowed: result.allowed,
        reason: result.reason,
        limit: result.limit,
        current: result.current
      });
      
      // If any gate fails, we can short-circuit (optional optimization)
      // if (!result.allowed) break;
    }
    
    return results;
  }

  /**
   * Auto-approve proposal and create mission
   */
  private async autoApproveAndCreateMission(proposal: Proposal): Promise<CreateProposalResult> {
    try {
      // Create mission from proposal
      const { mission, steps } = await this.missionCreator.createMissionFromProposal({
        ...proposal,
        status: 'auto_approved'
      });

      // Emit success events
      await this.eventEmitter.emitProposalAutoApproved(
        proposal.agent_id,
        proposal.id!,
        proposal.title,
        mission.id!
      );

      await this.eventEmitter.emitMissionCreated(
        mission.id!,
        proposal.id!,
        steps.length,
        proposal.agent_id
      );

      console.log(`Proposal ${proposal.id} auto-approved, created mission ${mission.id} with ${steps.length} steps`);

      return {
        success: true,
        proposal: { ...proposal, status: 'auto_approved' },
        mission,
        steps,
        auto_approved: true
      };

    } catch (error) {
      console.error('Error in autoApproveAndCreateMission:', error);
      
      // Emit failure event
      await this.eventEmitter.emitProposalEvent(
        proposal.agent_id,
        proposal.id!,
        'auto_approval_failed',
        `Auto-approval failed: ${proposal.title}`,
        `Failed to create mission: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ['auto_approval', 'failure']
      );

      return {
        success: false,
        proposal,
        error: 'Failed to create mission from auto-approved proposal'
      };
    }
  }

  /**
   * Mark proposal as pending review (requires roundtable)
   */
  private async markAsPendingReview(proposal: Proposal): Promise<CreateProposalResult> {
    // Determine which steps require roundtable
    const roundtableSteps: string[] = [];
    for (const stepKind of proposal.proposed_steps) {
      const requiresRoundtable = await this.policyEngine.requiresRoundtable(stepKind);
      if (requiresRoundtable) {
        roundtableSteps.push(stepKind);
      }
    }

    const reason = roundtableSteps.length > 0 
      ? `Requires roundtable for steps: ${roundtableSteps.join(', ')}`
      : 'Auto-approval policy not met';

    // Update proposal status to pending
    // In real implementation: UPDATE ops_trading_proposals SET status = 'pending' WHERE id = $1
    console.log(`Proposal ${proposal.id} marked as pending: ${reason}`);

    // Emit pending event
    await this.eventEmitter.emitProposalPendingReview(
      proposal.agent_id,
      proposal.id!,
      proposal.title,
      reason
    );

    return {
      success: true,
      proposal: { ...proposal, status: 'pending' },
      auto_approved: false
    };
  }

  /**
   * Quick proposal creation helper (for common patterns)
   */
  async createTradeProposal(
    agentId: AgentId,
    token: string,
    entryPrice: number,
    size: number,
    target?: number,
    stopLoss?: number
  ): Promise<CreateProposalResult> {
    return await this.createProposalAndMaybeAutoApprove(
      agentId,
      `Trade ${token} at $${entryPrice}`,
      ['execute_trade'],
      {
        token,
        entry_price: entryPrice,
        size,
        target,
        stop_loss: stopLoss,
        signal_type: 'manual'
      }
    );
  }

  async createSignalAnalysisProposal(
    agentId: AgentId,
    token: string,
    signalSource: string,
    confidence: number
  ): Promise<CreateProposalResult> {
    return await this.createProposalAndMaybeAutoApprove(
      agentId,
      `Analyze ${token} signal from ${signalSource}`,
      ['analyze_signal'],
      {
        token,
        signal_source: signalSource,
        confidence,
        confidence_threshold: 0.60
      }
    );
  }

  async createRoundtableProposal(
    agentId: AgentId,
    topic: string,
    participants: AgentId[],
    format: string = 'debate'
  ): Promise<CreateProposalResult> {
    return await this.createProposalAndMaybeAutoApprove(
      agentId,
      `Roundtable: ${topic}`,
      ['roundtable_conversation'],
      {
        format,
        participants,
        topic
      }
    );
  }

  /**
   * Get all cap gate functions (for testing/documentation)
   */
  getAllCapGateFunctions() {
    return this.capGates.getAllGateFunctions();
  }

  /**
   * Get policy engine instance (for testing/documentation)
   */
  getPolicyEngine() {
    return this.policyEngine;
  }
}