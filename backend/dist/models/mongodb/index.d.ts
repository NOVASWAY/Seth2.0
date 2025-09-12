export { ClinicalData, type IClinicalData } from './ClinicalData';
export { Analytics, type IAnalytics } from './Analytics';
export { AuditLog, type IAuditLog } from './AuditLog';
export { DocumentMetadata, type IDocumentMetadata } from './DocumentMetadata';
export { SyncEvent, type ISyncEvent } from './SyncEvent';
export declare const mongoModels: {
    ClinicalData: import("mongoose").Model<import("./ClinicalData").IClinicalData, {}, {}, {}, import("mongoose").Document<unknown, {}, import("./ClinicalData").IClinicalData, {}, {}> & import("./ClinicalData").IClinicalData & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }, any>;
    Analytics: import("mongoose").Model<import("./Analytics").IAnalytics, {}, {}, {}, import("mongoose").Document<unknown, {}, import("./Analytics").IAnalytics, {}, {}> & import("./Analytics").IAnalytics & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }, any>;
    AuditLog: import("mongoose").Model<import("./AuditLog").IAuditLog, {}, {}, {}, import("mongoose").Document<unknown, {}, import("./AuditLog").IAuditLog, {}, {}> & import("./AuditLog").IAuditLog & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }, any>;
    DocumentMetadata: import("mongoose").Model<import("./DocumentMetadata").IDocumentMetadata, {}, {}, {}, import("mongoose").Document<unknown, {}, import("./DocumentMetadata").IDocumentMetadata, {}, {}> & import("./DocumentMetadata").IDocumentMetadata & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }, any>;
    SyncEvent: import("mongoose").Model<import("./SyncEvent").ISyncEvent, {}, {}, {}, import("mongoose").Document<unknown, {}, import("./SyncEvent").ISyncEvent, {}, {}> & import("./SyncEvent").ISyncEvent & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }, any>;
};
export default mongoModels;
//# sourceMappingURL=index.d.ts.map