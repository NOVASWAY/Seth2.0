'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { useToast } from '../../hooks/use-toast'
import { useAuthStore } from '../../lib/auth'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Package, 
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  Users,
  ShoppingCart
} from 'lucide-react'

interface StockMovementReport {
  itemName: string
  itemCode: string
  openingStock: number
  stockIn: number
  stockOut: number
  closingStock: number
  revenue: number
  cost: number
  profit: number
  patientDispensing: number
  nonPatientSales: number
}

interface LowStockItem {
  id: string
  itemName: string
  itemCode: string
  currentStock: number
  minimumLevel: number
  unit: string
  daysOfStock: number
}

interface ExpiryAlert {
  id: string
  itemName: string
  itemCode: string
  batchNumber: string
  quantity: number
  expiryDate: string
  daysToExpiry: number
}

export function InventoryReports() {
  const { toast } = useToast()
  const { accessToken } = useAuthStore()
  const [reportType, setReportType] = useState('movement')
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [stockMovementData, setStockMovementData] = useState<StockMovementReport[]>([])
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlert[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchReports()
  }, [reportType, dateRange])

  const fetchReports = async () => {
    try {
      setLoading(true)

      if (reportType === 'movement') {
        const response = await fetch(`/api/inventory/reports/stock-movement?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setStockMovementData(result.data)
          }
        }
      } else if (reportType === 'alerts') {
        const [lowStockResponse, expiryResponse] = await Promise.all([
          fetch('/api/inventory/reports/low-stock', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }),
          fetch('/api/inventory/reports/expiry-alerts', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          })
        ])

        if (lowStockResponse.ok) {
          const result = await lowStockResponse.json()
          if (result.success) {
            setLowStockItems(result.data)
          }
        }

        if (expiryResponse.ok) {
          const result = await expiryResponse.json()
          if (result.success) {
            setExpiryAlerts(result.data)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getTotalRevenue = () => {
    return stockMovementData.reduce((sum, item) => sum + item.revenue, 0)
  }

  const getTotalCost = () => {
    return stockMovementData.reduce((sum, item) => sum + item.cost, 0)
  }

  const getTotalProfit = () => {
    return getTotalRevenue() - getTotalCost()
  }

  const exportReport = () => {
    // In a real implementation, this would generate and download a CSV/PDF
    toast({
      title: "Export Started",
      description: "Report export functionality would be implemented here",
    })
  }

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <span>Inventory Reports & Analytics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="movement">Stock Movement</SelectItem>
                  <SelectItem value="profitability">Profitability</SelectItem>
                  <SelectItem value="alerts">Alerts & Warnings</SelectItem>
                  <SelectItem value="usage">Usage Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            
            <div className="flex items-end space-x-2">
              <Button
                variant="outline"
                onClick={fetchReports}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={exportReport}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {reportType === 'movement' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">KSh {getTotalRevenue().toLocaleString()}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Cost</p>
                    <p className="text-2xl font-bold text-red-600">KSh {getTotalCost().toLocaleString()}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Profit</p>
                    <p className="text-2xl font-bold text-blue-600">KSh {getTotalProfit().toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Items Moved</p>
                    <p className="text-2xl font-bold text-purple-600">{stockMovementData.length}</p>
                  </div>
                  <Package className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stock Movement Table */}
          <Card>
            <CardHeader>
              <CardTitle>Daily/Monthly Stock Movement</CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Opening → Issued → Closing stock levels
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Opening</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Closing</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Patient/Sales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockMovementData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell className="font-mono text-sm">{item.itemCode}</TableCell>
                      <TableCell>{item.openingStock}</TableCell>
                      <TableCell className="text-red-600">{item.stockOut}</TableCell>
                      <TableCell>{item.closingStock}</TableCell>
                      <TableCell className="text-green-600">KSh {item.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-blue-600">KSh {item.profit.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {item.patientDispensing}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            {item.nonPatientSales}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === 'alerts' && (
        <div className="space-y-6">
          {/* Low Stock Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span>Low Stock Alerts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockItems.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600 dark:text-slate-400">No low stock items</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Minimum Level</TableHead>
                      <TableHead>Days of Stock</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell className="font-mono text-sm">{item.itemCode}</TableCell>
                        <TableCell>{item.currentStock} {item.unit}</TableCell>
                        <TableCell>{item.minimumLevel} {item.unit}</TableCell>
                        <TableCell>{item.daysOfStock} days</TableCell>
                        <TableCell>
                          <Badge variant={item.currentStock === 0 ? 'destructive' : 'secondary'}>
                            {item.currentStock === 0 ? 'Out of Stock' : 'Low Stock'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Expiry Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-red-600" />
                <span>Expiry Alerts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expiryAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600 dark:text-slate-400">No expiring items</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Days to Expiry</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiryAlerts.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell className="font-mono text-sm">{item.batchNumber}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{new Date(item.expiryDate).toLocaleDateString()}</TableCell>
                        <TableCell>{item.daysToExpiry} days</TableCell>
                        <TableCell>
                          <Badge variant={
                            item.daysToExpiry < 0 ? 'destructive' :
                            item.daysToExpiry <= 30 ? 'secondary' :
                            'outline'
                          }>
                            {item.daysToExpiry < 0 ? 'Expired' :
                             item.daysToExpiry <= 30 ? 'Expiring Soon' :
                             'Good'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === 'profitability' && (
        <div className="space-y-6">
          {/* Profitability Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">
                    KSh {getTotalRevenue().toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Revenue</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <TrendingDown className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-600">
                    KSh {getTotalCost().toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Cost</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">
                    KSh {getTotalProfit().toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Net Profit</p>
                  <p className="text-xs text-slate-500">
                    {getTotalRevenue() > 0 ? ((getTotalProfit() / getTotalRevenue()) * 100).toFixed(1) : 0}% margin
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profitability Table */}
          <Card>
            <CardHeader>
              <CardTitle>Profitability Report (Revenue − Cost)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Units Sold</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Margin %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockMovementData
                    .filter(item => item.stockOut > 0)
                    .sort((a, b) => b.profit - a.profit)
                    .map((item, index) => {
                      const margin = item.revenue > 0 ? ((item.profit / item.revenue) * 100) : 0
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.itemName}</TableCell>
                          <TableCell>{item.stockOut}</TableCell>
                          <TableCell className="text-green-600">KSh {item.revenue.toLocaleString()}</TableCell>
                          <TableCell className="text-red-600">KSh {item.cost.toLocaleString()}</TableCell>
                          <TableCell className="text-blue-600 font-bold">KSh {item.profit.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={margin > 50 ? 'default' : margin > 25 ? 'secondary' : 'outline'}>
                              {margin.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === 'usage' && (
        <div className="space-y-6">
          {/* Usage Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Patient Usage Report</CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Items dispensed to patients (linked to OP numbers and invoices)
                </p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Dispensed</TableHead>
                      <TableHead>Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockMovementData
                      .filter(item => item.patientDispensing > 0)
                      .map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.itemName}</TableCell>
                          <TableCell>{item.patientDispensing} times</TableCell>
                          <TableCell className="text-green-600">KSh {item.revenue.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Non-Patient Sales Report</CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Walk-in sales (linked to receipt numbers)
                </p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Sales</TableHead>
                      <TableHead>Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockMovementData
                      .filter(item => item.nonPatientSales > 0)
                      .map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.itemName}</TableCell>
                          <TableCell>{item.nonPatientSales} sales</TableCell>
                          <TableCell className="text-green-600">KSh {item.revenue.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
