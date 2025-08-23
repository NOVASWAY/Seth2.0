"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { FileText, Send, Clock, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Claim {
  id: string
  claim_number: string
  op_number: string
  patient_id: string
  first_name?: string
  last_name?: string
  member_number?: string
  diagnosis_code: string
  diagnosis_description: string
  total_amount: number
  approved_amount?: number
  status: "draft" | "ready_to_submit" | "submitted" | "approved" | "rejected" | "paid"
  submission_date?: string
  created_at: string
}

interface ClaimBatch {
  id: string
  batch_number: string
  batch_date: string
  total_claims: number
  total_amount: number
  status: "draft" | "submitted" | "processing" | "completed" | "failed"
  submission_date?: string
}

export function ClaimsManager() {
  const { toast } = useToast()
  const [claims, setClaims] = useState<Claim[]>([])
  const [batches, setBatches] = useState<ClaimBatch[]>([])
  const [selectedClaims, setSelectedClaims] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    status: "all",
    op_number: "",
  })

  useEffect(() => {
    fetchClaims()
    fetchBatches()
  }, [filters])

  const fetchClaims = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.status !== "all") params.append("status", filters.status)
      if (filters.op_number) params.append("op_number", filters.op_number)

      const response = await fetch(`/api/claims/claims?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setClaims(result.data)
      }
    } catch (error) {
      console.error("Error fetching claims:", error)
    }
  }

  const fetchBatches = async () => {
    try {
      const response = await fetch("/api/claims/batches", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setBatches(result.data)
      }
    } catch (error) {
      console.error("Error fetching batches:", error)
    }
  }

  const createBatch = async () => {
    if (selectedClaims.length === 0) {
      toast({
        title: "Error",
        description: "Please select claims to batch",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/claims/batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          claim_ids: selectedClaims,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Batch Created",
          description: `Batch ${result.data.batch_number} created with ${selectedClaims.length} claims`,
        })
        setSelectedClaims([])
        fetchClaims()
        fetchBatches()
      } else {
        const error = await response.json()
        throw new Error(error.message)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create batch",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const submitBatch = async (batchId: string) => {
    setLoading(true)

    try {
      const response = await fetch(`/api/claims/batches/${batchId}/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Batch Submitted",
          description: "Batch submitted to SHA successfully",
        })
        fetchBatches()
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit batch",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "secondary", icon: FileText },
      ready_to_submit: { color: "default", icon: Clock },
      submitted: { color: "default", icon: Send },
      approved: { color: "default", icon: CheckCircle },
      rejected: { color: "destructive", icon: XCircle },
      paid: { color: "default", icon: CheckCircle },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    const Icon = config.icon

    return (
      <Badge variant={config.color as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    )
  }

  const readyToSubmitClaims = claims.filter((claim) => claim.status === "ready_to_submit")

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">SHA Claims Management</h1>
      </div>

      <Tabs defaultValue="claims" className="space-y-4">
        <TabsList>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="batches">Batches</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="claims">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Claims Management</span>
                <div className="flex gap-2">
                  {selectedClaims.length > 0 && (
                    <Button onClick={createBatch} disabled={loading}>
                      Create Batch ({selectedClaims.length})
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="ready_to_submit">Ready to Submit</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="op_number">OP Number</Label>
                  <Input
                    id="op_number"
                    value={filters.op_number}
                    onChange={(e) => setFilters({ ...filters, op_number: e.target.value })}
                    placeholder="Search by OP Number"
                  />
                </div>

                <div className="flex items-end">
                  <Button onClick={fetchClaims} variant="outline">
                    Search
                  </Button>
                </div>
              </div>

              {/* Claims Table */}
              <div className="space-y-4">
                {claims.map((claim) => (
                  <Card key={claim.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {claim.status === "ready_to_submit" && (
                          <Checkbox
                            checked={selectedClaims.includes(claim.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedClaims([...selectedClaims, claim.id])
                              } else {
                                setSelectedClaims(selectedClaims.filter((id) => id !== claim.id))
                              }
                            }}
                          />
                        )}

                        <div>
                          <div className="font-medium">{claim.claim_number}</div>
                          <div className="text-sm text-muted-foreground">
                            OP: {claim.op_number} | Patient: {claim.first_name} {claim.last_name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">
                            KES {Number.parseFloat(claim.total_amount.toString()).toFixed(2)}
                          </div>
                          {claim.approved_amount && (
                            <div className="text-sm text-muted-foreground">
                              Approved: KES {Number.parseFloat(claim.approved_amount.toString()).toFixed(2)}
                            </div>
                          )}
                        </div>

                        {getStatusBadge(claim.status)}
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-muted-foreground">
                      <div>
                        Diagnosis: {claim.diagnosis_description} ({claim.diagnosis_code})
                      </div>
                      {claim.submission_date && (
                        <div>Submitted: {new Date(claim.submission_date).toLocaleDateString()}</div>
                      )}
                    </div>
                  </Card>
                ))}

                {claims.length === 0 && <div className="text-center py-8 text-muted-foreground">No claims found</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batches">
          <Card>
            <CardHeader>
              <CardTitle>Claim Batches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {batches.map((batch) => (
                  <Card key={batch.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{batch.batch_number}</div>
                        <div className="text-sm text-muted-foreground">
                          {batch.total_claims} claims | KES{" "}
                          {Number.parseFloat(batch.total_amount.toString()).toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Created: {new Date(batch.batch_date).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {batch.status === "draft" && (
                          <Button onClick={() => submitBatch(batch.id)} disabled={loading}>
                            <Send className="h-4 w-4 mr-2" />
                            Submit to SHA
                          </Button>
                        )}

                        {getStatusBadge(batch.status)}
                      </div>
                    </div>
                  </Card>
                ))}

                {batches.length === 0 && <div className="text-center py-8 text-muted-foreground">No batches found</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Claims Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-4">
                  <div className="text-2xl font-bold">{readyToSubmitClaims.length}</div>
                  <div className="text-sm text-muted-foreground">Ready to Submit</div>
                </Card>

                <Card className="p-4">
                  <div className="text-2xl font-bold">{claims.filter((c) => c.status === "submitted").length}</div>
                  <div className="text-sm text-muted-foreground">Submitted</div>
                </Card>

                <Card className="p-4">
                  <div className="text-2xl font-bold">{claims.filter((c) => c.status === "approved").length}</div>
                  <div className="text-sm text-muted-foreground">Approved</div>
                </Card>
              </div>

              <div className="mt-6">
                <p className="text-muted-foreground">
                  Detailed reporting features including claim success rates, processing times, and financial summaries
                  will be available here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
