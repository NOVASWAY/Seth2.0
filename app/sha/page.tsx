"use client"

import { ProtectedRoute } from "../../components/auth/ProtectedRoute"
import { UserRole } from "../../types"
import { SHAInvoiceManager } from "../../components/sha/SHAInvoiceManager"
import { SHABatchManager } from "../../components/sha/SHABatchManager"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { 
  FileText, 
  Package, 
  TrendingUp, 
  CheckCircle,
  AlertCircle,
  Calendar,
  Banknote,
  Printer,
  Send,
  Shield
} from "lucide-react"

export default function SHAManagementPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.CLAIMS_MANAGER, UserRole.CLINICAL_OFFICER]}>
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">SHA Insurance Management</h1>
              <p className="text-muted-foreground">
                Comprehensive management of SHA insurance claims, invoices, and compliance
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-6 w-6 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Claims</p>
                    <p className="text-xl font-bold">--</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Package className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Batches</p>
                    <p className="text-xl font-bold">--</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Printer className="h-6 w-6 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ready to Print</p>
                    <p className="text-xl font-bold">--</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Send className="h-6 w-6 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Submitted</p>
                    <p className="text-xl font-bold">--</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Paid</p>
                    <p className="text-xl font-bold">--</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Banknote className="h-6 w-6 text-indigo-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                    <p className="text-xl font-bold">KES --</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="invoices" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="batches" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Batches
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Compliance
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* Invoice Management Tab */}
          <TabsContent value="invoices" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Invoice Management</h2>
                <p className="text-muted-foreground">
                  Generate, print, and submit SHA insurance invoices
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Auto-generation enabled
                </Badge>
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Compliance tracking active
                </Badge>
              </div>
            </div>
            <SHAInvoiceManager />
          </TabsContent>

          {/* Batch Management Tab */}
          <TabsContent value="batches" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Batch Management</h2>
                <p className="text-muted-foreground">
                  Create and manage SHA claim batches for submission
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Weekly & Monthly batches
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Automated processing
                </Badge>
              </div>
            </div>
            <SHABatchManager />
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Compliance & Audit</h2>
              <p className="text-muted-foreground">
                Monitor SHA compliance requirements and audit trails
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Compliance Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Compliance Status
                  </CardTitle>
                  <CardDescription>
                    Current compliance with SHA requirements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Invoice Generation</span>
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Compliant
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Record Keeping</span>
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Compliant
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Audit Trail</span>
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Electronic Submission</span>
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Enabled
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Audit Activities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Recent Audit Activities
                  </CardTitle>
                  <CardDescription>
                    Latest audit and compliance activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Invoice auto-generated</p>
                        <p className="text-xs text-muted-foreground">2 minutes ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Batch submitted to SHA</p>
                        <p className="text-xs text-muted-foreground">1 hour ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Weekly batch created</p>
                        <p className="text-xs text-muted-foreground">3 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Compliance verification</p>
                        <p className="text-xs text-muted-foreground">6 hours ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Compliance Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>SHA Compliance Requirements</CardTitle>
                <CardDescription>
                  Ensure all requirements are met for successful claim processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Invoice Generation Requirements</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        All services must be recorded with invoice
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Invoices generated automatically for SHA patients
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Proper diagnosis codes (ICD-10) required
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Service codes must match SHA catalog
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Record Keeping Requirements</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Digital and physical copies maintained
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Supporting documents linked to claims
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Audit trail for all transactions
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        7-year retention policy enforced
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Reports & Analytics</h2>
              <p className="text-muted-foreground">
                Financial reconciliation and performance analytics
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Monthly Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Monthly Summary</CardTitle>
                  <CardDescription>December 2024</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Claims Submitted</span>
                      <span className="font-medium">--</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Value</span>
                      <span className="font-medium">KES --</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Payments Received</span>
                      <span className="font-medium">KES --</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Pending</span>
                      <span className="font-medium">KES --</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance Metrics</CardTitle>
                  <CardDescription>Last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Approval Rate</span>
                      <span className="font-medium">--%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg. Processing Time</span>
                      <span className="font-medium">-- days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Rejection Rate</span>
                      <span className="font-medium">--%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Auto-gen Invoices</span>
                      <span className="font-medium">--%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Compliance Score */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Compliance Score</CardTitle>
                  <CardDescription>Overall compliance rating</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600 mb-2">98%</div>
                    <p className="text-sm text-muted-foreground mb-4">Excellent Compliance</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Invoice Generation</span>
                        <span className="text-green-600">100%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Record Keeping</span>
                        <span className="text-green-600">100%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Submission Timeliness</span>
                        <span className="text-yellow-600">95%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Audit Compliance</span>
                        <span className="text-green-600">100%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  )
}
