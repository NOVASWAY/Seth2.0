"use client"

import { useRouter } from "next/navigation"
import { ProtectedRoute } from "../../../components/auth/ProtectedRoute"
import { PatientImportForm } from "../../../components/patients/PatientImportForm"
import { UserRole } from "../../../types"

export default function PatientImportPage() {
  const router = useRouter()

  const handleSuccess = (results: any) => {
    console.log('Import successful:', results)
    router.push("/patients")
  }

  const handleCancel = () => {
    router.push("/patients")
  }

  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.RECEPTIONIST]}>
      <div className="container mx-auto p-6">
        <PatientImportForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </ProtectedRoute>
  )
}
