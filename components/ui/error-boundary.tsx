'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-red-900/20 border border-red-700 rounded-lg p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-400 mb-4">
              Don't worry, your data is safe. We've logged the issue and our team will look into it.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left mb-4 p-3 bg-slate-900 rounded border border-red-800">
                <summary className="cursor-pointer text-sm font-medium text-red-400">
                  Error details
                </summary>
                <pre className="mt-2 text-xs text-gray-300 overflow-auto">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleReset}
              className="bg-purple-600 hover:bg-purple-500 text-white font-medium px-6 py-2 rounded-lg transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Wrapper component for easier use
export function WithErrorBoundary({ 
  children, 
  fallback 
}: { 
  children: ReactNode
  fallback?: ReactNode 
}) {
  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>
}
