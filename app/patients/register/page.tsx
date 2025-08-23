"use client"

import { useRouter } from "next/navigation"
import { ProtectedRoute } from "../../../components/auth/ProtectedRoute"
import { PatientRegistrationForm } from "../../../components/patients/PatientRegistrationForm"
import { UserRole } from "../../../types"

export default function PatientRegisterPage() {
  const router = useRouter()

  const handleSuccess = (patient: any) => {
    router.push("/dashboard")
  }

  const handleCancel = () => {
    router.push("/dashboard")
  }

  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.RECEPTIONIST]}>
      <div className="container mx-auto p-6">
        <PatientRegistrationForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </ProtectedRoute>
  )
}
