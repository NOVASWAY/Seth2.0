"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Alert, AlertDescription } from "../ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Package, AlertTriangle, TrendingDown, Plus, RefreshCw } from "lucide-react"
import { InventoryItemsList } from "./InventoryItemsList"
import { AddItemDialog } from "./AddItemDialog"
import { AddBatchDialog } from "./AddBatchDialog"

interface StockLevel {
  id: string
  name: string
  category: string
  unit: string
  totalQuantity: number
  reorderLevel: number
  needsReorder: boolean
  expiringBatches: number
}

interface ExpiringBatch {
  id: string
  itemName: string
  batchNumber: string
  quantity: number
  expiryDate: string
  daysToExpiry: number
}

export function InventoryDashboard() {
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([])
  const [expiringBatches, setExpiringBatches] = useState<ExpiringBatch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [showAddItem, setShowAddItem] = useState(false)
  const [showAddBatch, setShowAddBatch] = useState(false)

  const fetchData = async () => {
    try {
      setIsLoading(true)

      const [stockResponse, expiringResponse] = await Promise.all([
        fetch("/api/inventory/stock-levels", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }),
        fetch("/api/inventory/expiring?days=30", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }),
      ])

      if (!stockResponse.ok || !expiringResponse.ok) {
        throw new Error("Failed to fetch inventory data")
      }

      const stockResult = await stockResponse.json()
      const expiringResult = await expiringResponse.json()

      setStockLevels(stockResult.data)
      setExpiringBatches(expiringResult.data)
      setError("")
    } catch (err: any) {
      setError(err.message || "Failed to load inventory data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const lowStockItems = stockLevels.filter((item) => item.needsReorder)
  const criticallyLowItems = stockLevels.filter((item) => item.totalQuantity === 0)
  const expiringCount = expiringBatches.filter((batch) => batch.daysToExpiry <= 7).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">Out of Stock</p>
                <p className="text-2xl font-bold text-red-900">{criticallyLowItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-900">{lowStockItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-800">Expiring Soon</p>
                <p className="text-2xl font-bold text-orange-900">{expiringCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="items">All Items</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowAddBatch(true)} variant="outline" size="sm">
              <Package className="h-4 w-4 mr-2" />
              Add Batch
            </Button>
            <Button onClick={() => setShowAddItem(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Low Stock Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-yellow-600" />
                  Low Stock Items
                </CardTitle>
                <CardDescription>Items that need to be restocked</CardDescription>
              </CardHeader>
              <CardContent>
                {lowStockItems.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No low stock items</p>
                ) : (
                  <div className="space-y-3">
                    {lowStockItems.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-yellow-700">
                            {item.totalQuantity} {item.unit}
                          </p>
                          <p className="text-xs text-muted-foreground">Reorder at {item.reorderLevel}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expiring Batches */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Expiring Soon
                </CardTitle>
                <CardDescription>Batches expiring within 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                {expiringBatches.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No expiring batches</p>
                ) : (
                  <div className="space-y-3">
                    {expiringBatches.slice(0, 5).map((batch) => (
                      <div key={batch.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                        <div>
                          <p className="font-medium">{batch.itemName}</p>
                          <p className="text-sm text-muted-foreground">Batch: {batch.batchNumber}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={batch.daysToExpiry <= 7 ? "destructive" : "secondary"} className="mb-1">
                            {batch.daysToExpiry} days
                          </Badge>
                          <p className="text-sm text-muted-foreground">{batch.quantity} units</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="items">
          <InventoryItemsList onRefresh={fetchData} />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {/* Critical Alerts */}
          {criticallyLowItems.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-800">Out of Stock Items</CardTitle>
                <CardDescription>These items are completely out of stock</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {criticallyLowItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium text-red-900">{item.name}</p>
                        <p className="text-sm text-red-700">{item.category}</p>
                      </div>
                      <Badge variant="destructive">0 {item.unit}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expiring This Week */}
          {expiringCount > 0 && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="text-orange-800">Expiring This Week</CardTitle>
                <CardDescription>Batches expiring within 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {expiringBatches
                    .filter((batch) => batch.daysToExpiry <= 7)
                    .map((batch) => (
                      <div key={batch.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                        <div>
                          <p className="font-medium text-orange-900">{batch.itemName}</p>
                          <p className="text-sm text-orange-700">Batch: {batch.batchNumber}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive">{batch.daysToExpiry} days</Badge>
                          <p className="text-sm text-orange-700 mt-1">{batch.quantity} units</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddItemDialog open={showAddItem} onOpenChange={setShowAddItem} onSuccess={fetchData} />
      <AddBatchDialog open={showAddBatch} onOpenChange={setShowAddBatch} onSuccess={fetchData} />
    </div>
  )
}
