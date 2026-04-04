/**
 * TRADE APPROVALS MODULE
 * 
 * Exports all approval-related functionality.
 */

export * from './types';
export * from './approval-checker';
export * from './approval-service';
export * from './approval-notifier';

// Re-export main functions for convenience
export { checkTradeApproval, needsApproval, getUserApprovalSettings } from './approval-checker';
export { 
  createApproval, 
  getPendingApprovals, 
  getApproval, 
  respondToApproval, 
  processExpiredApprovals,
  getApprovalStats 
} from './approval-service';
