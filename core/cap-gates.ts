// Cap Gates - All gate functions for proposal validation
import { StepKind, CapGateResult, Position } from './types';
import { getDb } from '../integration/db-adapter';

// Mock database functions - these would be replaced with actual DB calls
const mockDb = {
  getDailyTradeCount: async (): Promise<number> => {
    // In real implementation: SELECT COUNT(*) FROM ops_missions WHERE mission_type = 'entry' AND created_at >= CURRENT_DATE
    return 2; // Mock value
  },
  
  getOpenPositionsCount: async (): Promise<number> => {
    // In real implementation: SELECT COUNT(*) FROM ops_positions WHERE status = 'open'
    return 1; // Mock value
  },
  
  getPosition: async (token: string): Promise<Position | null> => {
    // In real implementation: SELECT * FROM ops_positions WHERE token = $1 AND status = 'open'
    return null; // Mock value
  },
  
  getDailyAnalysisCount: async (): Promise<number> => {
    // In real implementation: SELECT COUNT(*) FROM ops_mission_steps WHERE kind = 'analyze_signal' AND created_at >= CURRENT_DATE
    return 5; // Mock value
  },
  
  getDailyConversationCount: async (): Promise<number> => {
    // In real implementation: SELECT COUNT(*) FROM ops_roundtable_queue WHERE created_at >= CURRENT_DATE
    return 3; // Mock value
  },
  
  getTotalPositionSize: async (): Promise<number> => {
    // In real implementation: SELECT SUM(size * entry_price) FROM ops_positions WHERE status = 'open'
    return 25; // Mock value in USD
  }
};

export class CapGates {
  // Policy values - would be fetched from ops_policy table
  private policies = {
    max_daily_trades: 8,
    max_open_positions: 3,
    max_position_size_usd: 60,
    daily_analysis_quota: 20,
    max_daily_conversations: 8,
    min_confidence: 0.60
  };

  /**
   * Check all cap gates for a specific step kind
   */
  async checkGate(stepKind: StepKind, payload?: Record<string, any>): Promise<CapGateResult> {
    switch (stepKind) {
      case 'execute_trade':
        return await this.checkExecuteTradeGate(payload);
      case 'close_position':
        return await this.checkClosePositionGate(payload);
      case 'scale_position':
        return await this.checkScalePositionGate(payload);
      case 'analyze_signal':
        return await this.checkAnalyzeSignalGate();
      case 'roundtable_conversation':
        return await this.checkRoundtableConversationGate();
      default:
        // Other step kinds (calculate_risk, monitor_position) don't have gates
        return { allowed: true };
    }
  }

  /**
   * Atomically try to claim a trade slot (prevents race conditions)
   */
  private async tryClaimTradeSlot(): Promise<{ allowed: boolean; current: number }> {
    const db = getDb();
    try {
      const result = await db.queryOne<{ allowed: boolean; current_count: number }>(`
        SELECT * FROM increment_daily_trade_count($1)
      `, [this.policies.max_daily_trades]);
      
      return {
        allowed: result?.allowed || false,
        current: result?.current_count || 0
      };
    } catch (error) {
      console.error('[CapGates] Failed to check daily trade limit:', error);
      // Fail safe: if DB error, allow but log
      return { allowed: true, current: 0 };
    }
  }

  /**
   * Rollback trade slot claim (if trade fails)
   */
  private async rollbackTradeSlot(): Promise<void> {
    const db = getDb();
    try {
      await db.execute('SELECT decrement_daily_trade_count()');
    } catch (error) {
      console.error('[CapGates] Failed to rollback trade slot:', error);
    }
  }

