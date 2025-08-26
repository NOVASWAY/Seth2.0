import type { UserRole } from "../types";
export interface User {
    id: string;
    username: string;
    email?: string;
    passwordHash: string;
    role: UserRole;
    isActive: boolean;
    isLocked: boolean;
    failedLoginAttempts: number;
    lastLoginAt?: Date;
    totpSecret?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateUserData {
    username: string;
    email?: string;
    password: string;
    role: UserRole;
}
export interface UpdateUserData {
    email?: string;
    role?: UserRole;
    isActive?: boolean;
    isLocked?: boolean;
}
export declare class UserModel {
    static findById(id: string): Promise<User | null>;
    static findByUsername(username: string): Promise<User | null>;
    static create(userData: CreateUserData): Promise<User>;
    static update(id: string, userData: UpdateUserData): Promise<User | null>;
    static updateLoginAttempts(id: string, attempts: number): Promise<void>;
    static updateLastLogin(id: string): Promise<void>;
    static resetPassword(id: string, newPassword: string): Promise<void>;
    static findAll(limit?: number, offset?: number): Promise<{
        users: Omit<User, "passwordHash">[];
        total: number;
    }>;
    static verifyPassword(user: User, password: string): Promise<boolean>;
}
//# sourceMappingURL=User.d.ts.map