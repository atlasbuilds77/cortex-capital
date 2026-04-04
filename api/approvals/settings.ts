/**
 * GET/PUT /api/approvals/settings
 * 
 * Get or update user's approval settings.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserApprovalSettings, DEFAULT_APPROVAL_SETTINGS, ApprovalSettings } from '../../lib/approvals';
import { query } from '../../lib/db';
import { authenticateRequest } from '../../lib/auth/middleware';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (req.method === 'GET') {
      const settings = await getUserApprovalSettings(user.id);
      return res.status(200).json({ settings });
    }
    
    if (req.method === 'PUT') {
      const updates = req.body as Partial<ApprovalSettings>;
      
      // Validate updates
      const allowedKeys = Object.keys(DEFAULT_APPROVAL_SETTINGS);
      const invalidKeys = Object.keys(updates).filter(k => !allowedKeys.includes(k));
      
      if (invalidKeys.length > 0) {
        return res.status(400).json({ error: `Invalid settings: ${invalidKeys.join(', ')}` });
      }
      
      // Get current settings and merge
      const current = await getUserApprovalSettings(user.id);
      const newSettings = { ...current, ...updates };
      
      // Update in database
      await query(
        `UPDATE user_preferences 
         SET approval_settings = $1, updated_at = NOW()
         WHERE user_id = $2`,
        [JSON.stringify(newSettings), user.id]
      );
      
      return res.status(200).json({ 
        success: true,
        settings: newSettings,
      });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error: any) {
    console.error('[API] Error with approval settings:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