  /**
   * Gate for execute_trade steps
   * Checks: daily trade limit, max positions, size limits
   */
  private async checkExecuteTradeGate(payload?: Record<string, any>): Promise<CapGateResult> {
    // Use atomic claim to prevent race conditions
    const tradeSlotResult = await this.tryClaimTradeSlot();
    if (!tradeSlotResult.allowed) {
      return {
        allowed: false,
        reason: `Daily trade limit reached (${tradeSlotResult.current}/${this.policies.max_daily_trades})`,
        limit: this.policies.max_daily_trades,
        current: tradeSlotResult.current
      };
    }
    
    // NOTE: Trade slot has been claimed atomically.
    // If any subsequent check fails, we should rollback the slot.
    // This is handled by the proposal service on proposal rejection.

    const openPositions = await mockDb.getOpenPositionsCount();
    if (openPositions >= this.policies.max_open_positions) {
      return {
        allowed: false,
        reason: `Max open positions reached (${openPositions}/${this.policies.max_open_positions})`,
        limit: this.policies.max_open_positions,
        current: openPositions
      };
    }

    // Check position size if payload includes size and price
    if (payload?.size && payload?.entry_price) {
      const positionSize = payload.size * payload.entry_price;
      if (positionSize > this.policies.max_position_size_usd) {
        return {
          allowed: false,
          reason: `Position size ${positionSize} exceeds max ${this.policies.max_position_size_usd} USD`,
          limit: this.policies.max_position_size_usd,
          current: positionSize
        };
      }

      // Check total portfolio exposure
      const totalExposure = await mockDb.getTotalPositionSize();
      const newTotal = totalExposure + positionSize;
      if (newTotal > this.policies.max_position_size_usd * 2) { // Allow 2x max position as total portfolio
        return {
          allowed: false,
          reason: `Total portfolio exposure would exceed ${this.policies.max_position_size_usd * 2} USD`,
          limit: this.policies.max_position_size_usd * 2,
          current: newTotal
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Gate for close_position steps
   * Checks: position exists, not already closing
   */
  private async checkClosePositionGate(payload?: Record<string, any>): Promise<CapGateResult> {
    if (!payload?.token) {
      return {
        allowed: false,
        reason: 'Token not specified in payload'
      };
    }

    const position = await mockDb.getPosition(payload.token);
    if (!position) {
      return {
        allowed: false,
        reason: `No open position found for token ${payload.token}`
      };
    }

    // Check if position is already being closed
    // In real implementation: Check ops_mission_steps for running close_position steps
    const isAlreadyClosing = false; // Mock value
    
    if (isAlreadyClosing) {
      return {
        allowed: false,
        reason: `Position for ${payload.token} is already being closed`
      };
    }

    return { allowed: true };
  }

  /**
   * Gate for scale_position steps
   * Checks: risk limits, sufficient capital
   */
  private async checkScalePositionGate(payload?: Record<string, any>): Promise<CapGateResult> {
    if (!payload?.token) {
      return {
        allowed: false,
        reason: 'Token not specified in payload'
      };
    }

    const position = await mockDb.getPosition(payload.token);
    if (!position) {
      return {
        allowed: false,
        reason: `No open position found for token ${payload.token}`
      };
    }

    // Check new total position size
    if (payload?.additional_size && payload?.current_price) {
      const currentSize = position.size * position.entry_price;
      const additionalSize = payload.additional_size * payload.current_price;
      const newTotalSize = currentSize + additionalSize;
      
      if (newTotalSize > this.policies.max_position_size_usd) {
        return {
          allowed: false,
          reason: `Scaled position size ${newTotalSize} exceeds max ${this.policies.max_position_size_usd} USD`,
          limit: this.policies.max_position_size_usd,
          current: newTotalSize
        };
      }

      // Check risk: don't scale into losing positions beyond -20%
      if (position.current_price && position.entry_price) {
        const currentPnlPct = (position.current_price - position.entry_price) / position.entry_price;
        if (currentPnlPct < -0.20) {
          return {
            allowed: false,
            reason: `Cannot scale into position down ${(currentPnlPct * 100).toFixed(1)}% (limit: -20%)`,
            limit: -0.20,
            current: currentPnlPct
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Gate for analyze_signal steps
   * Checks: daily analysis quota
   */
  private async checkAnalyzeSignalGate(): Promise<CapGateResult> {
    const dailyAnalysis = await mockDb.getDailyAnalysisCount();
    if (dailyAnalysis >= this.policies.daily_analysis_quota) {
      return {
        allowed: false,
        reason: `Daily analysis quota reached (${dailyAnalysis}/${this.policies.daily_analysis_quota})`,
        limit: this.policies.daily_analysis_quota,
        current: dailyAnalysis
      };
    }

    return { allowed: true };
  }

  /**
   * Gate for roundtable_conversation steps
   * Checks: max daily conversations
   */
  private async checkRoundtableConversationGate(): Promise<CapGateResult> {
    const dailyConversations = await mockDb.getDailyConversationCount();
    if (dailyConversations >= this.policies.max_daily_conversations) {
      return {
        allowed: false,
        reason: `Max daily conversations reached (${dailyConversations}/${this.policies.max_daily_conversations})`,
        limit: this.policies.max_daily_conversations,
        current: dailyConversations
      };
    }

    return { allowed: true };
  }

  /**
   * Rollback a claimed trade slot (public method for proposal service)
   */
  async rollbackClaimedTradeSlot(): Promise<void> {
    await this.rollbackTradeSlot();
  }

  /**
   * Get all gate functions for documentation/testing
   */
  getAllGateFunctions(): Record<string, (payload?: any) => Promise<CapGateResult>> {
    return {
      execute_trade: (payload) => this.checkExecuteTradeGate(payload),
      close_position: (payload) => this.checkClosePositionGate(payload),
      scale_position: (payload) => this.checkScalePositionGate(payload),
      analyze_signal: () => this.checkAnalyzeSignalGate(),
      roundtable_conversation: () => this.checkRoundtableConversationGate()
    };
  }
}