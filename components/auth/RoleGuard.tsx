'use client'

import { useAuthStore } from '../../lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'

interface RoleGuardProps {
  allowedRoles: string[]
  children: ReactNode
  fallback?: ReactNode
}

export default function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (!allowedRoles.includes(user.role)) {
        // Redirect to dashboard if user doesn't have permission
        router.push('/dashboard')
      }
    }
  }, [isAuthenticated, user, allowedRoles, router, isLoading])

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Checking permissions...</p>
        </div>
      </div>
    )
  }

  // Show fallback if not authenticated
  if (!isAuthenticated || !user) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Access Denied</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">You need to be logged in to access this page.</p>
          <button 
            onClick={() => router.push('/login')}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  // Check if user has required role
  if (!allowedRoles.includes(user.role)) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Access Denied</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            You don't have permission to access this page. Required roles: {allowedRoles.join(', ')}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
            Your current role: {user.role}
          </p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // User has permission, render children
  return <>{children}</>
}
