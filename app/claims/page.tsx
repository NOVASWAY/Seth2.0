"use client"

import { ClaimsManager } from "../../components/claims/ClaimsManager"
import { ProtectedRoute } from "../../components/auth/ProtectedRoute"
import { UserRole } from "../../types"

export default function ClaimsPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.CLAIMS_MANAGER]}>
      <ClaimsManager />
    </ProtectedRoute>
  )
}
