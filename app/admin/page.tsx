"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminDashboard } from "@/components/admin/AdminDashboard"
import { UserManagement } from "@/components/admin/UserManagement"
import { UserRecoveryForm } from "@/components/admin/UserRecoveryForm"
import { EventLogger } from "@/components/admin/EventLogger"
import { AuditLogViewer } from "@/components/admin/AuditLogViewer"
import { Shield } from "lucide-react"

export default function AdminPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Admin Panel</h1>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="recovery">Account Recovery</TabsTrigger>
          <TabsTrigger value="events">Event Logger</TabsTrigger>
          <TabsTrigger value="migration">Data Migration</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <AdminDashboard />
        </TabsContent>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="recovery">
          <UserRecoveryForm />
        </TabsContent>

        <TabsContent value="events">
          <EventLogger />
        </TabsContent>

        <TabsContent value="migration">
          <div className="text-center py-8 text-muted-foreground">
            Patient data migration interface will be implemented here
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogViewer />
        </TabsContent>

        <TabsContent value="reports">
          <div className="text-center py-8 text-muted-foreground">
            System reports and analytics will be implemented here
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
