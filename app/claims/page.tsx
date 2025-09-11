"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "../../components/auth/ProtectedRoute"
import { UserRole } from "../../types"

export default function ClaimsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to SHA page since they serve the same function
    router.replace("/sha")
  }, [router])

  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.CLAIMS_MANAGER, UserRole.RECEPTIONIST]}>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Redirecting to SHA Claims...</h2>
          <p className="text-gray-600">Claims functionality has been consolidated with SHA management.</p>
        </div>
      </div>
    </ProtectedRoute>
  )
}
