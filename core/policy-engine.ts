// Policy Engine - CRUD operations for ops_policy
import { Policy } from './types';

// Mock database functions
const mockDb = {
  getPolicy: async (key: string): Promise<Policy | null> => {
    // In real implementation: SELECT * FROM ops_policy WHERE key = $1
    const mockPolicies: Record<string, any> = {
      auto_approve: {
        enabled: true,
        allowed_step_kinds: ['analyze_signal', 'monitor_position', 'calculate_risk'],
        requires_roundtable: ['execute_trade', 'close_position', 'scale_position']
      },
      trade_limits: {
        max_daily_trades: 8,
        max_open_positions: 3,
        max_position_size_usd: 60,
        min_confidence: 0.60
      },
      risk_controls: {
        max_portfolio_risk: 0.05,
        max_single_position_risk: 0.02,
        stop_loss_required: true,
        default_stop_loss_pct: -0.30
      },
      roundtable_policy: {
        enabled: true,
        max_daily_conversations: 8,
        require_for_large_trades: true,
        large_trade_threshold_usd: 40
      }
    };
    
    if (mockPolicies[key]) {
      return {
        key,
        value: mockPolicies[key],
        updated_at: new Date()
      };
    }
    return null;
  },
  
  updatePolicy: async (key: string, value: any): Promise<Policy> => {
    // In real implementation: INSERT INTO ops_policy (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
    return {
      key,
      value,
      updated_at: new Date()
    };
  },
  
  getAllPolicies: async (): Promise<Policy[]> => {
    // In real implementation: SELECT * FROM ops_policy
    const mockPolicies = [
      { key: 'auto_approve', value: { enabled: true }, updated_at: new Date() },
      { key: 'trade_limits', value: { max_daily_trades: 8 }, updated_at: new Date() },
      { key: 'risk_controls', value: { stop_loss_required: true }, updated_at: new Date() }
    ];
    return mockPolicies;
  }
};

export class PolicyEngine {
  /**
   * Get policy by key
   */
  async getPolicy(key: string): Promise<any> {
    const policy = await mockDb.getPolicy(key);
    return policy?.value || null;
  }

  /**
   * Update or create policy
   */
  async updatePolicy(key: string, value: any): Promise<Policy> {
    return await mockDb.updatePolicy(key, value);
  }

  /**
   * Get all policies
   */
  async getAllPolicies(): Promise<Policy[]> {
    return await mockDb.getAllPolicies();
  }

  /**
   * Evaluate if a proposal should auto-approve
   * Based on auto_approve policy and step kinds
   */
  async evaluateAutoApprove(stepKinds: string[]): Promise<boolean> {
    const autoApprovePolicy = await this.getPolicy('auto_approve');
    
    if (!autoApprovePolicy?.enabled) {
      return false;
    }

    // Check if ALL step kinds are in allowed list
    const allowedStepKinds = autoApprovePolicy.allowed_step_kinds || [];
    const requiresRoundtable = autoApprovePolicy.requires_roundtable || [];
    
    // If any step requires roundtable, cannot auto-approve
    const hasRoundtableRequired = stepKinds.some(step => 
      requiresRoundtable.includes(step)
    );
    
    if (hasRoundtableRequired) {
      return false;
    }

    // All steps must be in allowed list
    const allAllowed = stepKinds.every(step => 
      allowedStepKinds.includes(step)
    );

    return allAllowed;
  }

  /**
   * Check if a specific step kind requires roundtable approval
   */
  async requiresRoundtable(stepKind: string): Promise<boolean> {
    const autoApprovePolicy = await this.getPolicy('auto_approve');
    const requiresRoundtable = autoApprovePolicy?.requires_roundtable || [];
    return requiresRoundtable.includes(stepKind);
  }

  /**
   * Get trade limits policy
   */
  async getTradeLimits(): Promise<any> {
    return await this.getPolicy('trade_limits');
  }

  /**
   * Get risk controls policy
   */
  async getRiskControls(): Promise<any> {
    return await this.getPolicy('risk_controls');
  }

  /**
   * Get roundtable policy
   */
  async getRoundtablePolicy(): Promise<any> {
    return await this.getPolicy('roundtable_policy');
  }

  /**
   * Check if large trade requires roundtable
   */
  async largeTradeRequiresRoundtable(tradeSizeUsd: number): Promise<boolean> {
    const roundtablePolicy = await this.getRoundtablePolicy();
    if (!roundtablePolicy?.require_for_large_trades) {
      return false;
    }
    
    const threshold = roundtablePolicy.large_trade_threshold_usd || 40;
    return tradeSizeUsd >= threshold;
  }
}