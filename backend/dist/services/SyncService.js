"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncService = exports.SyncService = void 0;
const WebSocketService_1 = require("./WebSocketService");
const Notification_1 = require("../models/Notification");
const UserPresence_1 = require("../models/UserPresence");
const EventLoggerService_1 = require("./EventLoggerService");
class SyncService {
    static getInstance() {
        if (!SyncService.instance) {
            SyncService.instance = new SyncService();
        }
        return SyncService.instance;
    }
    // Broadcast sync event to all connected users
    async broadcastSyncEvent(event) {
        const wsService = (0, WebSocketService_1.getWebSocketService)();
        if (wsService) {
            wsService.broadcastSyncEvent(event);
        }
        // Log the sync event
        await EventLoggerService_1.EventLoggerService.logEvent({
            event_type: 'SYSTEM',
            user_id: event.userId,
            username: event.username,
            target_type: event.entityType,
            target_id: event.entityId,
            action: `sync_${event.action}`,
            details: event,
            severity: 'MEDIUM'
        });
    }
    // Send notification to specific users or roles
    async sendNotification(notification, target) {
        const wsService = (0, WebSocketService_1.getWebSocketService)();
        // Create notifications in database
        if (target.users && target.users.length > 0) {
            for (const userId of target.users) {
                if (target.excludeUsers && target.excludeUsers.includes(userId)) {
                    continue;
                }
                await Notification_1.NotificationModel.create({
                    user_id: userId,
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    data: notification.data,
                    priority: notification.priority
                });
                // Send real-time notification
                if (wsService) {
                    wsService.notifyUser(userId, notification);
                }
            }
        }
        // Send to roles
        if (target.roles && target.roles.length > 0) {
            for (const role of target.roles) {
                if (wsService) {
                    wsService.notifyRole(role, notification);
                }
            }
        }
    }
    // Update user presence
    async updateUserPresence(userId, presence) {
        await UserPresence_1.UserPresenceModel.createOrUpdate(userId, presence);
        const wsService = (0, WebSocketService_1.getWebSocketService)();
        if (wsService) {
            wsService.getIO().emit('presence_update', {
                userId,
                ...presence,
                timestamp: new Date()
            });
        }
    }
    // Handle patient assignment sync
    async syncPatientAssignment(assignment, action, userId, username) {
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
        });
        // Send notification to assigned user
        if (action === 'create' && assignment.assigned_to_user_id !== userId) {
            await this.sendNotification({
                type: 'patient_assignment',
                title: 'New Patient Assignment',
                message: `You have been assigned to patient: ${assignment.patient_name || 'Unknown'}`,
                data: assignment,
                priority: assignment.priority === 'URGENT' ? 'urgent' : 'medium'
            }, { users: [assignment.assigned_to_user_id] });
        }
    }
    // Handle prescription sync
    async syncPrescription(prescription, action, userId, username) {
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
        });
        // Notify relevant users based on prescription status
        if (action === 'create' || action === 'update') {
            const targetRoles = ['PHARMACIST', 'CLINICAL_OFFICER'];
            if (prescription.status === 'READY_FOR_DISPENSING') {
                targetRoles.push('PHARMACIST');
            }
            await this.sendNotification({
                type: 'prescription_update',
                title: `Prescription ${action === 'create' ? 'Created' : 'Updated'}`,
                message: `Prescription for patient ${prescription.patient_name || 'Unknown'} has been ${action === 'create' ? 'created' : 'updated'}`,
                data: prescription,
                priority: 'medium'
            }, { roles: targetRoles });
        }
    }
    // Handle lab result sync
    async syncLabResult(labResult, action, userId, username) {
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
        });
        // Notify relevant users
        if (action === 'create' || action === 'update') {
            await this.sendNotification({
                type: 'lab_result',
                title: `Lab Result ${action === 'create' ? 'Available' : 'Updated'}`,
                message: `Lab results for patient ${labResult.patient_name || 'Unknown'} are ${action === 'create' ? 'available' : 'updated'}`,
                data: labResult,
                priority: labResult.urgency === 'URGENT' ? 'urgent' : 'medium'
            }, { roles: ['CLINICAL_OFFICER', 'NURSE'] });
        }
    }
    // Handle visit sync
    async syncVisit(visit, action, userId, username) {
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
        });
        // Notify relevant users
        if (action === 'create' || action === 'update') {
            await this.sendNotification({
                type: 'visit_update',
                title: `Visit ${action === 'create' ? 'Scheduled' : 'Updated'}`,
                message: `Visit for patient ${visit.patient_name || 'Unknown'} has been ${action === 'create' ? 'scheduled' : 'updated'}`,
                data: visit,
                priority: 'medium'
            }, { roles: ['CLINICAL_OFFICER', 'NURSE', 'RECEPTIONIST'] });
        }
    }
    // Handle payment sync
    async syncPayment(payment, action, userId, username) {
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
        });
        // Notify relevant users
        if (action === 'create') {
            await this.sendNotification({
                type: 'payment_received',
                title: 'Payment Received',
                message: `Payment of ${payment.amount} has been received for invoice ${payment.invoice_number || 'Unknown'}`,
                data: payment,
                priority: 'medium'
            }, { roles: ['ADMIN', 'CASHIER', 'CLAIMS_MANAGER'] });
        }
    }
    // Handle user update sync
    async syncUserUpdate(user, action, userId, username) {
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
        });
        // Notify admins about user changes
        if (action === 'create' || action === 'update') {
            await this.sendNotification({
                type: 'system_alert',
                title: `User ${action === 'create' ? 'Created' : 'Updated'}`,
                message: `User ${user.username} has been ${action === 'create' ? 'created' : 'updated'}`,
                data: user,
                priority: 'low'
            }, { roles: ['ADMIN'] });
        }
    }
    // Get system sync status
    async getSyncStatus() {
        const wsService = (0, WebSocketService_1.getWebSocketService)();
        const connectedUsers = wsService ? wsService.getConnectedUsersCount() : 0;
        const onlineUsers = await UserPresence_1.UserPresenceModel.getOnlineUsers();
        const activeUsers = onlineUsers.length;
        // Get recent sync events count (last 1 hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        // This would require a query to event_logs table for sync events
        const recentSyncEvents = 0; // Placeholder
        // Get pending notifications count
        const pendingNotifications = 0; // Placeholder - would require aggregation query
        return {
            connectedUsers,
            activeUsers,
            recentSyncEvents,
            pendingNotifications
        };
    }
    // Cleanup old sync data
    async cleanupOldData() {
        const notificationsDeleted = await Notification_1.NotificationModel.deleteOldNotifications(30);
        const presenceRecordsCleaned = await UserPresence_1.UserPresenceModel.cleanupOldPresence(30);
        return {
            notificationsDeleted,
            presenceRecordsCleaned
        };
    }
}
exports.SyncService = SyncService;
// Export singleton instance
exports.syncService = SyncService.getInstance();
