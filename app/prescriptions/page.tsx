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
import { useToast } from "../../hooks/use-toast"
import { 
  Pill, 
  Plus, 
  Search, 
  RefreshCw,
  Calendar,
  User,
  Eye,
  Edit
} from "lucide-react"
import { format } from "date-fns"

interface Prescription {
  id: string
  patient_id: string
  visit_id: string
  prescribed_by: string
  prescription_date: string
  status: string
  notes: string
  created_at: string
  patient?: {
    first_name: string
    last_name: string
  }
  items: PrescriptionItem[]
}

interface PrescriptionItem {
  id: string
  medication_name: string
  dosage: string
  frequency: string
  duration: string
  quantity: number
  instructions: string
}

export default function PrescriptionsPage() {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchPrescriptions()
  }, [])

  const fetchPrescriptions = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/prescriptions`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch prescriptions: ${response.status}`)
      }

      const data = await response.json()
      setPrescriptions(data.prescriptions || [])
    } catch (error) {
      console.error("Error fetching prescriptions:", error)
      toast({
        title: "Error",
        description: "Failed to fetch prescriptions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredPrescriptions = prescriptions.filter(prescription => {
    const matchesSearch = 
      prescription.patient?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.patient?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.items.some(item => 
        item.medication_name.toLowerCase().includes(searchTerm.toLowerCase())
      )

    return matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
      case "expired":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
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
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Prescriptions</h1>
                  <p className="text-slate-600 dark:text-slate-400">Manage patient prescriptions and medications</p>
                </div>
                
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New Prescription
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search prescriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Prescriptions List */}
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredPrescriptions.length === 0 ? (
                  <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Pill className="h-12 w-12 text-slate-400 mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No prescriptions found</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-center">
                        Get started by creating a new prescription.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredPrescriptions.map((prescription) => (
                    <Card key={prescription.id} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                              <Pill className="h-4 w-4" />
                            </div>
                            <div>
                              <CardTitle className="text-slate-900 dark:text-slate-100">
                                {prescription.patient ? `${prescription.patient.first_name} ${prescription.patient.last_name}` : "Unknown Patient"}
                              </CardTitle>
                              <CardDescription className="text-slate-600 dark:text-slate-400">
                                Prescribed on {format(new Date(prescription.prescription_date), "MMM dd, yyyy 'at' h:mm a")}
                              </CardDescription>
                            </div>
                          </div>
                          
                          <Badge className={getStatusColor(prescription.status)}>
                            {prescription.status.toUpperCase()}
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-4">
                          {prescription.notes && (
                            <div>
                              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes</Label>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{prescription.notes}</p>
                            </div>
                          )}
                          
                          <div>
                            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Medications</Label>
                            <div className="mt-2 space-y-2">
                              {prescription.items.map((item, index) => (
                                <div key={index} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Pill className="h-4 w-4 text-slate-500" />
                                      <span className="font-medium text-slate-900 dark:text-slate-100">
                                        {item.medication_name}
                                      </span>
                                      <span className="text-sm text-slate-600 dark:text-slate-400">
                                        {item.dosage}
                                      </span>
                                    </div>
                                    <span className="text-sm text-slate-500 dark:text-slate-400">
                                      Qty: {item.quantity}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                    {item.frequency} for {item.duration}
                                    {item.instructions && ` • ${item.instructions}`}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <User className="h-4 w-4" />
                            Prescribed by: {prescription.prescribed_by}
                          </div>
                          
                          <div className="flex items-center gap-2">
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