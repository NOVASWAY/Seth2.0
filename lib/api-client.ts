"use client"

import { useRouter } from "next/navigation"
import { useToast } from "../components/ui/use-toast"

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  errors?: string[]
}

interface ApiClientOptions {
  baseURL?: string
  timeout?: number
}

class ApiClient {
  private baseURL: string
  private timeout: number
  private router: any
  private toast: any

  constructor(options: ApiClientOptions = {}) {
    this.baseURL = options.baseURL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
    this.timeout = options.timeout || 10000
  }

  setRouter(router: any) {
    this.router = router
  }

  setToast(toast: any) {
    this.toast = toast
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    const token = localStorage.getItem('accessToken')

    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        return {
          success: true,
          data: data.data || data,
          message: data.message,
        }
      } else if (response.status === 401) {
        // Handle authentication error
        console.error("Authentication error - token may be expired")
        
        if (this.toast) {
          this.toast({
            title: "Session Expired",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          })
        }

        // Clear stored tokens
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        
        // Redirect to login
        if (this.router) {
          this.router.push('/login')
        }

        return {
          success: false,
          message: "Authentication required",
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          message: errorData.message || `Request failed with status ${response.status}`,
          errors: errorData.errors,
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          message: "Request timeout. Please check your connection.",
        }
      }

      console.error("API request error:", error)
      return {
        success: false,
        message: "Network error. Please check your connection.",
      }
    }
  }

  async get<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

// Create a singleton instance
export const apiClient = new ApiClient()

// Hook to initialize the API client with router and toast
export function useApiClient() {
  const router = useRouter()
  const toast = useToast()

  // Initialize the client
  apiClient.setRouter(router)
  apiClient.setToast(toast)

  return apiClient
}
