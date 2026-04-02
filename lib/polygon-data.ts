// Polygon.io Market Data for Health Score
// Fetches real historical data to calculate actual portfolio metrics

const POLYGON_API_KEY = process.env.POLYGON_API_KEY || ''
const BASE_URL = 'https://api.polygon.io'

interface DailyBar {
  c: number  // close
  h: number  // high
  l: number  // low
  o: number  // open
  v: number  // volume
  t: number  // timestamp
}

interface PolygonResponse {
  results?: DailyBar[]
  status: string
  error?: string
}

export interface StockMetrics {
  symbol: string
  currentPrice: number
  returns: number[]        // daily returns
  avgReturn: number
  stdDev: number
  maxDrawdown: number
  sharpeRatio: number
  winRate: number
  totalDays: number
}

export interface PortfolioRealMetrics {
  sharpeRatio: number
  maxDrawdown: number
  positionCount: number
  sectorCount: number
  largestPositionWeight: number
  winningTrades: number
  totalTrades: number
  monthlyReturnStdDev: number
  expenseRatio: number
}

// Fetch 1 year of daily bars for a symbol
export async function fetchStockHistory(symbol: string): Promise<DailyBar[]> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setFullYear(startDate.getFullYear() - 1)
  
  const from = startDate.toISOString().split('T')[0]
  const to = endDate.toISOString().split('T')[0]
  
  const url = `${BASE_URL}/v2/aggs/ticker/${symbol}/range/1/day/${from}/${to}?adjusted=true&sort=asc&apiKey=${POLYGON_API_KEY}`
  
  try {
    const response = await fetch(url)
    const data: PolygonResponse = await response.json()
    
    if (data.results && data.results.length > 0) {
      return data.results
    }
    return []
  } catch (error) {
    console.error(`Failed to fetch ${symbol}:`, error)
    return []
  }
}

// Calculate metrics for a single stock
export function calculateStockMetrics(symbol: string, bars: DailyBar[]): StockMetrics | null {
  if (bars.length < 30) return null // Need at least 30 days
  
  // Calculate daily returns
  const returns: number[] = []
  for (let i = 1; i < bars.length; i++) {
    const dailyReturn = (bars[i].c - bars[i - 1].c) / bars[i - 1].c
    returns.push(dailyReturn)
  }
  
  // Average return
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
  
  // Standard deviation
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  const stdDev = Math.sqrt(variance)
  
  // Max drawdown
  let peak = bars[0].c
  let maxDrawdown = 0
  for (const bar of bars) {
    if (bar.c > peak) peak = bar.c
    const drawdown = (peak - bar.c) / peak
    if (drawdown > maxDrawdown) maxDrawdown = drawdown
  }
  
  // Sharpe ratio (annualized, assuming 0% risk-free rate for simplicity)
  const annualizedReturn = avgReturn * 252
  const annualizedStdDev = stdDev * Math.sqrt(252)
  const sharpeRatio = annualizedStdDev > 0 ? annualizedReturn / annualizedStdDev : 0
  
  // Win rate
  const winningDays = returns.filter(r => r > 0).length
  const winRate = winningDays / returns.length
  
  return {
    symbol,
    currentPrice: bars[bars.length - 1].c,
    returns,
    avgReturn,
    stdDev,
    maxDrawdown,
    sharpeRatio,
    winRate,
    totalDays: returns.length
  }
}

