export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/db';
import { listAccounts, listConnections } from '@/lib/integrations/snaptrade';

/**
 * GET /api/broker/snaptrade/accounts
 * 
 * List all connected broker accounts for the user.
 */
export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    // Get SnapTrade credentials and selected account
    const result = await query(
      'SELECT snaptrade_user_id, snaptrade_user_secret, selected_snaptrade_account FROM users WHERE id = $1',
      [user.userId]
    );

    const snaptradeUserId = result.rows[0]?.snaptrade_user_id;
    const snaptradeUserSecret = result.rows[0]?.snaptrade_user_secret;
    const selectedAccount = result.rows[0]?.selected_snaptrade_account;

    if (!snaptradeUserId || !snaptradeUserSecret) {
      return NextResponse.json({
        connected: false,
        accounts: [],
        message: 'No broker connected. Use /api/broker/snaptrade/connect to link a broker.',
      });
    }

    // Get all connections and accounts
    const [connections, accounts] = await Promise.all([
      listConnections(snaptradeUserId, snaptradeUserSecret),
      listAccounts(snaptradeUserId, snaptradeUserSecret),
    ]);

    // Determine which account is selected (default to first if none)
    const accountList = accounts.map((a: any) => ({
      id: a.id,
      name: a.name,
      number: a.number,
      type: a.meta?.type || 'Unknown',
      brokerage: a.brokerage_authorization?.brokerage?.name,
      syncStatus: a.sync_status?.holdings?.last_successful_sync,
    }));

    const activeAccount = selectedAccount || (accountList.length > 0 ? accountList[0].id : null);

    return NextResponse.json({
      connected: accounts.length > 0,
      selectedAccount: activeAccount,
      connections: connections.map((c: any) => ({
        id: c.id,
        brokerage: c.brokerage?.name,
        brokerageType: c.brokerage?.slug,
        status: c.disabled ? 'disabled' : 'active',
        createdAt: c.created_date,
      })),
      accounts: accountList,
    });

  } catch (error: any) {
    console.error('[SnapTrade Accounts] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
});
