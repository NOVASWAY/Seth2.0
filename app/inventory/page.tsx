"use client"

import { ProtectedRoute } from "../../components/auth/ProtectedRoute"
import { InventoryDashboard } from "../../components/inventory/InventoryDashboard"
import { PharmacyPricingDisplay } from "../../components/pharmacy/PharmacyPricingDisplay"
import { DrugDispensingForm } from "../../components/inventory/DrugDispensingForm"
import { InventoryReports } from "../../components/inventory/InventoryReports"
import { UserRole } from "../../types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"

export default function InventoryPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.INVENTORY_MANAGER, UserRole.PHARMACIST]}>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">Manage stock levels, batches, and inventory movements</p>
        </div>

        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="inventory">Stock Management</TabsTrigger>
            <TabsTrigger value="dispensing">Drug Dispensing</TabsTrigger>
            <TabsTrigger value="pricing">Price Management</TabsTrigger>
            <TabsTrigger value="reports">Reports & Analytics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="inventory" className="mt-6">
            <InventoryDashboard />
          </TabsContent>
          
          <TabsContent value="dispensing" className="mt-6">
            <DrugDispensingForm />
          </TabsContent>
          
          <TabsContent value="pricing" className="mt-6">
            <PharmacyPricingDisplay />
          </TabsContent>
          
          <TabsContent value="reports" className="mt-6">
            <InventoryReports />
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  )
}
