'use client'

import { useState } from 'react'

interface RiskAssessmentProps {
  onComplete: (riskProfile: 'conservative' | 'moderate' | 'aggressive') => void
}

export function RiskAssessment({ onComplete }: RiskAssessmentProps) {
  const [answers, setAnswers] = useState<number[]>([])

  const questions = [
    {
      id: 1,
      question: 'How would you react to a 20% portfolio drop?',
      options: [
        { value: 1, label: "Sell everything - too risky" },
        { value: 2, label: "Sell some positions" },
        { value: 3, label: "Hold steady" },
        { value: 4, label: "Buy more - it's a discount!" },
      ],
    },
    {
      id: 2,
      question: 'What\'s your investment timeline?',
      options: [
        { value: 1, label: "Less than 2 years" },
        { value: 2, label: "2-5 years" },
        { value: 3, label: "5-10 years" },
        { value: 4, label: "10+ years" },
      ],
    },
    {
      id: 3,
      question: 'Your investing experience level?',
      options: [
        { value: 1, label: "New to investing" },
        { value: 2, label: "Some experience" },
        { value: 3, label: "Experienced investor" },
        { value: 4, label: "Very experienced" },
      ],
    },
  ]

  const handleAnswer = (questionId: number, value: number) => {
    const newAnswers = [...answers]
    newAnswers[questionId - 1] = value
    setAnswers(newAnswers)
  }

  const handleSubmit = () => {
    const avgScore = answers.reduce((a, b) => a + b, 0) / answers.length
    
    let profile: 'conservative' | 'moderate' | 'aggressive'
    if (avgScore <= 2) {
      profile = 'conservative'
    } else if (avgScore <= 3) {
      profile = 'moderate'
    } else {
      profile = 'aggressive'
    }

    onComplete(profile)
  }

  const canSubmit = answers.length === questions.length

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Risk Assessment</h2>
        <p className="text-text-secondary">
          Help us understand your investment style
        </p>
      </div>

      {questions.map((q) => (
        <div key={q.id} className="p-6 bg-surface rounded-xl">
          <h3 className="text-lg font-semibold mb-4">{q.question}</h3>
          <div className="space-y-3">
            {q.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAnswer(q.id, option.value)}
                className={`w-full p-4 rounded-lg text-left transition-all ${
                  answers[q.id - 1] === option.value
                    ? 'bg-primary text-background font-semibold'
                    : 'bg-surface-elevated hover:bg-opacity-80'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`w-full py-4 rounded-lg font-semibold transition-all ${
          canSubmit
            ? 'bg-primary text-background hover:bg-opacity-90'
            : 'bg-surface-elevated text-text-muted cursor-not-allowed'
        }`}
      >
        Continue
      </button>
    </div>
  )
}
