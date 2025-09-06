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
  UserCheck, 
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
  AlertCircle,
  Activity,
  Heart,
  Thermometer
} from "lucide-react"
import { format } from "date-fns"

interface PatientEncounter {
  id: string
  patient_id: string
  encounter_type: string
  encounter_date: string
  chief_complaint: string
  history_of_present_illness: string
  physical_examination: string
  assessment: string
  plan: string
  status: string
  created_at: string
  updated_at: string
  patient?: {
    first_name: string
    last_name: string
    phone: string
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

export default function PatientEncountersPage() {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const [encounters, setEncounters] = useState<PatientEncounter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedEncounter, setSelectedEncounter] = useState<PatientEncounter | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    patient_id: "",
    encounter_type: "",
    encounter_date: "",
    chief_complaint: "",
    history_of_present_illness: "",
    physical_examination: "",
    assessment: "",
    plan: "",
    status: "active"
  })

  const encounterTypes = [
    "Initial Consultation",
    "Follow-up Visit",
    "Emergency Visit",
    "Routine Check-up",
    "Specialist Consultation",
    "Telemedicine",
    "Home Visit"
  ]

  const encounterStatuses = [
    "Active",
    "Completed",
    "Cancelled",
    "In Progress",
    "Scheduled"
  ]

  useEffect(() => {
    fetchEncounters()
  }, [])

  const fetchEncounters = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/patient-encounters`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch encounters: ${response.status}`)
      }

      const data = await response.json()
      setEncounters(data.encounters || [])
    } catch (error) {
      console.error("Error fetching encounters:", error)
      toast({
        title: "Error",
        description: "Failed to fetch encounters. Please try again.",
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/patient-encounters`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error(`Failed to create encounter: ${response.status}`)
      }

      toast({
        title: "Success",
        description: "Patient encounter created successfully.",
      })

      setIsDialogOpen(false)
      setFormData({
        patient_id: "",
        encounter_type: "",
        encounter_date: "",
        chief_complaint: "",
        history_of_present_illness: "",
        physical_examination: "",
        assessment: "",
        plan: "",
        status: "active"
      })
      fetchEncounters()
    } catch (error) {
      console.error("Error creating encounter:", error)
      toast({
        title: "Error",
        description: "Failed to create encounter. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusUpdate = async (encounterId: string, newStatus: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/patient-encounters/${encounterId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error(`Failed to update encounter status: ${response.status}`)
      }

      toast({
        title: "Success",
        description: "Encounter status updated successfully.",
      })

      fetchEncounters()
    } catch (error) {
      console.error("Error updating encounter status:", error)
      toast({
        title: "Error",
        description: "Failed to update encounter status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const filteredEncounters = encounters.filter(encounter => {
    const matchesSearch = 
      encounter.patient?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      encounter.patient?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      encounter.chief_complaint?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      encounter.encounter_type?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === "all" || encounter.status.toLowerCase() === filterStatus.toLowerCase()

    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
      case "in progress":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
      case "scheduled":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return <Activity className="h-4 w-4" />
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "cancelled":
        return <AlertCircle className="h-4 w-4" />
      case "in progress":
        return <RefreshCw className="h-4 w-4" />
      case "scheduled":
        return <Clock className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
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
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Patient Encounters</h1>
                  <p className="text-slate-600 dark:text-slate-400">Manage comprehensive patient encounters and clinical notes</p>
                </div>
                
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      New Encounter
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[800px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-slate-900 dark:text-slate-100">Create New Patient Encounter</DialogTitle>
                      <DialogDescription className="text-slate-600 dark:text-slate-400">
                        Document a comprehensive patient encounter
                      </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
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
                          <Label htmlFor="encounter_date" className="text-slate-700 dark:text-slate-300">Encounter Date</Label>
                          <Input
                            id="encounter_date"
                            type="datetime-local"
                            value={formData.encounter_date}
                            onChange={(e) => setFormData({ ...formData, encounter_date: e.target.value })}
                            className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="encounter_type" className="text-slate-700 dark:text-slate-300">Encounter Type</Label>
                          <Select
                            value={formData.encounter_type}
                            onValueChange={(value) => setFormData({ ...formData, encounter_type: value })}
                          >
                            <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                              <SelectValue placeholder="Select encounter type" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                              {encounterTypes.map((type) => (
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
                        
                        <div className="space-y-2">
                          <Label htmlFor="status" className="text-slate-700 dark:text-slate-300">Status</Label>
                          <Select
                            value={formData.status}
                            onValueChange={(value) => setFormData({ ...formData, status: value })}
                          >
                            <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                              {encounterStatuses.map((status) => (
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
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="chief_complaint" className="text-slate-700 dark:text-slate-300">Chief Complaint</Label>
                        <Textarea
                          id="chief_complaint"
                          value={formData.chief_complaint}
                          onChange={(e) => setFormData({ ...formData, chief_complaint: e.target.value })}
                          placeholder="Enter chief complaint"
                          className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                          rows={3}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="history_of_present_illness" className="text-slate-700 dark:text-slate-300">History of Present Illness</Label>
                        <Textarea
                          id="history_of_present_illness"
                          value={formData.history_of_present_illness}
                          onChange={(e) => setFormData({ ...formData, history_of_present_illness: e.target.value })}
                          placeholder="Enter history of present illness"
                          className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                          rows={4}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="physical_examination" className="text-slate-700 dark:text-slate-300">Physical Examination</Label>
                        <Textarea
                          id="physical_examination"
                          value={formData.physical_examination}
                          onChange={(e) => setFormData({ ...formData, physical_examination: e.target.value })}
                          placeholder="Enter physical examination findings"
                          className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                          rows={4}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="assessment" className="text-slate-700 dark:text-slate-300">Assessment</Label>
                        <Textarea
                          id="assessment"
                          value={formData.assessment}
                          onChange={(e) => setFormData({ ...formData, assessment: e.target.value })}
                          placeholder="Enter clinical assessment"
                          className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="plan" className="text-slate-700 dark:text-slate-300">Plan</Label>
                        <Textarea
                          id="plan"
                          value={formData.plan}
                          onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                          placeholder="Enter treatment plan"
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
                            "Create Encounter"
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
                    placeholder="Search encounters..."
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
                    {encounterStatuses.map((status) => (
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
                  onClick={fetchEncounters}
                  className="border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Encounters List */}
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredEncounters.length === 0 ? (
                  <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <UserCheck className="h-12 w-12 text-slate-400 mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No encounters found</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-center">
                        {searchTerm || filterStatus !== "all" 
                          ? "No encounters match your current filters." 
                          : "Get started by creating a new patient encounter."}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredEncounters.map((encounter) => (
                    <Card key={encounter.id} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                              <UserCheck className="h-4 w-4" />
                            </div>
                            <div>
                              <CardTitle className="text-slate-900 dark:text-slate-100">
                                {encounter.patient ? `${encounter.patient.first_name} ${encounter.patient.last_name}` : "Unknown Patient"}
                              </CardTitle>
                              <CardDescription className="text-slate-600 dark:text-slate-400">
                                {encounter.encounter_type} • {format(new Date(encounter.encounter_date), "MMM dd, yyyy 'at' h:mm a")}
                              </CardDescription>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(encounter.status)}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(encounter.status)}
                                {encounter.status.replace("_", " ").toUpperCase()}
                              </div>
                            </Badge>
                            
                            <Select
                              value={encounter.status}
                              onValueChange={(value) => handleStatusUpdate(encounter.id, value)}
                            >
                              <SelectTrigger className="w-[140px] h-8 text-xs bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                                {encounterStatuses.map((status) => (
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
                        <div className="space-y-4">
                          {encounter.chief_complaint && (
                            <div>
                              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Chief Complaint</Label>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{encounter.chief_complaint}</p>
                            </div>
                          )}
                          
                          {encounter.assessment && (
                            <div>
                              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Assessment</Label>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{encounter.assessment}</p>
                            </div>
                          )}
                          
                          {encounter.plan && (
                            <div>
                              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Plan</Label>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{encounter.plan}</p>
                            </div>
                          )}

                          {encounter.vitals && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-slate-500" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">BP: {encounter.vitals.blood_pressure}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Heart className="h-4 w-4 text-slate-500" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">HR: {encounter.vitals.heart_rate} bpm</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Thermometer className="h-4 w-4 text-slate-500" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">Temp: {encounter.vitals.temperature}°C</span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Calendar className="h-4 w-4" />
                            Created {format(new Date(encounter.created_at), "MMM dd, yyyy")}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedEncounter(encounter)}
                              className="border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
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
    </ProtectedRoute>
  )
}
