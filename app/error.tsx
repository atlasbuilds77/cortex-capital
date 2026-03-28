'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Something went wrong
          </h1>
          
          <p className="text-gray-600 mb-6">
            We encountered an unexpected error. Don't worry, your data is safe and our team has been notified.
          </p>

          {process.env.NODE_ENV === 'development' && (
            <details className="text-left mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                Error details
              </summary>
              <pre className="text-xs text-gray-800 overflow-auto whitespace-pre-wrap">
                {error.message}
                {error.stack && (
                  <>
                    {'\n\n'}
                    {error.stack}
                  </>
                )}
                {error.digest && (
                  <>
                    {'\n\n'}
                    Digest: {error.digest}
                  </>
                )}
              </pre>
            </details>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={reset}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Try again
            </button>
            <a
              href="/"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Go home
            </a>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Need help?{' '}
              <a
                href="mailto:support@zerogtrading.com"
                className="text-blue-500 hover:text-blue-600 font-medium"
              >
                Contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
