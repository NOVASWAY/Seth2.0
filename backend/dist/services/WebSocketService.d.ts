import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
interface NotificationData {
    type: 'patient_assignment' | 'prescription_update' | 'lab_result' | 'payment_received' | 'visit_update' | 'system_alert';
    title: string;
    message: string;
    data?: any;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    targetUsers?: string[];
    targetRoles?: string[];
}
interface SyncEvent {
    type: 'patient_update' | 'prescription_update' | 'lab_update' | 'visit_update' | 'assignment_update';
    entityId: string;
    entityType: string;
    action: 'create' | 'update' | 'delete';
    data: any;
    userId: string;
    timestamp: Date;
}
export declare class WebSocketService {
    private io;
    private connectedUsers;
    private userRooms;
    constructor(server: HTTPServer);
    private setupMiddleware;
    private setupEventHandlers;
    private handleUserActivity;
    private handleTypingStart;
    private handleTypingStop;
    private handleEntityEditStart;
    private handleEntityEditStop;
    private handleDisconnect;
    broadcastNotification(notification: NotificationData): void;
    broadcastSyncEvent(event: SyncEvent): void;
    notifyUser(userId: string, notification: Omit<NotificationData, 'targetUsers' | 'targetRoles'>): void;
    notifyRole(role: string, notification: Omit<NotificationData, 'targetUsers' | 'targetRoles'>): void;
    getConnectedUsers(): Array<{
        userId: string;
        username: string;
        role: string;
        connectedAt: Date;
    }>;
    getConnectedUsersCount(): number;
    isUserConnected(userId: string): boolean;
    private generateNotificationId;
    private generateSyncEventId;
    getIO(): SocketIOServer;
}
export declare const initializeWebSocket: (server: HTTPServer) => WebSocketService;
export declare const getWebSocketService: () => WebSocketService | null;
export {};
//# sourceMappingURL=WebSocketService.d.ts.map