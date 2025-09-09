export interface EventLog {
    id: string;
    event_type: string;
    user_id?: string;
    username?: string;
    target_type?: string;
    target_id?: string;
    action: string;
    details?: any;
    ip_address?: string;
    user_agent?: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    created_at: Date;
}
export interface EventLogFilters {
    event_type?: string;
    user_id?: string;
    target_type?: string;
    action?: string;
    severity?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
}
export declare class EventLoggerService {
    private static readonly RETENTION_DAYS;
    static logEvent(eventData: {
        event_type: string;
        user_id?: string;
        username?: string;
        target_type?: string;
        target_id?: string;
        action: string;
        details?: any;
        ip_address?: string;
        user_agent?: string;
        severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    }): Promise<void>;
    static getEvents(filters?: EventLogFilters): Promise<{
        events: EventLog[];
        total: number;
    }>;
    static getRecentEvents(hours?: number, limit?: number): Promise<EventLog[]>;
    static getEventStats(days?: number): Promise<{
        total_events: number;
        events_by_type: Record<string, number>;
        events_by_severity: Record<string, number>;
        recent_events: EventLog[];
    }>;
    static cleanupOldEvents(): Promise<void>;
    static getEventTypes(): Promise<string[]>;
    static getActionsForEventType(eventType: string): Promise<string[]>;
}
//# sourceMappingURL=EventLoggerService.d.ts.map