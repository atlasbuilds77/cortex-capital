import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-middleware'
import { snaptrade } from '@/lib/integrations/snaptrade'
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
      'SELECT snaptrade_user_id, snaptrade_user_secret FROM users WHERE id = $1',
      [user.id]
    )

    const { snaptrade_user_id, snaptrade_user_secret } = result.rows[0] || {}

    if (!snaptrade_user_id || !snaptrade_user_secret) {
      return NextResponse.json({ error: 'No SnapTrade connection found' }, { status: 400 })
    }

    // Delete the account connection via SnapTrade
    await snaptrade.accountInformation.deleteUserAccount({
      userId: snaptrade_user_id,
      userSecret: snaptrade_user_secret,
      accountId: accountId,
    })

    return NextResponse.json({ 
      success: true,
      message: 'Account disconnected successfully'
    })
  } catch (error: any) {
    console.error('[SnapTrade Disconnect] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect account' },
      { status: 500 }
    )
  }
}
