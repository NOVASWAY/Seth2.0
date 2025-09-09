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
    async broadcastSyncEvent(event) {
        const wsService = (0, WebSocketService_1.getWebSocketService)();
        if (wsService) {
            wsService.broadcastSyncEvent(event);
        }
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
    async sendNotification(notification, target) {
        const wsService = (0, WebSocketService_1.getWebSocketService)();
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
                    priority: notification.priority || 'medium'
                });
                if (wsService) {
                    wsService.notifyUser(userId, notification);
                }
            }
        }
        if (target.roles && target.roles.length > 0) {
            for (const role of target.roles) {
                if (wsService) {
                    wsService.notifyRole(role, notification);
                }
            }
        }
    }
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
    async syncPatientAssignment(assignment, action, userId, username) {
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
    async syncPrescription(prescription, action, userId, username) {
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
    async syncLabResult(labResult, action, userId, username) {
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
    async syncVisit(visit, action, userId, username) {
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
    async syncPayment(payment, action, userId, username) {
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
    async syncUserUpdate(user, action, userId, username) {
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
    async getSyncStatus() {
        const wsService = (0, WebSocketService_1.getWebSocketService)();
        const connectedUsers = wsService ? wsService.getConnectedUsersCount() : 0;
        const onlineUsers = await UserPresence_1.UserPresenceModel.getOnlineUsers();
        const activeUsers = onlineUsers.length;
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentSyncEvents = 0;
        const pendingNotifications = 0;
        return {
            connectedUsers,
            activeUsers,
            recentSyncEvents,
            pendingNotifications
        };
    }
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
exports.syncService = SyncService.getInstance();
//# sourceMappingURL=SyncService.js.map