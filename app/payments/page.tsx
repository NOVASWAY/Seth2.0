'use client'

import { useAuthStore } from '../../lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '../../components/dashboard/Sidebar'
import { ProtectedRoute } from '../../components/auth/ProtectedRoute'
import { UserRole } from '../../types'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog'
import { useToast } from '../../hooks/use-toast'
import { Plus, CreditCard, Smartphone, Banknote, DollarSign, Clock, TrendingUp } from 'lucide-react'

interface Payment {
  id: string
  patientName: string
  patientId: string
  amount: number
  currency: string
  method: 'cash' | 'mpesa' | 'card' | 'insurance'
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  date: string
  description: string
  reference: string
}

interface NewPayment {
  patientName: string
  patientId: string
  amount: number
  method: 'cash' | 'mpesa' | 'card' | 'insurance'
  description: string
  phoneNumber?: string
  mpesaReceipt?: string
  notes?: string
  invoice_id?: string
}

const mockPayments: Payment[] = [
  {
    id: "1",
    patientName: "Sarah Johnson",
    patientId: "1",
    amount: 5000,
    currency: "KES",
    method: "mpesa",
    status: "completed",
    date: "2024-02-01",
    description: "Consultation fee",
    reference: "MPESA-001"
  },
  {
    id: "2",
    patientName: "Michael Chen",
    patientId: "2",
    amount: 3500,
    currency: "KES",
    method: "cash",
    status: "completed",
    date: "2024-02-01",
    description: "Lab test fee",
    reference: "CASH-002"
  },
  {
    id: "3",
    patientName: "Emily Davis",
    patientId: "3",
    amount: 8000,
    currency: "KES",
    method: "insurance",
    status: "pending",
    date: "2024-02-01",
    description: "Prenatal care",
    reference: "INS-003"
  }
]

