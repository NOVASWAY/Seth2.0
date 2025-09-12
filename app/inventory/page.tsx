"use client"

import { ProtectedRoute } from "../../components/auth/ProtectedRoute"
import { InventoryDashboard } from "../../components/inventory/InventoryDashboard"
import { PharmacyPricingDisplay } from "../../components/pharmacy/PharmacyPricingDisplay"
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inventory">Inventory Management</TabsTrigger>
            <TabsTrigger value="pharmacy">Pharmacy Pricing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="inventory" className="mt-6">
            <InventoryDashboard />
          </TabsContent>
          
          <TabsContent value="pharmacy" className="mt-6">
            <PharmacyPricingDisplay />
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  )
}
