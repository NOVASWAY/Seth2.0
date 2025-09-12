"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { Search, DollarSign, Package, TrendingUp, AlertCircle, Info } from "lucide-react"
import { useAuthStore } from "../../lib/auth"
import type { InventoryItem, InventoryBatch } from "../../types"

interface PharmacyPricingDisplayProps {
  onItemSelect?: (item: InventoryItem, pricing: any) => void
}

export function PharmacyPricingDisplay({ onItemSelect }: PharmacyPricingDisplayProps) {
  const { accessToken } = useAuthStore()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [batches, setBatches] = useState<InventoryBatch[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [itemsResponse, batchesResponse] = await Promise.all([
        fetch(`http://localhost:5000/api/inventory/items?limit=100`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        fetch(`http://localhost:5000/api/inventory/batches?limit=1000`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
      ])

      if (itemsResponse.ok) {
        const itemsResult = await itemsResponse.json()
        setItems(itemsResult.data.items || [])
      }

      if (batchesResponse.ok) {
        const batchesResult = await batchesResponse.json()
        setBatches(batchesResult.data.batches || [])
      }
    } catch (error) {
      console.error("Failed to fetch pharmacy data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [accessToken])

  // Helper function to get pricing info for an item
  const getItemPricing = (itemId: string) => {
    const itemBatches = batches.filter(batch => 
      batch.inventoryItemId === itemId && 
      !batch.isExpired && 
      batch.quantity > 0
    )
    
    if (itemBatches.length === 0) {
      return { hasPricing: false, minPrice: 0, maxPrice: 0, avgPrice: 0, totalQuantity: 0, batches: [] }
    }

    const prices = itemBatches.map(batch => batch.sellingPrice)
    const quantities = itemBatches.map(batch => batch.quantity)
    const totalQuantity = quantities.reduce((sum, qty) => sum + qty, 0)
    
    return {
      hasPricing: true,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgPrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
      totalQuantity,
      batches: itemBatches
    }
  }

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount)
  }

  // Filter items based on search term
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.genericName && item.genericName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Pharmacy Pricing Guide
        </CardTitle>
        <CardDescription>
          View medicine prices and stock levels for dispensing
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search medicines by name, generic name, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const pricing = getItemPricing(item.id)
            
            return (
              <div 
                key={item.id} 
                className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onItemSelect?.(item, pricing)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-sm">{item.name}</h4>
                  <Badge variant="outline" className="text-xs">
                    {item.category}
                  </Badge>
                </div>
                
                {item.genericName && (
                  <p className="text-xs text-muted-foreground mb-2">
                    {item.genericName}
                  </p>
                )}

                {pricing.hasPricing ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Price Range:</span>
                      <span className="text-sm font-medium text-green-600">
                        {formatCurrency(pricing.minPrice)} - {formatCurrency(pricing.maxPrice)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Average Price:</span>
                      <span className="text-sm font-bold text-blue-600">
                        {formatCurrency(pricing.avgPrice)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Available Stock:</span>
                      <span className="text-sm font-medium text-purple-600">
                        {pricing.totalQuantity} {item.unit}
                      </span>
                    </div>

                    {pricing.batches.length > 1 && (
                      <div className="text-xs text-amber-600 dark:text-amber-400">
                        <Info className="h-3 w-3 inline mr-1" />
                        {pricing.batches.length} different batches
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs">
                    <AlertCircle className="h-3 w-3" />
                    <span>No pricing or stock available</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No medicines found</p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">
                {filteredItems.filter(item => getItemPricing(item.id).hasPricing).length}
              </p>
              <p className="text-sm text-muted-foreground">Medicines with Pricing</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {filteredItems.reduce((sum, item) => sum + getItemPricing(item.id).totalQuantity, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Stock Units</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {batches.length}
              </p>
              <p className="text-sm text-muted-foreground">Active Batches</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
