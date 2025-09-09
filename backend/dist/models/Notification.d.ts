export interface Notification {
    id: string;
    user_id: string;
    type: 'patient_assignment' | 'prescription_update' | 'lab_result' | 'payment_received' | 'visit_update' | 'system_alert' | 'sync_event';
    title: string;
    message: string;
    data?: any;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    is_read: boolean;
    read_at?: Date;
    created_at: Date;
    updated_at: Date;
    username?: string;
}
export interface CreateNotificationData {
    user_id: string;
    type: 'patient_assignment' | 'prescription_update' | 'lab_result' | 'payment_received' | 'visit_update' | 'system_alert' | 'sync_event';
    title: string;
    message: string;
    data?: any;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
}
export declare class NotificationModel {
    static create(data: CreateNotificationData): Promise<Notification>;
    static findById(id: string): Promise<Notification | null>;
    static findByUserId(userId: string, filters?: {
        is_read?: boolean;
        type?: string;
        priority?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        notifications: Notification[];
        total: number;
    }>;
    static markAsRead(id: string): Promise<Notification | null>;
    static markAllAsRead(userId: string): Promise<number>;
    static delete(id: string): Promise<boolean>;
    static deleteOldNotifications(daysOld?: number): Promise<number>;
    static getNotificationStats(userId: string): Promise<{
        total: number;
        unread: number;
        by_type: Record<string, number>;
        by_priority: Record<string, number>;
    }>;
    static getUnreadCount(userId: string): Promise<number>;
    static getUserNotifications(userId: string, options?: {
        limit?: number;
        unreadOnly?: boolean;
    }): Promise<Notification[]>;
    private static mapRowToNotification;
}
//# sourceMappingURL=Notification.d.ts.map