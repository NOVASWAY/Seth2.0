import { Server as SocketIOServer, Socket } from 'socket.io'
import { Server as HTTPServer } from 'http'
import jwt from 'jsonwebtoken'
import { EventLoggerService } from './EventLoggerService'

interface AuthenticatedSocket extends Socket {
  userId?: string
  username?: string
  role?: string
}

interface Socket extends any {
  userId?: string
  username?: string
  role?: string
}

interface NotificationData {
  type: 'patient_assignment' | 'prescription_update' | 'lab_result' | 'payment_received' | 'visit_update' | 'system_alert'
  title: string
  message: string
  data?: any
  priority: 'low' | 'medium' | 'high' | 'urgent'
  targetUsers?: string[]
  targetRoles?: string[]
}

interface SyncEvent {
  type: 'patient_update' | 'prescription_update' | 'lab_update' | 'visit_update' | 'assignment_update'
  entityId: string
  entityType: string
  action: 'create' | 'update' | 'delete'
  data: any
  userId: string
  timestamp: Date
}

export class WebSocketService {
  private io: SocketIOServer
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map()
  private userRooms: Map<string, Set<string>> = new Map()

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    })

    this.setupMiddleware()
    this.setupEventHandlers()
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
        
        if (!token) {
          return next(new Error('Authentication token required'))
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
        socket.userId = decoded.userId
        socket.username = decoded.username
        socket.role = decoded.role

        next()
      } catch (error) {
        next(new Error('Invalid authentication token'))
      }
    })
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.username} (${socket.userId}) connected`)
      
      // Store connected user
      if (socket.userId) {
        this.connectedUsers.set(socket.userId, socket)
        this.userRooms.set(socket.userId, new Set())
      }

      // Join user to their personal room
      if (socket.userId) {
        socket.join(`user:${socket.userId}`)
        this.userRooms.get(socket.userId)?.add(`user:${socket.userId}`)
      }

      // Join user to role-based rooms
      if (socket.role) {
        socket.join(`role:${socket.role}`)
        this.userRooms.get(socket.userId!)?.add(`role:${socket.role}`)
      }

      // Join user to general room
      socket.join('general')
      this.userRooms.get(socket.userId!)?.add('general')

      // Handle user activity
      socket.on('user_activity', (data) => {
        this.handleUserActivity(socket, data)
      })

      // Handle typing indicators
      socket.on('typing_start', (data) => {
        this.handleTypingStart(socket, data)
      })

      socket.on('typing_stop', (data) => {
        this.handleTypingStop(socket, data)
      })

      // Handle real-time collaboration
      socket.on('entity_edit_start', (data) => {
        this.handleEntityEditStart(socket, data)
      })

      socket.on('entity_edit_stop', (data) => {
        this.handleEntityEditStop(socket, data)
      })

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket)
      })

      // Send connection confirmation
      socket.emit('connected', {
        message: 'Successfully connected to real-time sync',
        userId: socket.userId,
        username: socket.username,
        role: socket.role,
        connectedUsers: this.getConnectedUsersCount()
      })
    })
  }

  private handleUserActivity(socket: AuthenticatedSocket, data: any) {
    // Broadcast user activity to relevant rooms
    socket.to(`role:${socket.role}`).emit('user_activity', {
      userId: socket.userId,
      username: socket.username,
      activity: data.activity,
      page: data.page,
      timestamp: new Date()
    })

    // Log activity for audit
    EventLoggerService.logEvent({
      event_type: 'USER',
      user_id: socket.userId!,
      username: socket.username!,
      target_type: 'activity',
      target_id: data.page,
      action: 'user_activity',
      details: data,
      severity: 'LOW'
    })
  }

  private handleTypingStart(socket: AuthenticatedSocket, data: any) {
    socket.to(data.room).emit('user_typing', {
      userId: socket.userId,
      username: socket.username,
      entityId: data.entityId,
      entityType: data.entityType,
      isTyping: true
    })
  }

  private handleTypingStop(socket: AuthenticatedSocket, data: any) {
    socket.to(data.room).emit('user_typing', {
      userId: socket.userId,
      username: socket.username,
      entityId: data.entityId,
      entityType: data.entityType,
      isTyping: false
    })
  }

  private handleEntityEditStart(socket: AuthenticatedSocket, data: any) {
    // Notify other users that someone is editing this entity
    socket.to(`entity:${data.entityType}:${data.entityId}`).emit('entity_edit_start', {
      userId: socket.userId,
      username: socket.username,
      entityId: data.entityId,
      entityType: data.entityType,
      timestamp: new Date()
    })

    // Join the entity-specific room
    socket.join(`entity:${data.entityType}:${data.entityId}`)
    this.userRooms.get(socket.userId!)?.add(`entity:${data.entityType}:${data.entityId}`)
  }

  private handleEntityEditStop(socket: AuthenticatedSocket, data: any) {
    // Notify other users that editing has stopped
    socket.to(`entity:${data.entityType}:${data.entityId}`).emit('entity_edit_stop', {
      userId: socket.userId,
      username: socket.username,
      entityId: data.entityId,
      entityType: data.entityType,
      timestamp: new Date()
    })

    // Leave the entity-specific room
    socket.leave(`entity:${data.entityType}:${data.entityId}`)
    this.userRooms.get(socket.userId!)?.delete(`entity:${data.entityType}:${data.entityId}`)
  }

  private handleDisconnect(socket: AuthenticatedSocket) {
    console.log(`User ${socket.username} (${socket.userId}) disconnected`)
    
    if (socket.userId) {
      this.connectedUsers.delete(socket.userId)
      this.userRooms.delete(socket.userId)
    }

    // Notify other users about disconnection
    socket.broadcast.emit('user_disconnected', {
      userId: socket.userId,
      username: socket.username,
      timestamp: new Date()
    })
  }

  // Public methods for broadcasting events
  public broadcastNotification(notification: NotificationData) {
    const notificationData = {
      ...notification,
      id: this.generateNotificationId(),
      timestamp: new Date()
    }

    if (notification.targetUsers && notification.targetUsers.length > 0) {
      // Send to specific users
      notification.targetUsers.forEach(userId => {
        this.io.to(`user:${userId}`).emit('notification', notificationData)
      })
    } else if (notification.targetRoles && notification.targetRoles.length > 0) {
      // Send to specific roles
      notification.targetRoles.forEach(role => {
        this.io.to(`role:${role}`).emit('notification', notificationData)
      })
    } else {
      // Broadcast to all connected users
      this.io.emit('notification', notificationData)
    }

    // Log notification
    EventLoggerService.logEvent({
      event_type: 'SYSTEM',
      user_id: 'system',
      username: 'system',
      target_type: 'notification',
      target_id: notificationData.id,
      action: 'notification_sent',
      details: notification,
      severity: notification.priority.toUpperCase() as any
    })
  }

  public broadcastSyncEvent(event: SyncEvent) {
    const syncData = {
      ...event,
      id: this.generateSyncEventId(),
      timestamp: new Date()
    }

    // Broadcast to all connected users
    this.io.emit('sync_event', syncData)

    // Log sync event
    EventLoggerService.logEvent({
      event_type: 'SYSTEM',
      user_id: event.userId,
      username: 'system',
      target_type: event.entityType,
      target_id: event.entityId,
      action: `sync_${event.action}`,
      details: event,
      severity: 'MEDIUM'
    })
  }

  public notifyUser(userId: string, notification: Omit<NotificationData, 'targetUsers' | 'targetRoles'>) {
    this.broadcastNotification({
      ...notification,
      targetUsers: [userId]
    })
  }

  public notifyRole(role: string, notification: Omit<NotificationData, 'targetUsers' | 'targetRoles'>) {
    this.broadcastNotification({
      ...notification,
      targetRoles: [role]
    })
  }

  public getConnectedUsers(): Array<{userId: string, username: string, role: string, connectedAt: Date}> {
    const users: Array<{userId: string, username: string, role: string, connectedAt: Date}> = []
    
    this.connectedUsers.forEach((socket, userId) => {
      users.push({
        userId,
        username: socket.username || 'Unknown',
        role: socket.role || 'Unknown',
        connectedAt: new Date() // In a real implementation, you'd track this
      })
    })

    return users
  }

  public getConnectedUsersCount(): number {
    return this.connectedUsers.size
  }

  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId)
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateSyncEventId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Method to get the Socket.IO instance for use in other parts of the application
  public getIO(): SocketIOServer {
    return this.io
  }
}

// Singleton instance
let webSocketService: WebSocketService | null = null

export const initializeWebSocket = (server: HTTPServer): WebSocketService => {
  if (!webSocketService) {
    webSocketService = new WebSocketService(server)
  }
  return webSocketService
}

export const getWebSocketService = (): WebSocketService | null => {
  return webSocketService
}
