"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "../../lib/auth"
import { ProtectedRoute } from "../../components/auth/ProtectedRoute"
import { UserRole } from "../../types"
import Sidebar from "../../components/dashboard/Sidebar"
import { useApiClient } from "../../lib/api-client"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog"
import { Textarea } from "../../components/ui/textarea"
import { useToast } from "../../hooks/use-toast"
import { 
  TestTube, 
  Plus, 
  Search, 
  RefreshCw,
  Calendar,
  User,
  Eye,
  Edit,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react"
import { format } from "date-fns"

interface LabTest {
  id: string
  patient_id: string
  visit_id: string
  test_name: string
  test_type: string
  status: string
  requested_date: string
  completed_date?: string
  results?: string
  notes?: string
  created_at: string
  patient?: {
    first_name: string
    last_name: string
  }
  visit?: {
    visit_date: string
    chief_complaint: string
  }
}

interface LabRequest {
  id: string
  patient_id: string
  visit_id: string
  test_name: string
  test_type: string
  status: string
  requested_date: string
  priority: string
  notes?: string
}

export default function LabTestsPage() {
  const router = useRouter()
  const { accessToken, initialize } = useAuthStore()
  const { toast } = useToast()
  const apiClient = useApiClient()
  const [labTests, setLabTests] = useState<LabTest[]>([])
  const [labRequests, setLabRequests] = useState<LabRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isResultsDialogOpen, setIsResultsDialogOpen] = useState(false)
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    patient_id: "",
    visit_id: "",
    test_name: "",
    test_type: "",
    priority: "normal",
    notes: ""
  })

  const [resultsData, setResultsData] = useState({
    results: "",
    notes: ""
  })

  const testTypes = [
    "Blood Test",
    "Urine Test",
    "X-Ray",
    "CT Scan",
    "MRI",
    "Ultrasound",
    "ECG",
    "Echocardiogram",
    "Biopsy",
    "Culture",
    "Pathology",
    "Other"
  ]

  const priorities = [
    "Low",
    "Normal", 
    "High",
    "Urgent"
  ]

  const statuses = [
    "Requested",
    "In Progress",
    "Completed",
    "Cancelled",
    "Failed"
  ]

  useEffect(() => {
    // Initialize auth store first
    initialize()
    
    // Add a small delay to allow auth store to initialize
    const timer = setTimeout(() => {
      // Debug: Check what's in localStorage
      const storedAccessToken = localStorage.getItem('accessToken')
      const storedRefreshToken = localStorage.getItem('refreshToken')
      console.log("🔍 Debug - Stored tokens:", {
        accessToken: storedAccessToken ? "Present" : "Missing",
        refreshToken: storedRefreshToken ? "Present" : "Missing",
        authStoreAccessToken: accessToken ? "Present" : "Missing"
      })
      
      // Only fetch data if we have a valid access token
      if (accessToken) {
        console.log("Access token found, fetching lab data...")
        fetchLabTests()
        fetchLabRequests()
      } else {
        // If no access token, redirect to login
        console.log("No access token found, redirecting to login")
        toast({
          title: "Authentication Required",
          description: "Please log in to access lab tests",
          variant: "destructive"
        })
        router.push('/login')
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [accessToken, router, toast, initialize])

  const fetchLabTests = async () => {
    try {
      setIsLoading(true)
      
      const response = await apiClient.get<LabTest[]>('/lab-tests')
      
      if (response.success) {
        setLabTests(response.data || [])
      } else {
        console.error("Error fetching lab tests:", response.message)
        toast({
          title: "Error",
          description: response.message || "Failed to fetch lab tests",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching lab tests:", error)
      toast({
        title: "Error",
        description: "Failed to fetch lab tests. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLabRequests = async () => {
    try {
      const response = await apiClient.get<LabRequest[]>('/lab-requests')
      
      if (response.success) {
        setLabRequests(response.data || [])
      } else {
        console.error("Error fetching lab requests:", response.message)
        toast({
          title: "Error",
          description: response.message || "Failed to fetch lab requests",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error fetching lab requests:", error)
      toast({
        title: "Error",
        description: "Failed to fetch lab requests. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Check if user is authenticated
      if (!accessToken) {
        toast({
          title: "Authentication Error",
          description: "Please log in to create lab requests.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/lab-requests`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Authentication Error",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          })
          return
        }
        throw new Error(`Failed to create lab request: ${response.status}`)
      }

      toast({
        title: "Success",
        description: "Lab request created successfully.",
      })

      setIsDialogOpen(false)
      setFormData({
        patient_id: "",
        visit_id: "",
        test_name: "",
        test_type: "",
        priority: "normal",
        notes: ""
      })
      fetchLabRequests()
    } catch (error) {
      console.error("Error creating lab request:", error)
      toast({
        title: "Error",
        description: "Failed to create lab request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResultsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTest) return

    setIsSubmitting(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/lab-tests/${selectedTest.id}/results`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(resultsData)
      })

      if (!response.ok) {
        throw new Error(`Failed to submit results: ${response.status}`)
      }

      toast({
        title: "Success",
        description: "Lab results submitted successfully.",
      })

      setIsResultsDialogOpen(false)
      setResultsData({ results: "", notes: "" })
      fetchLabTests()
    } catch (error) {
      console.error("Error submitting results:", error)
      toast({
        title: "Error",
        description: "Failed to submit results. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleViewTestDetails = (test: any) => {
    // For now, show test details in an alert
    // In a real implementation, this would open a detailed view modal
    const details = `
Lab Test Details:
- Patient: ${test.patientName}
- Test Type: ${test.testType}
- Status: ${test.status}
- Requested Date: ${new Date(test.requestedDate).toLocaleString()}
- Results: ${test.results || 'Not available'}
- Notes: ${test.notes || 'None'}
- Created: ${new Date(test.created_at).toLocaleString()}
    `
    alert(details)
  }

  const handleEditTest = (test: any) => {
    // For now, show a simple edit dialog
    const newTestType = prompt("Enter new test type:", test.testType)
    if (newTestType && newTestType !== test.testType) {
      // Update the test in local state
      setLabTests(labTests.map(t => 
        t.id === test.id 
          ? { ...t, testType: newTestType, updated_at: new Date().toISOString() }
          : t
      ))
      
      toast({
        title: "Success",
        description: "Test updated successfully",
        variant: "default",
      })
    }
  }

  const handleDeleteTest = (test: any) => {
    const confirmed = confirm(`Are you sure you want to delete this lab test for ${test.patientName}? This action cannot be undone.`)
    
    if (confirmed) {
      setLabTests(labTests.filter(t => t.id !== test.id))
      
      toast({
        title: "Success",
        description: "Lab test deleted successfully",
        variant: "default",
      })
    }
  }

  const handleStatusUpdate = async (testId: string, newStatus: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/lab-tests/${testId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error(`Failed to update test status: ${response.status}`)
      }

      toast({
        title: "Success",
        description: "Test status updated successfully.",
      })

      fetchLabTests()
    } catch (error) {
      console.error("Error updating test status:", error)
      toast({
        title: "Error",
        description: "Failed to update test status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const filteredTests = labTests.filter(test => {
    const matchesSearch = 
      test.patient?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.patient?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.test_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.test_type?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === "all" || test.status.toLowerCase() === filterStatus.toLowerCase()

    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "requested":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
      case "in progress":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
      case "failed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "requested":
        return <Clock className="h-4 w-4" />
      case "in progress":
        return <RefreshCw className="h-4 w-4" />
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "cancelled":
        return <AlertCircle className="h-4 w-4" />
      case "failed":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "urgent":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300"
      case "normal":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
      case "low":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
    }
  }

  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE, UserRole.LAB_TECHNICIAN]}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
        <Sidebar />
        
        <div className="flex-1 flex flex-col">
          <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Lab Tests</h1>
                  <p className="text-slate-600 dark:text-slate-400">Manage laboratory tests and results</p>
                </div>
                
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Request Lab Test
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <DialogHeader>
                      <DialogTitle className="text-slate-900 dark:text-slate-100">Request Lab Test</DialogTitle>
                      <DialogDescription className="text-slate-600 dark:text-slate-400">
                        Create a new laboratory test request
                      </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="patient_id" className="text-slate-700 dark:text-slate-300">Patient ID</Label>
                          <Input
                            id="patient_id"
                            value={formData.patient_id}
                            onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                            placeholder="Enter patient ID"
                            className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="visit_id" className="text-slate-700 dark:text-slate-300">Visit ID</Label>
                          <Input
                            id="visit_id"
                            value={formData.visit_id}
                            onChange={(e) => setFormData({ ...formData, visit_id: e.target.value })}
                            placeholder="Enter visit ID"
                            className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="test_name" className="text-slate-700 dark:text-slate-300">Test Name</Label>
                          <Input
                            id="test_name"
                            value={formData.test_name}
                            onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
                            placeholder="Enter test name"
                            className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="test_type" className="text-slate-700 dark:text-slate-300">Test Type</Label>
                          <Select
                            value={formData.test_type}
                            onValueChange={(value) => setFormData({ ...formData, test_type: value })}
                          >
                            <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                              <SelectValue placeholder="Select test type" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                              {testTypes.map((type) => (
                                <SelectItem 
                                  key={type} 
                                  value={type}
                                  className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600"
                                >
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="priority" className="text-slate-700 dark:text-slate-300">Priority</Label>
                        <Select
                          value={formData.priority}
                          onValueChange={(value) => setFormData({ ...formData, priority: value })}
                        >
                          <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                            {priorities.map((priority) => (
                              <SelectItem 
                                key={priority} 
                                value={priority.toLowerCase()}
                                className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600"
                              >
                                {priority}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes" className="text-slate-700 dark:text-slate-300">Notes</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Enter test notes"
                          className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                          rows={3}
                        />
                      </div>

                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                          className="border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                              Creating...
                            </>
                          ) : (
                            "Create Request"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {/* Filters */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder="Search lab tests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600">
                    <SelectItem value="all" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">All Status</SelectItem>
                    {statuses.map((status) => (
                      <SelectItem 
                        key={status} 
                        value={status.toLowerCase().replace(" ", "_")}
                        className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600"
                      >
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  onClick={fetchLabTests}
                  className="border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Lab Tests List */}
            {!accessToken ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <User className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Authentication Required</h3>
                  <p className="text-slate-600 dark:text-slate-400">Please log in to view lab tests data.</p>
                </div>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredTests.length === 0 ? (
                  <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <TestTube className="h-12 w-12 text-slate-400 mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No lab tests found</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-center">
                        {searchTerm || filterStatus !== "all" 
                          ? "No lab tests match your current filters." 
                          : "Get started by requesting a new lab test."}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredTests.map((test) => (
                    <Card key={test.id} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                              <TestTube className="h-4 w-4" />
                            </div>
                            <div>
                              <CardTitle className="text-slate-900 dark:text-slate-100">
                                {test.patient ? `${test.patient.first_name} ${test.patient.last_name}` : "Unknown Patient"}
                              </CardTitle>
                              <CardDescription className="text-slate-600 dark:text-slate-400">
                                {test.test_name} • {test.test_type}
                              </CardDescription>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(test.status)}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(test.status)}
                                {test.status.toUpperCase()}
                              </div>
                            </Badge>
                            
                            <Select
                              value={test.status}
                              onValueChange={(value) => handleStatusUpdate(test.id, value)}
                            >
                              <SelectTrigger className="w-[140px] h-8 text-xs bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                                {statuses.map((status) => (
                                  <SelectItem 
                                    key={status} 
                                    value={status.toLowerCase().replace(" ", "_")}
                                    className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600 text-xs"
                                  >
                                    {status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Requested Date</Label>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {format(new Date(test.requested_date), "MMM dd, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                            
                            {test.completed_date && (
                              <div>
                                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Completed Date</Label>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  {format(new Date(test.completed_date), "MMM dd, yyyy 'at' h:mm a")}
                                </p>
                              </div>
                            )}
                          </div>
                          
                          {test.results && (
                            <div>
                              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Results</Label>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{test.results}</p>
                            </div>
                          )}
                          
                          {test.notes && (
                            <div>
                              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes</Label>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{test.notes}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Calendar className="h-4 w-4" />
                            Created {format(new Date(test.created_at), "MMM dd, yyyy")}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {test.status === "completed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedTest(test)
                                  setIsResultsDialogOpen(true)
                                }}
                                className="border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Add Results
                              </Button>
                            )}
                            
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Dialog */}
      <Dialog open={isResultsDialogOpen} onOpenChange={setIsResultsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Add Lab Results</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Enter results for {selectedTest?.test_name}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleResultsSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="results" className="text-slate-700 dark:text-slate-300">Results</Label>
              <Textarea
                id="results"
                value={resultsData.results}
                onChange={(e) => setResultsData({ ...resultsData, results: e.target.value })}
                placeholder="Enter lab test results"
                className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                rows={6}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-slate-700 dark:text-slate-300">Notes</Label>
              <Textarea
                id="notes"
                value={resultsData.notes}
                onChange={(e) => setResultsData({ ...resultsData, notes: e.target.value })}
                placeholder="Enter additional notes"
                className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsResultsDialogOpen(false)}
                className="border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  "Submit Results"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  )
}
