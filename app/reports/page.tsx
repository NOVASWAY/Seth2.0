"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
// import { DatePickerWithRange } from "../../components/ui/date-picker"
import { Badge } from "../../components/ui/badge"
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  Download,
  Filter,
  RefreshCw,
  FileText,
  PieChart,
  Activity,
  Upload
} from "lucide-react"
import { useToast } from "../../hooks/use-toast"
import { formatCurrencyDisplay } from "../../lib/currency"

export default function ReportsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedReport, setSelectedReport] = useState("financial")
  const [selectedFormats, setSelectedFormats] = useState({
    financial: "pdf",
    patients: "pdf", 
    appointments: "pdf",
    inventory: "pdf"
  })

  // Real data will be fetched from API
  const [financialData, setFinancialData] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    monthlyGrowth: 0
  })

  const [patientStats, setPatientStats] = useState({
    totalPatients: 0,
    newPatients: 0,
    activePatients: 0,
    averageAge: 0
  })

  const [appointmentStats, setAppointmentStats] = useState({
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    noShowAppointments: 0
  })

  const [inventoryStats, setInventoryStats] = useState({
    totalItems: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0
  })

  // CSV Import functionality
  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please select a CSV file.",
        variant: "destructive",
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string
        const lines = csv.split('\n')
        const headers = lines[0].split(',').map(h => h.trim())
        
        // Parse CSV data
        const data = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',').map(v => v.trim())
            const row: any = {}
            headers.forEach((header, index) => {
              row[header] = values[index] || ''
            })
            return row
          })

        toast({
          title: "CSV Import Successful",
          description: `Successfully imported ${data.length} patient records from ${file.name}`,
        })

        // Here you would typically send the data to your backend API
        console.log('Imported patient data:', data)
      } catch (error) {
        toast({
          title: "Import Error",
          description: "Failed to parse CSV file. Please check the format.",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(file)
  }

  const generateReport = async (reportType: string) => {
    setIsLoading(true)
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Get the selected format for this report type
      const format = selectedFormats[selectedReport as keyof typeof selectedFormats] || "pdf"
      
      // Generate report data based on type
      let reportData = {}
      let fileName = ""
      let mimeType = ""
      let content = ""
      
      switch (reportType) {
        case "Financial":
          reportData = {
            title: "Financial Report",
            generatedAt: new Date().toISOString(),
            data: financialData,
            summary: {
              totalRevenue: financialData.totalRevenue,
              totalExpenses: financialData.totalExpenses,
              netProfit: financialData.netProfit,
              growthRate: financialData.monthlyGrowth
            }
          }
          fileName = `financial-report-${new Date().toISOString().split('T')[0]}`
          break
          
        case "Patient":
          reportData = {
            title: "Patient Demographics Report",
            generatedAt: new Date().toISOString(),
            data: patientStats,
            summary: {
              totalPatients: patientStats.totalPatients,
              newPatients: patientStats.newPatients,
              activePatients: patientStats.activePatients,
              averageAge: patientStats.averageAge
            }
          }
          fileName = `patient-report-${new Date().toISOString().split('T')[0]}`
          break
          
        case "Appointment":
          reportData = {
            title: "Appointment Analytics Report",
            generatedAt: new Date().toISOString(),
            data: appointmentStats,
            summary: {
              totalAppointments: appointmentStats.totalAppointments,
              completedAppointments: appointmentStats.completedAppointments,
              cancelledAppointments: appointmentStats.cancelledAppointments,
              noShowAppointments: appointmentStats.noShowAppointments,
              completionRate: Math.round((appointmentStats.completedAppointments / appointmentStats.totalAppointments) * 100)
            }
          }
          fileName = `appointment-report-${new Date().toISOString().split('T')[0]}`
          break
          
        case "Inventory":
          reportData = {
            title: "Inventory Status Report",
            generatedAt: new Date().toISOString(),
            data: inventoryStats,
            summary: {
              totalItems: inventoryStats.totalItems,
              lowStockItems: inventoryStats.lowStock,
              outOfStockItems: inventoryStats.outOfStock,
              totalInventoryValue: inventoryStats.totalValue,
              stockHealth: inventoryStats.lowStock > 0 ? "Needs Attention" : "Good"
            }
          }
          fileName = `inventory-report-${new Date().toISOString().split('T')[0]}`
          break
          
        default:
          throw new Error("Unknown report type")
      }
      
      // Generate content based on selected format
      switch (format) {
        case "pdf":
          // For PDF, we'll create a simple HTML that can be printed to PDF
          content = generatePDFContent(reportData)
          mimeType = "text/html"
          fileName += ".html"
          break
        case "excel":
          // For Excel, we'll create CSV format (simplified Excel)
          content = generateCSVContent(reportData)
          mimeType = "text/csv"
          fileName += ".csv"
          break
        case "csv":
          content = generateCSVContent(reportData)
          mimeType = "text/csv"
          fileName += ".csv"
          break
        default:
          // Default to JSON
          content = JSON.stringify(reportData, null, 2)
          mimeType = "application/json"
          fileName += ".json"
      }
      
      // Create and download the report
      const dataBlob = new Blob([content], { type: mimeType })
      
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast({
        title: "Report Generated",
        description: `${reportType} report has been generated and downloaded successfully in ${format.toUpperCase()} format.`,
      })
    } catch (error) {
      console.error('Error generating report:', error)
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to generate PDF content (HTML format)
  const generatePDFContent = (data: any) => {
    const currentDate = new Date().toLocaleDateString()
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${data.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 20px; }
        .section h3 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 5px; }
        .data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .data-table th { background-color: #f2f2f2; }
        .summary { background-color: #f8f9fa; padding: 15px; border-radius: 5px; }
        .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${data.title}</h1>
        <p>Generated on: ${currentDate}</p>
    </div>
    
    <div class="section">
        <h3>Summary</h3>
        <div class="summary">
            ${Object.entries(data.summary).map(([key, value]) => 
              `<p><strong>${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong> ${value}</p>`
            ).join('')}
        </div>
    </div>
    
    <div class="section">
        <h3>Detailed Data</h3>
        <table class="data-table">
            ${Object.entries(data.data).map(([key, value]) => 
              `<tr><th>${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</th><td>${value}</td></tr>`
            ).join('')}
        </table>
    </div>
    
    <div class="footer">
        <p>This report was generated by Seth Medical Clinic CMS</p>
    </div>
</body>
</html>`
  }

  // Helper function to generate CSV content
  const generateCSVContent = (data: any) => {
    const csvRows = []
    
    // Add header
    csvRows.push('Field,Value')
    
    // Add summary data
    csvRows.push('')
    csvRows.push('SUMMARY')
    Object.entries(data.summary).forEach(([key, value]) => {
      csvRows.push(`${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())},${value}`)
    })
    
    // Add detailed data
    csvRows.push('')
    csvRows.push('DETAILED DATA')
    Object.entries(data.data).forEach(([key, value]) => {
      csvRows.push(`${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())},${value}`)
    })
    
    return csvRows.join('\n')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500 rounded-lg">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Reports & Analytics
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Comprehensive insights and data visualization for your clinic</p>
          </div>
        </div>

        <Tabs value={selectedReport} onValueChange={setSelectedReport} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <TabsTrigger 
              value="financial" 
              className="flex items-center gap-2 text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm"
            >
              <DollarSign className="h-4 w-4" />
              Financial
            </TabsTrigger>
            <TabsTrigger 
              value="patients" 
              className="flex items-center gap-2 text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm"
            >
              <Users className="h-4 w-4" />
              Patients
            </TabsTrigger>
            <TabsTrigger 
              value="appointments" 
              className="flex items-center gap-2 text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm"
            >
              <Calendar className="h-4 w-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger 
              value="inventory" 
              className="flex items-center gap-2 text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm"
            >
              <Activity className="h-4 w-4" />
              Inventory
            </TabsTrigger>
          </TabsList>

          {/* Financial Reports */}
          <TabsContent value="financial" className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Total Revenue</CardTitle>
                  <div className="p-2 bg-emerald-500 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrencyDisplay(financialData.totalRevenue)}</div>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                    +{financialData.monthlyGrowth}% from last month
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-red-700 dark:text-red-300">Total Expenses</CardTitle>
                  <div className="p-2 bg-red-500 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">{formatCurrencyDisplay(financialData.totalExpenses)}</div>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    -2.1% from last month
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-300">Net Profit</CardTitle>
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{formatCurrencyDisplay(financialData.netProfit)}</div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    +15.2% from last month
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-purple-700 dark:text-purple-300">Growth Rate</CardTitle>
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{financialData.monthlyGrowth}%</div>
                  <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                    Monthly growth rate
                  </p>
                </CardContent>
              </Card>
          </div>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-slate-100">Financial Report Generator</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Generate detailed financial reports for your clinic
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reportType" className="text-slate-700 dark:text-slate-300">Report Type</Label>
                  <Select defaultValue="monthly">
                    <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                      <SelectItem value="daily" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">Daily Report</SelectItem>
                      <SelectItem value="weekly" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">Weekly Report</SelectItem>
                      <SelectItem value="monthly" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">Monthly Report</SelectItem>
                      <SelectItem value="yearly" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">Yearly Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateRange" className="text-slate-700 dark:text-slate-300">Date Range</Label>
                  <Input type="date" className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="format" className="text-slate-700 dark:text-slate-300">Export Format</Label>
                  <Select 
                    value={selectedFormats.financial} 
                    onValueChange={(value) => setSelectedFormats(prev => ({ ...prev, financial: value }))}
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                      <SelectItem value="pdf" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">PDF</SelectItem>
                      <SelectItem value="excel" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">Excel</SelectItem>
                      <SelectItem value="csv" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                onClick={() => generateReport("Financial")} 
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Generate Financial Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patient Reports */}
        <TabsContent value="patients" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">Total Patients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{patientStats.totalPatients.toLocaleString()}</div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  +{patientStats.newPatients} new this month
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">Active Patients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{patientStats.activePatients.toLocaleString()}</div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Currently active
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">New Patients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{patientStats.newPatients}</div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  This month
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">Average Age</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{patientStats.averageAge}</div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Years
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-slate-100">Patient Report Generator</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Generate detailed patient reports and demographics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patientReportType" className="text-slate-700 dark:text-slate-300">Report Type</Label>
                  <Select defaultValue="demographics">
                    <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                      <SelectItem value="demographics" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">Demographics</SelectItem>
                      <SelectItem value="registration" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">Registration Trends</SelectItem>
                      <SelectItem value="ageGroups" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">Age Groups</SelectItem>
                      <SelectItem value="geographic" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">Geographic Distribution</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patientDateRange" className="text-slate-700 dark:text-slate-300">Date Range</Label>
                  <Input type="date" className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patientFormat" className="text-slate-700 dark:text-slate-300">Export Format</Label>
                  <Select 
                    value={selectedFormats.patients} 
                    onValueChange={(value) => setSelectedFormats(prev => ({ ...prev, patients: value }))}
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                      <SelectItem value="pdf" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">PDF</SelectItem>
                      <SelectItem value="excel" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">Excel</SelectItem>
                      <SelectItem value="csv" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={() => generateReport("Patient")} 
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Generate Patient Report
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => document.getElementById('csv-import')?.click()}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Import CSV Data
                </Button>
                
                <input
                  id="csv-import"
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  className="hidden"
                />
                
                <Button 
                  variant="outline"
                  onClick={() => {
                    toast({
                      title: "Export Template",
                      description: "Downloading CSV template for patient data import...",
                    })
                    // Generate and download CSV template
                    const template = "Patient ID,First Name,Last Name,Email,Phone,Date of Birth,Gender,Address,Insurance Provider,Insurance Number\n"
                    const blob = new Blob([template], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const link = document.createElement('a')
                    link.href = url
                    link.download = 'patient-import-template.csv'
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                    URL.revokeObjectURL(url)
                  }}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Download Template
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => {
                    toast({
                      title: "Refresh Data",
                      description: "Refreshing patient data from database...",
                    })
                    // Simulate data refresh
                    setTimeout(() => {
                      toast({
                        title: "Data Refreshed",
                        description: "Patient data has been updated successfully.",
                      })
                    }, 1000)
                  }}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointment Reports */}
        <TabsContent value="appointments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">Total Appointments</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{appointmentStats.totalAppointments}</div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  This month
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">Completed</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{appointmentStats.completedAppointments}</div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {Math.round((appointmentStats.completedAppointments / appointmentStats.totalAppointments) * 100)}% completion rate
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">Cancelled</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{appointmentStats.cancelledAppointments}</div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {Math.round((appointmentStats.cancelledAppointments / appointmentStats.totalAppointments) * 100)}% cancellation rate
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">No Shows</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{appointmentStats.noShowAppointments}</div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {Math.round((appointmentStats.noShowAppointments / appointmentStats.totalAppointments) * 100)}% no-show rate
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-slate-100">Appointment Report Generator</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Generate detailed appointment reports and analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appointmentReportType" className="text-slate-700 dark:text-slate-300">Report Type</Label>
                  <Select defaultValue="summary">
                    <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                      <SelectItem value="summary" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">Appointment Summary</SelectItem>
                      <SelectItem value="trends" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">Appointment Trends</SelectItem>
                      <SelectItem value="noShows" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">No-Show Analysis</SelectItem>
                      <SelectItem value="cancellations" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">Cancellation Analysis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appointmentDateRange" className="text-slate-700 dark:text-slate-300">Date Range</Label>
                  <Input type="date" className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appointmentFormat" className="text-slate-700 dark:text-slate-300">Export Format</Label>
                  <Select 
                    value={selectedFormats.appointments} 
                    onValueChange={(value) => setSelectedFormats(prev => ({ ...prev, appointments: value }))}
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                      <SelectItem value="pdf" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">PDF</SelectItem>
                      <SelectItem value="excel" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">Excel</SelectItem>
                      <SelectItem value="csv" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                onClick={() => generateReport("Appointment")} 
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Generate Appointment Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Reports */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">Total Items</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{inventoryStats.totalItems.toLocaleString()}</div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  In inventory
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">Low Stock</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{inventoryStats.lowStock}</div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Items need restocking
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">Out of Stock</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{inventoryStats.outOfStock}</div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Items out of stock
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">Total Value</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrencyDisplay(inventoryStats.totalValue)}</div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Inventory value
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-slate-100">Inventory Report Generator</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Generate detailed inventory reports and stock analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inventoryReportType" className="text-slate-700 dark:text-slate-300">Report Type</Label>
                  <Select defaultValue="stock">
                    <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                      <SelectItem value="stock" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">Stock Levels</SelectItem>
                      <SelectItem value="movement" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">Stock Movement</SelectItem>
                      <SelectItem value="expiry" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">Expiry Tracking</SelectItem>
                      <SelectItem value="value" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">Inventory Valuation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inventoryDateRange" className="text-slate-700 dark:text-slate-300">Date Range</Label>
                  <Input type="date" className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inventoryFormat" className="text-slate-700 dark:text-slate-300">Export Format</Label>
                  <Select 
                    value={selectedFormats.inventory} 
                    onValueChange={(value) => setSelectedFormats(prev => ({ ...prev, inventory: value }))}
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                      <SelectItem value="pdf" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">PDF</SelectItem>
                      <SelectItem value="excel" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">Excel</SelectItem>
                      <SelectItem value="csv" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                onClick={() => generateReport("Inventory")} 
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Generate Inventory Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}
