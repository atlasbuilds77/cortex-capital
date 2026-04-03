/**
 * POSITION CONTEXT - Makes agents aware of current positions
 * 
 * Provides:
 * - All open positions with entry, current price, P&L
 * - Distance to stop loss and take profit
 * - Risk exposure summary
 * - Alerts for positions near SL/TP
 */

import { query } from '../db';
import { calculatePositionSize, RiskProfile } from '../position-sizing';

export interface PositionData {
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  distanceToStop: number;  // percentage
  distanceToTP: number;    // percentage
  status: 'healthy' | 'warning' | 'critical';
}

export interface PositionContextSummary {
  positions: PositionData[];
  totalPnl: number;
  totalExposure: number;
  openPositionCount: number;
  alertMessages: string[];
  contextForAgents: string;
}

/**
 * Fetch open positions from database for a user
 */
export async function getOpenPositions(userId: string): Promise<PositionData[]> {
  try {
    const result = await query(`
      SELECT 
        COALESCE(symbol, ticker) as symbol,
        COALESCE(position_type, 'long') as side,
        COALESCE(quantity, shares, 0) as quantity,
        COALESCE(avg_cost, cost_basis, 0) as entry_price,
        COALESCE(current_price, 0) as current_price,
        NULL as stop_loss_price,
        NULL as take_profit_price,
        COALESCE(unrealized_pnl, pnl, 0) as unrealized_pnl
      FROM positions 
      WHERE user_id = $1
      ORDER BY updated_at DESC
    `, [userId]);

    return result.rows.map((row: any) => {
      const entryPrice = parseFloat(row.entry_price);
      const currentPrice = parseFloat(row.current_price) || entryPrice;
      const stopLossPrice = parseFloat(row.stop_loss_price) || entryPrice * 0.93;
      const takeProfitPrice = parseFloat(row.take_profit_price) || entryPrice * 1.15;
      
      const pnl = parseFloat(row.unrealized_pnl) || 0;
      const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
      
      const distanceToStop = ((currentPrice - stopLossPrice) / currentPrice) * 100;
      const distanceToTP = ((takeProfitPrice - currentPrice) / currentPrice) * 100;
      
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (distanceToStop < 2) status = 'critical';
      else if (distanceToStop < 5) status = 'warning';
      
      return {
        symbol: row.symbol,
        side: row.side || 'long',
        quantity: parseInt(row.quantity),
        entryPrice,
        currentPrice,
        pnl,
        pnlPercent,
        stopLossPrice,
        takeProfitPrice,
        stopLossPercent: ((entryPrice - stopLossPrice) / entryPrice) * 100,
        takeProfitPercent: ((takeProfitPrice - entryPrice) / entryPrice) * 100,
        distanceToStop,
        distanceToTP,
        status,
      };
    });
  } catch (error) {
    console.error('[PositionContext] Failed to fetch positions:', error);
    return [];
  }
}

/**
 * Generate context string for agents about current positions
 */
export async function getPositionContextForAgents(userId: string): Promise<PositionContextSummary> {
  const positions = await getOpenPositions(userId);
  
  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
  const totalExposure = positions.reduce((sum, p) => sum + (p.quantity * p.currentPrice), 0);
  const alertMessages: string[] = [];
  
  // Generate alerts for positions needing attention
  for (const pos of positions) {
    if (pos.status === 'critical') {
      alertMessages.push(`🚨 ${pos.symbol} is ${pos.distanceToStop.toFixed(1)}% from STOP LOSS`);
    } else if (pos.status === 'warning') {
      alertMessages.push(`⚠️ ${pos.symbol} approaching stop (${pos.distanceToStop.toFixed(1)}% away)`);
    }
    if (pos.distanceToTP < 3) {
      alertMessages.push(`🎯 ${pos.symbol} is ${pos.distanceToTP.toFixed(1)}% from TAKE PROFIT`);
    }
  }
  
  // Build context string for agent prompts
  let contextForAgents = '';
  
  if (positions.length === 0) {
    contextForAgents = '📊 CURRENT POSITIONS: None (fully cash)\n';
  } else {
    contextForAgents = `📊 CURRENT POSITIONS (${positions.length}):\n`;
    contextForAgents += `Total P&L: ${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)} | Exposure: $${totalExposure.toFixed(0)}\n\n`;
    
    for (const pos of positions) {
      const statusIcon = pos.status === 'critical' ? '🔴' : pos.status === 'warning' ? '🟡' : '🟢';
      contextForAgents += `${statusIcon} ${pos.symbol}: ${pos.side.toUpperCase()} ${pos.quantity} @ $${pos.entryPrice.toFixed(2)}\n`;
      contextForAgents += `   Now: $${pos.currentPrice.toFixed(2)} | P&L: ${pos.pnlPercent >= 0 ? '+' : ''}${pos.pnlPercent.toFixed(1)}%\n`;
      contextForAgents += `   Stop: $${pos.stopLossPrice.toFixed(2)} (${pos.distanceToStop.toFixed(1)}% away) | TP: $${pos.takeProfitPrice.toFixed(2)} (${pos.distanceToTP.toFixed(1)}% away)\n\n`;
    }
    
    if (alertMessages.length > 0) {
      contextForAgents += '⚡ ALERTS:\n' + alertMessages.map(a => `  ${a}`).join('\n') + '\n';
    }
  }
  
  return {
    positions,
    totalPnl,
    totalExposure,
    openPositionCount: positions.length,
    alertMessages,
    contextForAgents,
  };
}

/**
 * Check if any positions need immediate attention
 * Call this before any agent discussion
 */
export async function getUrgentPositionAlerts(userId: string): Promise<string[]> {
  const { positions } = await getPositionContextForAgents(userId);
  return positions
    .filter(p => p.status === 'critical' || p.distanceToTP < 2)
    .map(p => {
      if (p.distanceToStop < 2) {
        return `URGENT: ${p.symbol} is ${p.distanceToStop.toFixed(1)}% from stop loss - consider action`;
      }
      if (p.distanceToTP < 2) {
        return `TARGET: ${p.symbol} is ${p.distanceToTP.toFixed(1)}% from take profit - consider taking gains`;
      }
      return '';
    })
    .filter(Boolean);
}
