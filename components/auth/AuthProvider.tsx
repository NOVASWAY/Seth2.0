'use client'

import { useEffect } from 'react'
import { useAuthStore } from '../../lib/auth'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => {
    console.log('🔧 AuthProvider: Initializing authentication state')
    initialize()
  }, [initialize])

  return <>{children}</>
}
