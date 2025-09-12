"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { useToast } from "../../hooks/use-toast"
import { ProtectedRoute } from "../../components/auth/ProtectedRoute"
import { UserRole } from "../../types"
import { QuickPaymentRecording } from "../../components/financial/QuickPaymentRecording"
import { PharmacySales } from "../../components/financial/PharmacySales"
import { BillingForm } from "../../components/financial/BillingForm"
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  CreditCard, 
  Smartphone,
  Banknote,
  Receipt,
  Activity,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  Clock,
  FileText,
  BarChart3,
  Calculator
} from "lucide-react"
import { formatCurrencyDisplay } from "../../lib/currency"
import Sidebar from "../../components/dashboard/Sidebar"
import { useAuthStore } from "../../lib/auth"

interface Transaction {
  id: string
  type: "payment" | "sale" | "invoice"
  amount: number
  method: string
  description: string
  timestamp: string
  patient_name?: string
  buyer_name?: string
  invoice_number?: string
  status: string
}

interface FinancialStats {
  today_revenue: number
  today_payments: number
  today_sales: number
  pending_receivables: number
  total_transactions: number
  receivables: {
    current: number
    thirty_days: number
    sixty_days: number
    ninety_plus: number
  }
}

export default function FinancialPage() {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [stats, setStats] = useState<FinancialStats>({
    today_revenue: 0,
    today_payments: 0,
    today_sales: 0,
    pending_receivables: 0,
    total_transactions: 0,
    receivables: {
      current: 0,
      thirty_days: 0,
      sixty_days: 0,
      ninety_plus: 0
    }
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [methodFilter, setMethodFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("today")

  useEffect(() => {
    fetchFinancialData()
  }, [])

  const fetchFinancialData = async () => {
    try {
      setLoading(true)
      
      // Fetch dashboard data
      const dashboardResponse = await fetch("/api/financial/dashboard", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      })

      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json()
        setStats({
          today_revenue: dashboardData.data.today_revenue || 0,
          today_payments: dashboardData.data.recent_transactions?.length || 0,
          today_sales: 0, // This would need to be calculated separately
          pending_receivables: (Object.values(dashboardData.data.receivables || {}) as number[]).reduce((sum: number, val: number) => sum + val, 0),
          total_transactions: dashboardData.data.recent_transactions?.length || 0,
          receivables: dashboardData.data.receivables || {
            current: 0,
            thirty_days: 0,
            sixty_days: 0,
            ninety_plus: 0
          }
        })
        setTransactions(dashboardData.data.recent_transactions || [])
      }
    } catch (error) {
      console.error("Error fetching financial data:", error)
      toast({
        title: "Error",
        description: "Failed to load financial data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = !searchTerm || 
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = typeFilter === "all" || transaction.type === typeFilter
    const matchesMethod = methodFilter === "all" || transaction.method === methodFilter
    
    return matchesSearch && matchesType && matchesMethod
  })

  const totalReceivables = stats.receivables.current + stats.receivables.thirty_days + stats.receivables.sixty_days + stats.receivables.ninety_plus

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading financial data...</span>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.PHARMACIST]}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex">
        <Sidebar
          user={user}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <nav className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                    Financial Management
                  </h1>
                </div>
                <div className="flex items-center space-x-4">
                  <Button 
                    onClick={fetchFinancialData}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <div className="flex-1 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Financial Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Today's Revenue
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrencyDisplay(stats.today_revenue)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      +12% from yesterday
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Total Receivables
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrencyDisplay(totalReceivables)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Outstanding payments
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Overdue (90+ days)
                    </CardTitle>
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrencyDisplay(stats.receivables.ninety_plus)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Requires attention
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Today's Transactions
                    </CardTitle>
                    <Activity className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {stats.total_transactions}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Payments & sales
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Main Financial Management Tabs */}
              <Tabs defaultValue="recording" className="space-y-6">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="recording" className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Quick Recording
                  </TabsTrigger>
                  <TabsTrigger value="billing" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Create Invoice
                  </TabsTrigger>
                  <TabsTrigger value="transactions" className="flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Transactions
                  </TabsTrigger>
                  <TabsTrigger value="receivables" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Receivables
                  </TabsTrigger>
                  <TabsTrigger value="reports" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Reports
                  </TabsTrigger>
                </TabsList>

                {/* Quick Recording Tab */}
                <TabsContent value="recording" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Patient Payments
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          Record payments from patients for consultations, lab tests, and other services.
                        </p>
                        <QuickPaymentRecording onPaymentRecorded={fetchFinancialData} />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ShoppingCart className="h-5 w-5" />
                          Pharmacy Sales
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          Record medicine sales to walk-in customers (non-patients).
                        </p>
                        <PharmacySales onSaleRecorded={fetchFinancialData} />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Billing Tab */}
                <TabsContent value="billing">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Create Invoice
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <BillingForm onInvoiceCreated={fetchFinancialData} />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Transactions Tab */}
                <TabsContent value="transactions" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        Transaction History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Filters */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="space-y-2">
                          <Label htmlFor="search">Search</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                              id="search"
                              placeholder="Search transactions..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10 border-2 border-blue-300 dark:border-blue-600 shadow-md h-12"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="typeFilter">Type</Label>
                          <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="border-2 border-blue-300 dark:border-blue-600 shadow-md h-12">
                              <SelectValue placeholder="Filter by type" />
                            </SelectTrigger>
                            <SelectContent className="shadow-xl z-50 max-h-60">
                              <SelectItem value="all" className="hover:bg-blue-100 font-medium py-3">
                                All Types
                              </SelectItem>
                              <SelectItem value="payment" className="hover:bg-blue-100 font-medium py-3">
                                Payments
                              </SelectItem>
                              <SelectItem value="sale" className="hover:bg-blue-100 font-medium py-3">
                                Sales
                              </SelectItem>
                              <SelectItem value="invoice" className="hover:bg-blue-100 font-medium py-3">
                                Invoices
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="methodFilter">Payment Method</Label>
                          <Select value={methodFilter} onValueChange={setMethodFilter}>
                            <SelectTrigger className="border-2 border-blue-300 dark:border-blue-600 shadow-md h-12">
                              <SelectValue placeholder="Filter by method" />
                            </SelectTrigger>
                            <SelectContent className="shadow-xl z-50 max-h-60">
                              <SelectItem value="all" className="hover:bg-blue-100 font-medium py-3">
                                All Methods
                              </SelectItem>
                              <SelectItem value="cash" className="hover:bg-blue-100 font-medium py-3">
                                Cash
                              </SelectItem>
                              <SelectItem value="mpesa" className="hover:bg-blue-100 font-medium py-3">
                                M-Pesa
                              </SelectItem>
                              <SelectItem value="bank_transfer" className="hover:bg-blue-100 font-medium py-3">
                                Bank Transfer
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="dateFilter">Date Range</Label>
                          <Select value={dateFilter} onValueChange={setDateFilter}>
                            <SelectTrigger className="border-2 border-blue-300 dark:border-blue-600 shadow-md h-12">
                              <SelectValue placeholder="Filter by date" />
                            </SelectTrigger>
                            <SelectContent className="shadow-xl z-50 max-h-60">
                              <SelectItem value="today" className="hover:bg-blue-100 font-medium py-3">
                                Today
                              </SelectItem>
                              <SelectItem value="week" className="hover:bg-blue-100 font-medium py-3">
                                This Week
                              </SelectItem>
                              <SelectItem value="month" className="hover:bg-blue-100 font-medium py-3">
                                This Month
                              </SelectItem>
                              <SelectItem value="all" className="hover:bg-blue-100 font-medium py-3">
                                All Time
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Transactions List */}
                      <div className="space-y-4">
                        {filteredTransactions.length > 0 ? (
                          filteredTransactions.map((transaction) => (
                            <div
                              key={transaction.id}
                              className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800"
                            >
                              <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-full ${
                                  transaction.type === 'payment' ? 'bg-green-100 text-green-600' :
                                  transaction.type === 'sale' ? 'bg-blue-100 text-blue-600' :
                                  'bg-purple-100 text-purple-600'
                                }`}>
                                  {transaction.type === 'payment' ? <CreditCard className="h-4 w-4" /> :
                                   transaction.type === 'sale' ? <ShoppingCart className="h-4 w-4" /> :
                                   <FileText className="h-4 w-4" />}
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 dark:text-slate-100">
                                    {transaction.description}
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-slate-400">
                                    {transaction.patient_name || transaction.buyer_name || 'N/A'} • {transaction.method}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-gray-900 dark:text-slate-100">
                                  {formatCurrencyDisplay(transaction.amount)}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-slate-400">
                                  {new Date(transaction.timestamp).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                            No transactions found matching your criteria.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Receivables Tab */}
                <TabsContent value="receivables">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Accounts Receivable Aging
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {formatCurrencyDisplay(stats.receivables.current)}
                            </div>
                            <div className="text-sm text-muted-foreground">Current (0-30 days)</div>
                          </div>
                          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                              {formatCurrencyDisplay(stats.receivables.thirty_days)}
                            </div>
                            <div className="text-sm text-muted-foreground">31-60 days</div>
                          </div>
                          <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                              {formatCurrencyDisplay(stats.receivables.sixty_days)}
                            </div>
                            <div className="text-sm text-muted-foreground">61-90 days</div>
                          </div>
                          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                              {formatCurrencyDisplay(stats.receivables.ninety_plus)}
                            </div>
                            <div className="text-sm text-muted-foreground">90+ days</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Reports Tab */}
                <TabsContent value="reports">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Financial Reports
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
                          <Download className="h-6 w-6" />
                          <span>Revenue Report</span>
                        </Button>
                        <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
                          <TrendingUp className="h-6 w-6" />
                          <span>Payment Analysis</span>
                        </Button>
                        <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
                          <Receipt className="h-6 w-6" />
                          <span>Transaction Summary</span>
                        </Button>
                      </div>
                      <p className="text-muted-foreground mt-4 text-center">
                        Financial reporting features will be implemented here, including revenue reports, payment analysis, and export capabilities.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}