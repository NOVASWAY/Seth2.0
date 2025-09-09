"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuthStore } from "../../lib/auth"
import { ProtectedRoute } from "../../components/auth/ProtectedRoute"
import { UserRole } from "../../types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Textarea } from "../../components/ui/textarea"
import { Badge } from "../../components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog"
import { ScrollArea } from "../../components/ui/scroll-area"
import { Separator } from "../../components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { 
  Microscope, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  User,
  Calendar,
  FileText,
  RefreshCw,
  TestTube,
  Activity
} from "lucide-react"
import { toast } from "../../hooks/use-toast"
import { format } from "date-fns"
import { LabTestAutocomplete } from "../../components/clinical/ClinicalAutocomplete"

interface LabRequest {
  id: string
  patientId: string
  patientName: string
  visitId: string
  visitDate: string
  requestedBy: string
  requestedAt: string
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  urgency: "ROUTINE" | "URGENT" | "STAT"
  clinicalNotes: string
  items: LabRequestItem[]
  completedAt?: string
  completedBy?: string
}

interface LabRequestItem {
  id: string
  testId: string
  testName: string
  testCode: string
  specimenType: string
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  result?: string
  completedAt?: string
  notes?: string
}

interface LabRequestFormData {
  patientId: string
  visitId: string
  urgency: "ROUTINE" | "URGENT" | "STAT"
  clinicalNotes: string
  items: {
    testId: string
    testName: string
    testCode: string
    specimenType: string
  }[]
}

