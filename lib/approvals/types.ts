/**
 * TRADE APPROVAL TYPES
 */

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'auto_executed';

export type ApprovalReason = 
  | 'options_trade'
  | 'large_position'
  | 'new_symbol'
  | 'day_trade'
  | 'short_position'
  | 'manual_review';

export type ResponseMethod = 'dashboard' | 'email' | 'auto' | 'timeout';

export interface TradeData {
  symbol: string;
  action: 'buy' | 'sell';
  quantity: number;
  isOption: boolean;
  optionSymbol?: string;
  estimatedPrice?: number;
  estimatedTotal?: number;
  confidence?: number;
  reason?: string;
  direction?: 'long' | 'short';
  dte?: number;
  portfolioPercentage?: number;
}

export interface TradeApproval {
  id: string;
  userId: string;
  tradeData: TradeData;
  reasonRequired: ApprovalReason;
  status: ApprovalStatus;
  createdAt: Date;
  expiresAt: Date;
  respondedAt?: Date;
  responseMethod?: ResponseMethod;
}

export interface ApprovalSettings {
  requireOptions: boolean;
  requireLargePositions: boolean;
  largePositionThresholdPct: number;
  requireNewSymbols: boolean;
  requireDayTrades: boolean;
  requireShorts: boolean;
  autoExecuteTimeoutHours: number;
  notifyOnAutoExecute: boolean;
}

export const DEFAULT_APPROVAL_SETTINGS: ApprovalSettings = {
  requireOptions: false,           // Hands-off by default
  requireLargePositions: false,
  largePositionThresholdPct: 10,   // 10% of portfolio
  requireNewSymbols: false,
  requireDayTrades: false,
  requireShorts: false,
  autoExecuteTimeoutHours: 4,      // Auto-execute after 4 hours
  notifyOnAutoExecute: true,
};
