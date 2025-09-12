"use client"
import { useState, useEffect } from "react"
import type React from "react"
import { useAuthStore } from "../../lib/auth"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Search, Package, Eye, DollarSign, TrendingUp, Info } from "lucide-react"
import type { InventoryItem, InventoryBatch } from "../../types"

interface InventoryItemsListProps {
  onRefresh?: () => void
}

export function InventoryItemsList({ onRefresh }: InventoryItemsListProps) {
  const { accessToken } = useAuthStore()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [batches, setBatches] = useState<InventoryBatch[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const fetchItems = async (page = 1, search = "") => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      })

      if (search) {
        params.append("search", search)
      }

      const [itemsResponse, batchesResponse] = await Promise.all([
        fetch(`http://localhost:5000/api/inventory/items?${params}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        fetch(`http://localhost:5000/api/inventory/batches?${params}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
      ])

      if (!itemsResponse.ok) {
        throw new Error("Failed to fetch items")
      }

      const itemsResult = await itemsResponse.json()
      setItems(itemsResult.data.items)
      setPagination(itemsResult.data.pagination)

      if (batchesResponse.ok) {
        const batchesResult = await batchesResponse.json()
        setBatches(batchesResult.data.batches || [])
      }
    } catch (error) {
      console.error("Failed to fetch items:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchItems(1, searchTerm)
  }

  const handlePageChange = (newPage: number) => {
    fetchItems(newPage, searchTerm)
  }

  // Helper function to get pricing info for an item
  const getItemPricing = (itemId: string) => {
    const itemBatches = batches.filter(batch => batch.inventoryItemId === itemId)
    
    if (itemBatches.length === 0) {
      return { hasPricing: false, minPrice: 0, maxPrice: 0, avgPrice: 0, totalQuantity: 0 }
    }

    const prices = itemBatches.map(batch => batch.sellingPrice)
    const quantities = itemBatches.map(batch => batch.quantity)
    const totalQuantity = quantities.reduce((sum, qty) => sum + qty, 0)
    
    return {
      hasPricing: true,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgPrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
      totalQuantity
    }
  }

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Items</CardTitle>
        <CardDescription>Manage your inventory items and stock levels</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items by name, category, or generic name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            Search
          </Button>
        </form>

        {/* Items List */}
        {isLoading ? (
          <div className="text-center py-8">
            <Package className="h-8 w-8 animate-pulse mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No items found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const pricing = getItemPricing(item.id)
              return (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">{item.name}</h4>
                      {item.genericName && (
                        <Badge variant="outline" className="text-xs">
                          {item.genericName}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <span>Category: {item.category}</span>
                      <span>Unit: {item.unit}</span>
                      <span>Reorder Level: {item.reorderLevel}</span>
                    </div>
                    
                    {/* Pricing Information */}
                    {pricing.hasPricing ? (
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <DollarSign className="h-3 w-3" />
                          <span className="font-medium">Price Range:</span>
                          <span>{formatCurrency(pricing.minPrice)} - {formatCurrency(pricing.maxPrice)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <TrendingUp className="h-3 w-3" />
                          <span className="font-medium">Avg:</span>
                          <span>{formatCurrency(pricing.avgPrice)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                          <Package className="h-3 w-3" />
                          <span className="font-medium">Stock:</span>
                          <span>{pricing.totalQuantity} {item.unit}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-sm">
                        <Info className="h-3 w-3" />
                        <span>No pricing information available</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              )
            })}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} items
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
