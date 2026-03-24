'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface User {
  id: string
  email: string
  name?: string
  tier?: string
  risk_profile?: string
  broker_connected?: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  isAuthenticated: boolean
  token: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('cortex_token')
    const savedUser = localStorage.getItem('cortex_user')
    
    if (savedToken) {
      setToken(savedToken)
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser))
        } catch {
          // Corrupted user data
        }
      }
      // Validate token with backend
      fetchCurrentUser(savedToken)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      
      if (res.ok) {
        const data = await res.json()
        const userData = data.data || data
        setUser(userData)
        localStorage.setItem('cortex_user', JSON.stringify(userData))
      } else {
        // Token invalid — clear everything
        localStorage.removeItem('cortex_token')
        localStorage.removeItem('cortex_user')
        setToken(null)
        setUser(null)
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
      // Network error — keep stored user for offline
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Login failed' }))
      throw new Error(error.error || error.message || 'Login failed')
    }

    const data = await res.json()
    const accessToken = data.data?.access_token || data.access_token || data.token
    const userData = data.data?.user || data.user || { email }
    
    localStorage.setItem('cortex_token', accessToken)
    localStorage.setItem('cortex_user', JSON.stringify(userData))
    setToken(accessToken)
    setUser(userData)
  }

  const signup = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Signup failed' }))
      throw new Error(error.error || error.message || 'Signup failed')
    }

    const data = await res.json()
    const accessToken = data.data?.access_token || data.access_token || data.token
    const userData = data.data?.user || data.user || { email, tier: 'free' }
    
    if (accessToken) {
      localStorage.setItem('cortex_token', accessToken)
      setToken(accessToken)
    }
    localStorage.setItem('cortex_user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('cortex_token')
    localStorage.removeItem('cortex_user')
    setToken(null)
    setUser(null)
  }

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev
      const updated = { ...prev, ...updates }
      localStorage.setItem('cortex_user', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        updateUser,
        isAuthenticated: !!user && !!token,
        token,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
