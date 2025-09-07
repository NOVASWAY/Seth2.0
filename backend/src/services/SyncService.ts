import { getWebSocketService } from './WebSocketService'
import { NotificationModel } from '../models/Notification'
import { UserPresenceModel } from '../models/UserPresence'
import { EventLoggerService } from './EventLoggerService'

interface SyncEvent {
  type: 'patient_update' | 'prescription_update' | 'lab_update' | 'visit_update' | 'assignment_update' | 'user_update'
  entityId: string
  entityType: string
  action: 'create' | 'update' | 'delete'
  data: any
  userId: string
  username: string
  timestamp: Date
}

interface NotificationTarget {
  users?: string[]
  roles?: string[]
  excludeUsers?: string[]
}

export class SyncService {
  private static instance: SyncService

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService()
    }
    return SyncService.instance
  }

  // Broadcast sync event to all connected users
  public async broadcastSyncEvent(event: SyncEvent): Promise<void> {
    const wsService = getWebSocketService()
    if (wsService) {
      wsService.broadcastSyncEvent(event)
    }

    // Log the sync event
    await EventLoggerService.logEvent({
      event_type: 'SYSTEM',
      user_id: event.userId,
      username: event.username,
      target_type: event.entityType,
      target_id: event.entityId,
      action: `sync_${event.action}`,
      details: event,
      severity: 'MEDIUM'
    })
  }

  // Send notification to specific users or roles
  public async sendNotification(
    notification: {
      type: 'patient_assignment' | 'prescription_update' | 'lab_result' | 'payment_received' | 'visit_update' | 'system_alert' | 'sync_event'
      title: string
      message: string
      data?: any
      priority?: 'low' | 'medium' | 'high' | 'urgent'
    },
    target: NotificationTarget
  ): Promise<void> {
    const wsService = getWebSocketService()

    // Create notifications in database
    if (target.users && target.users.length > 0) {
      for (const userId of target.users) {
        if (target.excludeUsers && target.excludeUsers.includes(userId)) {
          continue
        }

        await NotificationModel.create({
          user_id: userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          priority: notification.priority || 'medium'
        })

        // Send real-time notification
        if (wsService) {
          wsService.notifyUser(userId, notification)
        }
      }
    }

    // Send to roles
    if (target.roles && target.roles.length > 0) {
      for (const role of target.roles) {
        if (wsService) {
          wsService.notifyRole(role, notification)
        }
      }
    }
  }

  // Update user presence
  public async updateUserPresence(
    userId: string,
    presence: {
      status?: 'online' | 'away' | 'busy' | 'offline'
      current_page?: string
      current_activity?: string
      is_typing?: boolean
      typing_entity_id?: string
      typing_entity_type?: string
    }
  ): Promise<void> {
    await UserPresenceModel.createOrUpdate(userId, presence)

    const wsService = getWebSocketService()
    if (wsService) {
      wsService.getIO().emit('presence_update', {
        userId,
        ...presence,
        timestamp: new Date()
      })
    }
  }

  // Handle patient assignment sync
  public async syncPatientAssignment(
    assignment: any,
    action: 'create' | 'update' | 'delete',
    userId: string,
    username: string
  ): Promise<void> {
    // Broadcast sync event
    await this.broadcastSyncEvent({
      type: 'assignment_update',
      entityId: assignment.id,
      entityType: 'patient_assignment',
      action,
      data: assignment,
      userId,
      username,
      timestamp: new Date()
    })

    // Send notification to assigned user
    if (action === 'create' && assignment.assigned_to_user_id !== userId) {
      await this.sendNotification(
        {
          type: 'patient_assignment',
          title: 'New Patient Assignment',
          message: `You have been assigned to patient: ${assignment.patient_name || 'Unknown'}`,
          data: assignment,
          priority: assignment.priority === 'URGENT' ? 'urgent' : 'medium'
        },
        { users: [assignment.assigned_to_user_id] }
      )
    }
  }

  // Handle prescription sync
  public async syncPrescription(
    prescription: any,
    action: 'create' | 'update' | 'delete',
    userId: string,
    username: string
  ): Promise<void> {
    // Broadcast sync event
    await this.broadcastSyncEvent({
      type: 'prescription_update',
      entityId: prescription.id,
      entityType: 'prescription',
      action,
      data: prescription,
      userId,
      username,
      timestamp: new Date()
    })

    // Notify relevant users based on prescription status
    if (action === 'create' || action === 'update') {
      const targetRoles = ['PHARMACIST', 'CLINICAL_OFFICER']
      if (prescription.status === 'READY_FOR_DISPENSING') {
        targetRoles.push('PHARMACIST')
      }

      await this.sendNotification(
        {
          type: 'prescription_update',
          title: `Prescription ${action === 'create' ? 'Created' : 'Updated'}`,
          message: `Prescription for patient ${prescription.patient_name || 'Unknown'} has been ${action === 'create' ? 'created' : 'updated'}`,
          data: prescription,
          priority: 'medium'
        },
        { roles: targetRoles }
      )
    }
  }

  // Handle lab result sync
  public async syncLabResult(
    labResult: any,
    action: 'create' | 'update' | 'delete',
    userId: string,
    username: string
  ): Promise<void> {
    // Broadcast sync event
    await this.broadcastSyncEvent({
      type: 'lab_update',
      entityId: labResult.id,
      entityType: 'lab_result',
      action,
      data: labResult,
      userId,
      username,
      timestamp: new Date()
    })

    // Notify relevant users
    if (action === 'create' || action === 'update') {
      await this.sendNotification(
        {
          type: 'lab_result',
          title: `Lab Result ${action === 'create' ? 'Available' : 'Updated'}`,
          message: `Lab results for patient ${labResult.patient_name || 'Unknown'} are ${action === 'create' ? 'available' : 'updated'}`,
          data: labResult,
          priority: labResult.urgency === 'URGENT' ? 'urgent' : 'medium'
        },
        { roles: ['CLINICAL_OFFICER', 'NURSE'] }
      )
    }
  }

  // Handle visit sync
  public async syncVisit(
    visit: any,
    action: 'create' | 'update' | 'delete',
    userId: string,
    username: string
  ): Promise<void> {
    // Broadcast sync event
    await this.broadcastSyncEvent({
      type: 'visit_update',
      entityId: visit.id,
      entityType: 'visit',
      action,
      data: visit,
      userId,
      username,
      timestamp: new Date()
    })

    // Notify relevant users
    if (action === 'create' || action === 'update') {
      await this.sendNotification(
        {
          type: 'visit_update',
          title: `Visit ${action === 'create' ? 'Scheduled' : 'Updated'}`,
          message: `Visit for patient ${visit.patient_name || 'Unknown'} has been ${action === 'create' ? 'scheduled' : 'updated'}`,
          data: visit,
          priority: 'medium'
        },
        { roles: ['CLINICAL_OFFICER', 'NURSE', 'RECEPTIONIST'] }
      )
    }
  }

  // Handle payment sync
  public async syncPayment(
    payment: any,
    action: 'create' | 'update' | 'delete',
    userId: string,
    username: string
  ): Promise<void> {
    // Broadcast sync event
    await this.broadcastSyncEvent({
      type: 'payment_update',
      entityId: payment.id,
      entityType: 'payment',
      action,
      data: payment,
      userId,
      username,
      timestamp: new Date()
    })

    // Notify relevant users
    if (action === 'create') {
      await this.sendNotification(
        {
          type: 'payment_received',
          title: 'Payment Received',
          message: `Payment of ${payment.amount} has been received for invoice ${payment.invoice_number || 'Unknown'}`,
          data: payment,
          priority: 'medium'
        },
        { roles: ['ADMIN', 'CASHIER', 'CLAIMS_MANAGER'] }
      )
    }
  }

  // Handle user update sync
  public async syncUserUpdate(
    user: any,
    action: 'create' | 'update' | 'delete',
    userId: string,
    username: string
  ): Promise<void> {
    // Broadcast sync event
    await this.broadcastSyncEvent({
      type: 'user_update',
      entityId: user.id,
      entityType: 'user',
      action,
      data: user,
      userId,
      username,
      timestamp: new Date()
    })

    // Notify admins about user changes
    if (action === 'create' || action === 'update') {
      await this.sendNotification(
        {
          type: 'system_alert',
          title: `User ${action === 'create' ? 'Created' : 'Updated'}`,
          message: `User ${user.username} has been ${action === 'create' ? 'created' : 'updated'}`,
          data: user,
          priority: 'low'
        },
        { roles: ['ADMIN'] }
      )
    }
  }

  // Get system sync status
  public async getSyncStatus(): Promise<{
    connectedUsers: number
    activeUsers: number
    recentSyncEvents: number
    pendingNotifications: number
  }> {
    const wsService = getWebSocketService()
    const connectedUsers = wsService ? wsService.getConnectedUsersCount() : 0

    const onlineUsers = await UserPresenceModel.getOnlineUsers()
    const activeUsers = onlineUsers.length

    // Get recent sync events count (last 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    // This would require a query to event_logs table for sync events
    const recentSyncEvents = 0 // Placeholder

    // Get pending notifications count
    const pendingNotifications = 0 // Placeholder - would require aggregation query

    return {
      connectedUsers,
      activeUsers,
      recentSyncEvents,
      pendingNotifications
    }
  }

  // Cleanup old sync data
  public async cleanupOldData(): Promise<{
    notificationsDeleted: number
    presenceRecordsCleaned: number
  }> {
    const notificationsDeleted = await NotificationModel.deleteOldNotifications(30)
    const presenceRecordsCleaned = await UserPresenceModel.cleanupOldPresence(30)

    return {
      notificationsDeleted,
      presenceRecordsCleaned
    }
  }
}

// Export singleton instance
export const syncService = SyncService.getInstance()
