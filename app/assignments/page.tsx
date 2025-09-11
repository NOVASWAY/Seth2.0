"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuthStore } from "@/lib/auth"
import { 
  Users, 
  Search, 
  Filter, 
  User, 
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  X,
  RefreshCw,
  Plus
} from "lucide-react"
import Link from "next/link"

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

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<PatientAssignment[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { accessToken } = useAuthStore()

  // Filters
  const [filters, setFilters] = useState({
    status: "all",
    assignment_type: "all",
    priority: "all",
    assigned_to_user_id: "",
    search: ""
  })

  useEffect(() => {
    if (accessToken) {
      fetchAssignments()
      fetchUsers()
    }
  }, [accessToken, filters])

  const fetchAssignments = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") {
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
          description: "Failed to fetch assignments",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching assignments:", error)
      toast({
        title: "Error",
        description: "Failed to fetch assignments",
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
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      const matchesSearch = (
        assignment.patient_name?.toLowerCase().includes(searchTerm) ||
        assignment.assigned_to_name?.toLowerCase().includes(searchTerm) ||
        assignment.assigned_by_name?.toLowerCase().includes(searchTerm) ||
        assignment.assignment_type.toLowerCase().includes(searchTerm)
      )
      if (!matchesSearch) return false
    }

    // Status filter
    if (filters.status && filters.status !== "all") {
      if (assignment.status !== filters.status) return false
    }

    // Assignment type filter
    if (filters.assignment_type && filters.assignment_type !== "all") {
      if (assignment.assignment_type !== filters.assignment_type) return false
    }

    // Priority filter
    if (filters.priority && filters.priority !== "all") {
      if (assignment.priority !== filters.priority) return false
    }

    return true
  })

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto p-6">
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Authentication Required</h2>
            <p className="text-gray-600 dark:text-gray-300">Please log in to access assignments.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Patient Assignments</h1>
            <p className="text-gray-600 dark:text-gray-300">Manage patient assignments to staff members</p>
          </div>
          
          <Link href="/patient-assignments">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600 dark:text-white font-medium">
              <Plus className="h-4 w-4 mr-2" />
              Advanced Assignment Management
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search" className="text-sm font-medium text-gray-700 dark:text-gray-200">Search</Label>
                <Input
                  id="search"
                  placeholder="Search assignments..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-md h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium text-gray-700 dark:text-gray-200">Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                  <SelectTrigger className="bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-md h-12">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-600 shadow-xl z-50">
                    <SelectItem value="all" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">Active</SelectItem>
                    <SelectItem value="COMPLETED" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">Completed</SelectItem>
                    <SelectItem value="CANCELLED" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">Cancelled</SelectItem>
                    <SelectItem value="TRANSFERRED" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">Transferred</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignment_type" className="text-sm font-medium text-gray-700 dark:text-gray-200">Type</Label>
                <Select value={filters.assignment_type} onValueChange={(value) => setFilters({...filters, assignment_type: value})}>
                  <SelectTrigger className="bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-md h-12">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-600 shadow-xl z-50">
                    <SelectItem value="all" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">All Types</SelectItem>
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
                <Label htmlFor="priority" className="text-sm font-medium text-gray-700 dark:text-gray-200">Priority</Label>
                <Select value={filters.priority} onValueChange={(value) => setFilters({...filters, priority: value})}>
                  <SelectTrigger className="bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-md h-12">
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-600 shadow-xl z-50">
                    <SelectItem value="all" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">All Priorities</SelectItem>
                    <SelectItem value="LOW" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">Low</SelectItem>
                    <SelectItem value="NORMAL" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">Normal</SelectItem>
                    <SelectItem value="HIGH" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">High</SelectItem>
                    <SelectItem value="URGENT" className="text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-700 focus:bg-blue-100 dark:focus:bg-blue-700 cursor-pointer font-medium py-3">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignments List */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Users className="h-5 w-5" />
              Assignments ({filteredAssignments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-600 dark:text-gray-400" />
                <div className="mt-2 text-gray-600 dark:text-gray-400">Loading assignments...</div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {assignment.patient_name}
                        </div>
                        {getStatusBadge(assignment.status)}
                        {getPriorityBadge(assignment.priority)}
                        <Badge variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                          {assignment.assignment_type.replace("_", " ")}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Assigned to: <span className="font-medium text-gray-900 dark:text-white">{assignment.assigned_to_name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Assigned by: <span className="font-medium text-gray-900 dark:text-white">{assignment.assigned_by_name}</span>
                          </div>
                        </div>
                        
                        {assignment.assignment_reason && (
                          <div>Reason: <span className="text-gray-900 dark:text-white">{assignment.assignment_reason}</span></div>
                        )}
                        
                        {assignment.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due: <span className="text-gray-900 dark:text-white">{new Date(assignment.due_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Assigned: <span className="text-gray-900 dark:text-white">{new Date(assignment.assigned_at).toLocaleString()}</span>
                        </div>
                        
                        {assignment.notes && (
                          <div className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded mt-2 text-gray-800 dark:text-gray-200">
                            {assignment.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {assignment.status === "ACTIVE" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCompleteAssignment(assignment.id)}
                          className="text-green-600 hover:text-green-700 border-green-300 hover:border-green-400"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {filteredAssignments.length === 0 && !loading && (
                  <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                    No assignments found matching your criteria
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
