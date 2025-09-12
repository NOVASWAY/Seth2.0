"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "../../lib/auth"
import { useToast } from "../ui/use-toast"

interface AuthGuardProps {
  children: React.ReactNode
  requiredRoles?: string[]
  redirectTo?: string
}

export function AuthGuard({ 
  children, 
  requiredRoles = [], 
  redirectTo = "/login" 
}: AuthGuardProps) {
  const router = useRouter()
  const { user, accessToken, isAuthenticated } = useAuthStore()
  const { toast } = useToast()

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated || !accessToken) {
      console.log("User not authenticated, redirecting to login")
      toast({
        title: "Authentication Required",
        description: "Please log in to access this page",
        variant: "destructive"
      })
      router.push(redirectTo)
      return
    }

    // Check if user has required roles
    if (requiredRoles.length > 0 && user?.role && !requiredRoles.includes(user.role)) {
      console.log(`User role ${user.role} not authorized for this page`)
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive"
      })
      router.push("/dashboard")
      return
    }
  }, [isAuthenticated, accessToken, user, requiredRoles, router, redirectTo, toast])

  // Show loading or nothing while checking authentication
  if (!isAuthenticated || !accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Check role authorization
  if (requiredRoles.length > 0 && user?.role && !requiredRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="h-12 w-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Access Denied
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            You don't have permission to access this page
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
