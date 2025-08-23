"use client"

import { ProtectedRoute } from "../../components/auth/ProtectedRoute"
import { InventoryDashboard } from "../../components/inventory/InventoryDashboard"
import { UserRole } from "../../types"

export default function InventoryPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.INVENTORY_MANAGER]}>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">Manage stock levels, batches, and inventory movements</p>
        </div>

        <InventoryDashboard />
      </div>
    </ProtectedRoute>
  )
}
