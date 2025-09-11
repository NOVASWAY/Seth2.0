"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "../../components/auth/ProtectedRoute"
import { UserRole } from "../../types"

export default function PatientEncountersPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to Visits page since they serve the same function
    router.replace("/visits")
  }, [router])

  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE]}>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Redirecting to Visits...</h2>
          <p className="text-gray-600">Patient encounters functionality has been consolidated with visit management.</p>
        </div>
      </div>
    </ProtectedRoute>
  )
}
