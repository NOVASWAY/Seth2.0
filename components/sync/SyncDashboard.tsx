"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useSync } from "@/hooks/useSync"
import { useAuthStore } from "@/lib/auth"
import { 
  Users, 
  Bell, 
  Activity, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Eye,
  EyeOff,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react"

interface SyncStats {
  connectedUsers: number
  activeUsers: number
  recentSyncEvents: number
  pendingNotifications: number
}

export default function SyncDashboard() {
  const [stats, setStats] = useState<SyncStats>({
    connectedUsers: 0,
    activeUsers: 0,
    recentSyncEvents: 0,
    pendingNotifications: 0
  })
  const [showDetails, setShowDetails] = useState(false)
  const { accessToken } = useAuthStore()
  
  const {
    isConnected,
    connectedUsers,
    notifications,
    syncEvents,
    connectedUsersCount,
    unreadNotificationsCount
  } = useSync()

  useEffect(() => {
    if (accessToken) {
      fetchSyncStats()
    }
  }, [accessToken])

  const fetchSyncStats = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/sync/stats`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setStats(result.data)
      }
    } catch (error) {
      console.error("Error fetching sync stats:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'away': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'busy': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'offline': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'update': return <RefreshCw className="h-4 w-4 text-blue-600" />
      case 'delete': return <XCircle className="h-4 w-4 text-red-600" />
      default: return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-8">
      {/* Connection Status */}
      <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800 dark:text-slate-100">
            <div className={`p-2 rounded-full ${isConnected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              {isConnected ? (
                <Wifi className="h-6 w-6 text-green-600 dark:text-green-400" />
              ) : (
                <WifiOff className="h-6 w-6 text-red-600 dark:text-red-400" />
              )}
            </div>
            System Synchronization Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                {connectedUsersCount}
              </div>
              <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">Connected Users</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {stats.activeUsers}
              </div>
              <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">Active Users</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                {syncEvents.length}
              </div>
              <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">Recent Sync Events</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                {unreadNotificationsCount}
              </div>
              <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">Unread Notifications</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connected Users */}
      <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-xl font-bold text-slate-800 dark:text-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              Connected Users ({connectedUsers.length})
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold px-4 py-2"
            >
              {showDetails ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {connectedUsers.length === 0 ? (
            <div className="text-center py-8">
              <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-700 w-fit mx-auto mb-4">
                <Users className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No users currently connected</p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">Users will appear here when they connect to the system</p>
            </div>
          ) : (
            <div className="space-y-3">
              {connectedUsers.slice(0, showDetails ? connectedUsers.length : 5).map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 hover:bg-slate-100/50 dark:hover:bg-slate-700/70 transition-colors duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="p-2 rounded-full bg-slate-200 dark:bg-slate-600">
                        <User className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${
                        user.status === 'online' ? 'bg-green-500' :
                        user.status === 'away' ? 'bg-yellow-500' :
                        user.status === 'busy' ? 'bg-red-500' : 'bg-gray-500'
                      }`} />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-100 text-lg">{user.username}</div>
                      <div className="text-sm font-medium text-slate-600 dark:text-slate-400">{user.role}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={`${getStatusColor(user.status)} font-semibold px-3 py-1`}>
                      {user.status}
                    </Badge>
                    {user.current_activity && (
                      <div className="text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-600 px-3 py-1 rounded-full">
                        {user.current_activity}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {!showDetails && connectedUsers.length > 5 && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-full">
                    <Users className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                      +{connectedUsers.length - 5} more users
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Sync Events */}
      <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800 dark:text-slate-100">
            <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
              <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            Recent Sync Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {syncEvents.length === 0 ? (
            <div className="text-center py-8">
              <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-700 w-fit mx-auto mb-4">
                <Activity className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No recent sync events</p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">System events will appear here as they occur</p>
            </div>
          ) : (
            <div className="space-y-3">
              {syncEvents.slice(0, 10).map((event, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 hover:bg-slate-100/50 dark:hover:bg-slate-700/70 transition-colors duration-200"
                >
                  <div className="p-2 rounded-full bg-slate-200 dark:bg-slate-600">
                    {getActionIcon(event.action)}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800 dark:text-slate-100 text-lg">
                      {event.username} {event.action} {event.entityType}
                    </div>
                    <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant="outline" className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold px-3 py-1">
                    {event.entityType}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800 dark:text-slate-100">
            <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
              <Bell className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            Recent Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-700 w-fit mx-auto mb-4">
                <Bell className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No recent notifications</p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">System notifications will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start gap-4 p-4 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 hover:bg-slate-100/50 dark:hover:bg-slate-700/70 transition-colors duration-200"
                >
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 mt-1">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800 dark:text-slate-100 text-lg mb-1">{notification.title}</div>
                    <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">{notification.message}</div>
                    <div className="flex items-center gap-3">
                      <Badge className={`${getPriorityColor(notification.priority)} font-semibold px-3 py-1`}>
                        {notification.priority}
                      </Badge>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-500 flex items-center gap-1 bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded-full">
                        <Clock className="h-3 w-3" />
                        {new Date(notification.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
