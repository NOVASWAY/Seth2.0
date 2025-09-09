"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuthStore } from "@/lib/auth"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              System Synchronization
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 font-medium">
              Monitor real-time system coordination and user activity
            </p>
          </div>
        <Button
          onClick={checkSystemStatus}
          disabled={isChecking}
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-5 w-5 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Checking...' : 'Refresh Status'}
        </Button>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">API Server</CardTitle>
            {getStatusIcon(systemStatus.api)}
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2">
              {systemStatus.api === 'healthy' ? 'Online' : 'Offline'}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
              Last checked: {new Date(systemStatus.lastCheck).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">Database</CardTitle>
            {getStatusIcon(systemStatus.database)}
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2">
              {systemStatus.database === 'connected' ? 'Connected' : 'Disconnected'}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
              PostgreSQL connection status
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">WebSocket</CardTitle>
            {getStatusIcon(systemStatus.websocket)}
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2">
              {systemStatus.websocket === 'connected' ? 'Connected' : 'Disconnected'}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
              Real-time communication
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors duration-200">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Connected Users</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">{connectedUsersCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors duration-200">
                <Bell className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Unread Notifications</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">{unreadNotificationsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors duration-200">
                <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Sync Events</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">{syncEvents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors duration-200">
                <Server className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">System Status</p>
                <Badge className={`${getStatusColor(
                  systemStatus.api === 'healthy' && 
                  systemStatus.database === 'connected' && 
                  systemStatus.websocket === 'connected' ? 'healthy' : 'unhealthy'
                )} font-semibold px-3 py-1`}>
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
      <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-6">
        <SyncDashboard />
      </div>
      </div>
    </div>
  )
}
