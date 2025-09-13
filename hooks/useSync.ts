"use client"

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import { io, Socket } from 'socket.io-client'

interface SyncEvent {
  type: string
  entityId: string
  entityType: string
  action: 'create' | 'update' | 'delete'
  data: any
  userId: string
  username: string
  timestamp: string
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  data?: any
  priority: 'low' | 'medium' | 'high' | 'urgent'
  timestamp: string
  isRead?: boolean
}

interface UserPresence {
  userId: string
  username: string
  role: string
  status: 'online' | 'away' | 'busy' | 'offline'
  current_page?: string
  current_activity?: string
  is_typing?: boolean
  typing_entity_id?: string
  typing_entity_type?: string
  last_seen: string
}

interface TypingUser {
  userId: string
  username: string
  entityId: string
  entityType: string
  isTyping: boolean
}

export const useSync = () => {
  const [socket, setSocket] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState<UserPresence[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([])
  
  const { accessToken, user } = useAuthStore()
  const { toast } = useToast()

  // Initialize WebSocket connection
  useEffect(() => {
    if (!accessToken || !user) return

    const initializeSocket = () => {
      try {
        const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
          auth: {
            token: accessToken
          },
          transports: ['websocket', 'polling']
        })

        // Connection events
        newSocket.on('connect', () => {
          console.log('Connected to sync service')
          setIsConnected(true)
        })

        newSocket.on('disconnect', () => {
          console.log('Disconnected from sync service')
          setIsConnected(false)
        })

        newSocket.on('connected', (data) => {
          console.log('Sync service connected:', data)
          setConnectedUsers(prev => [...prev, {
            userId: data.userId,
            username: data.username,
            role: data.role,
            status: 'online',
            last_seen: new Date().toISOString()
          }])
        })

        // Sync events
        newSocket.on('sync_event', (event: SyncEvent) => {
          console.log('Sync event received:', event)
          setSyncEvents(prev => [event, ...prev.slice(0, 49)]) // Keep last 50 events
          
          // Show toast for important events
          if (event.action === 'create' || event.action === 'update') {
            toast({
              title: `${event.entityType} ${event.action === 'create' ? 'Created' : 'Updated'}`,
              description: `${event.username} ${event.action === 'create' ? 'created' : 'updated'} a ${event.entityType}`,
            })
          }
        })

        // Notifications
        newSocket.on('notification', (notification: Notification) => {
          console.log('Notification received:', notification)
          setNotifications(prev => [notification, ...prev.slice(0, 49)]) // Keep last 50 notifications
          
          // Show toast notification
          toast({
            title: notification.title,
            description: notification.message,
            variant: notification.priority === 'urgent' ? 'destructive' : 'default'
          })
        })

        // User presence updates
        newSocket.on('presence_update', (presence: UserPresence) => {
          setConnectedUsers(prev => {
            const existingIndex = prev.findIndex(u => u.userId === presence.userId)
            if (existingIndex >= 0) {
              const updated = [...prev]
              updated[existingIndex] = { ...updated[existingIndex], ...presence }
              return updated
            } else {
              return [...prev, presence]
            }
          })
        })

        newSocket.on('user_offline', (data: { userId: string, username: string, role: string }) => {
          setConnectedUsers(prev => prev.filter(u => u.userId !== data.userId))
        })

        newSocket.on('user_disconnected', (data: { userId: string, username: string }) => {
          setConnectedUsers(prev => prev.filter(u => u.userId !== data.userId))
        })

        // Typing indicators
        newSocket.on('user_typing', (data: TypingUser) => {
          setTypingUsers(prev => {
            const existingIndex = prev.findIndex(t => t.userId === data.userId && t.entityId === data.entityId)
            if (data.isTyping) {
              if (existingIndex >= 0) {
                const updated = [...prev]
                updated[existingIndex] = data
                return updated
              } else {
                return [...prev, data]
              }
            } else {
              return prev.filter(t => !(t.userId === data.userId && t.entityId === data.entityId))
            }
          })
        })

        // Entity editing indicators
        newSocket.on('entity_edit_start', (data: { userId: string, username: string, entityId: string, entityType: string }) => {
          console.log(`${data.username} started editing ${data.entityType} ${data.entityId}`)
        })

        newSocket.on('entity_edit_stop', (data: { userId: string, username: string, entityId: string, entityType: string }) => {
          console.log(`${data.username} stopped editing ${data.entityType} ${data.entityId}`)
        })

        setSocket(newSocket)
      } catch (error) {
        console.error('Failed to initialize socket:', error)
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to sync service',
          variant: 'destructive'
        })
      }
    }

    initializeSocket()

    return () => {
      if (socket) {
        socket.disconnect()
        setSocket(null)
        setIsConnected(false)
      }
    }
  }, [accessToken, user])

  // Update user presence
  const updatePresence = useCallback((presence: {
    status?: 'online' | 'away' | 'busy' | 'offline'
    current_page?: string
    current_activity?: string
    is_typing?: boolean
    typing_entity_id?: string
    typing_entity_type?: string
  }) => {
    if (socket && isConnected) {
      socket.emit('user_activity', {
        activity: presence.current_activity,
        page: presence.current_page,
        ...presence
      })
    }
  }, [socket, isConnected])

  // Start typing indicator
  const startTyping = useCallback((entityId: string, entityType: string) => {
    if (socket && isConnected) {
      socket.emit('typing_start', {
        room: `entity:${entityType}:${entityId}`,
        entityId,
        entityType
      })
    }
  }, [socket, isConnected])

  // Stop typing indicator
  const stopTyping = useCallback((entityId: string, entityType: string) => {
    if (socket && isConnected) {
      socket.emit('typing_stop', {
        room: `entity:${entityType}:${entityId}`,
        entityId,
        entityType
      })
    }
  }, [socket, isConnected])

  // Start entity editing
  const startEditing = useCallback((entityId: string, entityType: string) => {
    if (socket && isConnected) {
      socket.emit('entity_edit_start', {
        entityId,
        entityType
      })
    }
  }, [socket, isConnected])

  // Stop entity editing
  const stopEditing = useCallback((entityId: string, entityType: string) => {
    if (socket && isConnected) {
      socket.emit('entity_edit_stop', {
        entityId,
        entityType
      })
    }
  }, [socket, isConnected])

  // Get typing users for specific entity
  const getTypingUsers = useCallback((entityId: string, entityType: string) => {
    return typingUsers.filter(t => t.entityId === entityId && t.entityType === entityType)
  }, [typingUsers])

  // Get online users by role
  const getOnlineUsersByRole = useCallback((role: string) => {
    return connectedUsers.filter(u => u.role === role && u.status === 'online')
  }, [connectedUsers])

  // Get online users by activity
  const getOnlineUsersByActivity = useCallback((activity: string) => {
    return connectedUsers.filter(u => u.current_activity === activity && u.status === 'online')
  }, [connectedUsers])

  return {
    // Connection status
    isConnected,
    socket,
    
    // Data
    connectedUsers,
    notifications,
    typingUsers,
    syncEvents,
    
    // Actions
    updatePresence,
    startTyping,
    stopTyping,
    startEditing,
    stopEditing,
    
    // Utilities
    getTypingUsers,
    getOnlineUsersByRole,
    getOnlineUsersByActivity,
    
    // Stats
    connectedUsersCount: connectedUsers.length,
    unreadNotificationsCount: notifications.filter(n => !n.isRead).length
  }
}
