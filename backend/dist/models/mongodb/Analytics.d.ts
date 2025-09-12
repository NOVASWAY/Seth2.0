import mongoose, { Document } from 'mongoose';
export interface IAnalytics extends Document {
    event_type: string;
    user_id?: string;
    data: Record<string, any>;
    timestamp: Date;
    session_id?: string;
    ip_address?: string;
    user_agent?: string;
    metadata?: {
        page?: string;
        action?: string;
        duration?: number;
        [key: string]: any;
    };
}
export declare const Analytics: mongoose.Model<IAnalytics, {}, {}, {}, mongoose.Document<unknown, {}, IAnalytics, {}, {}> & IAnalytics & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default Analytics;
//# sourceMappingURL=Analytics.d.ts.map