// Calculate portfolio-level metrics from multiple stocks
export async function calculatePortfolioMetrics(
  holdings: { symbol: string; shares: number; sector: string }[]
): Promise<PortfolioRealMetrics> {
  const validHoldings = holdings.filter(h => h.symbol && h.shares > 0)
  
  if (validHoldings.length === 0) {
    // Return default metrics if no valid holdings
    return getDefaultMetrics()
  }
  
  // Fetch data for all symbols in parallel
  const stockDataPromises = validHoldings.map(async (holding) => {
    const bars = await fetchStockHistory(holding.symbol.toUpperCase())
    const metrics = calculateStockMetrics(holding.symbol, bars)
    return { holding, metrics, bars }
  })
  
  const results = await Promise.all(stockDataPromises)
  const validResults = results.filter(r => r.metrics !== null)
  
  if (validResults.length === 0) {
    return getDefaultMetrics()
  }
  
  // Calculate portfolio values over time
  // Find common date range
  const minLength = Math.min(...validResults.map(r => r.bars.length))
  
  // Calculate daily portfolio values
  const portfolioValues: number[] = []
  for (let i = 0; i < minLength; i++) {
    let totalValue = 0
    for (const { holding, bars } of validResults) {
      totalValue += bars[i].c * holding.shares
    }
    portfolioValues.push(totalValue)
  }
  
  // Portfolio returns
  const portfolioReturns: number[] = []
  for (let i = 1; i < portfolioValues.length; i++) {
    portfolioReturns.push((portfolioValues[i] - portfolioValues[i - 1]) / portfolioValues[i - 1])
  }
  
  // Portfolio avg return and std dev
  const avgReturn = portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length
  const variance = portfolioReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / portfolioReturns.length
  const dailyStdDev = Math.sqrt(variance)
  
  // Portfolio Sharpe
  const annualizedReturn = avgReturn * 252
  const annualizedStdDev = dailyStdDev * Math.sqrt(252)
  const sharpeRatio = annualizedStdDev > 0 ? annualizedReturn / annualizedStdDev : 0
  
  // Portfolio max drawdown
  let peak = portfolioValues[0]
  let maxDrawdown = 0
  for (const value of portfolioValues) {
    if (value > peak) peak = value
    const drawdown = (peak - value) / peak
    if (drawdown > maxDrawdown) maxDrawdown = drawdown
  }
  
  // Monthly std dev (approximate from daily)
  const monthlyReturnStdDev = dailyStdDev * Math.sqrt(21)
  
  // Win rate across all stocks
  const totalWinDays = validResults.reduce((sum, r) => {
    const wins = r.metrics!.returns.filter(ret => ret > 0).length
    return sum + wins
  }, 0)
  const totalTradeDays = validResults.reduce((sum, r) => r.metrics!.totalDays, 0)
  
  // Position weights
  const totalValue = portfolioValues[portfolioValues.length - 1]
  const weights = validResults.map(r => {
    const positionValue = r.bars[r.bars.length - 1].c * r.holding.shares
    return positionValue / totalValue
  })
  const largestPositionWeight = Math.max(...weights)
  
  // Sectors
  const sectors = new Set(validHoldings.map(h => h.sector))
  
  return {
    sharpeRatio: Math.max(0, sharpeRatio), // Floor at 0
    maxDrawdown,
    positionCount: validHoldings.length,
    sectorCount: sectors.size,
    largestPositionWeight,
    winningTrades: totalWinDays,
    totalTrades: totalTradeDays,
    monthlyReturnStdDev,
    expenseRatio: 0.005 // Assume 0.5% average expense ratio
  }
}

function getDefaultMetrics(): PortfolioRealMetrics {
  return {
    sharpeRatio: 0.5,
    maxDrawdown: 0.20,
    positionCount: 1,
    sectorCount: 1,
    largestPositionWeight: 1,
    winningTrades: 25,
    totalTrades: 50,
    monthlyReturnStdDev: 0.08,
    expenseRatio: 0.005
  }
}

// Quick price lookup for a symbol (latest price + change)
export async function getQuote(symbol: string): Promise<{ price: number; change: number; changePercent: number; volume: number } | null> {
  try {
    // Get previous close and current price
    const url = `${BASE_URL}/v2/aggs/ticker/${symbol.toUpperCase()}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.results && data.results.length > 0) {
      const bar = data.results[0]
      const prevClose = bar.o // Use open as approximation for prev close
      const currentPrice = bar.c
      const change = currentPrice - prevClose
      const changePercent = (change / prevClose) * 100
      
      return {
        price: currentPrice,
        change,
        changePercent,
        volume: bar.v || 0
      }
    }
    return null
  } catch (error) {
    console.error(`[Polygon] Quote failed for ${symbol}:`, error)
    return null
  }
}

// Get intraday bars (for more recent data)
export async function getIntradayBars(symbol: string, minutes: number = 60): Promise<DailyBar[]> {
  const now = new Date()
  const from = new Date(now.getTime() - minutes * 60 * 1000)
  
  const fromStr = from.toISOString()
  const toStr = now.toISOString()
  
  const url = `${BASE_URL}/v2/aggs/ticker/${symbol.toUpperCase()}/range/1/minute/${fromStr}/${toStr}?adjusted=true&sort=asc&apiKey=${POLYGON_API_KEY}`
  
  try {
    const response = await fetch(url)
    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error(`[Polygon] Intraday failed for ${symbol}:`, error)
    return []
  }
}
