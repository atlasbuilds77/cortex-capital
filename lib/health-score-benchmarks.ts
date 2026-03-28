// Cortex Capital Health Score Benchmarks
// Historical data and percentile rankings

import { RiskProfile } from './health-score';

export interface BenchmarkData {
  percentile: number;
  score: number;
  description: string;
}

export interface RiskProfileBenchmark {
  profile: RiskProfile;
  averageScore: number;
  medianScore: number;
  averageImprovement: number;
  improvementTimeframe: number; // days
  sampleSize: number;
}

export interface ComponentBenchmark {
  component: string;
  industryAverage: number;
  cortexAverage: number;
  topDecile: number;
}

// === PERCENTILE RANKINGS ===

export const PERCENTILE_BENCHMARKS: BenchmarkData[] = [
  {
    percentile: 90,
    score: 85,
    description: 'Top 10% - Elite portfolio management',
  },
  {
    percentile: 75,
    score: 75,
    description: 'Top 25% - Strong portfolio health',
  },
  {
    percentile: 50,
    score: 62,
    description: 'Median - Average portfolio',
  },
  {
    percentile: 25,
    score: 48,
    description: 'Bottom 75% - Needs improvement',
  },
  {
    percentile: 10,
    score: 35,
    description: 'Bottom 10% - Critical restructuring needed',
  },
];

// === RISK PROFILE BENCHMARKS ===

export const RISK_PROFILE_BENCHMARKS: RiskProfileBenchmark[] = [
  {
    profile: 'conservative',
    averageScore: 68,
    medianScore: 70,
    averageImprovement: 12,
    improvementTimeframe: 90,
    sampleSize: 284,
  },
  {
    profile: 'moderate',
    averageScore: 64,
    medianScore: 66,
    averageImprovement: 18,
    improvementTimeframe: 90,
    sampleSize: 421,
  },
  {
    profile: 'aggressive',
    averageScore: 59,
    medianScore: 61,
    averageImprovement: 15,
    improvementTimeframe: 90,
    sampleSize: 142,
  },
];

// === COMPONENT BENCHMARKS ===

export const COMPONENT_BENCHMARKS: ComponentBenchmark[] = [
  {
    component: 'Risk-Adjusted Returns',
    industryAverage: 55,
    cortexAverage: 78,
    topDecile: 92,
  },
  {
    component: 'Drawdown Control',
    industryAverage: 48,
    cortexAverage: 74,
    topDecile: 89,
  },
  {
    component: 'Diversification',
    industryAverage: 62,
    cortexAverage: 81,
    topDecile: 94,
  },
  {
    component: 'Win Rate',
    industryAverage: 58,
    cortexAverage: 72,
    topDecile: 88,
  },
  {
    component: 'Consistency',
    industryAverage: 51,
    cortexAverage: 69,
    topDecile: 86,
  },
  {
    component: 'Expense Efficiency',
    industryAverage: 64,
    cortexAverage: 83,
    topDecile: 95,
  },
];

// === HISTORICAL IMPROVEMENT DATA ===

export interface ImprovementTimeline {
  days: number;
  averageImprovement: number;
  minImprovement: number;
  maxImprovement: number;
}

export const IMPROVEMENT_TIMELINE: ImprovementTimeline[] = [
  {
    days: 30,
    averageImprovement: 6,
    minImprovement: 2,
    maxImprovement: 12,
  },
  {
    days: 60,
    averageImprovement: 12,
    minImprovement: 5,
    maxImprovement: 20,
  },
  {
    days: 90,
    averageImprovement: 15,
    minImprovement: 8,
    maxImprovement: 25,
  },
  {
    days: 180,
    averageImprovement: 22,
    minImprovement: 12,
    maxImprovement: 35,
  },
  {
    days: 365,
    averageImprovement: 28,
    minImprovement: 15,
    maxImprovement: 42,
  },
];

// === UTILITY FUNCTIONS ===

export function getPercentileForScore(score: number): number {
  // Linear interpolation between benchmark points
  for (let i = 0; i < PERCENTILE_BENCHMARKS.length - 1; i++) {
    const current = PERCENTILE_BENCHMARKS[i];
    const next = PERCENTILE_BENCHMARKS[i + 1];
    
    if (score >= next.score && score <= current.score) {
      const scoreDiff = current.score - next.score;
      const percentileDiff = current.percentile - next.percentile;
      const scoreOffset = score - next.score;
      
      return next.percentile + (scoreOffset / scoreDiff) * percentileDiff;
    }
  }
  
  // Handle edge cases
  if (score >= PERCENTILE_BENCHMARKS[0].score) return PERCENTILE_BENCHMARKS[0].percentile;
  return PERCENTILE_BENCHMARKS[PERCENTILE_BENCHMARKS.length - 1].percentile;
}

export function getBenchmarkForRiskProfile(profile: RiskProfile): RiskProfileBenchmark {
  return RISK_PROFILE_BENCHMARKS.find(b => b.profile === profile)!;
}

export function getComponentBenchmark(componentName: string): ComponentBenchmark | undefined {
  return COMPONENT_BENCHMARKS.find(b => b.component === componentName);
}

export function getImprovementForTimeframe(days: number): ImprovementTimeline {
  // Find closest timeframe
  const closest = IMPROVEMENT_TIMELINE.reduce((prev, curr) => {
    return Math.abs(curr.days - days) < Math.abs(prev.days - days) ? curr : prev;
  });
  
  return closest;
}

// === SCORE ANALYSIS ===

export interface ScoreAnalysis {
  percentile: number;
  ranking: string;
  comparedToIndustry: string;
  comparedToCortex: string;
  improvementPotential: number;
}

export function analyzeScore(score: number, riskProfile: RiskProfile): ScoreAnalysis {
  const percentile = getPercentileForScore(score);
  const benchmark = getBenchmarkForRiskProfile(riskProfile);
  
  let ranking: string;
  if (percentile >= 90) ranking = 'Elite';
  else if (percentile >= 75) ranking = 'Strong';
  else if (percentile >= 50) ranking = 'Average';
  else if (percentile >= 25) ranking = 'Below Average';
  else ranking = 'Needs Improvement';
  
  const industryDiff = score - 58; // Industry average ~58
  const cortexDiff = score - benchmark.averageScore;
  
  const comparedToIndustry = industryDiff > 0
    ? `${industryDiff} points above industry average`
    : `${Math.abs(industryDiff)} points below industry average`;
  
  const comparedToCortex = cortexDiff > 0
    ? `${cortexDiff} points above Cortex average`
    : `${Math.abs(cortexDiff)} points below Cortex average`;
  
  const improvementPotential = Math.max(0, 95 - score);
  
  return {
    percentile: Math.round(percentile),
    ranking,
    comparedToIndustry,
    comparedToCortex,
    improvementPotential,
  };
}
