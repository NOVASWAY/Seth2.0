import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "../types";
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        username: string;
        email?: string;
        role: UserRole;
        isActive: boolean;
    };
}
export declare const authenticate: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const authorize: (roles: UserRole[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const authorizeSingle: (role: UserRole) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const requireRole: (roles: UserRole[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=auth.d.ts.map