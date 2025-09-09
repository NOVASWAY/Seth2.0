export interface UserPresence {
    id: string;
    user_id: string;
    status: 'online' | 'away' | 'busy' | 'offline';
    last_seen: Date;
    current_page?: string;
    current_activity?: string;
    is_typing?: boolean;
    typing_entity_id?: string;
    typing_entity_type?: string;
    created_at: Date;
    updated_at: Date;
    username?: string;
    role?: string;
}
export interface UpdatePresenceData {
    status?: 'online' | 'away' | 'busy' | 'offline';
    current_page?: string;
    current_activity?: string;
    is_typing?: boolean;
    typing_entity_id?: string;
    typing_entity_type?: string;
}
export declare class UserPresenceModel {
    static createOrUpdate(userId: string, data: UpdatePresenceData): Promise<UserPresence>;
    static findByUserId(userId: string): Promise<UserPresence | null>;
    static findAllActive(filters?: {
        status?: string;
        role?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        presences: UserPresence[];
        total: number;
    }>;
    static updateLastSeen(userId: string): Promise<void>;
    static setOffline(userId: string): Promise<void>;
    static getOnlineUsers(): Promise<UserPresence[]>;
    static getUsersByActivity(activity: string): Promise<UserPresence[]>;
    static getTypingUsers(entityId: string, entityType: string): Promise<UserPresence[]>;
    static cleanupOldPresence(minutesOld?: number): Promise<number>;
    static getActiveUsers(): Promise<UserPresence[]>;
    private static mapRowToUserPresence;
}
//# sourceMappingURL=UserPresence.d.ts.map