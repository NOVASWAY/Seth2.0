"use client"

import { useRouter } from "next/navigation"
import { ProtectedRoute } from "../../../components/auth/ProtectedRoute"
import { QuickVisitRecording } from "../../../components/visits/QuickVisitRecording"
import { UserRole } from "../../../types"
import Sidebar from "../../../components/dashboard/Sidebar"
import { useAuthStore } from "../../../lib/auth"
import { useState } from "react"

export default function RecordVisitPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const handleVisitCreated = (visit: any) => {
    // Redirect to visits page or visit details
    router.push("/visits")
  }

  const handleCancel = () => {
    router.push("/visits")
  }

  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.CLINICAL_OFFICER, UserRole.NURSE]}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex">
        <Sidebar
          user={user}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <nav className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                    Start New Visit
                  </h1>
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <QuickVisitRecording
                onVisitCreated={handleVisitCreated}
                onCancel={handleCancel}
                showPatientSearch={true}
              />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
