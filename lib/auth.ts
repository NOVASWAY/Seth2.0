import { create } from "zustand"
import { persist } from "zustand/middleware"
import axios from "axios"
import type { UserRole } from "../types"
// Mock authentication removed - using real API only

export interface AuthUser {
  id: string
  username: string
  email?: string
  role: UserRole
  isActive: boolean
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshAccessToken: () => Promise<boolean>
  setUser: (user: AuthUser | null) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  initialize: () => void
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

// Check if we're in test mode (Playwright tests)
const getIsTestMode = () => {
  console.log('🔍 getIsTestMode() called')
  
  // Check for Playwright test environment
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost'
    const isTestPort = window.location.port === '3003'
    const hasPlaywrightUserAgent = navigator.userAgent.includes('HeadlessChrome') || 
                                  navigator.userAgent.includes('Chrome-Lighthouse') ||
                                  navigator.userAgent.includes('Playwright')
    
    // Additional test environment indicators
    const hasTestQueryParam = window.location.search.includes('test=true')
    const hasTestHash = window.location.hash.includes('test=true')
    
    // Check localStorage for test mode flag (set by tests)
    const hasTestModeFlag = localStorage.getItem('test-mode') === 'true'
    
    // Debug logging in development
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('🔍 Test mode detection:', {
        hostname: window.location.hostname,
        port: window.location.port,
        isLocalhost,
        isTestPort,
        hasPlaywrightUserAgent,
        hasTestQueryParam,
        hasTestHash,
        hasTestModeFlag,
        userAgent: navigator.userAgent
      })
    }
    
    // More permissive test mode detection for development
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      const result = isLocalhost && (isTestPort || hasPlaywrightUserAgent || hasTestQueryParam || hasTestHash || hasTestModeFlag)
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('🔍 Test mode result (dev):', result)
      }
      return result
    }
    
    // Strict test mode detection for production
    const result = isLocalhost && (isTestPort || hasPlaywrightUserAgent)
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('🔍 Test mode result (prod):', result)
    }
    return result
  }
  return false
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      console.log('🔧 Auth store being created')
      
      return {
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: true, // Start with loading true to prevent premature redirects

        login: async (username: string, password: string) => {
          console.log('🔐 login() function called with:', username)
          set({ isLoading: true })
          try {
            const isTestMode = getIsTestMode()
            
            if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
              console.log('🔐 Login attempt:', { username, isTestMode })
            }
            
            // Mock authentication removed - using real API only

            // Use real API for production
            console.log('🔐 Using real API authentication')
            const response = await axios.post(`${API_BASE_URL}/auth/login`, {
              username,
              password,
            })

            if (response.data.success) {
              const { user, accessToken, refreshToken } = response.data.data
              set({
                user,
                accessToken,
                refreshToken,
                isAuthenticated: true,
                isLoading: false,
              })
            } else {
              throw new Error(response.data.message || "Login failed")
            }
          } catch (error: any) {
            set({ isLoading: false })
            console.error('🔐 Login error:', error)
            
            // Preserve the original error message from mock auth
            if (getIsTestMode()) {
              throw error
            }
            
            // Handle specific error types
            if (error.response?.status === 429) {
              throw new Error("Too many login attempts. Please wait 15 minutes before trying again.")
            } else if (error.response?.status === 401) {
              throw new Error("Invalid username or password. Please check your credentials.")
            } else if (error.response?.status === 403) {
              throw new Error("Account is locked or inactive. Please contact an administrator.")
            } else if (error.response?.status >= 500) {
              throw new Error("Server error. Please try again later.")
            }
            
            throw new Error(error.response?.data?.message || "Login failed. Please try again.")
          }
        },

        logout: async () => {
          const { accessToken } = get()
          try {
            // Mock authentication removed - using real API only
            if (accessToken) {
              // Use real API for production
              await axios.post(
                `${API_BASE_URL}/auth/logout`,
                {},
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                },
              )
            }
          } catch (error) {
            console.error("Logout error:", error)
          } finally {
            set({
              user: null,
              accessToken: null,
              refreshToken: null,
              isAuthenticated: false,
            })
          }
        },

        refreshAccessToken: async () => {
          const { refreshToken } = get()
          if (!refreshToken) return false

          try {
            // Mock authentication removed - using real API only
            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken,
            })

            if (response.data.success) {
              const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data
              set({
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
              })
              return true
            }
          } catch (error) {
            console.error("Token refresh failed:", error)
            // Clear auth state on refresh failure
            set({
              user: null,
              accessToken: null,
              refreshToken: null,
              isAuthenticated: false,
            })
          }
          return false
        },

        setUser: (user: AuthUser | null) => {
          set({ user })
        },

        setTokens: (accessToken: string, refreshToken: string) => {
          set({ accessToken, refreshToken })
        },

        // Initialize authentication state from localStorage
        initialize: () => {
          console.log('🔧 Initializing auth state from localStorage')
          const state = get()
          if (state.accessToken && state.user) {
            console.log('✅ Auth state restored from localStorage')
            set({ isAuthenticated: true, isLoading: false })
          } else {
            console.log('❌ No valid auth state found in localStorage')
            set({ isAuthenticated: false, isLoading: false })
          }
        },
      }
    },
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)

// Set up axios interceptors AFTER the store is defined
setTimeout(() => {
  console.log('🔧 Setting up axios interceptors')
  
  axios.interceptors.request.use(
    (config) => {
      const { accessToken } = useAuthStore.getState()
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`
      }
      return config
    },
    (error) => {
      return Promise.reject(error)
    },
  )

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true

        const refreshed = await useAuthStore.getState().refreshAccessToken()
        if (refreshed) {
          const { accessToken } = useAuthStore.getState()
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return axios(originalRequest)
        }
      }

      return Promise.reject(error)
    },
  )
}, 0)
