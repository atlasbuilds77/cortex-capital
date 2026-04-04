/**
 * GET /api/approvals/pending
 * 
 * Returns pending trade approvals for the authenticated user.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPendingApprovals, getApprovalStats } from '../../lib/approvals';
import { authenticateRequest } from '../../lib/auth/middleware';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const [pending, stats] = await Promise.all([
      getPendingApprovals(user.id),
      getApprovalStats(user.id),
    ]);
    
    return res.status(200).json({
      pending,
      stats,
    });
    
  } catch (error: any) {
    console.error('[API] Error fetching pending approvals:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
