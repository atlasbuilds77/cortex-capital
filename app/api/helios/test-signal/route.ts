export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/db';
import { listAccounts, placeOptionOrder, getOptionQuote } from '@/lib/integrations/snaptrade';

/**
 * POST /api/helios/test-signal
 * 
 * Test the Helios → SnapTrade execution flow without placing a real order.
 * Authenticated via user session (must have Helios role).
 * 
 * Body:
 * {
 *   contract_symbol: string,  // e.g. "SPY260417C00560000"
 *   dry_run?: boolean,        // default true - if false, actually places the order!
 * }
 */
export const POST = requireAuth(async (request: NextRequest, user) => {
  try {
    // Check Helios role
    const userResult = await query(
      'SELECT has_helios_role, snaptrade_user_id, snaptrade_user_secret FROM users WHERE id = $1',
      [user.userId]
    );

    const row = userResult.rows[0];
    if (!row?.has_helios_role) {
      return NextResponse.json({ error: 'Helios role required' }, { status: 403 });
    }

    if (!row.snaptrade_user_id || !row.snaptrade_user_secret) {
      return NextResponse.json({ error: 'No broker connected. Go to Settings > Brokers to connect.' }, { status: 400 });
    }

    const body = await request.json();
    const contractSymbol = body.contract_symbol;
    const dryRun = body.dry_run !== false; // default to dry run

    if (!contractSymbol) {
      return NextResponse.json({ error: 'contract_symbol required' }, { status: 400 });
    }

    const steps: { step: string; status: 'ok' | 'error'; data?: any; error?: string }[] = [];

    // Step 1: List accounts
    try {
      const accounts = await listAccounts(row.snaptrade_user_id, row.snaptrade_user_secret);
      steps.push({
        step: 'list_accounts',
        status: 'ok',
        data: accounts.map((a: any) => ({ id: a.id, name: a.name, number: a.number })),
      });

      if (!accounts.length) {
        return NextResponse.json({
          success: false,
          steps,
          error: 'No broker accounts found',
        });
      }

      const accountId = accounts[0].id;

      // Step 2: Try to get quote for the option (validates symbol format)
      try {
        const quote = await getOptionQuote(row.snaptrade_user_id, row.snaptrade_user_secret, accountId, contractSymbol);
        steps.push({
          step: 'get_option_quote',
          status: 'ok',
          data: quote,
        });
      } catch (quoteErr: any) {
        steps.push({
          step: 'get_option_quote',
          status: 'error',
          error: quoteErr.message,
        });
        // Continue anyway - quote might fail but order might work
      }

      // Step 3: Place order (or simulate)
      if (dryRun) {
        steps.push({
          step: 'place_order',
          status: 'ok',
          data: {
            dry_run: true,
            would_execute: {
              accountId,
              symbol: contractSymbol,
              action: 'BUY_TO_OPEN',
              quantity: 1,
              orderType: 'Market',
              timeInForce: 'Day',
            },
          },
        });
      } else {
        // ACTUALLY PLACE THE ORDER
        const orderResult = await placeOptionOrder(
          row.snaptrade_user_id,
          row.snaptrade_user_secret,
          accountId,
          {
            orderType: 'Market',
            timeInForce: 'Day',
            legs: [{
              symbol: contractSymbol,
              action: 'BUY_TO_OPEN',
              quantity: 1,
            }],
          }
        );
        steps.push({
          step: 'place_order',
          status: 'ok',
          data: orderResult,
        });
      }

    } catch (err: any) {
      steps.push({
        step: 'execution',
        status: 'error',
        error: err.message,
      });
    }

    const allOk = steps.every(s => s.status === 'ok');

    return NextResponse.json({
      success: allOk,
      dry_run: body.dry_run !== false,
      contract_symbol: contractSymbol,
      steps,
    });

  } catch (error: any) {
    console.error('[Helios/test-signal] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
