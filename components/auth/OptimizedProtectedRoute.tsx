'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth'
import { UserRole } from '@/lib/types'
import { PageLoadingSpinner } from '@/components/ui/LoadingSpinner'
import { DashboardSkeleton } from '@/components/ui/Skeleton'

interface OptimizedProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: UserRole[]
  fallbackPath?: string
}

export function OptimizedProtectedRoute({ 
  children, 
  requiredRoles = [], 
  fallbackPath = "/login" 
}: OptimizedProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()
  const [isHydrated, setIsHydrated] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  // Memoize role check to prevent unnecessary re-renders
  const hasRequiredRole = useMemo(() => {
    if (requiredRoles.length === 0) return true
    return user ? requiredRoles.includes(user.role) : false
  }, [user, requiredRoles])

  // Optimize hydration check
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsHydrated(true)
      setIsChecking(false)
    }, 50) // Reduced from immediate to 50ms for better UX

    return () => clearTimeout(timer)
  }, [])

  // Optimize authentication and role checks
  useEffect(() => {
    if (!isHydrated || isChecking) return

    // Quick redirect if not authenticated
    if (!isAuthenticated || !user) {
      router.replace(fallbackPath)
      return
    }

    // Quick redirect if insufficient role
    if (!hasRequiredRole) {
      router.replace("/unauthorized")
      return
    }
  }, [isAuthenticated, user, hasRequiredRole, router, fallbackPath, isHydrated, isChecking])

  // Show loading state with skeleton for better perceived performance
  if (!isHydrated || isChecking || isLoading) {
    return <PageLoadingSpinner />
  }

  // Show loading skeleton while redirecting
  if (!isAuthenticated || !user || !hasRequiredRole) {
    return <DashboardSkeleton />
  }

  return <>{children}</>
}
