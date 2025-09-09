import type { UserRole } from "../types";
export interface LoginCredentials {
    username: string;
    password: string;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}
export interface AuthUser {
    id: string;
    username: string;
    email?: string;
    role: UserRole;
    isActive: boolean;
}
export declare class AuthService {
    private static readonly ACCESS_TOKEN_EXPIRES_IN;
    private static readonly REFRESH_TOKEN_EXPIRES_IN;
    private static readonly MAX_LOGIN_ATTEMPTS;
    static login(credentials: LoginCredentials, ipAddress?: string, userAgent?: string): Promise<{
        user: AuthUser;
        tokens: AuthTokens;
    } | null>;
    static refreshToken(refreshToken: string): Promise<AuthTokens | null>;
    static logout(userId: string): Promise<void>;
    static verifyAccessToken(token: string): Promise<AuthUser | null>;
    private static generateTokens;
    private static storeRefreshToken;
}
//# sourceMappingURL=AuthService.d.ts.map