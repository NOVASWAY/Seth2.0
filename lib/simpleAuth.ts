import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SimpleAuthState {
  user: any | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const useSimpleAuth = create<SimpleAuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username: string, password: string) => {
        console.log('🔐 Simple auth login called with:', username)
        set({ isLoading: true })
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        if (username === 'admin' && password === 'admin123') {
          console.log('🔐 Simple auth login successful')
          set({
            user: { username: 'admin', role: 'ADMIN' },
            isAuthenticated: true,
            isLoading: false
          })
        } else {
          console.log('🔐 Simple auth login failed')
          set({ isLoading: false })
          throw new Error('Invalid username or password')
        }
      },

      logout: () => {
        console.log('🔐 Simple auth logout called')
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false
        })
      }
    }),
    {
      name: 'simple-auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)
