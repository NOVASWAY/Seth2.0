export interface AuditLogData {
    id?: string;
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    opNumber?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    createdAt?: Date;
}
export declare class AuditLog {
    static query(text: string, params?: any[]): Promise<import("pg").QueryResult<any>>;
    static create(data: Omit<AuditLogData, "id" | "createdAt">): Promise<any>;
    static findById(id: string): Promise<any>;
    static findByResource(resource: string, resourceId: string): Promise<any[]>;
    static findByUser(userId: string, limit?: number): Promise<any[]>;
    static findAll(limit?: number, offset?: number): Promise<any[]>;
    static count(): Promise<number>;
}
export declare const AuditLogModel: typeof AuditLog;
//# sourceMappingURL=AuditLog.d.ts.map