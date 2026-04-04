/**
 * POST /api/approvals/respond
 * 
 * Approve or reject a pending trade.
 * 
 * Body: { approvalId: string, action: 'approve' | 'reject' }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { respondToApproval, getApproval } from '../../lib/approvals';
import { sendRejectionEmail } from '../../lib/approvals/approval-notifier';
import { authenticateRequest } from '../../lib/auth/middleware';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { approvalId, action } = req.body;
    
    if (!approvalId || !action) {
      return res.status(400).json({ error: 'Missing approvalId or action' });
    }
    
    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }
    
    // Verify the approval belongs to this user
    const approval = await getApproval(approvalId);
    if (!approval) {
      return res.status(404).json({ error: 'Approval not found' });
    }
    
    if (approval.userId !== user.id) {
      return res.status(403).json({ error: 'Not authorized to respond to this approval' });
    }
    
    // Process the response
    const result = await respondToApproval(approvalId, action, 'dashboard');
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    // Send rejection email if rejected
    if (action === 'reject' && result.approval) {
      await sendRejectionEmail(user.id, result.approval);
    }
    
    return res.status(200).json({
      success: true,
      message: `Trade ${action === 'approve' ? 'approved and executed' : 'rejected'}`,
      approval: result.approval,
    });
    
  } catch (error: any) {
    console.error('[API] Error responding to approval:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
