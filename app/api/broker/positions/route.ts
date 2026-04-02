import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { query } from '@/lib/db'
import { listAccounts, getPositions } from '@/lib/integrations/snaptrade'

// Tradier API for fetching positions (read-only)
const TRADIER_BASE_URL = 'https://api.tradier.com/v1'

// Map Tradier symbols to sectors (simplified)
const SECTOR_MAP: Record<string, string> = {
  // Tech
  'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology', 'GOOG': 'Technology',
  'META': 'Technology', 'NVDA': 'Technology', 'AMD': 'Technology', 'INTC': 'Technology',
  'TSLA': 'Technology', 'AMZN': 'Technology', 'NFLX': 'Technology', 'CRM': 'Technology',
  'ADBE': 'Technology', 'ORCL': 'Technology', 'CSCO': 'Technology', 'AVGO': 'Technology',
  
  // Finance
  'JPM': 'Finance', 'BAC': 'Finance', 'WFC': 'Finance', 'GS': 'Finance',
  'MS': 'Finance', 'C': 'Finance', 'V': 'Finance', 'MA': 'Finance',
  'AXP': 'Finance', 'BLK': 'Finance', 'SCHW': 'Finance',
  
  // Healthcare
  'JNJ': 'Healthcare', 'UNH': 'Healthcare', 'PFE': 'Healthcare', 'ABBV': 'Healthcare',
  'MRK': 'Healthcare', 'LLY': 'Healthcare', 'TMO': 'Healthcare', 'ABT': 'Healthcare',
  
  // Consumer
  'WMT': 'Consumer', 'HD': 'Consumer', 'KO': 'Consumer', 'PEP': 'Consumer',
  'COST': 'Consumer', 'MCD': 'Consumer', 'NKE': 'Consumer', 'SBUX': 'Consumer',
  'TGT': 'Consumer', 'LOW': 'Consumer',
  
  // Energy
  'XOM': 'Energy', 'CVX': 'Energy', 'COP': 'Energy', 'SLB': 'Energy',
  'EOG': 'Energy', 'MPC': 'Energy', 'PSX': 'Energy', 'VLO': 'Energy',
  
  // Industrials
  'CAT': 'Industrials', 'BA': 'Industrials', 'UPS': 'Industrials', 'HON': 'Industrials',
  'GE': 'Industrials', 'MMM': 'Industrials', 'LMT': 'Industrials', 'RTX': 'Industrials',
  
  // ETFs
  'SPY': 'ETF/Index', 'QQQ': 'ETF/Index', 'IWM': 'ETF/Index', 'DIA': 'ETF/Index',
  'VTI': 'ETF/Index', 'VOO': 'ETF/Index', 'VXX': 'ETF/Index', 'ARKK': 'ETF/Index',
  'XLF': 'ETF/Index', 'XLE': 'ETF/Index', 'XLK': 'ETF/Index', 'XLV': 'ETF/Index',
}

function getSector(symbol: string): string {
  return SECTOR_MAP[symbol.toUpperCase()] || 'Other'
}

export const POST = requireAuth(async (req: NextRequest, user) => {
  try {
    const { token, broker } = await req.json()
    const userId = user.userId
    
    // If userId provided, try SnapTrade first
    if (userId) {
      const snapResult = await query(
        'SELECT snaptrade_user_id, snaptrade_user_secret FROM users WHERE id = $1',
        [userId]
      )
      
      const snapUserId = snapResult.rows[0]?.snaptrade_user_id
      const snapUserSecret = snapResult.rows[0]?.snaptrade_user_secret
      
      if (snapUserId && snapUserSecret) {
        try {
          const accounts = await listAccounts(snapUserId, snapUserSecret)
          const allHoldings: any[] = []
          
          for (const account of accounts as any[]) {
            const positions = await getPositions(snapUserId, snapUserSecret, account.id)
            
            for (const pos of positions as any[]) {
              allHoldings.push({
                id: pos.id || String(allHoldings.length + 1),
                symbol: pos.symbol?.symbol || 'UNKNOWN',
                shares: pos.units || 0,
                sector: getSector(pos.symbol?.symbol || ''),
                costBasis: (pos.average_purchase_price || 0) * (pos.units || 0),
                currentValue: (pos.price || 0) * (pos.units || 0),
              })
            }
          }
          
          return NextResponse.json({
            broker: 'snaptrade',
            holdings: allHoldings,
            count: allHoldings.length,
          })
        } catch (err) {
          console.error('SnapTrade positions fetch failed:', err)
          // Fall through to legacy
        }
      }
    }
    
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }
    
    if (broker === 'tradier' || !broker) {
      // Fetch from Tradier
      const accountsRes = await fetch(`${TRADIER_BASE_URL}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })
      
      if (!accountsRes.ok) {
        return NextResponse.json({ error: 'Invalid token or API error' }, { status: 401 })
      }
      
      const accountsData = await accountsRes.json()
      const accountId = accountsData.profile?.account?.account_number || 
                        accountsData.profile?.account?.[0]?.account_number
      
      if (!accountId) {
        return NextResponse.json({ error: 'No account found' }, { status: 404 })
      }
      
      // Fetch positions
      const positionsRes = await fetch(`${TRADIER_BASE_URL}/accounts/${accountId}/positions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })
      
      if (!positionsRes.ok) {
        return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 })
      }
      
      const positionsData = await positionsRes.json()
      const positions = positionsData.positions?.position || []
      
      // Normalize to array
      const posArray = Array.isArray(positions) ? positions : (positions ? [positions] : [])
      
      // Convert to holdings format
      const holdings = posArray.map((pos: any, index: number) => ({
        id: String(index + 1),
        symbol: pos.symbol,
        shares: Math.abs(pos.quantity),
        sector: getSector(pos.symbol),
        costBasis: pos.cost_basis,
        currentValue: pos.quantity * (pos.cost_basis / pos.quantity) // Approximate
      }))
      
      return NextResponse.json({
        broker: 'tradier',
        accountId,
        holdings,
        count: holdings.length
      })
    }
    
    return NextResponse.json({ error: 'Unsupported broker' }, { status: 400 })
    
  } catch (error) {
    console.error('Broker positions error:', error)
    return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 })
  }
})
