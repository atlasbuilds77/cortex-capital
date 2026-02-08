/**
 * REACTIVE Trigger Checkers
 * Respond to specific trading events
 */

import { TriggerResult, ProposalTemplate, CooldownManager, TriggerLogger } from './trigger-utils';
import { memoryEnricher } from './memory-enrichment';

const logger = TriggerLogger.getInstance();

interface TradeData {
  id: string;
  entry_price: number;
  exit_price?: number;
  pnl?: number;
  pnl_pct?: number;
  outcome_type?: 'win' | 'loss' | 'breakeven';
  token: string;
}

interface PositionData {
  id: string;
  token: string;
  entry_price: number;
  current_price: number;
  size: number;
  unrealized_pnl: number;
  stop_loss?: number;
  take_profit?: number;
  status: 'open' | 'closed';
}

interface SignalData {
  id: string;
  token: string;
  signal_type: 'buy' | 'sell' | 'scale';
  confidence: number;
  source: string;
  metadata: Record<string, any>;
}

export class ReactiveTriggers {
  private cooldownManager = new CooldownManager();

  /**
   * 1. Check for big wins (PnL > +50%)
   */
  async checkTradeBigWin(trade: TradeData): Promise<TriggerResult> {
    const triggerName = 'trade_big_win';
    const cooldownMinutes = 60;

    // Check cooldown
    if (!this.cooldownManager.canFire(triggerName, cooldownMinutes)) {
      const timeRemaining = this.cooldownManager.getTimeUntilNextFire(triggerName, cooldownMinutes);
      logger.log(triggerName, false, `Cooldown active: ${Math.ceil(timeRemaining / 60000)} minutes remaining`, { tradeId: trade.id });
      return { fired: false, triggerName };
    }

    // Check condition: PnL > +50%
    if (!trade.pnl_pct || trade.pnl_pct <= 50) {
      return { fired: false, triggerName };
    }

    // Enrich with memory (30% chance)
    const enrichment = await memoryEnricher.enrichTopicWithMemory(
      `big win analysis ${trade.token} ${trade.pnl_pct}%`,
      'growth',
      ['pattern', 'insight', 'strategy']
    );

    // Create proposal for GROWTH to analyze why it worked
    const proposal: ProposalTemplate = {
      title: `Analyze big win: ${trade.token} +${trade.pnl_pct}%`,
      agent_id: 'growth',
      signal_type: 'analysis',
      proposed_steps: [
        {
          kind: 'analyze',
          action: 'review_trade_outcome',
          payload: {
            trade_id: trade.id,
            pnl_pct: trade.pnl_pct,
            token: trade.token,
            memory_context: enrichment.usedMemory ? enrichment.memoryEntries?.map(m => m.content) : undefined
          }
        }
      ],
      metadata: {
        trigger: triggerName,
        trade_id: trade.id,
        pnl_pct: trade.pnl_pct,
        memory_enriched: enrichment.usedMemory,
        confidence_boost: enrichment.confidenceBoost
      }
    };

    // Record the fire
    this.cooldownManager.recordFire(triggerName);
    logger.log(triggerName, true, `Big win detected: ${trade.token} +${trade.pnl_pct}%`, {
      tradeId: trade.id,
      pnlPct: trade.pnl_pct,
      memoryEnriched: enrichment.usedMemory
    });

    return { fired: true, proposal, triggerName };
  }

