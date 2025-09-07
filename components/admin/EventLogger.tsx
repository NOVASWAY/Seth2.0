"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Calendar,
  User,
  Activity,
  AlertTriangle,
  Info,
  Shield,
  Database,
  Clock,
  Eye,
  Trash2
} from "lucide-react"

interface EventLog {
  id: string
  event_type: string
  user_id?: string
  username?: string
  target_type?: string
  target_id?: string
  action: string
  details?: any
  ip_address?: string
  user_agent?: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  created_at: string
}

interface EventStats {
  total_events: number
  events_by_type: Record<string, number>
  events_by_severity: Record<string, number>
  recent_events: EventLog[]
}

interface EventLoggerProps {
  onEventLogged?: () => void
}

export function EventLogger({ onEventLogged }: EventLoggerProps) {
  const [events, setEvents] = useState<EventLog[]>([])
  const [stats, setStats] = useState<EventStats | null>(null)
  const [eventTypes, setEventTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const { toast } = useToast()

  // Filters
  const [filters, setFilters] = useState({
    event_type: "",
    user_id: "",
    target_type: "",
    action: "",
    severity: "",
    start_date: "",
    end_date: "",
    limit: 50,
    offset: 0,
  })

  // Pagination
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    has_more: false,
  })

  useEffect(() => {
    fetchEventTypes()
    fetchEvents()
    fetchStats()
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [filters])

  const fetchEventTypes = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/events/types`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setEventTypes(result.data || [])
      }
    } catch (error) {
      console.error("Error fetching event types:", error)
    }
  }

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const queryParams = new URLSearchParams()
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value.toString())
        }
      })

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/events?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setEvents(result.data || [])
        setPagination(result.pagination || { total: 0, limit: 50, offset: 0, has_more: false })
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch events",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching events:", error)
      toast({
        title: "Error",
        description: "Failed to fetch events",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    setStatsLoading(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/events/stats?days=30`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setStats(result.data)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setStatsLoading(false)
    }
  }

  const handleCleanup = async () => {
    setCleanupLoading(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/events/cleanup`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Event cleanup completed successfully",
        })
        fetchEvents()
        fetchStats()
      } else {
        toast({
          title: "Error",
          description: "Failed to cleanup events",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error cleaning up events:", error)
      toast({
        title: "Error",
        description: "Failed to cleanup events",
        variant: "destructive",
      })
    } finally {
      setCleanupLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0, // Reset pagination when filters change
    }))
  }

  const handlePageChange = (newOffset: number) => {
    setFilters(prev => ({
      ...prev,
      offset: newOffset,
    }))
  }

  const getSeverityBadge = (severity: string) => {
    const severityColors = {
      LOW: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    }
    
    return (
      <Badge className={severityColors[severity as keyof typeof severityColors] || "bg-gray-100 text-gray-800"}>
        {severity}
      </Badge>
    )
  }

  const getEventTypeIcon = (eventType: string) => {
    const icons = {
      LOGIN: <User className="h-4 w-4" />,
      USER: <User className="h-4 w-4" />,
      PATIENT: <Activity className="h-4 w-4" />,
      SYSTEM: <Database className="h-4 w-4" />,
      SECURITY: <Shield className="h-4 w-4" />,
      AUDIT: <Eye className="h-4 w-4" />,
    }
    
    return icons[eventType as keyof typeof icons] || <Info className="h-4 w-4" />
  }

  const exportEvents = () => {
    const csvContent = [
      ["ID", "Event Type", "User", "Action", "Target", "Severity", "IP Address", "Created At"],
      ...events.map(event => [
        event.id,
        event.event_type,
        event.username || "System",
        event.action,
        event.target_type ? `${event.target_type}:${event.target_id}` : "",
        event.severity,
        event.ip_address || "",
        new Date(event.created_at).toLocaleString(),
      ])
    ].map(row => row.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `events-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Event Logger</h2>
        <p className="text-muted-foreground">Monitor system events, user activities, and security logs</p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold text-blue-500">{stats.total_events}</div>
                  <div className="text-sm text-muted-foreground">Total Events (30d)</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-500" />
                <div>
                  <div className="text-2xl font-bold text-red-500">
                    {stats.events_by_severity.CRITICAL || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Critical Events</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold text-green-500">
                    {stats.events_by_type.LOGIN || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Login Events</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold text-orange-500">
                    {stats.events_by_severity.HIGH || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">High Severity</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_type">Event Type</Label>
              <Select value={filters.event_type} onValueChange={(value) => handleFilterChange("event_type", value)}>
                <SelectTrigger className="dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  {eventTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select value={filters.severity} onValueChange={(value) => handleFilterChange("severity", value)}>
                <SelectTrigger className="dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Severities</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange("start_date", e.target.value)}
                className="dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange("end_date", e.target.value)}
                className="dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={fetchEvents} disabled={loading} className="dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
            
            <Button onClick={exportEvents} variant="outline" className="dark:border-gray-600 dark:text-white dark:hover:bg-gray-700">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            
            <Button 
              onClick={handleCleanup} 
              disabled={cleanupLoading}
              variant="destructive"
              className="dark:bg-red-900 dark:text-white dark:hover:bg-red-800"
            >
              {cleanupLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Cleanup Old Events
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Events ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start justify-between p-4 border rounded-lg dark:border-gray-600 dark:bg-gray-800/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getEventTypeIcon(event.event_type)}
                    <div className="font-medium dark:text-white">
                      {event.action.replace("_", " ").toUpperCase()}
                    </div>
                    {getSeverityBadge(event.severity)}
                    <Badge variant="outline" className="dark:border-gray-600 dark:text-white">
                      {event.event_type}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    {event.username && (
                      <div>User: <span className="font-medium">{event.username}</span></div>
                    )}
                    {event.target_type && (
                      <div>Target: <span className="font-medium">{event.target_type}</span></div>
                    )}
                    {event.ip_address && (
                      <div>IP: <span className="font-medium">{event.ip_address}</span></div>
                    )}
                    {event.details && (
                      <div className="text-xs bg-muted/50 p-2 rounded mt-2">
                        <pre className="whitespace-pre-wrap">{JSON.stringify(event.details, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(event.created_at).toLocaleString()}
                </div>
              </div>
            ))}

            {events.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                No events found matching your criteria
              </div>
            )}

            {loading && (
              <div className="text-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                <div className="mt-2 text-muted-foreground">Loading events...</div>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {filters.offset + 1} to {Math.min(filters.offset + filters.limit, pagination.total)} of {pagination.total} events
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.max(0, filters.offset - filters.limit))}
                  disabled={filters.offset === 0}
                  className="dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
                >
                  Previous
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(filters.offset + filters.limit)}
                  disabled={!pagination.has_more}
                  className="dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Information */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Event Logger Information:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• <strong>Retention Policy:</strong> Login events (90 days), User events (180 days), Patient events (1 year), Security events (1 year)</li>
            <li>• <strong>Severity Levels:</strong> LOW (info), MEDIUM (warnings), HIGH (errors), CRITICAL (security issues)</li>
            <li>• <strong>Cleanup:</strong> Automatically removes old events based on retention policy</li>
            <li>• <strong>Export:</strong> Download events as CSV for external analysis</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}
