"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuthStore } from "@/lib/auth"
import { 
  UserPlus, 
  Users, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  X,
  User
} from "lucide-react"

interface Patient {
  id: string
  first_name: string
  last_name: string
  op_number: string
}

interface User {
  id: string
  username: string
  role: string
}

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

interface PatientAssignmentButtonProps {
  patient: Patient
  onAssignmentCreated?: () => void
}

export default function PatientAssignmentButton({ patient, onAssignmentCreated }: PatientAssignmentButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [assignments, setAssignments] = useState<PatientAssignment[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const { accessToken, user } = useAuthStore()

  // Form data
  const [formData, setFormData] = useState({
    assigned_to_user_id: "",
    assignment_type: "GENERAL",
    assignment_reason: "",
    priority: "NORMAL",
    due_date: "",
    notes: ""
  })

  // Fetch users and existing assignments
  useEffect(() => {
    if (isOpen && accessToken) {
      fetchUsers()
      fetchAssignments()
    }
  }, [isOpen, accessToken])

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

  const fetchAssignments = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/patient-assignments?patient_id=${patient.id}`, {
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
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.assigned_to_user_id) {
      toast({
        title: "Error",
        description: "Please select a user to assign to",
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
          ...formData,
          patient_id: patient.id,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Patient assigned successfully",
        })
        setIsOpen(false)
        resetForm()
        fetchAssignments()
        onAssignmentCreated?.()
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

  const resetForm = () => {
    setFormData({
      assigned_to_user_id: "",
      assignment_type: "GENERAL",
      assignment_reason: "",
      priority: "NORMAL",
      due_date: "",
      notes: ""
    })
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
      <Badge className={config.color}>
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
      <Badge className={priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.NORMAL}>
        {priority}
      </Badge>
    )
  }

  const activeAssignments = assignments.filter(a => a.status === "ACTIVE")
  const completedAssignments = assignments.filter(a => a.status === "COMPLETED")

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          variant="outline"
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
        >
          <UserPlus className="h-3 w-3" />
          Assign
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Patient: {patient.first_name} {patient.last_name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Existing Assignments */}
          {assignments.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Current Assignments</h3>
              
              {/* Active Assignments */}
              {activeAssignments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</h4>
                  {activeAssignments.map((assignment) => (
                    <div key={assignment.id} className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {assignment.assigned_to_name}
                          </span>
                          {getStatusBadge(assignment.status)}
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
                      {assignment.assignment_reason && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Reason: {assignment.assignment_reason}
                        </p>
                      )}
                      {assignment.due_date && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Due: {new Date(assignment.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Completed Assignments */}
              {completedAssignments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Completed</h4>
                  {completedAssignments.map((assignment) => (
                    <div key={assignment.id} className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* New Assignment Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Create New Assignment</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assigned_to_user_id">Assign To</Label>
                  <Select 
                    value={formData.assigned_to_user_id} 
                    onValueChange={(value) => setFormData({...formData, assigned_to_user_id: value})}
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
                  <Label htmlFor="assignment_type">Assignment Type</Label>
                  <Select 
                    value={formData.assignment_type} 
                    onValueChange={(value) => setFormData({...formData, assignment_type: value})}
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
                  <Label htmlFor="priority">Priority</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value) => setFormData({...formData, priority: value})}
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

                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date (Optional)</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignment_reason">Assignment Reason</Label>
                <Input
                  id="assignment_reason"
                  value={formData.assignment_reason}
                  onChange={(e) => setFormData({...formData, assignment_reason: e.target.value})}
                  placeholder="Reason for assignment"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {submitting ? "Assigning..." : "Assign Patient"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
