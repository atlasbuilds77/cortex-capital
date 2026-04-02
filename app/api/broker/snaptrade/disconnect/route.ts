import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-middleware'
import { listAccounts, snaptrade } from '@/lib/integrations/snaptrade'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accountId } = await request.json()

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 })
    }

    // Get user's SnapTrade credentials
    const result = await query(
      'SELECT snaptrade_user_id, snaptrade_user_secret, selected_snaptrade_account FROM users WHERE id = $1',
      [user.userId]
    )

    const { snaptrade_user_id, snaptrade_user_secret, selected_snaptrade_account } = result.rows[0] || {}

    if (!snaptrade_user_id || !snaptrade_user_secret) {
      return NextResponse.json({ error: 'No SnapTrade connection found' }, { status: 400 })
    }

    const accounts = await listAccounts(snaptrade_user_id, snaptrade_user_secret)
    const matchedAccount = (accounts as any[]).find((account) => account.id === accountId)
    const authorizationId = matchedAccount?.brokerage_authorization?.id

    if (!authorizationId) {
      return NextResponse.json({ error: 'Account not found for this user' }, { status: 404 })
    }

    await snaptrade.connections.removeBrokerageAuthorization({
      authorizationId,
      userId: snaptrade_user_id,
      userSecret: snaptrade_user_secret,
    })

    const remainingAccounts = (accounts as any[]).filter((account) => account.id !== accountId)
    const nextSelectedAccount =
      selected_snaptrade_account === accountId
        ? remainingAccounts[0]?.id || null
        : selected_snaptrade_account || null

    await query(
      'UPDATE users SET selected_snaptrade_account = $1, updated_at = NOW() WHERE id = $2',
      [nextSelectedAccount, user.userId]
    )

    return NextResponse.json({ 
      success: true,
      message: 'Account disconnected successfully',
      selectedAccount: nextSelectedAccount,
    })
  } catch (error: any) {
    console.error('[SnapTrade Disconnect] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect account' },
      { status: 500 }
    )
  }
}