  /**
   * 2. Check for big losses (PnL < -30%)
   */
  async checkTradeBigLoss(trade: TradeData): Promise<TriggerResult> {
    const triggerName = 'trade_big_loss';
    const cooldownMinutes = 60;

    // Check cooldown
    if (!this.cooldownManager.canFire(triggerName, cooldownMinutes)) {
      const timeRemaining = this.cooldownManager.getTimeUntilNextFire(triggerName, cooldownMinutes);
      logger.log(triggerName, false, `Cooldown active: ${Math.ceil(timeRemaining / 60000)} minutes remaining`, { tradeId: trade.id });
      return { fired: false, triggerName };
    }

    // Check condition: PnL < -30%
    if (!trade.pnl_pct || trade.pnl_pct >= -30) {
      return { fired: false, triggerName };
    }

    // Enrich with memory (30% chance)
    const enrichment = await memoryEnricher.enrichTopicWithMemory(
      `big loss diagnosis ${trade.token} ${trade.pnl_pct}%`,
      'sage',
      ['lesson', 'strategy']
    );

    // Create proposal for SAGE to diagnose what went wrong
    const proposal: ProposalTemplate = {
      title: `Diagnose big loss: ${trade.token} ${trade.pnl_pct}%`,
      agent_id: 'sage',
      signal_type: 'analysis',
      proposed_steps: [
        {
          kind: 'analyze',
          action: 'diagnose_trade_failure',
          payload: {
            trade_id: trade.id,
            pnl_pct: trade.pnl_pct,
            token: trade.token,
            memory_context: enrichment.usedMemory ? enrichment.memoryEntries?.map(m => m.content) : undefined
          }
        }
      ],
      metadata: {
        trigger: triggerName,
        trade_id: trade.id,
        pnl_pct: trade.pnl_pct,
        memory_enriched: enrichment.usedMemory,
        confidence_boost: enrichment.confidenceBoost
      }
    };

    // Record the fire
    this.cooldownManager.recordFire(triggerName);
    logger.log(triggerName, true, `Big loss detected: ${trade.token} ${trade.pnl_pct}%`, {
      tradeId: trade.id,
      pnlPct: trade.pnl_pct,
      memoryEnriched: enrichment.usedMemory
    });

    return { fired: true, proposal, triggerName };
  }

  /**
   * 3. Check for positions at risk (down -20%)
   */
  async checkPositionAtRisk(position: PositionData): Promise<TriggerResult> {
    const triggerName = 'position_at_risk';
    const cooldownMinutes = 30;

    // Check cooldown
    if (!this.cooldownManager.canFire(triggerName, cooldownMinutes)) {
      const timeRemaining = this.cooldownManager.getTimeUntilNextFire(triggerName, cooldownMinutes);
      logger.log(triggerName, false, `Cooldown active: ${Math.ceil(timeRemaining / 60000)} minutes remaining`, { positionId: position.id });
      return { fired: false, triggerName };
    }

    // Check condition: Open position down -20% or more
    const unrealizedPnlPct = ((position.current_price - position.entry_price) / position.entry_price) * 100;
    if (unrealizedPnlPct >= -20 || position.status !== 'open') {
      return { fired: false, triggerName };
    }

    // Enrich with memory (30% chance)
    const enrichment = await memoryEnricher.enrichTopicWithMemory(
      `position risk review ${position.token} ${unrealizedPnlPct.toFixed(1)}%`,
      'atlas',
      ['strategy', 'lesson']
    );

    // Create proposal for ATLAS to review position
    const proposal: ProposalTemplate = {
      title: `Review at-risk position: ${position.token} ${unrealizedPnlPct.toFixed(1)}%`,
      agent_id: 'atlas',
      signal_type: 'review',
      proposed_steps: [
        {
          kind: 'analyze',
          action: 'review_position_risk',
          payload: {
            position_id: position.id,
            unrealized_pnl_pct: unrealizedPnlPct,
            token: position.token,
            current_price: position.current_price,
            entry_price: position.entry_price,
            memory_context: enrichment.usedMemory ? enrichment.memoryEntries?.map(m => m.content) : undefined
          }
        }
      ],
      metadata: {
        trigger: triggerName,
        position_id: position.id,
        unrealized_pnl_pct: unrealizedPnlPct,
        token: position.token,
        memory_enriched: enrichment.usedMemory,
        confidence_boost: enrichment.confidenceBoost
      }
    };

    // Record the fire
    this.cooldownManager.recordFire(triggerName);
    logger.log(triggerName, true, `Position at risk: ${position.token} ${unrealizedPnlPct.toFixed(1)}%`, {
      positionId: position.id,
      pnlPct: unrealizedPnlPct,
      memoryEnriched: enrichment.usedMemory
    });

    return { fired: true, proposal, triggerName };
  }

