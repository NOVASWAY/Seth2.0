"use client"

import { ProtectedRoute } from "../../components/auth/ProtectedRoute"
import { QueueBoard } from "../../components/queue/QueueBoard"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { UserRole } from "../../types"
import { FileText, Users, Activity, TrendingUp, Microscope, TestTube, Shield } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.NURSE, UserRole.CLINICAL_OFFICER, UserRole.LAB_TECHNICIAN]}>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Monitor patient queue and clinic operations</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Prescriptions</h3>
                  <p className="text-sm text-muted-foreground">Create & manage prescriptions</p>
                </div>
              </div>
              <Link href="/prescriptions" className="mt-4 block">
                <Button className="w-full" size="sm">
                  Open Prescriptions
                </Button>
              </Link>
            </CardContent>
          </Card>

                          <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Microscope className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Diagnostics</h3>
                        <p className="text-sm text-muted-foreground">Create lab test requests</p>
                      </div>
                    </div>
                    <Link href="/diagnostics" className="mt-4 block">
                      <Button className="w-full" size="sm">
                        Open Diagnostics
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <Shield className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">SHA Insurance</h3>
                        <p className="text-sm text-muted-foreground">Manage SHA claims & invoices</p>
                      </div>
                    </div>
                    <Link href="/sha" className="mt-4 block">
                      <Button className="w-full" size="sm">
                        Open SHA Management
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Patients</h3>
                  <p className="text-sm text-muted-foreground">Manage patient records</p>
                </div>
              </div>
              <Link href="/patients" className="mt-4 block">
                <Button className="w-full" size="sm" variant="outline">
                  View Patients
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Activity className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Queue</h3>
                  <p className="text-sm text-muted-foreground">Patient flow management</p>
                </div>
              </div>
              <div className="mt-4">
                <Button className="w-full" size="sm" variant="outline" disabled>
                  View Queue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Patient Queue */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Patient Queue</h2>
            <div className="text-sm text-muted-foreground">
              Real-time patient flow monitoring
            </div>
          </div>
          <QueueBoard />
        </div>

        {/* System Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">All systems operational</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Auto-Save</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Active - every 30 seconds</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Prescription System</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Online - real-time stock</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Diagnostics System</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Online - test catalog ready</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
