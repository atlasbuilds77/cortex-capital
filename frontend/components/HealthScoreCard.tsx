'use client';

// Cortex Capital Health Score Card Component
// Premium animated circular gauge with score breakdown

import React, { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import {
  HealthScore,
  ComponentScore,
  Prediction,
  RiskProfile,
} from '../../lib/health-score';

interface HealthScoreCardProps {
  healthScore: HealthScore;
  prediction?: Prediction;
  showPrediction?: boolean;
  animated?: boolean;
}

export const HealthScoreCard: React.FC<HealthScoreCardProps> = ({
  healthScore,
  prediction,
  showPrediction = true,
  animated = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const controls = useAnimation();

  useEffect(() => {
    setIsVisible(true);
    if (animated) {
      controls.start({
        scale: [0.9, 1],
        opacity: [0, 1],
        transition: { duration: 0.5, ease: 'easeOut' },
      });
    }
  }, [animated, controls]);

  const { score, grade, color, breakdown } = healthScore;

  // Calculate circular gauge path
  const radius = 120;
  const strokeWidth = 20;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <motion.div
      animate={controls}
      className="w-full max-w-2xl mx-auto bg-[#1a1a1a] rounded-2xl p-8 shadow-2xl border border-[#2a2a2a]"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          Portfolio Health Score
        </h2>
        <p className="text-gray-400 text-sm">
          Your complete portfolio analysis
        </p>
      </div>

      {/* Circular Gauge */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative w-[280px] h-[280px]">
          {/* Background circle */}
          <svg
            height={radius * 2}
            width={radius * 2}
            className="transform -rotate-90"
          >
            <circle
              stroke="#2a2a2a"
              fill="transparent"
              strokeWidth={strokeWidth}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            {/* Animated progress circle */}
            <motion.circle
              stroke={color}
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference + ' ' + circumference}
              style={{ strokeDashoffset }}
              strokeLinecap="round"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              initial={{ strokeDashoffset: circumference }}
              animate={
                animated
                  ? {
                      strokeDashoffset,
                      transition: { duration: 1.5, ease: 'easeOut', delay: 0.3 },
                    }
                  : {}
              }
            />
          </svg>

          {/* Score display in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              initial={animated ? { scale: 0 } : {}}
              animate={animated ? { scale: 1 } : {}}
              transition={{ delay: 0.8, duration: 0.5, type: 'spring' }}
              className="text-center"
            >
              <div className="text-6xl font-bold" style={{ color }}>
                {score}
              </div>
              <div className="text-lg font-semibold text-gray-300 mt-1">
                {grade}
              </div>
              <div className="text-xs text-gray-500 mt-1">out of 100</div>
            </motion.div>
          </div>
        </div>

        {/* Grade description */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-400">
            {grade === 'Poor' && 'Your portfolio needs major restructuring'}
            {grade === 'Fair' && 'Your portfolio has room for improvement'}
            {grade === 'Healthy' && 'Your portfolio is well-optimized'}
          </p>
        </div>
      </div>

      {/* Prediction */}
      {showPrediction && prediction && (
        <motion.div
          initial={animated ? { opacity: 0, y: 20 } : {}}
          animate={animated ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="mb-8 p-6 bg-[#0f0f0f] rounded-xl border border-[#00C805]/20"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                Your Projected Score with Cortex
              </h3>
              <p className="text-xs text-gray-500">
                Based on {prediction.similarPortfolios} similar portfolios
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-[#00C805]">
                {prediction.projectedScore}
              </div>
              <div className="text-xs text-gray-400">in {prediction.timeframeDays} days</div>
            </div>
          </div>

          {/* Score progression */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Current</span>
                <span className="text-sm font-semibold text-white">
                  {prediction.currentScore}
                </span>
              </div>
              <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-gray-500 to-gray-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${(prediction.currentScore / 100) * 100}%` }}
                  transition={{ delay: 1.4, duration: 0.8 }}
                />
              </div>
            </div>
            <div className="text-2xl text-gray-600">→</div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Projected</span>
                <span className="text-sm font-semibold text-[#00C805]">
                  {prediction.projectedScore}
                </span>
              </div>
              <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#00C805] to-[#00ff00]"
                  initial={{ width: 0 }}
                  animate={{ width: `${(prediction.projectedScore / 100) * 100}%` }}
                  transition={{ delay: 1.6, duration: 0.8 }}
                />
              </div>
            </div>
          </div>

          {/* Improvement badge */}
          <div className="mt-4 flex items-center justify-center">
            <div className="px-4 py-2 bg-[#00C805]/10 border border-[#00C805]/30 rounded-full">
              <span className="text-sm font-semibold text-[#00C805]">
                +{prediction.improvement} point improvement
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Score Breakdown */}
      <motion.div
        initial={animated ? { opacity: 0 } : {}}
        animate={animated ? { opacity: 1 } : {}}
        transition={{ delay: 1.0, duration: 0.5 }}
      >
        <h3 className="text-lg font-semibold text-white mb-4">Score Breakdown</h3>
        <div className="space-y-4">
          {Object.values(breakdown).map((component: ComponentScore, index) => (
            <ComponentBreakdownItem
              key={component.name}
              component={component}
              delay={animated ? 1.2 + index * 0.1 : 0}
              animated={animated}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

// === COMPONENT BREAKDOWN ITEM ===

interface ComponentBreakdownItemProps {
  component: ComponentScore;
  delay: number;
  animated: boolean;
}

const ComponentBreakdownItem: React.FC<ComponentBreakdownItemProps> = ({
  component,
  delay,
  animated,
}) => {
  const getScoreColor = (score: number): string => {
    if (score <= 40) return '#EF4444'; // red
    if (score <= 70) return '#F59E0B'; // yellow
    return '#00C805'; // green
  };

  const scoreColor = getScoreColor(component.score);

  return (
    <motion.div
      initial={animated ? { opacity: 0, x: -20 } : {}}
      animate={animated ? { opacity: 1, x: 0 } : {}}
      transition={{ delay, duration: 0.4 }}
      className="bg-[#0f0f0f] p-4 rounded-lg border border-[#2a2a2a]"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-white">{component.name}</h4>
          <p className="text-xs text-gray-500 mt-1">{component.description}</p>
        </div>
        <div className="text-right ml-4">
          <div className="text-xl font-bold" style={{ color: scoreColor }}>
            {Math.round(component.score)}
          </div>
          <div className="text-xs text-gray-500">
            {(component.weight * 100).toFixed(0)}% weight
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
        <motion.div
          className="h-full"
          style={{ backgroundColor: scoreColor }}
          initial={{ width: 0 }}
          animate={{ width: `${component.score}%` }}
          transition={{ delay: delay + 0.2, duration: 0.6 }}
        />
      </div>

      {/* Recommendation */}
      {component.recommendation && (
        <div className="mt-2 text-xs text-gray-400 italic">
          💡 {component.recommendation}
        </div>
      )}
    </motion.div>
  );
};

// === EXAMPLE USAGE ===

export const HealthScoreCardExample = () => {
  // Example data - replace with actual data from API
  const exampleHealthScore: HealthScore = {
    score: 58,
    grade: 'Fair',
    color: '#F59E0B',
    breakdown: {
      riskAdjustedReturns: {
        name: 'Risk-Adjusted Returns',
        score: 45,
        weight: 0.25,
        weightedScore: 11.25,
        description: 'Sharpe Ratio: 0.8',
        recommendation: 'Focus on improving risk-adjusted performance',
      },
      drawdownControl: {
        name: 'Drawdown Control',
        score: 55,
        weight: 0.2,
        weightedScore: 11,
        description: 'Max Drawdown: 18.5%',
      },
      diversification: {
        name: 'Diversification',
        score: 60,
        weight: 0.15,
        weightedScore: 9,
        description: '8 positions across 3 sectors',
      },
      winRate: {
        name: 'Win Rate',
        score: 70,
        weight: 0.15,
        weightedScore: 10.5,
        description: '62.0% winning trades',
      },
      consistency: {
        name: 'Consistency',
        score: 52,
        weight: 0.15,
        weightedScore: 7.8,
        description: 'Monthly volatility: 8.2%',
        recommendation: 'Smooth out return volatility',
      },
      expenseEfficiency: {
        name: 'Expense Efficiency',
        score: 75,
        weight: 0.1,
        weightedScore: 7.5,
        description: 'Expense ratio: 0.45%',
      },
    },
    totalWeightedScore: 57.05,
  };

  const examplePrediction: Prediction = {
    currentScore: 58,
    projectedScore: 76,
    improvement: 18,
    timeframeDays: 90,
    confidenceMin: 71,
    confidenceMax: 81,
    riskProfile: 'moderate',
    similarPortfolios: 847,
  };

  return (
    <div className="min-h-screen bg-black p-8">
      <HealthScoreCard
        healthScore={exampleHealthScore}
        prediction={examplePrediction}
        showPrediction={true}
        animated={true}
      />
    </div>
  );
};

export default HealthScoreCard;