export default function PaymentsPage() {
  const { user, isAuthenticated, isLoading, accessToken } = useAuthStore()
  const router = useRouter()
  const { toast } = useToast()
  const [payments, setPayments] = useState<Payment[]>(mockPayments)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newPayment, setNewPayment] = useState<NewPayment>({
    patientName: '',
    patientId: '',
    amount: 0,
    method: 'cash',
    description: '',
    phoneNumber: '',
    mpesaReceipt: '',
    notes: '',
    invoice_id: ''
  })

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  const filteredPayments = payments.filter(payment => {
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter
    const matchesMethod = methodFilter === 'all' || payment.method === methodFilter
    return matchesStatus && matchesMethod
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      case 'refunded': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'mpesa': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'cash': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'card': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
      case 'insurance': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  const handleAddPayment = () => {
    setShowAddPayment(true)
  }

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!accessToken) {
        toast({
          title: "Authentication Error",
          description: "Please log in to record payments.",
          variant: "destructive",
        })
        return
      }

      // For now, we'll create a mock invoice_id since the backend requires it
      // In a real implementation, you'd select from existing invoices
      const paymentData = {
        invoice_id: newPayment.invoice_id || `temp-invoice-${Date.now()}`,
        amount: newPayment.amount,
        payment_method: newPayment.method,
        mpesa_receipt: newPayment.mpesaReceipt,
        notes: newPayment.notes
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/financial/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(paymentData)
      })

      if (!response.ok) {
        throw new Error(`Failed to record payment: ${response.status}`)
      }

      const result = await response.json()
      
      // Add the new payment to the list
      const payment: Payment = {
        id: result.id || Date.now().toString(),
        patientName: newPayment.patientName,
        patientId: newPayment.patientId,
        amount: newPayment.amount,
        currency: 'KES',
        method: newPayment.method,
        status: 'completed',
        date: new Date().toISOString().split('T')[0],
        description: newPayment.description,
        reference: `${newPayment.method.toUpperCase()}-${Date.now()}`
      }

      setPayments([payment, ...payments])
      
      toast({
        title: "Payment Recorded",
        description: `Payment of ${newPayment.amount.toLocaleString()} KES recorded successfully.`,
      })

      // Reset form
      setNewPayment({
        patientName: '',
        patientId: '',
        amount: 0,
        method: 'cash',
        description: '',
        phoneNumber: '',
        mpesaReceipt: '',
        notes: '',
        invoice_id: ''
      })
      setShowAddPayment(false)

    } catch (error) {
      console.error('Error recording payment:', error)
      toast({
        title: "Error",
        description: "Failed to record payment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditPayment = (paymentId: string) => {
    // TODO: Implement edit functionality
    console.log('Edit payment:', paymentId)
  }

  const handleStatusChange = (paymentId: string, newStatus: Payment['status']) => {
    setPayments(payments.map(payment => 
      payment.id === paymentId ? { ...payment, status: newStatus } : payment
    ))
  }

  const totalRevenue = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)

  const pendingPayments = payments.filter(p => p.status === 'pending')

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading payments...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.PHARMACIST]}>
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 items-center justify-center">
          <div className="text-center">
            <CreditCard className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Authentication Required
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Please log in to access payments data.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.PHARMACIST]}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
        <Sidebar
          user={user}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <nav className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Payments</h1>
                </div>
                <div className="flex items-center space-x-4">
                  <Dialog open={showAddPayment} onOpenChange={setShowAddPayment}>
                    <DialogTrigger asChild>
                      <Button onClick={handleAddPayment} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Record Payment
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <DialogHeader>
                        <DialogTitle className="text-slate-900 dark:text-slate-100">Record New Payment</DialogTitle>
                        <DialogDescription className="text-slate-600 dark:text-slate-400">
                          Enter the payment details below to record a new payment.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <form onSubmit={handleSubmitPayment} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="patientName" className="text-slate-700 dark:text-slate-300">Patient Name</Label>
                            <Input
                              id="patientName"
                              value={newPayment.patientName}
                              onChange={(e) => setNewPayment({ ...newPayment, patientName: e.target.value })}
                              className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="patientId" className="text-slate-700 dark:text-slate-300">Patient ID</Label>
                            <Input
                              id="patientId"
                              value={newPayment.patientId}
                              onChange={(e) => setNewPayment({ ...newPayment, patientId: e.target.value })}
                              className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="invoiceId" className="text-slate-700 dark:text-slate-300">Invoice ID (Optional)</Label>
                          <Input
                            id="invoiceId"
                            value={newPayment.invoice_id}
                            onChange={(e) => setNewPayment({ ...newPayment, invoice_id: e.target.value })}
                            placeholder="Leave empty for direct payment"
                            className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="amount" className="text-slate-700 dark:text-slate-300">Amount (KES)</Label>
                            <Input
                              id="amount"
                              type="number"
                              min="0"
                              step="0.01"
                              value={newPayment.amount}
                              onChange={(e) => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) || 0 })}
                              className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="method" className="text-slate-700 dark:text-slate-300">Payment Method</Label>
                            <Select
                              value={newPayment.method}
                              onValueChange={(value) => setNewPayment({ ...newPayment, method: value as any })}
                            >
                              <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                <SelectItem value="cash" className="text-slate-900 dark:text-slate-100">
                                  <div className="flex items-center gap-2">
                                    <Banknote className="h-4 w-4" />
                                    Cash
                                  </div>
                                </SelectItem>
                                <SelectItem value="mpesa" className="text-slate-900 dark:text-slate-100">
                                  <div className="flex items-center gap-2">
                                    <Smartphone className="h-4 w-4" />
                                    M-Pesa
                                  </div>
                                </SelectItem>
                                <SelectItem value="card" className="text-slate-900 dark:text-slate-100">
                                  <div className="flex items-center gap-2">
                                    <CreditCard className="h-4 w-4" />
                                    Card
                                  </div>
                                </SelectItem>
                                <SelectItem value="insurance" className="text-slate-900 dark:text-slate-100">Insurance</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {newPayment.method === 'mpesa' && (
                          <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <div>
                              <Label htmlFor="phoneNumber" className="text-slate-700 dark:text-slate-300">Phone Number</Label>
                              <Input
                                id="phoneNumber"
                                value={newPayment.phoneNumber}
                                onChange={(e) => setNewPayment({ ...newPayment, phoneNumber: e.target.value })}
                                placeholder="+254712345678"
                                className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                              />
                            </div>
                            <div>
                              <Label htmlFor="mpesaReceipt" className="text-slate-700 dark:text-slate-300">M-Pesa Receipt (Optional)</Label>
                              <Input
                                id="mpesaReceipt"
                                value={newPayment.mpesaReceipt}
                                onChange={(e) => setNewPayment({ ...newPayment, mpesaReceipt: e.target.value })}
                                placeholder="Enter M-Pesa receipt number"
                                className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <Label htmlFor="description" className="text-slate-700 dark:text-slate-300">Description</Label>
                          <Input
                            id="description"
                            value={newPayment.description}
                            onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
                            placeholder="e.g., Consultation fee, Lab test, etc."
                            className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="notes" className="text-slate-700 dark:text-slate-300">Notes (Optional)</Label>
                          <Textarea
                            id="notes"
                            value={newPayment.notes}
                            onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                            placeholder="Additional payment notes..."
                            rows={3}
                            className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                          />
                        </div>

                        <div className="flex justify-end space-x-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowAddPayment(false)}
                            className="border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {isSubmitting ? "Recording..." : "Record Payment"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-md flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Revenue</p>
                    <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                      {totalRevenue.toLocaleString()} KES
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-md flex items-center justify-center">
                      <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending Payments</p>
                    <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                      {pendingPayments.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-md flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Transactions</p>
                    <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                      {payments.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div>
                  <Label className="text-slate-700 dark:text-slate-300 mb-1">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectItem value="all" className="text-slate-900 dark:text-slate-100">All Status</SelectItem>
                      <SelectItem value="completed" className="text-slate-900 dark:text-slate-100">Completed</SelectItem>
                      <SelectItem value="pending" className="text-slate-900 dark:text-slate-100">Pending</SelectItem>
                      <SelectItem value="failed" className="text-slate-900 dark:text-slate-100">Failed</SelectItem>
                      <SelectItem value="refunded" className="text-slate-900 dark:text-slate-100">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-700 dark:text-slate-300 mb-1">Payment Method</Label>
                  <Select value={methodFilter} onValueChange={setMethodFilter}>
                    <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectItem value="all" className="text-slate-900 dark:text-slate-100">All Methods</SelectItem>
                      <SelectItem value="mpesa" className="text-slate-900 dark:text-slate-100">M-Pesa</SelectItem>
                      <SelectItem value="cash" className="text-slate-900 dark:text-slate-100">Cash</SelectItem>
                      <SelectItem value="card" className="text-slate-900 dark:text-slate-100">Card</SelectItem>
                      <SelectItem value="insurance" className="text-slate-900 dark:text-slate-100">Insurance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payments List */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 overflow-hidden">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700">
              <CardTitle className="text-slate-900 dark:text-slate-100">
                Payment Records ({filteredPayments.length})
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Reference
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{payment.patientName}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">ID: {payment.patientId}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {payment.amount.toLocaleString()} {payment.currency}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">{payment.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMethodColor(payment.method)}`}>
                            {payment.method.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Select
                            value={payment.status}
                            onValueChange={(value) => handleStatusChange(payment.id, value as Payment['status'])}
                          >
                            <SelectTrigger className={`w-auto h-auto p-0 border-0 bg-transparent ${getStatusColor(payment.status)}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                              <SelectItem value="pending" className="text-slate-900 dark:text-slate-100">Pending</SelectItem>
                              <SelectItem value="completed" className="text-slate-900 dark:text-slate-100">Completed</SelectItem>
                              <SelectItem value="failed" className="text-slate-900 dark:text-slate-100">Failed</SelectItem>
                              <SelectItem value="refunded" className="text-slate-900 dark:text-slate-100">Refunded</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900 dark:text-slate-100">
                            {new Date(payment.date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900 dark:text-slate-100">{payment.reference}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPayment(payment.id)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              Edit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
    </ProtectedRoute>
  )
}
