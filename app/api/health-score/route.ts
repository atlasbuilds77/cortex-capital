import { NextRequest, NextResponse } from 'next/server'
import { calculatePortfolioMetrics } from '@/lib/polygon-data'
import { calculateHealthScore, predictImprovement, PortfolioMetrics } from '@/lib/health-score'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { holdings } = body
    
    if (!holdings || !Array.isArray(holdings)) {
      return NextResponse.json({ error: 'Holdings array required' }, { status: 400 })
    }
    
    // Get real metrics from Polygon
    const realMetrics = await calculatePortfolioMetrics(holdings)
    
    // Convert to health score format
    const metrics: PortfolioMetrics = {
      sharpeRatio: realMetrics.sharpeRatio,
      maxDrawdown: realMetrics.maxDrawdown,
      positionCount: realMetrics.positionCount,
      sectorCount: realMetrics.sectorCount,
      largestPositionWeight: realMetrics.largestPositionWeight,
      winningTrades: realMetrics.winningTrades,
      totalTrades: realMetrics.totalTrades,
      monthlyReturnStdDev: realMetrics.monthlyReturnStdDev,
      expenseRatio: realMetrics.expenseRatio,
      riskProfile: 'moderate'
    }
    
    // Calculate health score
    const healthScore = calculateHealthScore(metrics)
    const prediction = predictImprovement(healthScore.score, 'moderate')
    
    return NextResponse.json({
      healthScore,
      prediction,
      metrics: realMetrics,
      source: 'polygon'
    })
    
  } catch (error) {
    console.error('Health score calculation error:', error)
    return NextResponse.json({ error: 'Failed to calculate health score' }, { status: 500 })
  }
}
