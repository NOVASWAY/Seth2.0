"use client"

import type React from "react"

import { useEffect } from "react"
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

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !user) {
        router.push(fallbackPath)
        return
      }

      if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
        router.push("/unauthorized")
        return
      }
    }
  }, [isAuthenticated, user, isLoading, requiredRoles, router, fallbackPath])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
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