  /**
   * 4. Check for high confidence signals (> 80%)
   */
  async checkSignalHighConfidence(signal: SignalData): Promise<TriggerResult> {
    const triggerName = 'signal_high_confidence';
    const cooldownMinutes = 15;

    // Check cooldown
    if (!this.cooldownManager.canFire(triggerName, cooldownMinutes)) {
      const timeRemaining = this.cooldownManager.getTimeUntilNextFire(triggerName, cooldownMinutes);
      logger.log(triggerName, false, `Cooldown active: ${Math.ceil(timeRemaining / 60000)} minutes remaining`, { signalId: signal.id });
      return { fired: false, triggerName };
    }

    // Check condition: Signal confidence > 80%
    if (signal.confidence <= 0.8) {
      return { fired: false, triggerName };
    }

    // Enrich with memory (30% chance)
    const enrichment = await memoryEnricher.enrichTopicWithMemory(
      `high confidence signal ${signal.token} ${Math.round(signal.confidence * 100)}%`,
      'scout',
      ['pattern', 'strategy']
    );

    // Create proposal for SCOUT to prepare execution plan
    const proposal: ProposalTemplate = {
      title: `Prepare execution for high-confidence signal: ${signal.token} ${Math.round(signal.confidence * 100)}%`,
      agent_id: 'scout',
      signal_type: signal.signal_type,
      proposed_steps: [
        {
          kind: 'analyze',
          action: 'prepare_execution_plan',
          payload: {
            signal_id: signal.id,
            confidence: signal.confidence,
            token: signal.token,
            signal_type: signal.signal_type,
            source: signal.source,
            memory_context: enrichment.usedMemory ? enrichment.memoryEntries?.map(m => m.content) : undefined
          }
        }
      ],
      metadata: {
        trigger: triggerName,
        signal_id: signal.id,
        confidence: signal.confidence,
        token: signal.token,
        memory_enriched: enrichment.usedMemory,
        confidence_boost: enrichment.confidenceBoost
      }
    };

    // Record the fire
    this.cooldownManager.recordFire(triggerName);
    logger.log(triggerName, true, `High confidence signal: ${signal.token} ${Math.round(signal.confidence * 100)}%`, {
      signalId: signal.id,
      confidence: signal.confidence,
      memoryEnriched: enrichment.usedMemory
    });

    return { fired: true, proposal, triggerName };
  }

  /**
   * 5. Check if max positions reached (3+ open positions)
   */
  async checkMaxPositionsReached(positions: PositionData[]): Promise<TriggerResult> {
    const triggerName = 'max_positions_reached';
    const cooldownMinutes = 60;

    // Check cooldown
    if (!this.cooldownManager.canFire(triggerName, cooldownMinutes)) {
      const timeRemaining = this.cooldownManager.getTimeUntilNextFire(triggerName, cooldownMinutes);
      logger.log(triggerName, false, `Cooldown active: ${Math.ceil(timeRemaining / 60000)} minutes remaining`);
      return { fired: false, triggerName };
    }

    // Check condition: 3+ open positions
    const openPositions = positions.filter(p => p.status === 'open');
    if (openPositions.length < 3) {
      return { fired: false, triggerName };
    }

    // Enrich with memory (30% chance)
    const enrichment = await memoryEnricher.enrichTopicWithMemory(
      `max positions exposure review ${openPositions.length} positions`,
      'observer',
      ['lesson', 'strategy']
    );

    // Create proposal for OBSERVER to flag exposure
    const proposal: ProposalTemplate = {
      title: `Flag max positions reached: ${openPositions.length} open positions`,
      agent_id: 'observer',
      signal_type: 'alert',
      proposed_steps: [
        {
          kind: 'analyze',
          action: 'flag_exposure_risk',
          payload: {
            open_positions_count: openPositions.length,
            positions: openPositions.map(p => ({
              id: p.id,
              token: p.token,
              unrealized_pnl: p.unrealized_pnl
            })),
            memory_context: enrichment.usedMemory ? enrichment.memoryEntries?.map(m => m.content) : undefined
          }
        }
      ],
      metadata: {
        trigger: triggerName,
        open_positions_count: openPositions.length,
        memory_enriched: enrichment.usedMemory,
        confidence_boost: enrichment.confidenceBoost
      }
    };

    // Record the fire
    this.cooldownManager.recordFire(triggerName);
    logger.log(triggerName, true, `Max positions reached: ${openPositions.length} open positions`, {
      positionCount: openPositions.length,
      memoryEnriched: enrichment.usedMemory
    });

    return { fired: true, proposal, triggerName };
  }

