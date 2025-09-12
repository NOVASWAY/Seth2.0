import mongoose, { Document } from 'mongoose';
export interface ISyncEvent extends Document {
    event_type: string;
    entity_type?: string;
    entity_id?: string;
    action: 'create' | 'update' | 'delete';
    user_id?: string;
    data: Record<string, any>;
    timestamp: Date;
    metadata?: {
        source?: string;
        version?: string;
        [key: string]: any;
    };
}
export declare const SyncEvent: mongoose.Model<ISyncEvent, {}, {}, {}, mongoose.Document<unknown, {}, ISyncEvent, {}, {}> & ISyncEvent & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default SyncEvent;
//# sourceMappingURL=SyncEvent.d.ts.map