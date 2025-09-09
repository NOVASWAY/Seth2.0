"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "../../lib/auth"
import type { UserRole } from "../../types"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: UserRole[]
  fallbackPath?: string
}

export function ProtectedRoute({ children, requiredRoles = [], fallbackPath = "/login" }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()
  const [isHydrated, setIsHydrated] = useState(false)

  // Ensure we're hydrated before making authentication checks
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    console.log('🔐 ProtectedRoute check:', { 
      isLoading, 
      isAuthenticated, 
      user: user ? { id: user.id, username: user.username, role: user.role } : null,
      requiredRoles,
      currentPath: window.location.pathname,
      isHydrated
    })

    if (!isLoading) {
      if (!isAuthenticated || !user) {
        console.log('❌ Not authenticated, redirecting to login')
        router.push(fallbackPath)
        return
      }

      if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
        console.log('❌ Insufficient role, redirecting to unauthorized')
        router.push("/unauthorized")
        return
      }

      console.log('✅ Authentication check passed')
    }
  }, [isAuthenticated, user, isLoading, requiredRoles, router, fallbackPath, isHydrated])

  if (!isHydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">
            {!isHydrated ? 'Initializing...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return null
  }

  return <>{children}</>
}
