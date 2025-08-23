import { create } from "zustand"
import { persist } from "zustand/middleware"
import axios from "axios"
import type { UserRole } from "../types"

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
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username: string, password: string) => {
        set({ isLoading: true })
        try {
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
          throw new Error(error.response?.data?.message || "Login failed")
        }
      },

      logout: async () => {
        const { accessToken } = get()
        try {
          if (accessToken) {
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
        set({ user, isAuthenticated: !!user })
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken })
      },
    }),
    {
      name: "seth-clinic-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)

// Axios interceptor for automatic token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const { refreshAccessToken, accessToken } = useAuthStore.getState()
      const success = await refreshAccessToken()

      if (success) {
        const newAccessToken = useAuthStore.getState().accessToken
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return axios(originalRequest)
      }
    }

    return Promise.reject(error)
  },
)
