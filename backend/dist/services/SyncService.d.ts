interface SyncEvent {
    type: 'patient_update' | 'prescription_update' | 'lab_update' | 'visit_update' | 'assignment_update' | 'user_update';
    entityId: string;
    entityType: string;
    action: 'create' | 'update' | 'delete';
    data: any;
    userId: string;
    username: string;
    timestamp: Date;
}
interface NotificationTarget {
    users?: string[];
    roles?: string[];
    excludeUsers?: string[];
}
export declare class SyncService {
    private static instance;
    static getInstance(): SyncService;
    broadcastSyncEvent(event: SyncEvent): Promise<void>;
    sendNotification(notification: {
        type: 'patient_assignment' | 'prescription_update' | 'lab_result' | 'payment_received' | 'visit_update' | 'system_alert' | 'sync_event';
        title: string;
        message: string;
        data?: any;
        priority?: 'low' | 'medium' | 'high' | 'urgent';
    }, target: NotificationTarget): Promise<void>;
    updateUserPresence(userId: string, presence: {
        status?: 'online' | 'away' | 'busy' | 'offline';
        current_page?: string;
        current_activity?: string;
        is_typing?: boolean;
        typing_entity_id?: string;
        typing_entity_type?: string;
    }): Promise<void>;
    syncPatientAssignment(assignment: any, action: 'create' | 'update' | 'delete', userId: string, username: string): Promise<void>;
    syncPrescription(prescription: any, action: 'create' | 'update' | 'delete', userId: string, username: string): Promise<void>;
    syncLabResult(labResult: any, action: 'create' | 'update' | 'delete', userId: string, username: string): Promise<void>;
    syncVisit(visit: any, action: 'create' | 'update' | 'delete', userId: string, username: string): Promise<void>;
    syncPayment(payment: any, action: 'create' | 'update' | 'delete', userId: string, username: string): Promise<void>;
    syncUserUpdate(user: any, action: 'create' | 'update' | 'delete', userId: string, username: string): Promise<void>;
    getSyncStatus(): Promise<{
        connectedUsers: number;
        activeUsers: number;
        recentSyncEvents: number;
        pendingNotifications: number;
    }>;
    cleanupOldData(): Promise<{
        notificationsDeleted: number;
        presenceRecordsCleaned: number;
    }>;
}
export declare const syncService: SyncService;
export {};
//# sourceMappingURL=SyncService.d.ts.map