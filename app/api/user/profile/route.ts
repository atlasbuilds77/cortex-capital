export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/db';

export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.tier, u.risk_profile, u.email_verified, u.created_at, u.updated_at,
              up.investment_horizon, up.constraints, up.day_trading_allocation, up.options_allocation
       FROM users u
       LEFT JOIN user_preferences up ON u.id = up.user_id
       WHERE u.id = $1`,
      [user.userId]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});

export const PUT = requireAuth(async (request: NextRequest, user) => {
  try {
    const data = await request.json();
    
    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (data.email) {
      // Check if email already exists
      const existing = await query(
        `SELECT id FROM users WHERE email = $1 AND id != $2`,
        [data.email, user.userId]
      );
      
      if (existing.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Email already in use' },
          { status: 400 }
        );
      }
      
      updates.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }
    
    if (data.tier) {
      updates.push(`tier = $${paramIndex++}`);
      values.push(data.tier);
    }
    
    if (data.risk_profile) {
      updates.push(`risk_profile = $${paramIndex++}`);
      values.push(data.risk_profile);
    }
    
    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(user.userId);
    
    const result = await query(
      `UPDATE users SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, email, tier, risk_profile, updated_at`,
      values
    );
    
    // Audit
    await query(
      `INSERT INTO audit_log (user_id, action, metadata)
       VALUES ($1, 'profile_updated', $2)`,
      [user.userId, JSON.stringify(data)]
    );
    
    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});

export const DELETE = requireAuth(async (request: NextRequest, user) => {
  try {
    // Audit before deletion
    await query(
      `INSERT INTO audit_log (user_id, action, metadata)
       VALUES ($1, 'account_deleted', $2)`,
      [user.userId, JSON.stringify({ timestamp: new Date().toISOString() })]
    );
    
    // Delete user (cascade will handle related records)
    await query(
      `DELETE FROM users WHERE id = $1`,
      [user.userId]
    );
    
    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});
