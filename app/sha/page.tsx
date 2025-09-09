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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { useToast } from "../../hooks/use-toast"
import { SHADocumentManager } from "../../components/sha/SHADocumentManager"
import { SHAExportSystem } from "../../components/sha/SHAExportSystem"
import { PatientClinicalData } from "../../components/sha/PatientClinicalData"
import { 
  Shield, 
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
  DollarSign,
  Download
} from "lucide-react"
import { format } from "date-fns"

interface SHAClaim {
  id: string
  patient_id: string
  visit_id: string
  claim_number: string
  claim_type: string
  status: string
  amount: number
  submitted_date: string
  processed_date?: string
  notes?: string
  created_at: string
  patient?: {
    first_name: string
    last_name: string
    nhif_number?: string
  }
  visit?: {
    visit_date: string
    chief_complaint: string
  }
}

interface SHABatch {
  id: string
  batch_number: string
  status: string
  total_claims: number
  total_amount: number
  created_date: string
  submitted_date?: string
  processed_date?: string
}

export default function SHAPage() {
  const { accessToken, isAuthenticated, user, logout } = useAuthStore()
  const { toast } = useToast()
  const [claims, setClaims] = useState<SHAClaim[]>([])
  const [batches, setBatches] = useState<SHABatch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false)
  const [selectedClaim, setSelectedClaim] = useState<SHAClaim | null>(null)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    patient_id: "",
    visit_id: "",
    claim_type: "",
    amount: "",
    notes: ""
  })

  const [batchFormData, setBatchFormData] = useState({
    batch_number: "",
    notes: ""
  })

  const claimTypes = [
    "Outpatient",
    "Inpatient",
    "Emergency",
    "Surgery",
    "Laboratory",
    "Radiology",
    "Pharmacy",
    "Other"
  ]

  const claimStatuses = [
    "Draft",
    "Submitted",
    "Under Review",
    "Approved",
    "Rejected",
    "Paid",
    "Cancelled"
  ]

  const batchStatuses = [
    "Draft",
    "Submitted",
    "Under Review",
    "Approved",
    "Rejected",
    "Processed"
  ]

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      console.log("User authenticated, fetching SHA data...")
      fetchClaims()
      fetchBatches()
    } else {
      console.log("User not authenticated, skipping data fetch")
      console.log("Authentication state:", { isAuthenticated, hasToken: !!accessToken, user })
      setIsLoading(false)
    }
  }, [isAuthenticated, accessToken])

  const fetchClaims = async () => {
    try {
      setIsLoading(true)
      
      // Check if user is authenticated
      if (!accessToken) {
        console.error("No access token available")
        toast({
          title: "Authentication Error",
          description: "Please log in to access SHA claims data.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/sha-claims`, {
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
          // Logout and redirect to login
          await logout()
          window.location.href = '/login'
          return
        } else if (response.status === 404) {
          // SHA claims API endpoint not implemented yet
          console.log("SHA claims API endpoint not yet implemented in backend")
          setClaims([]) // Set empty array for now
          toast({
            title: "Info",
            description: "SHA claims functionality is not yet implemented in the backend.",
            variant: "default",
          })
          return
        }
        throw new Error(`Failed to fetch SHA claims: ${response.status}`)
      }

      const data = await response.json()
      setClaims(data.claims || [])
    } catch (error) {
      console.error("Error fetching SHA claims:", error)
      toast({
        title: "Error",
        description: "Failed to fetch SHA claims. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBatches = async () => {
    try {
      // Check if user is authenticated
      if (!accessToken) {
        console.error("No access token available for SHA batches")
        console.log("Authentication state:", { isAuthenticated, user, accessToken: !!accessToken })
        toast({
          title: "Authentication Required",
          description: "Please log in to view SHA batches.",
          variant: "destructive",
        })
        return
      }

      console.log("Fetching SHA batches with token:", accessToken.substring(0, 20) + "...")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/sha-batches`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const data = await response.json()
        setBatches(data.data?.batches || [])
      } else if (response.status === 401) {
        console.error("Authentication error when fetching SHA batches")
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        })
        // Logout and redirect to login
        await logout()
        window.location.href = '/login'
      } else if (response.status === 404) {
        // SHA batches API endpoint not implemented yet
        console.log("SHA batches API endpoint not yet implemented in backend")
        setBatches([]) // Set empty array for now
      } else {
        console.error(`HTTP error ${response.status} when fetching SHA batches`)
        toast({
          title: "Error",
          description: `Failed to fetch SHA batches (${response.status}). Please try again.`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching SHA batches:", error)
      toast({
        title: "Network Error",
        description: "Failed to connect to the server. Please check your connection.",
        variant: "destructive",
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
          description: "Please log in to create SHA claims.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/sha-claims`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      })

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Authentication Error",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          })
          return
        } else if (response.status === 404) {
          toast({
            title: "Info",
            description: "SHA claims functionality is not yet implemented in the backend.",
            variant: "default",
          })
          return
        }
        throw new Error(`Failed to create SHA claim: ${response.status}`)
      }

      toast({
        title: "Success",
        description: "SHA claim created successfully.",
      })

      setIsDialogOpen(false)
      setFormData({
        patient_id: "",
        visit_id: "",
        claim_type: "",
        amount: "",
        notes: ""
      })
      fetchClaims()
    } catch (error) {
      console.error("Error creating SHA claim:", error)
      toast({
        title: "Error",
        description: "Failed to create SHA claim. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/sha-batches`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(batchFormData)
      })

      if (!response.ok) {
        throw new Error(`Failed to create SHA batch: ${response.status}`)
      }

      toast({
        title: "Success",
        description: "SHA batch created successfully.",
      })

      setIsBatchDialogOpen(false)
      setBatchFormData({
        batch_number: "",
        notes: ""
      })
      fetchBatches()
    } catch (error) {
      console.error("Error creating SHA batch:", error)
      toast({
        title: "Error",
        description: "Failed to create SHA batch. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusUpdate = async (claimId: string, newStatus: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/sha-claims/${claimId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error(`Failed to update claim status: ${response.status}`)
      }

      toast({
        title: "Success",
        description: "Claim status updated successfully.",
      })

      fetchClaims()
    } catch (error) {
      console.error("Error updating claim status:", error)
      toast({
        title: "Error",
        description: "Failed to update claim status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleGenerateInvoice = async (claimId: string) => {
    try {
      setIsSubmitting(true)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/sha-invoices/generate-comprehensive/${claimId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Success",
          description: "Comprehensive SHA invoice generated successfully",
          variant: "default",
        })
        
        // Optionally show invoice details or download
        console.log("Generated invoice:", result.data)
      } else {
        throw new Error("Failed to generate invoice")
      }
    } catch (error) {
      console.error("Error generating invoice:", error)
      toast({
        title: "Error",
        description: "Failed to generate invoice. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredClaims = claims.filter(claim => {
    const matchesSearch = 
      claim.patient?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.patient?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.claim_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.claim_type?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === "all" || claim.status.toLowerCase() === filterStatus.toLowerCase()

    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
      case "submitted":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
      case "under review":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
      case "paid":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return <FileText className="h-4 w-4" />
      case "submitted":
        return <Clock className="h-4 w-4" />
      case "under review":
        return <RefreshCw className="h-4 w-4" />
      case "approved":
        return <CheckCircle className="h-4 w-4" />
      case "rejected":
        return <AlertCircle className="h-4 w-4" />
      case "paid":
        return <DollarSign className="h-4 w-4" />
      case "cancelled":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.CLAIMS_MANAGER]}>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
        <Sidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">SHA Claims</h1>
                  <p className="text-slate-600 dark:text-slate-400">Manage Social Health Authority claims and batches</p>
                  {!isAuthenticated && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                      ⚠️ Please log in to access all features
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        New Claim
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <DialogHeader>
                        <DialogTitle className="text-slate-900 dark:text-slate-100">Create New SHA Claim</DialogTitle>
                        <DialogDescription className="text-slate-600 dark:text-slate-400">
                          Submit a new claim to the Social Health Authority
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
                            <Label htmlFor="claim_type" className="text-slate-700 dark:text-slate-300">Claim Type</Label>
                            <Select
                              value={formData.claim_type}
                              onValueChange={(value) => setFormData({ ...formData, claim_type: value })}
                            >
                              <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                                <SelectValue placeholder="Select claim type" />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                                {claimTypes.map((type) => (
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
                            <Label htmlFor="amount" className="text-slate-700 dark:text-slate-300">Amount (KES)</Label>
                            <Input
                              id="amount"
                              type="number"
                              step="0.01"
                              value={formData.amount}
                              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                              placeholder="Enter claim amount"
                              className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="notes" className="text-slate-700 dark:text-slate-300">Notes</Label>
                          <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Enter claim notes"
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
                              "Create Claim"
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300">
                        <Shield className="h-4 w-4" />
                        New Batch
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <DialogHeader>
                        <DialogTitle className="text-slate-900 dark:text-slate-100">Create New SHA Batch</DialogTitle>
                        <DialogDescription className="text-slate-600 dark:text-slate-400">
                          Create a new batch for SHA claims
                        </DialogDescription>
                      </DialogHeader>
                      
                      <form onSubmit={handleBatchSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="batch_number" className="text-slate-700 dark:text-slate-300">Batch Number</Label>
                          <Input
                            id="batch_number"
                            value={batchFormData.batch_number}
                            onChange={(e) => setBatchFormData({ ...batchFormData, batch_number: e.target.value })}
                            placeholder="Enter batch number"
                            className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="batch_notes" className="text-slate-700 dark:text-slate-300">Notes</Label>
                          <Textarea
                            id="batch_notes"
                            value={batchFormData.notes}
                            onChange={(e) => setBatchFormData({ ...batchFormData, notes: e.target.value })}
                            placeholder="Enter batch notes"
                            className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                            rows={3}
                          />
                        </div>

                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsBatchDialogOpen(false)}
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
                              "Create Batch"
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
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
                    placeholder="Search claims..."
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
                    {claimStatuses.map((status) => (
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
                  onClick={fetchClaims}
                  className="border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Claims List */}
            {!accessToken ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <User className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Authentication Required</h3>
                  <p className="text-slate-600 dark:text-slate-400">Please log in to view SHA claims data.</p>
                </div>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredClaims.length === 0 ? (
                  <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Shield className="h-12 w-12 text-slate-400 mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No SHA claims found</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-center">
                        {searchTerm || filterStatus !== "all" 
                          ? "No claims match your current filters." 
                          : "Get started by creating a new SHA claim."}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredClaims.map((claim) => (
                    <Card key={claim.id} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                              <Shield className="h-4 w-4" />
                            </div>
                            <div>
                              <CardTitle className="text-slate-900 dark:text-slate-100">
                                {claim.patient ? `${claim.patient.first_name} ${claim.patient.last_name}` : "Unknown Patient"}
                              </CardTitle>
                              <CardDescription className="text-slate-600 dark:text-slate-400">
                                {claim.claim_number} • {claim.claim_type}
                              </CardDescription>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(claim.status)}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(claim.status)}
                                {claim.status.toUpperCase()}
                              </div>
                            </Badge>
                            
                            <Select
                              value={claim.status}
                              onValueChange={(value) => handleStatusUpdate(claim.id, value)}
                            >
                              <SelectTrigger className="w-[140px] h-8 text-xs bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                                {claimStatuses.map((status) => (
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
                              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Amount</Label>
                              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                KES {claim.amount.toLocaleString()}
                              </p>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Submitted Date</Label>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {format(new Date(claim.submitted_date), "MMM dd, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                          </div>
                          
                          {claim.processed_date && (
                            <div>
                              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Processed Date</Label>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {format(new Date(claim.processed_date), "MMM dd, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                          )}
                          
                          {claim.notes && (
                            <div>
                              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes</Label>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{claim.notes}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Calendar className="h-4 w-4" />
                            Created {format(new Date(claim.created_at), "MMM dd, yyyy")}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPatientId(claim.patient_id)
                                setSelectedVisitId(claim.visit_id)
                              }}
                              className="border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                            >
                              <User className="h-4 w-4 mr-1" />
                              View Patient Data
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateInvoice(claim.id)}
                              className="border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Generate Invoice
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

          {/* Patient Clinical Data Section */}
          {selectedPatientId && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                      <User className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Patient Clinical Data</h2>
                      <p className="text-slate-600 dark:text-slate-400">Comprehensive patient information for SHA claims</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedPatientId(null)
                      setSelectedVisitId(null)
                    }}
                    className="border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                  >
                    Close
                  </Button>
                </div>
                
                {!accessToken ? (
                  <div className="text-center py-8">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Authentication Required</h3>
                    <p className="text-slate-600 dark:text-slate-400">Please log in to access patient clinical data.</p>
                  </div>
                ) : (
                  <PatientClinicalData
                    patientId={selectedPatientId}
                    visitId={selectedVisitId || undefined}
                    accessToken={accessToken}
                    onDataLoaded={(data) => {
                      console.log('Patient clinical data loaded:', data)
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Document Management Section */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Document Management</h2>
                  <p className="text-slate-600 dark:text-slate-400">Manage documents for SHA claims</p>
                </div>
              </div>
              
              {!accessToken ? (
                <div className="text-center py-8">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Authentication Required</h3>
                  <p className="text-slate-600 dark:text-slate-400">Please log in to access document management.</p>
                </div>
              ) : (
                <SHADocumentManager 
                  claimId={claims.length > 0 ? claims[0].id : undefined}
                  onDocumentUploaded={(doc) => {
                    toast({
                      title: "Success",
                      description: "Document uploaded successfully",
                      variant: "default"
                    })
                  }}
                  onDocumentDeleted={(docId) => {
                    toast({
                      title: "Success", 
                      description: "Document deleted successfully",
                      variant: "default"
                    })
                  }}
                />
              )}
            </div>
          </div>

          {/* Export System Section */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                  <Download className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Export System</h2>
                  <p className="text-slate-600 dark:text-slate-400">Export SHA data in various formats</p>
                </div>
              </div>
              
              {!accessToken ? (
                <div className="text-center py-8">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Authentication Required</h3>
                  <p className="text-slate-600 dark:text-slate-400">Please log in to access export system.</p>
                </div>
              ) : (
                <SHAExportSystem />
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}