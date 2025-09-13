"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuthStore } from "../../lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Textarea } from "../ui/textarea"
import { Badge } from "../ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"
import { ScrollArea } from "../ui/scroll-area"
import { Separator } from "../ui/separator"
import { Progress } from "../ui/progress"
import { 
  Upload, 
  Download, 
  Eye, 
  Trash2, 
  FileText, 
  Image, 
  File,
  CheckCircle,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Plus,
  RefreshCw,
  X
} from "lucide-react"
import { toast } from "../../hooks/use-toast"
import { format } from "date-fns"

interface SHADocument {
  id: string
  claimId: string
  documentType: string
  documentDescription?: string
  fileName: string
  originalFileName: string
  fileSize: number
  mimeType: string
  filePath: string
  isRequired: boolean
  uploadedBy: string
  uploadedAt: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  rejectionReason?: string
}

interface DocumentUpload {
  file: File
  documentType: string
  documentDescription: string
  isRequired: boolean
}

interface SHADocumentManagerProps {
  claimId?: string
  onDocumentUploaded?: (document: SHADocument) => void
  onDocumentDeleted?: (documentId: string) => void
}

export function SHADocumentManager({ 
  claimId, 
  onDocumentUploaded, 
  onDocumentDeleted 
}: SHADocumentManagerProps) {
  const { accessToken } = useAuthStore()
  const [documents, setDocuments] = useState<SHADocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<SHADocument | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")

  // Upload form state
  const [uploadForm, setUploadForm] = useState<DocumentUpload>({
    file: null as any,
    documentType: "",
    documentDescription: "",
    isRequired: false
  })

  // Document types
  const documentTypes = [
    { value: "LAB_RESULTS", label: "Lab Results" },
    { value: "DISCHARGE_SUMMARY", label: "Discharge Summary" },
    { value: "PRESCRIPTION", label: "Prescription" },
    { value: "REFERRAL_LETTER", label: "Referral Letter" },
    { value: "MEDICAL_REPORT", label: "Medical Report" },
    { value: "IMAGING_REPORT", label: "Imaging Report" },
    { value: "CONSENT_FORM", label: "Consent Form" },
    { value: "INSURANCE_CARD", label: "Insurance Card" },
    { value: "IDENTIFICATION", label: "Identification" },
    { value: "OTHER", label: "Other" }
  ]

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    if (!accessToken || !claimId) return

    try {
      setLoading(true)
      const response = await fetch(`http://localhost:5000/api/sha-documents/claim/${claimId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setDocuments(result.data || [])
        } else {
          throw new Error(result.message || "Failed to fetch documents")
        }
      } else if (response.status === 401) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive"
        })
      } else {
        throw new Error("Failed to fetch documents")
      }
    } catch (error) {
      console.error("Error fetching documents:", error)
      toast({
        title: "Error",
        description: "Failed to fetch documents. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [accessToken, claimId])

  // Upload document
  const handleUpload = async () => {
    if (!accessToken || !claimId || !uploadForm.file) {
      toast({
        title: "Error",
        description: "Please select a file and claim ID",
        variant: "destructive"
      })
      return
    }

    try {
      setUploading(true)
      setUploadProgress(0)

      const formData = new FormData()
      formData.append("document", uploadForm.file)
      formData.append("documentType", uploadForm.documentType)
      formData.append("documentDescription", uploadForm.documentDescription)
      formData.append("isRequired", uploadForm.isRequired.toString())

      const response = await fetch(`http://localhost:5000/api/sha-documents/upload/${claimId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          toast({
            title: "Success",
            description: "Document uploaded successfully",
            variant: "default"
          })
          
          // Reset form
          setUploadForm({
            file: null as any,
            documentType: "",
            documentDescription: "",
            isRequired: false
          })
          setIsUploadDialogOpen(false)
          
          // Refresh documents
          fetchDocuments()
          
          // Notify parent
          if (onDocumentUploaded) {
            onDocumentUploaded(result.data)
          }
        } else {
          throw new Error(result.message || "Failed to upload document")
        }
      } else if (response.status === 401) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive"
        })
      } else {
        throw new Error("Failed to upload document")
      }
    } catch (error) {
      console.error("Error uploading document:", error)
      toast({
        title: "Error",
        description: "Failed to upload document. Please try again.",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // Delete document
  const handleDelete = async (documentId: string) => {
    if (!accessToken) return

    try {
      const response = await fetch(`http://localhost:5000/api/sha-documents/${documentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          toast({
            title: "Success",
            description: "Document deleted successfully",
            variant: "default"
          })
          
          // Refresh documents
          fetchDocuments()
          
          // Notify parent
          if (onDocumentDeleted) {
            onDocumentDeleted(documentId)
          }
        } else {
          throw new Error(result.message || "Failed to delete document")
        }
      } else if (response.status === 401) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive"
        })
      } else {
        throw new Error("Failed to delete document")
      }
    } catch (error) {
      console.error("Error deleting document:", error)
      toast({
        title: "Error",
        description: "Failed to delete document. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Download document
  const handleDownload = async (document: SHADocument) => {
    if (!accessToken) return

    try {
      const response = await fetch(`http://localhost:5000/api/sha-documents/${document.id}/download`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = window.document.createElement("a")
        a.href = url
        a.download = document.originalFileName
        window.document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        window.document.body.removeChild(a)
      } else if (response.status === 401) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive"
        })
      } else {
        throw new Error("Failed to download document")
      }
    } catch (error) {
      console.error("Error downloading document:", error)
      toast({
        title: "Error",
        description: "Failed to download document. Please try again.",
        variant: "destructive"
      })
    }
  }

  // View document
  const handleView = (document: SHADocument) => {
    setSelectedDocument(document)
    setIsViewDialogOpen(true)
  }

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadForm(prev => ({ ...prev, file }))
    }
  }

  // Get file icon
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <Image className="h-4 w-4" />
    } else if (mimeType === "application/pdf") {
      return <FileText className="h-4 w-4" />
    } else {
      return <File className="h-4 w-4" />
    }
  }

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "APPROVED": return "default"
      case "PENDING": return "secondary"
      case "REJECTED": return "destructive"
      default: return "secondary"
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED": return <CheckCircle className="h-4 w-4" />
      case "PENDING": return <Clock className="h-4 w-4" />
      case "REJECTED": return <AlertTriangle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.originalFileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.documentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (doc.documentDescription && doc.documentDescription.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesType = filterType === "all" || doc.documentType === filterType
    const matchesStatus = filterStatus === "all" || doc.status === filterStatus
    
    return matchesSearch && matchesType && matchesStatus
  })

  // Load documents on mount
  useEffect(() => {
    if (claimId) {
      fetchDocuments()
    }
  }, [claimId, fetchDocuments])

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto p-6">
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Authentication Required</h2>
            <p className="text-gray-600 dark:text-gray-300">Please log in to access document management.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">SHA Document Management</h1>
                <p className="text-gray-600 dark:text-gray-300">Manage documents for SHA claims</p>
                {claimId && (
                  <p className="text-sm text-gray-500 mt-1">Claim ID: {claimId}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={fetchDocuments}
                variant="outline"
                className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="text-gray-900 dark:text-white">Upload Document</DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-300">
                      Upload a document for this SHA claim
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* File Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="file" className="text-gray-700 dark:text-gray-300">File</Label>
                      <Input
                        id="file"
                        type="file"
                        onChange={handleFileSelect}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt"
                        className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                      />
                      {uploadForm.file && (
                        <p className="text-sm text-gray-500">
                          Selected: {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                        </p>
                      )}
                    </div>

                    {/* Document Type */}
                    <div className="space-y-2">
                      <Label htmlFor="documentType" className="text-gray-700 dark:text-gray-300">Document Type</Label>
                      <Select value={uploadForm.documentType} onValueChange={(value) => setUploadForm(prev => ({ ...prev, documentType: value }))}>
                        <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                          <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                          {documentTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value} className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-gray-700 dark:text-gray-300">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Enter document description..."
                        value={uploadForm.documentDescription}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, documentDescription: e.target.value }))}
                        className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                      />
                    </div>

                    {/* Required */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isRequired"
                        checked={uploadForm.isRequired}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, isRequired: e.target.checked }))}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <Label htmlFor="isRequired" className="text-gray-700 dark:text-gray-300">Required Document</Label>
                    </div>

                    {/* Upload Progress */}
                    {uploading && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">Uploading...</span>
                          <span className="text-gray-600 dark:text-gray-300">{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="w-full" />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => setIsUploadDialogOpen(false)}
                        variant="outline"
                        className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUpload}
                        disabled={!uploadForm.file || !uploadForm.documentType || uploading}
                        className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white"
                      >
                        {uploading ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                  <SelectItem value="all" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">All Types</SelectItem>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                  <SelectItem value="all" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">All Statuses</SelectItem>
                  <SelectItem value="PENDING" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Pending</SelectItem>
                  <SelectItem value="APPROVED" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Approved</SelectItem>
                  <SelectItem value="REJECTED" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Documents</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              {filteredDocuments.length} of {documents.length} documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-500" />
                <span className="ml-2 text-gray-500">Loading documents...</span>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No documents found</h3>
                <p className="text-gray-500">Upload documents to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-200 dark:border-gray-700">
                        <TableHead className="text-gray-700 dark:text-gray-300">File</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Type</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Size</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Uploaded</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.map((doc) => (
                        <TableRow key={doc.id} className="border-gray-200 dark:border-gray-700">
                          <TableCell className="text-gray-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              {getFileIcon(doc.mimeType)}
                              <div>
                                <div className="font-medium">{doc.originalFileName}</div>
                                {doc.documentDescription && (
                                  <div className="text-sm text-gray-500">{doc.documentDescription}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-white">
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              {documentTypes.find(t => t.value === doc.documentType)?.label || doc.documentType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-white">{formatFileSize(doc.fileSize)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(doc.status)} className="flex items-center gap-1 w-fit">
                              {getStatusIcon(doc.status)}
                              {doc.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-white">
                            {format(new Date(doc.uploadedAt), "MMM dd, yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleView(doc)}
                                variant="outline"
                                size="sm"
                                className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => handleDownload(doc)}
                                variant="outline"
                                size="sm"
                                className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => handleDelete(doc.id)}
                                variant="outline"
                                size="sm"
                                className="border-red-200 dark:border-red-600 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
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

        {/* Document View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white">Document Details</DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                View document information and details
              </DialogDescription>
            </DialogHeader>
            {selectedDocument && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">File Name</Label>
                    <p className="text-gray-900 dark:text-white">{selectedDocument.originalFileName}</p>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Document Type</Label>
                    <p className="text-gray-900 dark:text-white">
                      {documentTypes.find(t => t.value === selectedDocument.documentType)?.label || selectedDocument.documentType}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">File Size</Label>
                    <p className="text-gray-900 dark:text-white">{formatFileSize(selectedDocument.fileSize)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Status</Label>
                    <Badge variant={getStatusBadgeVariant(selectedDocument.status)} className="flex items-center gap-1 w-fit">
                      {getStatusIcon(selectedDocument.status)}
                      {selectedDocument.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Uploaded By</Label>
                    <p className="text-gray-900 dark:text-white">{selectedDocument.uploadedBy}</p>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Uploaded At</Label>
                    <p className="text-gray-900 dark:text-white">{format(new Date(selectedDocument.uploadedAt), "PPP 'at' p")}</p>
                  </div>
                </div>
                
                {selectedDocument.documentDescription && (
                  <>
                    <Separator className="bg-gray-200 dark:bg-gray-700" />
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300">Description</Label>
                      <p className="text-gray-900 dark:text-white">{selectedDocument.documentDescription}</p>
                    </div>
                  </>
                )}

                {selectedDocument.rejectionReason && (
                  <>
                    <Separator className="bg-gray-200 dark:bg-gray-700" />
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300">Rejection Reason</Label>
                      <p className="text-red-600 dark:text-red-400">{selectedDocument.rejectionReason}</p>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => handleDownload(selectedDocument)}
                    className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
