"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuthStore } from "@/stores/authStore"
import { useSync } from "@/hooks/useSync"
import SyncDashboard from "@/components/sync/SyncDashboard"
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Users, 
  Bell, 
  Activity,
  Settings,
  Database,
  Server
} from "lucide-react"

interface SystemStatus {
  database: 'connected' | 'disconnected'
  websocket: 'connected' | 'disconnected'
  api: 'healthy' | 'unhealthy'
  lastCheck: string
}

export default function SyncPage() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: 'disconnected',
    websocket: 'disconnected',
    api: 'unhealthy',
    lastCheck: new Date().toISOString()
  })
  const [isChecking, setIsChecking] = useState(false)
  const { accessToken } = useAuthStore()
  
  const {
    isConnected,
    connectedUsersCount,
    unreadNotificationsCount,
    syncEvents
  } = useSync()

  useEffect(() => {
    if (accessToken) {
      checkSystemStatus()
    }
  }, [accessToken])

  const checkSystemStatus = async () => {
    setIsChecking(true)
    try {
      // Check API health
      const healthResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/health`)
      const apiStatus = healthResponse.ok ? 'healthy' : 'unhealthy'

      // Check database connection (via API)
      const dbResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/sync/stats`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      const dbStatus = dbResponse.ok ? 'connected' : 'disconnected'

      setSystemStatus({
        database: dbStatus,
        websocket: isConnected ? 'connected' : 'disconnected',
        api: apiStatus,
        lastCheck: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error checking system status:', error)
      setSystemStatus(prev => ({
        ...prev,
        api: 'unhealthy',
        database: 'disconnected',
        lastCheck: new Date().toISOString()
      }))
    } finally {
      setIsChecking(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'healthy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'disconnected':
      case 'unhealthy':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'healthy':
        return <Wifi className="h-4 w-4 text-green-600" />
      case 'disconnected':
      case 'unhealthy':
        return <WifiOff className="h-4 w-4 text-red-600" />
      default:
        return <WifiOff className="h-4 w-4 text-gray-600" />
    }
  }

  if (!accessToken) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to access synchronization status.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Synchronization</h1>
          <p className="text-muted-foreground">Monitor real-time system coordination and user activity</p>
        </div>
        <Button
          onClick={checkSystemStatus}
          disabled={isChecking}
          className="dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Checking...' : 'Refresh Status'}
        </Button>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium dark:text-white">API Server</CardTitle>
            {getStatusIcon(systemStatus.api)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-white">
              {systemStatus.api === 'healthy' ? 'Online' : 'Offline'}
            </div>
            <p className="text-xs text-muted-foreground">
              Last checked: {new Date(systemStatus.lastCheck).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium dark:text-white">Database</CardTitle>
            {getStatusIcon(systemStatus.database)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-white">
              {systemStatus.database === 'connected' ? 'Connected' : 'Disconnected'}
            </div>
            <p className="text-xs text-muted-foreground">
              PostgreSQL connection status
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium dark:text-white">WebSocket</CardTitle>
            {getStatusIcon(systemStatus.websocket)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-white">
              {systemStatus.websocket === 'connected' ? 'Connected' : 'Disconnected'}
            </div>
            <p className="text-xs text-muted-foreground">
              Real-time communication
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Connected Users</p>
                <p className="text-2xl font-bold dark:text-white">{connectedUsersCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Bell className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Unread Notifications</p>
                <p className="text-2xl font-bold dark:text-white">{unreadNotificationsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Sync Events</p>
                <p className="text-2xl font-bold dark:text-white">{syncEvents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Server className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">System Status</p>
                <Badge className={getStatusColor(
                  systemStatus.api === 'healthy' && 
                  systemStatus.database === 'connected' && 
                  systemStatus.websocket === 'connected' ? 'healthy' : 'unhealthy'
                )}>
                  {systemStatus.api === 'healthy' && 
                   systemStatus.database === 'connected' && 
                   systemStatus.websocket === 'connected' ? 'All Systems Operational' : 'Issues Detected'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Dashboard */}
      <SyncDashboard />
    </div>
  )
}
