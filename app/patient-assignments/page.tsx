"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useAuthStore } from "@/stores/authStore"
import { 
  Plus, 
  Search, 
  Filter, 
  Users, 
  User, 
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  X,
  Edit,
  Trash2,
  RefreshCw
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
  patient_name?: string
  assigned_to_name?: string
  assigned_by_name?: string
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

export default function PatientAssignmentsPage() {
  const [assignments, setAssignments] = useState<PatientAssignment[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<PatientAssignment | null>(null)
  const { toast } = useToast()
  const { accessToken } = useAuthStore()

  // Filters
  const [filters, setFilters] = useState({
    status: "",
    assignment_type: "",
    priority: "",
    assigned_to_user_id: "",
    search: ""
  })

  // Form data
  const [formData, setFormData] = useState({
    patient_id: "",
    assigned_to_user_id: "",
    assignment_type: "GENERAL",
    assignment_reason: "",
    priority: "NORMAL",
    due_date: "",
    notes: ""
  })

  useEffect(() => {
    if (accessToken) {
      fetchAssignments()
      fetchUsers()
      fetchPatients()
    }
  }, [accessToken, filters])

  const fetchAssignments = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value)
        }
      })

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/patient-assignments?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setAssignments(result.data || [])
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch patient assignments",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching assignments:", error)
      toast({
        title: "Error",
        description: "Failed to fetch patient assignments",
        variant: "destructive",
      })
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

  const fetchPatients = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/patients?limit=1000`, {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingAssignment 
        ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/patient-assignments/${editingAssignment.id}`
        : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/patient-assignments`
      
      const method = editingAssignment ? "PUT" : "POST"
      
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: editingAssignment ? "Assignment updated successfully" : "Assignment created successfully",
        })
        setIsDialogOpen(false)
        setEditingAssignment(null)
        resetForm()
        fetchAssignments()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to save assignment",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving assignment:", error)
      toast({
        title: "Error",
        description: "Failed to save assignment",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (assignment: PatientAssignment) => {
    setEditingAssignment(assignment)
    setFormData({
      patient_id: assignment.patient_id,
      assigned_to_user_id: assignment.assigned_to_user_id,
      assignment_type: assignment.assignment_type,
      assignment_reason: assignment.assignment_reason || "",
      priority: assignment.priority,
      due_date: assignment.due_date ? assignment.due_date.split('T')[0] : "",
      notes: assignment.notes || ""
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/patient-assignments/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Assignment deleted successfully",
        })
        fetchAssignments()
      } else {
        toast({
          title: "Error",
          description: "Failed to delete assignment",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting assignment:", error)
      toast({
        title: "Error",
        description: "Failed to delete assignment",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      patient_id: "",
      assigned_to_user_id: "",
      assignment_type: "GENERAL",
      assignment_reason: "",
      priority: "NORMAL",
      due_date: "",
      notes: ""
    })
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      TRANSFERRED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    }
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
        {status}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityColors = {
      LOW: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
      NORMAL: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      URGENT: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    }
    
    return (
      <Badge className={priorityColors[priority as keyof typeof priorityColors] || "bg-gray-100 text-gray-800"}>
        {priority}
      </Badge>
    )
  }

  const filteredAssignments = assignments.filter(assignment => {
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      return (
        assignment.patient_name?.toLowerCase().includes(searchTerm) ||
        assignment.assigned_to_name?.toLowerCase().includes(searchTerm) ||
        assignment.assigned_by_name?.toLowerCase().includes(searchTerm) ||
        assignment.assignment_type.toLowerCase().includes(searchTerm)
      )
    }
    return true
  })

  if (!accessToken) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to access patient assignments.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Patient Assignments</h1>
          <p className="text-muted-foreground">Manage patient assignments to staff members</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingAssignment(null); resetForm(); }} className="dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600">
              <Plus className="h-4 w-4 mr-2" />
              Assign Patient
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl dark:bg-gray-800 dark:border-gray-600">
            <DialogHeader>
              <DialogTitle className="dark:text-white">
                {editingAssignment ? "Edit Assignment" : "Assign Patient"}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patient_id" className="dark:text-white">Patient</Label>
                  <Select value={formData.patient_id} onValueChange={(value) => setFormData({...formData, patient_id: value})}>
                    <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map(patient => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.first_name} {patient.last_name} ({patient.op_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigned_to_user_id" className="dark:text-white">Assign To</Label>
                  <Select value={formData.assigned_to_user_id} onValueChange={(value) => setFormData({...formData, assigned_to_user_id: value})}>
                    <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.username} ({user.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignment_type" className="dark:text-white">Assignment Type</Label>
                  <Select value={formData.assignment_type} onValueChange={(value) => setFormData({...formData, assignment_type: value})}>
                    <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL">General</SelectItem>
                      <SelectItem value="PRIMARY_CARE">Primary Care</SelectItem>
                      <SelectItem value="SPECIALIST">Specialist</SelectItem>
                      <SelectItem value="NURSE">Nurse</SelectItem>
                      <SelectItem value="PHARMACIST">Pharmacist</SelectItem>
                      <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
                      <SelectItem value="REFERRAL">Referral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority" className="dark:text-white">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                    <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date" className="dark:text-white">Due Date (Optional)</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignment_reason" className="dark:text-white">Assignment Reason</Label>
                <Input
                  id="assignment_reason"
                  value={formData.assignment_reason}
                  onChange={(e) => setFormData({...formData, assignment_reason: e.target.value})}
                  placeholder="Reason for assignment"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="dark:text-white">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="dark:border-gray-600 dark:text-white dark:hover:bg-gray-700">
                  Cancel
                </Button>
                <Button type="submit" className="dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600">
                  {editingAssignment ? "Update Assignment" : "Create Assignment"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-white">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search" className="dark:text-white">Search</Label>
              <Input
                id="search"
                placeholder="Search assignments..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="dark:text-white">Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="TRANSFERRED">Transferred</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment_type" className="dark:text-white">Type</Label>
              <Select value={filters.assignment_type} onValueChange={(value) => setFilters({...filters, assignment_type: value})}>
                <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="GENERAL">General</SelectItem>
                  <SelectItem value="PRIMARY_CARE">Primary Care</SelectItem>
                  <SelectItem value="SPECIALIST">Specialist</SelectItem>
                  <SelectItem value="NURSE">Nurse</SelectItem>
                  <SelectItem value="PHARMACIST">Pharmacist</SelectItem>
                  <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
                  <SelectItem value="REFERRAL">Referral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority" className="dark:text-white">Priority</Label>
              <Select value={filters.priority} onValueChange={(value) => setFilters({...filters, priority: value})}>
                <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Priorities</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignments List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-white">
            <Users className="h-5 w-5" />
            Assignments ({filteredAssignments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
              <div className="mt-2 text-muted-foreground">Loading assignments...</div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-600 dark:bg-gray-800/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="font-medium dark:text-white">
                        {assignment.patient_name}
                      </div>
                      {getStatusBadge(assignment.status)}
                      {getPriorityBadge(assignment.priority)}
                      <Badge variant="outline" className="dark:border-gray-600 dark:text-white">
                        {assignment.assignment_type.replace("_", " ")}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Assigned to: <span className="font-medium">{assignment.assigned_to_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Assigned by: <span className="font-medium">{assignment.assigned_by_name}</span>
                        </div>
                      </div>
                      
                      {assignment.assignment_reason && (
                        <div>Reason: {assignment.assignment_reason}</div>
                      )}
                      
                      {assignment.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {new Date(assignment.due_date).toLocaleDateString()}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Assigned: {new Date(assignment.assigned_at).toLocaleString()}
                      </div>
                      
                      {assignment.notes && (
                        <div className="text-xs bg-muted/50 p-2 rounded mt-2">
                          {assignment.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(assignment)}
                      className="dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(assignment.id)}
                      className="dark:bg-red-900 dark:text-white dark:hover:bg-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {filteredAssignments.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  No assignments found matching your criteria
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