  /**
   * 6. Check if stop loss was hit
   */
  async checkStopLossHit(position: PositionData, previousPrice?: number): Promise<TriggerResult> {
    const triggerName = 'stop_loss_hit';
    const cooldownMinutes = 30;

    // Check cooldown
    if (!this.cooldownManager.canFire(triggerName, cooldownMinutes)) {
      const timeRemaining = this.cooldownManager.getTimeUntilNextFire(triggerName, cooldownMinutes);
      logger.log(triggerName, false, `Cooldown active: ${Math.ceil(timeRemaining / 60000)} minutes remaining`, { positionId: position.id });
      return { fired: false, triggerName };
    }

    // Check condition: Position has stop loss and current price <= stop loss
    if (!position.stop_loss || position.current_price > position.stop_loss) {
      return { fired: false, triggerName };
    }

    // Optional: Check if price just crossed below stop loss (using previous price)
    if (previousPrice && previousPrice > position.stop_loss) {
      // Price just crossed below stop loss
    }

    // Enrich with memory (30% chance)
    const enrichment = await memoryEnricher.enrichTopicWithMemory(
      `stop loss hit analysis ${position.token}`,
      'growth',
      ['lesson', 'pattern']
    );

    // Create proposal for GROWTH to analyze entry timing
    const proposal: ProposalTemplate = {
      title: `Analyze stop loss hit: ${position.token}`,
      agent_id: 'growth',
      signal_type: 'analysis',
      proposed_steps: [
        {
          kind: 'analyze',
          action: 'analyze_stop_loss_timing',
          payload: {
            position_id: position.id,
            token: position.token,
            stop_loss: position.stop_loss,
            entry_price: position.entry_price,
            current_price: position.current_price,
            memory_context: enrichment.usedMemory ? enrichment.memoryEntries?.map(m => m.content) : undefined
          }
        }
      ],
      metadata: {
        trigger: triggerName,
        position_id: position.id,
        token: position.token,
        stop_loss: position.stop_loss,
        memory_enriched: enrichment.usedMemory,
        confidence_boost: enrichment.confidenceBoost
      }
    };

    // Record the fire
    this.cooldownManager.recordFire(triggerName);
    logger.log(triggerName, true, `Stop loss hit: ${position.token} at ${position.stop_loss}`, {
      positionId: position.id,
      stopLoss: position.stop_loss,
      currentPrice: position.current_price,
      memoryEnriched: enrichment.usedMemory
    });

    return { fired: true, proposal, triggerName };
  }

  /**
   * Get all cooldown states
   */
  getCooldownStates(): Record<string, any> {
    return this.cooldownManager.getAllStates();
  }

  /**
   * Clear cooldown for a specific trigger
   */
  clearCooldown(triggerName: string): void {
    this.cooldownManager.clearCooldown(triggerName);
  }
}

// Singleton instance
export const reactiveTriggers = new ReactiveTriggers();