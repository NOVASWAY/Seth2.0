"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useAuthStore } from "@/lib/auth"
import { 
  Users, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  User,
  X
} from "lucide-react"

interface PatientAssignment {
  id: string
  patient_id: string
  assigned_to_user_id: string
  assigned_by_user_id: string
  assignment_type: string
  assignment_reason?: string
  status: string
  priority: string
  assigned_at: string
  completed_at?: string
  due_date?: string
  notes?: string
  assigned_to_name?: string
  assigned_by_name?: string
}

interface PatientAssignmentStatusProps {
  patientId: string
  compact?: boolean
}

export default function PatientAssignmentStatus({ patientId, compact = false }: PatientAssignmentStatusProps) {
  const [assignments, setAssignments] = useState<PatientAssignment[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { accessToken } = useAuthStore()

  useEffect(() => {
    if (patientId && accessToken) {
      fetchAssignments()
    }
  }, [patientId, accessToken])

  const fetchAssignments = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/patient-assignments?patient_id=${patientId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setAssignments(result.data || [])
      }
    } catch (error) {
      console.error("Error fetching assignments:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteAssignment = async (assignmentId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/patient-assignments/${assignmentId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "COMPLETED",
          completed_at: new Date().toISOString()
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Assignment completed successfully",
        })
        fetchAssignments()
      } else {
        toast({
          title: "Error",
          description: "Failed to complete assignment",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error completing assignment:", error)
      toast({
        title: "Error",
        description: "Failed to complete assignment",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: { color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: Clock },
      COMPLETED: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: CheckCircle },
      CANCELLED: { color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: X },
      TRANSFERRED: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: User },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ACTIVE
    const Icon = config.icon
    
    return (
      <Badge className={`${config.color} text-xs`}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      LOW: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
      NORMAL: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      URGENT: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    }
    
    return (
      <Badge className={`${priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.NORMAL} text-xs`}>
        {priority}
      </Badge>
    )
  }

  const activeAssignments = assignments.filter(a => a.status === "ACTIVE")
  const completedAssignments = assignments.filter(a => a.status === "COMPLETED")

  if (loading) {
    return (
      <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
        <span className="text-xs">Loading...</span>
      </div>
    )
  }

  if (assignments.length === 0) {
    return (
      <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
        <Users className="h-3 w-3" />
        <span className="text-xs">No assignments</span>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Users className="h-3 w-3 text-gray-500 dark:text-gray-400" />
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {activeAssignments.length} active, {completedAssignments.length} completed
        </span>
        {activeAssignments.some(a => a.priority === "URGENT") && (
          <AlertTriangle className="h-3 w-3 text-red-500" />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Active Assignments */}
      {activeAssignments.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Active Assignments</div>
          {activeAssignments.map((assignment) => (
            <div key={assignment.id} className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {assignment.assigned_to_name}
                </span>
                {getStatusBadge(assignment.status)}
                {getPriorityBadge(assignment.priority)}
                <Badge variant="outline" className="text-xs">
                  {assignment.assignment_type.replace("_", " ")}
                </Badge>
                {assignment.due_date && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Due: {new Date(assignment.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCompleteAssignment(assignment.id)}
                className="text-green-600 hover:text-green-700 border-green-300 hover:border-green-400 h-6 px-2 text-xs"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Complete
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Completed Assignments */}
      {completedAssignments.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Completed Assignments</div>
          {completedAssignments.map((assignment) => (
            <div key={assignment.id} className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {assignment.assigned_to_name}
              </span>
              {getStatusBadge(assignment.status)}
              {getPriorityBadge(assignment.priority)}
              <Badge variant="outline" className="text-xs">
                {assignment.assignment_type.replace("_", " ")}
              </Badge>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Completed: {new Date(assignment.completed_at!).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
