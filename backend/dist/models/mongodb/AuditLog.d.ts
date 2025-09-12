import mongoose, { Document } from 'mongoose';
export interface IAuditLog extends Document {
    action: string;
    user_id: string;
    entity_type?: string;
    entity_id?: string;
    changes?: Record<string, any>;
    timestamp: Date;
    ip_address?: string;
    user_agent?: string;
    metadata?: {
        reason?: string;
        source?: string;
        [key: string]: any;
    };
}
export declare const AuditLog: mongoose.Model<IAuditLog, {}, {}, {}, mongoose.Document<unknown, {}, IAuditLog, {}, {}> & IAuditLog & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default AuditLog;
//# sourceMappingURL=AuditLog.d.ts.map