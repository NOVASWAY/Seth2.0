import type { Request, Response, NextFunction } from "express";
interface AuditLogParams {
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    opNumber?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
}
export declare const auditLog: (params: AuditLogParams) => Promise<void>;
export declare const auditLogger: (req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=auditLogger.d.ts.map