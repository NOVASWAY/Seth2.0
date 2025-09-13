"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { useToast } from "../../hooks/use-toast"
import { QuickPaymentRecording } from "../financial/QuickPaymentRecording"
import { PharmacySales } from "../financial/PharmacySales"
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  CreditCard, 
  Smartphone,
  Banknote,
  Receipt,
  Activity
} from "lucide-react"
import { formatCurrencyDisplay } from "../../lib/currency"

interface FinancialStats {
  today_revenue: number
  today_payments: number
  today_sales: number
  pending_receivables: number
}

interface RecentTransaction {
  id: string
  type: "payment" | "sale"
  amount: number
  method: string
  description: string
  timestamp: string
  patient_name?: string
  buyer_name?: string
}

interface FinancialRecordingWidgetProps {
  className?: string
}

export function FinancialRecordingWidget({ className }: FinancialRecordingWidgetProps) {
  const { toast } = useToast()
  const [stats, setStats] = useState<FinancialStats>({
    today_revenue: 0,
    today_payments: 0,
    today_sales: 0,
    pending_receivables: 0
  })
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFinancialData()
  }, [])

  const fetchFinancialData = async () => {
    try {
      setLoading(true)
      
      // Fetch dashboard data
      const dashboardResponse = await fetch("/api/financial/dashboard", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json()
        setStats({
          today_revenue: dashboardData.data.today_revenue || 0,
          today_payments: dashboardData.data.recent_transactions?.length || 0,
          today_sales: 0, // This would need to be calculated separately
          pending_receivables: Number(Object.values(dashboardData.data.receivables || {}).reduce((sum: number, val: unknown) => sum + (Number(val) || 0), 0))
        })
        setRecentTransactions(dashboardData.data.recent_transactions?.slice(0, 5) || [])
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

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case "cash":
        return <Banknote className="h-4 w-4 text-green-600" />
      case "mpesa":
        return <Smartphone className="h-4 w-4 text-green-600" />
      case "bank_transfer":
        return <CreditCard className="h-4 w-4 text-blue-600" />
      default:
        return <Receipt className="h-4 w-4 text-gray-600" />
    }
  }

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case "payment":
        return <Users className="h-4 w-4 text-blue-600" />
      case "sale":
        return <ShoppingCart className="h-4 w-4 text-purple-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Recording
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Financial Recording
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickPaymentRecording onPaymentRecorded={fetchFinancialData} />
          <PharmacySales onSaleRecorded={fetchFinancialData} />
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {formatCurrencyDisplay(stats.today_revenue)}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">Today's Revenue</div>
          </div>

          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-center mb-2">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {stats.today_payments}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Payments Today</div>
          </div>

          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-center mb-2">
              <ShoppingCart className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {stats.today_sales}
            </div>
            <div className="text-sm text-purple-600 dark:text-purple-400">Sales Today</div>
          </div>

          <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-center mb-2">
              <Receipt className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              {formatCurrencyDisplay(stats.pending_receivables)}
            </div>
            <div className="text-sm text-orange-600 dark:text-orange-400">Pending Receivables</div>
          </div>
        </div>

        {/* Recent Transactions */}
        {recentTransactions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Transactions
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    {getTransactionTypeIcon(transaction.type)}
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {transaction.patient_name || transaction.buyer_name || "Unknown"}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {transaction.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPaymentMethodIcon(transaction.method)}
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrencyDisplay(transaction.amount)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimeAgo(transaction.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Stats Summary */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrencyDisplay(stats.today_revenue)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {stats.today_payments + stats.today_sales}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Transactions</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrencyDisplay(stats.pending_receivables)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Outstanding</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
