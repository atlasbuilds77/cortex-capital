// Cortex Capital Health Score API Routes
// Next.js API route handlers for health score calculations

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateHealthScore,
  predictImprovement,
  getScoreBreakdown,
  PortfolioMetrics,
  RiskProfile,
} from '../lib/health-score';
import {
  PERCENTILE_BENCHMARKS,
  RISK_PROFILE_BENCHMARKS,
  COMPONENT_BENCHMARKS,
  IMPROVEMENT_TIMELINE,
  analyzeScore,
  getPercentileForScore,
} from '../lib/health-score-benchmarks';

// === POST /api/health-score/calculate ===
// Calculate health score from portfolio data

export async function POST_calculate(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate required fields
    const requiredFields = [
      'sharpeRatio',
      'maxDrawdown',
      'positionCount',
      'sectorCount',
      'winningTrades',
      'totalTrades',
      'monthlyReturnStdDev',
      'expenseRatio',
    ];
    
    for (const field of requiredFields) {
      if (body[field] === undefined) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    const metrics: PortfolioMetrics = {
      sharpeRatio: Number(body.sharpeRatio),
      maxDrawdown: Number(body.maxDrawdown),
      positionCount: Number(body.positionCount),
      sectorCount: Number(body.sectorCount),
      largestPositionWeight: Number(body.largestPositionWeight || 0),
      winningTrades: Number(body.winningTrades),
      totalTrades: Number(body.totalTrades),
      monthlyReturnStdDev: Number(body.monthlyReturnStdDev),
      expenseRatio: Number(body.expenseRatio),
      riskProfile: body.riskProfile as RiskProfile || 'moderate',
    };
    
    // Calculate health score
    const healthScore = calculateHealthScore(metrics);
    
    // Add percentile and analysis
    const percentile = getPercentileForScore(healthScore.score);
    const analysis = analyzeScore(healthScore.score, metrics.riskProfile!);
    
    return NextResponse.json({
      success: true,
      data: {
        ...healthScore,
        percentile,
        analysis,
      },
    });
  } catch (error) {
    console.error('Error calculating health score:', error);
    return NextResponse.json(
      { error: 'Failed to calculate health score' },
      { status: 500 }
    );
  }
}

// === POST /api/health-score/predict ===
// Get projected score improvement with Cortex

export async function POST_predict(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (!body.currentScore) {
      return NextResponse.json(
        { error: 'Missing required field: currentScore' },
        { status: 400 }
      );
    }
    
    const currentScore = Number(body.currentScore);
    const riskProfile: RiskProfile = body.riskProfile || 'moderate';
    
    // Get prediction
    const prediction = predictImprovement(currentScore, riskProfile);
    
    // Add additional context
    const analysis = analyzeScore(currentScore, riskProfile);
    const projectedAnalysis = analyzeScore(prediction.projectedScore, riskProfile);
    
    return NextResponse.json({
      success: true,
      data: {
        ...prediction,
        currentAnalysis: analysis,
        projectedAnalysis,
        message: `Based on ${prediction.similarPortfolios} similar ${riskProfile} portfolios`,
      },
    });
  } catch (error) {
    console.error('Error predicting improvement:', error);
    return NextResponse.json(
      { error: 'Failed to predict improvement' },
      { status: 500 }
    );
  }
}

// === GET /api/health-score/benchmarks ===
// Get benchmark data for comparison

export async function GET_benchmarks(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const riskProfile = searchParams.get('riskProfile') as RiskProfile | null;
    
    const response: any = {
      success: true,
      data: {
        percentiles: PERCENTILE_BENCHMARKS,
        components: COMPONENT_BENCHMARKS,
        improvementTimeline: IMPROVEMENT_TIMELINE,
        riskProfiles: RISK_PROFILE_BENCHMARKS,
      },
    };
    
    // Add specific risk profile data if requested
    if (riskProfile) {
      const profileBenchmark = RISK_PROFILE_BENCHMARKS.find(
        b => b.profile === riskProfile
      );
      if (profileBenchmark) {
        response.data.selectedProfile = profileBenchmark;
      }
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching benchmarks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch benchmarks' },
      { status: 500 }
    );
  }
}

// === ROUTE EXPORTS (Next.js App Router format) ===

export async function POST(req: NextRequest) {
  const { pathname } = new URL(req.url);
  
  if (pathname.endsWith('/calculate')) {
    return POST_calculate(req);
  } else if (pathname.endsWith('/predict')) {
    return POST_predict(req);
  }
  
  return NextResponse.json(
    { error: 'Invalid endpoint' },
    { status: 404 }
  );
}

export async function GET(req: NextRequest) {
  const { pathname } = new URL(req.url);
  
  if (pathname.endsWith('/benchmarks')) {
    return GET_benchmarks(req);
  }
  
  return NextResponse.json(
    { error: 'Invalid endpoint' },
    { status: 404 }
  );
}