export default function LabRequestsPage() {
  const { accessToken, user } = useAuthStore()
  const [requests, setRequests] = useState<LabRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [urgencyFilter, setUrgencyFilter] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState<LabRequestFormData>({
    patientId: "",
    visitId: "",
    urgency: "ROUTINE",
    clinicalNotes: "",
    items: []
  })

  // Fetch lab requests
  const fetchLabRequests = useCallback(async () => {
    if (!accessToken) return

    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (urgencyFilter !== "all") params.append("urgency", urgencyFilter)

      const endpoint = activeTab === "pending" ? "/pending" : 
                      activeTab === "completed" ? "/completed" : "/"
      
      const response = await fetch(`http://localhost:5000/api/lab-requests${endpoint}?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setRequests(result.data || [])
        } else {
          throw new Error(result.message || "Failed to fetch lab requests")
        }
      } else if (response.status === 401) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive"
        })
      } else {
        throw new Error("Failed to fetch lab requests")
      }
    } catch (error) {
      console.error("Error fetching lab requests:", error)
      toast({
        title: "Error",
        description: "Failed to fetch lab requests. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [accessToken, activeTab, statusFilter, urgencyFilter])

  // Create lab request
  const handleCreateRequest = async () => {
    if (!accessToken || !formData.patientId || formData.items.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and add at least one test",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch("http://localhost:5000/api/lab-requests", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          toast({
            title: "Success",
            description: "Lab request created successfully",
            variant: "default"
          })
          
          // Reset form
          setFormData({
            patientId: "",
            visitId: "",
            urgency: "ROUTINE",
            clinicalNotes: "",
            items: []
          })
          setIsCreateDialogOpen(false)
          
          // Refresh requests
          fetchLabRequests()
        } else {
          throw new Error(result.message || "Failed to create lab request")
        }
      } else if (response.status === 401) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive"
        })
      } else {
        throw new Error("Failed to create lab request")
      }
    } catch (error) {
      console.error("Error creating lab request:", error)
      toast({
        title: "Error",
        description: "Failed to create lab request. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Add test item
  const addTestItem = (test: any) => {
    const newItem = {
      testId: test.id,
      testName: test.name,
      testCode: test.code,
      specimenType: test.specimenType || "Blood"
    }
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))
  }

  // Remove test item
  const removeTestItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  // View request details
  const viewRequestDetails = async (request: LabRequest) => {
    try {
      const response = await fetch(`http://localhost:5000/api/lab-requests/${request.id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setSelectedRequest(result.data)
          setIsViewDialogOpen(true)
        }
      }
    } catch (error) {
      console.error("Error fetching request details:", error)
    }
  }

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "COMPLETED": return "default"
      case "IN_PROGRESS": return "secondary"
      case "PENDING": return "outline"
      case "CANCELLED": return "destructive"
      default: return "secondary"
    }
  }

  // Get urgency badge variant
  const getUrgencyBadgeVariant = (urgency: string) => {
    switch (urgency) {
      case "STAT": return "destructive"
      case "URGENT": return "secondary"
      case "ROUTINE": return "outline"
      default: return "outline"
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED": return <CheckCircle className="h-4 w-4" />
      case "IN_PROGRESS": return <Activity className="h-4 w-4" />
      case "PENDING": return <Clock className="h-4 w-4" />
      case "CANCELLED": return <AlertTriangle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  // Filter requests
  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         request.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         request.requestedBy.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSearch
  })

  // Load requests on mount and when filters change
  useEffect(() => {
    fetchLabRequests()
  }, [fetchLabRequests])

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto p-6">
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Authentication Required</h2>
            <p className="text-gray-600 dark:text-gray-300">Please log in to access lab requests.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.LAB_TECHNICIAN]}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                  <Microscope className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Lab Request Management</h1>
                  <p className="text-gray-600 dark:text-gray-300">Manage laboratory test requests and results</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={fetchLabRequests}
                  variant="outline"
                  className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                {(user?.role === UserRole.ADMIN || user?.role === UserRole.CLINICAL_OFFICER) && (
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        New Request
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-white">Create Lab Request</DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-gray-300">
                          Create a new laboratory test request
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="patientId" className="text-gray-700 dark:text-gray-300">Patient ID</Label>
                            <Input
                              id="patientId"
                              value={formData.patientId}
                              onChange={(e) => setFormData(prev => ({ ...prev, patientId: e.target.value }))}
                              placeholder="Enter patient ID"
                              className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="visitId" className="text-gray-700 dark:text-gray-300">Visit ID</Label>
                            <Input
                              id="visitId"
                              value={formData.visitId}
                              onChange={(e) => setFormData(prev => ({ ...prev, visitId: e.target.value }))}
                              placeholder="Enter visit ID"
                              className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="urgency" className="text-gray-700 dark:text-gray-300">Urgency</Label>
                          <Select value={formData.urgency} onValueChange={(value: any) => setFormData(prev => ({ ...prev, urgency: value }))}>
                            <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                              <SelectValue placeholder="Select urgency" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                              <SelectItem value="ROUTINE" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Routine</SelectItem>
                              <SelectItem value="URGENT" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Urgent</SelectItem>
                              <SelectItem value="STAT" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Stat</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="clinicalNotes" className="text-gray-700 dark:text-gray-300">Clinical Notes</Label>
                          <Textarea
                            id="clinicalNotes"
                            value={formData.clinicalNotes}
                            onChange={(e) => setFormData(prev => ({ ...prev, clinicalNotes: e.target.value }))}
                            placeholder="Enter clinical notes..."
                            className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                            rows={3}
                          />
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-gray-700 dark:text-gray-300">Test Items</Label>
                            <LabTestAutocomplete
                              onSelect={addTestItem}
                              placeholder="Add test..."
                              showCode={true}
                              showCategory={true}
                            />
                          </div>
                          
                          {formData.items.length > 0 && (
                            <div className="space-y-2">
                              {formData.items.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                  <div>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      {item.testCode} - {item.testName}
                                    </div>
                                    <div className="text-sm text-gray-500">Specimen: {item.specimenType}</div>
                                  </div>
                                  <Button
                                    onClick={() => removeTestItem(index)}
                                    variant="outline"
                                    size="sm"
                                    className="border-red-200 dark:border-red-600 text-red-700 dark:text-red-300"
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => setIsCreateDialogOpen(false)}
                            variant="outline"
                            className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleCreateRequest}
                            disabled={isSubmitting || !formData.patientId || formData.items.length === 0}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                          >
                            {isSubmitting ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              "Create Request"
                            )}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <TabsTrigger value="all" className="text-gray-700 dark:text-gray-300">All Requests</TabsTrigger>
              <TabsTrigger value="pending" className="text-gray-700 dark:text-gray-300">Pending</TabsTrigger>
              <TabsTrigger value="completed" className="text-gray-700 dark:text-gray-300">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {/* Filters */}
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search requests..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-48 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                        <SelectItem value="all" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">All Statuses</SelectItem>
                        <SelectItem value="PENDING" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Pending</SelectItem>
                        <SelectItem value="IN_PROGRESS" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">In Progress</SelectItem>
                        <SelectItem value="COMPLETED" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Completed</SelectItem>
                        <SelectItem value="CANCELLED" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                      <SelectTrigger className="w-48 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                        <SelectValue placeholder="Filter by urgency" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                        <SelectItem value="all" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">All Urgencies</SelectItem>
                        <SelectItem value="ROUTINE" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Routine</SelectItem>
                        <SelectItem value="URGENT" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Urgent</SelectItem>
                        <SelectItem value="STAT" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Stat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Requests Table */}
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white">Lab Requests</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-300">
                    {filteredRequests.length} of {requests.length} requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-gray-500" />
                      <span className="ml-2 text-gray-500">Loading requests...</span>
                    </div>
                  ) : filteredRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <Microscope className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No lab requests found</h3>
                      <p className="text-gray-500">Create a new request to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <ScrollArea className="h-[600px]">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-gray-200 dark:border-gray-700">
                              <TableHead className="text-gray-700 dark:text-gray-300">Request ID</TableHead>
                              <TableHead className="text-gray-700 dark:text-gray-300">Patient</TableHead>
                              <TableHead className="text-gray-700 dark:text-gray-300">Status</TableHead>
                              <TableHead className="text-gray-700 dark:text-gray-300">Urgency</TableHead>
                              <TableHead className="text-gray-700 dark:text-gray-300">Requested By</TableHead>
                              <TableHead className="text-gray-700 dark:text-gray-300">Date</TableHead>
                              <TableHead className="text-gray-700 dark:text-gray-300">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredRequests.map((request) => (
                              <TableRow key={request.id} className="border-gray-200 dark:border-gray-700">
                                <TableCell className="text-gray-900 dark:text-white font-mono text-sm">
                                  {request.id}
                                </TableCell>
                                <TableCell className="text-gray-900 dark:text-white">
                                  <div>
                                    <div className="font-medium">{request.patientName}</div>
                                    <div className="text-sm text-gray-500">ID: {request.patientId}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={getStatusBadgeVariant(request.status)} className="flex items-center gap-1 w-fit">
                                    {getStatusIcon(request.status)}
                                    {request.status.replace("_", " ")}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={getUrgencyBadgeVariant(request.urgency)} className="w-fit">
                                    {request.urgency}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-gray-900 dark:text-white">{request.requestedBy}</TableCell>
                                <TableCell className="text-gray-900 dark:text-white">
                                  {format(new Date(request.requestedAt), "MMM dd, yyyy HH:mm")}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => viewRequestDetails(request)}
                                      variant="outline"
                                      size="sm"
                                      className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Request Details Dialog */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-4xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-gray-900 dark:text-white">Lab Request Details</DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-300">
                  View detailed information about this lab request
                </DialogDescription>
              </DialogHeader>
              {selectedRequest && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300">Request ID</Label>
                      <p className="text-gray-900 dark:text-white font-mono">{selectedRequest.id}</p>
                    </div>
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300">Patient</Label>
                      <p className="text-gray-900 dark:text-white">{selectedRequest.patientName}</p>
                    </div>
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300">Status</Label>
                      <Badge variant={getStatusBadgeVariant(selectedRequest.status)} className="flex items-center gap-1 w-fit">
                        {getStatusIcon(selectedRequest.status)}
                        {selectedRequest.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300">Urgency</Label>
                      <Badge variant={getUrgencyBadgeVariant(selectedRequest.urgency)} className="w-fit">
                        {selectedRequest.urgency}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300">Requested By</Label>
                      <p className="text-gray-900 dark:text-white">{selectedRequest.requestedBy}</p>
                    </div>
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300">Requested At</Label>
                      <p className="text-gray-900 dark:text-white">{format(new Date(selectedRequest.requestedAt), "PPP 'at' p")}</p>
                    </div>
                  </div>
                  
                  {selectedRequest.clinicalNotes && (
                    <>
                      <Separator className="bg-gray-200 dark:bg-gray-700" />
                      <div>
                        <Label className="text-gray-700 dark:text-gray-300">Clinical Notes</Label>
                        <p className="text-gray-900 dark:text-white">{selectedRequest.clinicalNotes}</p>
                      </div>
                    </>
                  )}

                  <Separator className="bg-gray-200 dark:bg-gray-700" />
                  
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Test Items</Label>
                    <div className="space-y-2 mt-2">
                      {selectedRequest.items.map((item, index) => (
                        <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {item.testCode} - {item.testName}
                              </div>
                              <div className="text-sm text-gray-500">Specimen: {item.specimenType}</div>
                              {item.notes && (
                                <div className="text-sm text-gray-500 mt-1">Notes: {item.notes}</div>
                              )}
                            </div>
                            <Badge variant={getStatusBadgeVariant(item.status)} className="flex items-center gap-1">
                              {getStatusIcon(item.status)}
                              {item.status.replace("_", " ")}
                            </Badge>
                          </div>
                          {item.result && (
                            <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border">
                              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Result:</div>
                              <div className="text-gray-900 dark:text-white">{item.result}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </ProtectedRoute>
  )
}
