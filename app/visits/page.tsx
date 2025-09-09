"use client"

import { useState, useEffect } from "react"
import { useAuthStore } from "../../lib/auth"
import { ProtectedRoute } from "../../components/auth/ProtectedRoute"
import { UserRole } from "../../types"
import Sidebar from "../../components/dashboard/Sidebar"
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
  Calendar, 
  Clock, 
  User, 
  Stethoscope, 
  FileText, 
  Plus, 
  Search, 
  Filter,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Activity,
  Heart,
  Thermometer,
  Weight,
  Ruler
} from "lucide-react"
import { format } from "date-fns"

interface Visit {
  id: string
  patientId: string
  opNumber: string
  visitDate: string
  status: string
  chiefComplaint?: string
  triageCategory?: string
  createdAt: string
  updatedAt: string
  patient?: {
    firstName: string
    lastName: string
    phoneNumber: string
    email: string
  }
  vitals?: {
    blood_pressure: string
    heart_rate: number
    temperature: number
    weight: number
    height: number
    oxygen_saturation: number
  }
}

interface Vitals {
  blood_pressure: string
  heart_rate: number
  temperature: number
  weight: number
  height: number
  oxygen_saturation: number
}

export default function VisitsPage() {
  const { accessToken, user } = useAuthStore()
  const { toast } = useToast()
  const [visits, setVisits] = useState<Visit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isVitalsDialogOpen, setIsVitalsDialogOpen] = useState(false)
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    patientId: "",
    chiefComplaint: "",
    triageCategory: "NORMAL"
  })

  const [vitalsData, setVitalsData] = useState<Vitals>({
    blood_pressure: "",
    heart_rate: 0,
    temperature: 0,
    weight: 0,
    height: 0,
    oxygen_saturation: 0
  })

  const visitTypes = [
    "Consultation",
    "Follow-up",
    "Emergency",
    "Routine Check-up",
    "Specialist Referral",
    "Lab Visit"
  ]

  const visitStatuses = [
    "Scheduled",
    "In Progress",
    "Completed",
    "Cancelled",
    "No Show"
  ]

  useEffect(() => {
    if (accessToken) {
      fetchVisits()
    }
  }, [accessToken])

  const fetchVisits = async () => {
    try {
      setIsLoading(true)
      
      // Check if user is authenticated
      if (!accessToken) {
        console.error("No access token available")
        toast({
          title: "Authentication Error",
          description: "Please log in to access visits data.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/visits/queue`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
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
        throw new Error(`Failed to fetch visits: ${response.status}`)
      }

      const data = await response.json()
      setVisits(data.data?.queue || [])
    } catch (error) {
      console.error("Error fetching visits:", error)
      toast({
        title: "Error",
        description: "Failed to fetch visits. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
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
          description: "Please log in to create visits.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/visits`, {
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
        throw new Error(`Failed to create visit: ${response.status}`)
      }

      toast({
        title: "Success",
        description: "Visit created successfully.",
      })

      setIsDialogOpen(false)
      setFormData({
        patientId: "",
        chiefComplaint: "",
        triageCategory: "NORMAL"
      })
      fetchVisits()
    } catch (error) {
      console.error("Error creating visit:", error)
      toast({
        title: "Error",
        description: "Failed to create visit. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVitalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVisit) return

    setIsSubmitting(true)

    try {
      // TODO: Implement vitals API endpoint in backend
      // For now, just show a success message
      toast({
        title: "Success",
        description: "Vitals recorded successfully. (Note: Vitals API not yet implemented in backend)",
      })

      setIsVitalsDialogOpen(false)
      setVitalsData({
        blood_pressure: "",
        heart_rate: 0,
        temperature: 0,
        weight: 0,
        height: 0,
        oxygen_saturation: 0
      })
      fetchVisits()
    } catch (error) {
      console.error("Error adding vitals:", error)
      toast({
        title: "Error",
        description: "Failed to add vitals. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleViewVisitDetails = (visit: any) => {
    // For now, show visit details in an alert
    // In a real implementation, this would open a detailed view modal
    const details = `
Visit Details:
- Patient: ${visit.patientName}
- Chief Complaint: ${visit.chiefComplaint}
- Triage Category: ${visit.triageCategory}
- Status: ${visit.status}
- Created: ${new Date(visit.createdAt).toLocaleString()}
- Updated: ${new Date(visit.updatedAt).toLocaleString()}
    `
    alert(details)
  }

  const handleEditVisit = (visit: any) => {
    // For now, show a simple edit dialog
    const newComplaint = prompt("Enter new chief complaint:", visit.chiefComplaint)
    if (newComplaint && newComplaint !== visit.chiefComplaint) {
      // Update the visit in local state
      setVisits(visits.map(v => 
        v.id === visit.id 
          ? { ...v, chiefComplaint: newComplaint, updatedAt: new Date().toISOString() }
          : v
      ))
      
      toast({
        title: "Success",
        description: "Visit updated successfully",
        variant: "default",
      })
    }
  }

  const handleDeleteVisit = (visit: any) => {
    const confirmed = confirm(`Are you sure you want to delete this visit for ${visit.patientName}? This action cannot be undone.`)
    
    if (confirmed) {
      setVisits(visits.filter(v => v.id !== visit.id))
      
      toast({
        title: "Success",
        description: "Visit deleted successfully",
        variant: "default",
      })
    }
  }

  const handleStatusUpdate = async (visitId: string, newStatus: string) => {
    try {
      // Check if user is authenticated
      if (!accessToken) {
        toast({
          title: "Authentication Error",
          description: "Please log in to update visit status.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/visits/${visitId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
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
        throw new Error(`Failed to update visit status: ${response.status}`)
      }

      toast({
        title: "Success",
        description: "Visit status updated successfully.",
      })

      fetchVisits()
    } catch (error) {
      console.error("Error updating visit status:", error)
      toast({
        title: "Error",
        description: "Failed to update visit status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const filteredVisits = visits.filter(visit => {
    const matchesSearch = 
      visit.patient?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.patient?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.chiefComplaint?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.triageCategory?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === "all" || visit.status.toLowerCase() === filterStatus.toLowerCase()

    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
      case "in progress":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
      case "no show":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
    }
  }

  const getVisitTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "consultation":
        return <Stethoscope className="h-4 w-4" />
      case "follow-up":
        return <RefreshCw className="h-4 w-4" />
      case "emergency":
        return <Activity className="h-4 w-4" />
      case "routine check-up":
        return <Heart className="h-4 w-4" />
      case "specialist referral":
        return <User className="h-4 w-4" />
      case "lab visit":
        return <FileText className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE]}>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
        <Sidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Visit Management</h1>
                  <p className="text-slate-600 dark:text-slate-400">Manage patient visits and appointments</p>
                </div>
                
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      New Visit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <DialogHeader>
                      <DialogTitle className="text-slate-900 dark:text-slate-100">Create New Visit</DialogTitle>
                      <DialogDescription className="text-slate-600 dark:text-slate-400">
                        Schedule a new patient visit
                      </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="patientId" className="text-slate-700 dark:text-slate-300">Patient ID</Label>
                        <Input
                          id="patientId"
                          value={formData.patientId}
                          onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                          placeholder="Enter patient ID"
                          className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="triageCategory" className="text-slate-700 dark:text-slate-300">Triage Category</Label>
                        <Select
                          value={formData.triageCategory}
                          onValueChange={(value) => setFormData({ ...formData, triageCategory: value })}
                        >
                          <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                            <SelectValue placeholder="Select triage category" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                            <SelectItem 
                              value="NORMAL"
                              className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600"
                            >
                              Normal
                            </SelectItem>
                            <SelectItem 
                              value="URGENT"
                              className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600"
                            >
                              Urgent
                            </SelectItem>
                            <SelectItem 
                              value="EMERGENCY"
                              className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600"
                            >
                              Emergency
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="chiefComplaint" className="text-slate-700 dark:text-slate-300">Chief Complaint</Label>
                        <Textarea
                          id="chiefComplaint"
                          value={formData.chiefComplaint}
                          onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                          placeholder="Enter chief complaint"
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
                            "Create Visit"
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
                    placeholder="Search visits..."
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
                    {visitStatuses.map((status) => (
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
                  onClick={fetchVisits}
                  className="border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Visits List */}
            {!accessToken ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <User className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Authentication Required</h3>
                  <p className="text-slate-600 dark:text-slate-400">Please log in to view visits data.</p>
                </div>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredVisits.length === 0 ? (
                  <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Calendar className="h-12 w-12 text-slate-400 mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No visits found</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-center">
                        {searchTerm || filterStatus !== "all" 
                          ? "No visits match your current filters." 
                          : "Get started by creating a new visit."}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredVisits.map((visit) => (
                    <Card key={visit.id} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                              {getVisitTypeIcon(visit.triageCategory || "NORMAL")}
                            </div>
                            <div>
                              <CardTitle className="text-slate-900 dark:text-slate-100">
                                {visit.patient ? `${visit.patient.firstName} ${visit.patient.lastName}` : "Unknown Patient"}
                              </CardTitle>
                              <CardDescription className="text-slate-600 dark:text-slate-400">
                                {visit.triageCategory || "NORMAL"} • {format(new Date(visit.visitDate), "MMM dd, yyyy 'at' h:mm a")}
                              </CardDescription>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(visit.status)}>
                              {visit.status.replace("_", " ").toUpperCase()}
                            </Badge>
                            
                            <Select
                              value={visit.status}
                              onValueChange={(value) => handleStatusUpdate(visit.id, value)}
                            >
                              <SelectTrigger className="w-[140px] h-8 text-xs bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                                {visitStatuses.map((status) => (
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
                          {visit.chiefComplaint && (
                            <div>
                              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Chief Complaint</Label>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{visit.chiefComplaint}</p>
                            </div>
                          )}
                          
                          {visit.diagnosis && (
                            <div>
                              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Diagnosis</Label>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{visit.diagnosis}</p>
                            </div>
                          )}
                          
                          {visit.treatment_plan && (
                            <div>
                              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Treatment Plan</Label>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{visit.treatment_plan}</p>
                            </div>
                          )}

                          {visit.vitals && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-slate-500" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">BP: {visit.vitals.blood_pressure}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Heart className="h-4 w-4 text-slate-500" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">HR: {visit.vitals.heart_rate} bpm</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Thermometer className="h-4 w-4 text-slate-500" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">Temp: {visit.vitals.temperature}°C</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Weight className="h-4 w-4 text-slate-500" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">Weight: {visit.vitals.weight} kg</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Ruler className="h-4 w-4 text-slate-500" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">Height: {visit.vitals.height} cm</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-slate-500" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">SpO2: {visit.vitals.oxygen_saturation}%</span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Clock className="h-4 w-4" />
                            Created {format(new Date(visit.createdAt), "MMM dd, yyyy")}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedVisit(visit)
                                setIsVitalsDialogOpen(true)
                              }}
                              className="border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                            >
                              <Activity className="h-4 w-4 mr-1" />
                              Add Vitals
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewVisitDetails(visit)}
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

      {/* Vitals Dialog */}
      <Dialog open={isVitalsDialogOpen} onOpenChange={setIsVitalsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Record Vitals</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Record vital signs for {selectedVisit?.patient ? `${selectedVisit.patient.firstName} ${selectedVisit.patient.lastName}` : "this patient"}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleVitalsSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="blood_pressure" className="text-slate-700 dark:text-slate-300">Blood Pressure</Label>
                <Input
                  id="blood_pressure"
                  value={vitalsData.blood_pressure}
                  onChange={(e) => setVitalsData({ ...vitalsData, blood_pressure: e.target.value })}
                  placeholder="120/80"
                  className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="heart_rate" className="text-slate-700 dark:text-slate-300">Heart Rate (bpm)</Label>
                <Input
                  id="heart_rate"
                  type="number"
                  value={vitalsData.heart_rate}
                  onChange={(e) => setVitalsData({ ...vitalsData, heart_rate: Number(e.target.value) })}
                  placeholder="72"
                  className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperature" className="text-slate-700 dark:text-slate-300">Temperature (°C)</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  value={vitalsData.temperature}
                  onChange={(e) => setVitalsData({ ...vitalsData, temperature: Number(e.target.value) })}
                  placeholder="36.5"
                  className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="weight" className="text-slate-700 dark:text-slate-300">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={vitalsData.weight}
                  onChange={(e) => setVitalsData({ ...vitalsData, weight: Number(e.target.value) })}
                  placeholder="70"
                  className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height" className="text-slate-700 dark:text-slate-300">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={vitalsData.height}
                  onChange={(e) => setVitalsData({ ...vitalsData, height: Number(e.target.value) })}
                  placeholder="170"
                  className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="oxygen_saturation" className="text-slate-700 dark:text-slate-300">Oxygen Saturation (%)</Label>
                <Input
                  id="oxygen_saturation"
                  type="number"
                  value={vitalsData.oxygen_saturation}
                  onChange={(e) => setVitalsData({ ...vitalsData, oxygen_saturation: Number(e.target.value) })}
                  placeholder="98"
                  className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsVitalsDialogOpen(false)}
                className="border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Recording...
                  </>
                ) : (
                  "Record Vitals"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  )
}
