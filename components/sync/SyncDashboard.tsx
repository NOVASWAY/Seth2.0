"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useSync } from "@/hooks/useSync"
import { useAuthStore } from "@/stores/authStore"
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
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-white">
            {isConnected ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-600" />
            )}
            System Synchronization Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {connectedUsersCount}
              </div>
              <div className="text-sm text-muted-foreground">Connected Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.activeUsers}
              </div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {syncEvents.length}
              </div>
              <div className="text-sm text-muted-foreground">Recent Sync Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {unreadNotificationsCount}
              </div>
              <div className="text-sm text-muted-foreground">Unread Notifications</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connected Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between dark:text-white">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Connected Users ({connectedUsers.length})
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
            >
              {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {connectedUsers.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No users currently connected
            </div>
          ) : (
            <div className="space-y-2">
              {connectedUsers.slice(0, showDetails ? connectedUsers.length : 5).map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <User className="h-8 w-8 text-muted-foreground" />
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                        user.status === 'online' ? 'bg-green-500' :
                        user.status === 'away' ? 'bg-yellow-500' :
                        user.status === 'busy' ? 'bg-red-500' : 'bg-gray-500'
                      }`} />
                    </div>
                    <div>
                      <div className="font-medium dark:text-white">{user.username}</div>
                      <div className="text-sm text-muted-foreground">{user.role}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(user.status)}>
                      {user.status}
                    </Badge>
                    {user.current_activity && (
                      <div className="text-sm text-muted-foreground">
                        {user.current_activity}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {!showDetails && connectedUsers.length > 5 && (
                <div className="text-center text-sm text-muted-foreground">
                  +{connectedUsers.length - 5} more users
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Sync Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-white">
            <Activity className="h-5 w-5" />
            Recent Sync Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {syncEvents.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No recent sync events
            </div>
          ) : (
            <div className="space-y-2">
              {syncEvents.slice(0, 10).map((event, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-800/50"
                >
                  {getActionIcon(event.action)}
                  <div className="flex-1">
                    <div className="font-medium dark:text-white">
                      {event.username} {event.action} {event.entityType}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant="outline" className="dark:border-gray-600 dark:text-white">
                    {event.entityType}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-white">
            <Bell className="h-5 w-5" />
            Recent Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No recent notifications
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start gap-3 p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-800/50"
                >
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium dark:text-white">{notification.title}</div>
                    <div className="text-sm text-muted-foreground">{notification.message}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getPriorityColor(notification.priority)}>
                        {notification.priority}
                      </Badge>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
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
