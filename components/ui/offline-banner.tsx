'use client'

import React, { useEffect, useState } from 'react'

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true)
  const [queuedActions, setQueuedActions] = useState(0)

  useEffect(() => {
    // Check initial status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      // Process queued actions
      processQueuedActions()
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const processQueuedActions = () => {
    // Get queued actions from localStorage
    const queue = getActionQueue()
    if (queue.length === 0) return

    // Process each action
    queue.forEach(async (action) => {
      try {
        // Retry the action
        await retryAction(action)
      } catch (error) {
        // Silently fail in production - could add error reporting service here
      }
    })

    // Clear queue
    clearActionQueue()
    setQueuedActions(0)
  }

  if (isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">📡</span>
          <div>
            <p className="font-semibold">You're offline</p>
            <p className="text-sm text-yellow-100">
              {queuedActions > 0
                ? `${queuedActions} action(s) will be synced when you're back online`
                : 'Some features may be unavailable'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Action queue management
interface QueuedAction {
  id: string
  endpoint: string
  method: string
  body?: any
  timestamp: number
}

const QUEUE_KEY = 'cortex_action_queue'

export function queueAction(endpoint: string, method: string, body?: any) {
  const queue = getActionQueue()
  const action: QueuedAction = {
    id: Math.random().toString(36).substr(2, 9),
    endpoint,
    method,
    body,
    timestamp: Date.now(),
  }
  queue.push(action)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  return action.id
}

function getActionQueue(): QueuedAction[] {
  try {
    const stored = localStorage.getItem(QUEUE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function clearActionQueue() {
  localStorage.removeItem(QUEUE_KEY)
}

async function retryAction(action: QueuedAction) {
  const response = await fetch(action.endpoint, {
    method: action.method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: action.body ? JSON.stringify(action.body) : undefined,
  })

  if (!response.ok) {
    throw new Error(`Failed to retry action: ${response.statusText}`)
  }

  return response.json()
}

// Hook for offline-aware API calls
export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, queueAction }
}
