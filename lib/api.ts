// Always use relative URLs for same-origin API calls
const API_BASE_URL = ''

// Typed API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface Position {
  symbol: string
  shares: number
  value: number
  change_pct: number
  cost_basis: number
}

export interface AgentActivity {
  id: string
  agent_name: string
  action: string
  timestamp: string
  status: 'completed' | 'pending' | 'failed'
  details?: string
}

export interface PortfolioSnapshot {
  total_value: number
  daily_change: number
  daily_change_pct: number
  positions: Position[]
}

export interface OnboardingData {
  risk_profile: 'conservative' | 'moderate' | 'aggressive'
  goals: string[]
  interests?: string[]
  custom_picks?: string[]
  exclusions?: string[]
}

// Retry configuration
const RETRY_CONFIG = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
}

// Request timeout
const REQUEST_TIMEOUT_MS = 30000 // 30 seconds

class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  setToken(token: string) {
    this.token = token
  }

  clearToken() {
    this.token = null
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async requestWithTimeout<T>(
    url: string,
    options: RequestInit,
    timeoutMs: number
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408, 'TIMEOUT')
      }
      throw error
    }
  }

  private shouldRetry(error: any, attempt: number): boolean {
    if (attempt >= RETRY_CONFIG.maxAttempts) return false

    // Retry on network errors
    if (error instanceof TypeError) return true

    // Retry on timeout
    if (error instanceof ApiError && error.code === 'TIMEOUT') return true

    // Retry on 5xx server errors
    if (error instanceof ApiError && error.statusCode && error.statusCode >= 500) {
      return true
    }

    return false
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    attempt = 1
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    }

    try {
      const response = await this.requestWithTimeout(
        `${this.baseUrl}${endpoint}`,
        { ...options, headers },
        REQUEST_TIMEOUT_MS
      )

      if (!response.ok) {
        let errorMessage: string
        let errorCode: string | undefined

        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || response.statusText
          errorCode = errorData.code
        } catch {
          errorMessage = response.statusText
        }

        const error = new ApiError(errorMessage, response.status, errorCode)

        // Retry if appropriate
        if (this.shouldRetry(error, attempt)) {
          const delay = RETRY_CONFIG.delayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1)
          await this.sleep(delay)
          return this.request<T>(endpoint, options, attempt + 1)
        }

        return { error: errorMessage }
      }

      const data = await response.json()
      return { data }
    } catch (error) {
      // Handle network errors and retry
      if (this.shouldRetry(error, attempt)) {
        const delay = RETRY_CONFIG.delayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1)
        await this.sleep(delay)
        return this.request<T>(endpoint, options, attempt + 1)
      }

      // Return typed error
      if (error instanceof ApiError) {
        return { error: error.message }
      }

      if (error instanceof Error) {
        return { error: error.message }
      }

      return { error: 'An unknown error occurred' }
    }
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{ token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async signup(email: string, password: string) {
    return this.request<{ token: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async logout() {
    this.clearToken()
    return this.request<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    })
  }

  // Portfolio
  async getPortfolio() {
    return this.request<PortfolioSnapshot>('/api/portfolio')
  }

  async getPositions() {
    return this.request<Position[]>('/api/positions')
  }

  // Agents
  async getAgentActivity(limit: number = 10) {
    return this.request<AgentActivity[]>(`/api/agents/activity?limit=${limit}`)
  }

  // Onboarding
  async submitOnboarding(data: OnboardingData) {
    return this.request<{ success: boolean }>('/api/onboarding', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Profile
  async updateRiskProfile(risk_profile: string) {
    return this.request<{ success: boolean }>('/api/profile/select', {
      method: 'PUT',
      body: JSON.stringify({ risk_profile }),
    })
  }

  // Broker
  async connectBroker(broker: string, credentials: any) {
    return this.request<{ success: boolean }>('/api/broker/connect', {
      method: 'POST',
      body: JSON.stringify({ broker, credentials }),
    })
  }

  // Health check
  async healthCheck() {
    return this.request<{ status: string }>('/api/health')
  }
}

export const api = new ApiClient(API_BASE_URL)
