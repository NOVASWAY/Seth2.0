"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuthStore } from "@/lib/auth"
import { 
  Users, 
  UserPlus, 
  Clock,
  AlertTriangle,
  CheckCircle,
  User,
  Plus
} from "lucide-react"
import Link from "next/link"

interface PatientAssignment {
  id: string
  patient_id: string
  assigned_to_user_id: string
  assignment_type: string
  status: string
  priority: string
  assigned_at: string
  due_date?: string
  patient_name?: string
  assigned_to_name?: string
}

interface User {
  id: string
  username: string
  role: string
}

interface Patient {
  id: string
  first_name: string
  last_name: string
  op_number: string
}

export default function QuickAssignmentWidget() {
  const [assignments, setAssignments] = useState<PatientAssignment[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const { accessToken, user } = useAuthStore()

  // Quick assignment form
  const [quickForm, setQuickForm] = useState({
    patient_id: "",
    assigned_to_user_id: "",
    assignment_type: "GENERAL",
    priority: "NORMAL"
  })

  useEffect(() => {
    if (accessToken) {
      fetchMyAssignments()
      fetchUsers()
      fetchRecentPatients()
    }
  }, [accessToken])

  const fetchMyAssignments = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/patient-assignments?assigned_to_user_id=${user?.id}&status=ACTIVE`, {
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

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/admin/users`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setUsers(result.data || [])
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const fetchRecentPatients = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/patients?limit=20`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setPatients(result.data || [])
      }
    } catch (error) {
      console.error("Error fetching patients:", error)
    }
  }

  const handleQuickAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!quickForm.patient_id || !quickForm.assigned_to_user_id) {
      toast({
        title: "Error",
        description: "Please select both patient and assignee",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/patient-assignments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...quickForm,
          assigned_by_user_id: user?.id,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Patient assigned successfully",
        })
        setQuickForm({
          patient_id: "",
          assigned_to_user_id: "",
          assignment_type: "GENERAL",
          priority: "NORMAL"
        })
        fetchMyAssignments()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to assign patient",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error assigning patient:", error)
      toast({
        title: "Error",
        description: "Failed to assign patient",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
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
        fetchMyAssignments()
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

  const getPriorityBadge = (priority: string) => {
    const priorityColors = {
      LOW: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
      NORMAL: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      URGENT: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    }
    
    return (
      <Badge className={`${priorityColors[priority as keyof typeof priorityColors] || priorityColors.NORMAL} text-xs`}>
        {priority}
      </Badge>
    )
  }

  const urgentAssignments = assignments.filter(a => a.priority === "URGENT")
  const highPriorityAssignments = assignments.filter(a => a.priority === "HIGH")

  return (
    <div className="space-y-6">
      {/* Quick Assignment Form */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <UserPlus className="h-5 w-5" />
            Quick Patient Assignment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleQuickAssign} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Patient</label>
                <Select 
                  value={quickForm.patient_id} 
                  onValueChange={(value) => setQuickForm({...quickForm, patient_id: value})}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-md h-12">
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-600 shadow-xl z-50 max-h-60">
                    {patients.map(patient => (
                      <SelectItem 
                        key={patient.id} 
                        value={patient.id}
                        className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3"
                      >
                        {patient.first_name} {patient.last_name} ({patient.op_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Assign To</label>
                <Select 
                  value={quickForm.assigned_to_user_id} 
                  onValueChange={(value) => setQuickForm({...quickForm, assigned_to_user_id: value})}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-md h-12">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-600 shadow-xl z-50 max-h-60">
                    {users.map(user => (
                      <SelectItem 
                        key={user.id} 
                        value={user.id}
                        className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3"
                      >
                        {user.username} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Type</label>
                <Select 
                  value={quickForm.assignment_type} 
                  onValueChange={(value) => setQuickForm({...quickForm, assignment_type: value})}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-md h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-600 shadow-xl z-50">
                    <SelectItem value="GENERAL" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">General</SelectItem>
                    <SelectItem value="PRIMARY_CARE" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">Primary Care</SelectItem>
                    <SelectItem value="SPECIALIST" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">Specialist</SelectItem>
                    <SelectItem value="NURSE" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">Nurse</SelectItem>
                    <SelectItem value="PHARMACIST" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">Pharmacist</SelectItem>
                    <SelectItem value="FOLLOW_UP" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">Follow Up</SelectItem>
                    <SelectItem value="REFERRAL" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">Referral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Priority</label>
                <Select 
                  value={quickForm.priority} 
                  onValueChange={(value) => setQuickForm({...quickForm, priority: value})}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-md h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-600 shadow-xl z-50">
                    <SelectItem value="LOW" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">Low</SelectItem>
                    <SelectItem value="NORMAL" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">Normal</SelectItem>
                    <SelectItem value="HIGH" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">High</SelectItem>
                    <SelectItem value="URGENT" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitting ? "Assigning..." : "Assign Patient"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* My Assignments */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Users className="h-5 w-5" />
              My Active Assignments ({assignments.length})
            </CardTitle>
            <Link href="/assignments">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
              <div className="mt-2 text-gray-600 dark:text-gray-400">Loading assignments...</div>
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No active assignments</p>
              <p className="text-sm">Assignments will appear here when patients are assigned to you</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Urgent Assignments */}
              {urgentAssignments.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    Urgent Assignments ({urgentAssignments.length})
                  </div>
                  {urgentAssignments.map((assignment) => (
                    <div key={assignment.id} className="p-3 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {assignment.patient_name}
                          </span>
                          {getPriorityBadge(assignment.priority)}
                          <Badge variant="outline" className="text-xs">
                            {assignment.assignment_type.replace("_", " ")}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCompleteAssignment(assignment.id)}
                          className="text-green-600 hover:text-green-700 border-green-300 hover:border-green-400"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Complete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* High Priority Assignments */}
              {highPriorityAssignments.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-medium">
                    <Clock className="h-4 w-4" />
                    High Priority ({highPriorityAssignments.length})
                  </div>
                  {highPriorityAssignments.map((assignment) => (
                    <div key={assignment.id} className="p-3 border border-orange-200 dark:border-orange-800 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {assignment.patient_name}
                          </span>
                          {getPriorityBadge(assignment.priority)}
                          <Badge variant="outline" className="text-xs">
                            {assignment.assignment_type.replace("_", " ")}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCompleteAssignment(assignment.id)}
                          className="text-green-600 hover:text-green-700 border-green-300 hover:border-green-400"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Complete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Normal Assignments */}
              {assignments.filter(a => a.priority === "NORMAL" || a.priority === "LOW").map((assignment) => (
                <div key={assignment.id} className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {assignment.patient_name}
                      </span>
                      {getPriorityBadge(assignment.priority)}
                      <Badge variant="outline" className="text-xs">
                        {assignment.assignment_type.replace("_", " ")}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCompleteAssignment(assignment.id)}
                      className="text-green-600 hover:text-green-700 border-green-300 hover:border-green-400"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Complete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
