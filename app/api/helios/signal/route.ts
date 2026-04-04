export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { placeOptionOrder, listAccounts } from '@/lib/integrations/snaptrade';

/**
 * POST /api/helios/signal
 *
 * Receives a trading signal from the Helios algorithm.
 * Authenticated via HELIOS_API_KEY (Bearer token in Authorization header).
 *
 * Body:
 * {
 *   signal_id:        string,   // Unique ID from Helios (idempotency key)
 *   ticker:           string,   // Underlying ticker, e.g. "SPY"
 *   direction:        string,   // "long" | "short" | "call" | "put"
 *   contract_symbol:  string,   // Options contract, e.g. "SPY250417C00560000"
 *   strike:           number,
 *   expiry:           string,   // ISO date "YYYY-MM-DD"
 *   entry_price:      number,
 * }
 */
export async function POST(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const apiKey = process.env.HELIOS_API_KEY;
  if (!apiKey) {
    console.error('[Helios/signal] HELIOS_API_KEY env var not set');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const provided = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!provided || provided !== apiKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Parse & validate body ───────────────────────────────────────────────────
  let body: {
    signal_id: string;
    ticker: string;
    direction: string;
    contract_symbol?: string;
    strike?: number;
    expiry?: string;
    entry_price?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { signal_id, ticker, direction } = body;

  if (!signal_id || !ticker || !direction) {
    return NextResponse.json(
      { error: 'Missing required fields: signal_id, ticker, direction' },
      { status: 400 }
    );
  }

  const validDirections = ['long', 'short', 'call', 'put'];
  if (!validDirections.includes(direction)) {
    return NextResponse.json(
      { error: `direction must be one of: ${validDirections.join(', ')}` },
      { status: 400 }
    );
  }

  // ── Store signal (idempotent via UNIQUE signal_id) ──────────────────────────
  let signalRow: { id: string };
  try {
    const insert = await query(
      `INSERT INTO helios_signals
         (signal_id, ticker, direction, contract_symbol, strike, expiry, entry_price, raw_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (signal_id) DO UPDATE
         SET status = helios_signals.status   -- no-op, just return existing
       RETURNING id`,
      [
        signal_id,
        ticker.toUpperCase(),
        direction,
        body.contract_symbol ?? null,
        body.strike ?? null,
        body.expiry ?? null,
        body.entry_price ?? null,
        JSON.stringify(body),
      ]
    );
    signalRow = insert.rows[0];
  } catch (err: any) {
    console.error('[Helios/signal] DB insert error:', err);
    return NextResponse.json({ error: 'Failed to store signal' }, { status: 500 });
  }

  // ── Fan out to all Helios-enabled users with Helios Discord role ────────────
  const usersResult = await query(
    `SELECT id, snaptrade_user_id, snaptrade_user_secret, helios_position_size
     FROM users
     WHERE helios_enabled = true
       AND has_helios_role = true
       AND snaptrade_user_id IS NOT NULL
       AND snaptrade_user_secret IS NOT NULL`
  );

  const users = usersResult.rows;
  const executionIds: string[] = [];

  // Fire executions concurrently but don't block the response
  const executions = users.map(async (u) => {
    // Create a pending execution record first
    const execInsert = await query(
      `INSERT INTO helios_executions (signal_id, user_id, status, position_size_pct)
       VALUES ($1, $2, 'pending', $3)
       RETURNING id`,
      [signalRow.id, u.id, u.helios_position_size]
    );
    const execId: string = execInsert.rows[0].id;
    executionIds.push(execId);

    try {
      // Helios sends options signals - need to use option order format
      const optionSymbol = body.contract_symbol;
      
      if (!optionSymbol) {
        throw new Error('No contract_symbol provided - required for options execution');
      }
      
      // Helios direction is "LONG" or "SHORT" (market bias)
      // The contract symbol contains C (call) or P (put)
      // For Helios signals, we're always BUYING to open the position
      // - LONG bias + Call = BUY_TO_OPEN (bullish)
      // - SHORT bias + Put = BUY_TO_OPEN (bearish via puts)
      // We don't sell-to-open naked options from Helios signals
      const optionAction: 'BUY_TO_OPEN' = 'BUY_TO_OPEN';

      // Fetch account
      const accounts = await listAccounts(u.snaptrade_user_id, u.snaptrade_user_secret);
      if (!accounts.length) throw new Error('No broker accounts linked');
      const accountId = accounts[0].id;

      // Default to 1 contract for now
      // TODO: Calculate based on position_size_pct and account balance
      const quantity = 1;

      const orderResult = await placeOptionOrder(
        u.snaptrade_user_id,
        u.snaptrade_user_secret,
        accountId,
        {
          orderType: 'Market',
          timeInForce: 'Day',
          legs: [{
            symbol: optionSymbol,
            action: optionAction,
            quantity,
          }],
        }
      );

      const brokerOrderId = (orderResult as any)?.brokerage_order_id ?? null;

      await query(
        `UPDATE helios_executions
         SET status = 'submitted', broker_order_id = $2, quantity = $3, updated_at = NOW()
         WHERE id = $1`,
        [execId, brokerOrderId, quantity]
      );
    } catch (err: any) {
      console.error(`[Helios/signal] Execution failed for user ${u.id}:`, err);
      await query(
        `UPDATE helios_executions
         SET status = 'failed', error_message = $2, updated_at = NOW()
         WHERE id = $1`,
        [execId, err.message ?? 'Unknown error']
      );
    }
  });

  // Kick off async, don't await — respond immediately to Helios
  Promise.allSettled(executions)
    .then(() => {
      // Mark signal as executed once all done (best-effort)
      query(
        `UPDATE helios_signals SET status = 'executed', executed_at = NOW() WHERE id = $1`,
        [signalRow.id]
      ).catch(console.error);
    })
    .catch(console.error);

  return NextResponse.json({
    success: true,
    signal_db_id: signalRow.id,
    users_targeted: users.length,
    message: `Signal received. Executing for ${users.length} user(s).`,
  });
}
