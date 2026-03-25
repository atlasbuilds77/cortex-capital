'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function DemoPage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Give iframe time to load
    const timer = setTimeout(() => setLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 bg-surface/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to home</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-text-secondary">Live Demo - Alpaca Paper Trading</span>
          </div>

          <Link
            href="/signup"
            className="px-6 py-2 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-primary/25 transition-all"
          >
            Get Started
          </Link>
        </div>
      </div>

      {/* Demo Info Banner */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-primary/20">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <p className="text-sm text-center">
            <strong className="text-primary">Demo Account:</strong> Watch our AI agents trade in real-time with a live Alpaca paper trading account.
            <Link href="/signup" className="ml-2 underline hover:text-primary">
              Sign up to get your own AI trading team →
            </Link>
          </p>
        </div>
      </div>

      {/* 3D Office Iframe */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-text-secondary">Loading demo fishtank...</p>
            </div>
          </div>
        )}
        
        <iframe
          src="http://localhost:3002"
          className="w-full h-full border-0"
          title="Cortex Capital Demo - 3D Office"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-same-origin allow-scripts allow-forms"
        />
      </div>
    </div>
  )
}
