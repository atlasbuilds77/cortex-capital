'use client'

import { motion } from 'framer-motion'

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
  stepNames: string[]
}

export function ProgressBar({ currentStep, totalSteps, stepNames }: ProgressBarProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100

  return (
    <div className="mb-8">
      {/* Step names */}
      <div className="flex justify-between mb-4">
        {stepNames.map((name, index) => (
          <div
            key={name}
            className={`flex-1 text-center transition-all ${
              index <= currentStep
                ? 'text-primary font-medium'
                : 'text-text-muted text-sm'
            }`}
          >
            <div className="hidden md:block">{name}</div>
            <div className="md:hidden text-xs">
              {index + 1}
            </div>
          </div>
        ))}
      </div>

      {/* Progress info */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-text-secondary">
          Step {currentStep + 1} of {totalSteps}
        </span>
        <span className="text-sm font-medium text-primary">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-surface rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-purple-600"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
