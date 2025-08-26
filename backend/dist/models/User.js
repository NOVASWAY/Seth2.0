"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const database_1 = __importDefault(require("../config/database"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class UserModel {
    static async findById(id) {
        const query = `
      SELECT id, username, email, password_hash as "passwordHash", role, 
             is_active as "isActive", is_locked as "isLocked", 
             failed_login_attempts as "failedLoginAttempts",
             last_login_at as "lastLoginAt", totp_secret as "totpSecret",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM users WHERE id = $1
    `;
        const result = await database_1.default.query(query, [id]);
        return result.rows[0] || null;
    }
    static async findByUsername(username) {
        const query = `
      SELECT id, username, email, password_hash as "passwordHash", role, 
             is_active as "isActive", is_locked as "isLocked", 
             failed_login_attempts as "failedLoginAttempts",
             last_login_at as "lastLoginAt", totp_secret as "totpSecret",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM users WHERE username = $1
    `;
        const result = await database_1.default.query(query, [username]);
        return result.rows[0] || null;
    }
    static async create(userData) {
        const hashedPassword = await bcryptjs_1.default.hash(userData.password, 12);
        const query = `
      INSERT INTO users (username, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, email, password_hash as "passwordHash", role, 
                is_active as "isActive", is_locked as "isLocked", 
                failed_login_attempts as "failedLoginAttempts",
                last_login_at as "lastLoginAt", totp_secret as "totpSecret",
                created_at as "createdAt", updated_at as "updatedAt"
    `;
        const result = await database_1.default.query(query, [userData.username, userData.email, hashedPassword, userData.role]);
        return result.rows[0];
    }
    static async update(id, userData) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        if (userData.email !== undefined) {
            fields.push(`email = $${paramCount}`);
            values.push(userData.email);
            paramCount++;
        }
        if (userData.role !== undefined) {
            fields.push(`role = $${paramCount}`);
            values.push(userData.role);
            paramCount++;
        }
        if (userData.isActive !== undefined) {
            fields.push(`is_active = $${paramCount}`);
            values.push(userData.isActive);
            paramCount++;
        }
        if (userData.isLocked !== undefined) {
            fields.push(`is_locked = $${paramCount}`);
            values.push(userData.isLocked);
            paramCount++;
        }
        if (fields.length === 0) {
            return this.findById(id);
        }
        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);
        const query = `
      UPDATE users SET ${fields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id, username, email, password_hash as "passwordHash", role, 
                is_active as "isActive", is_locked as "isLocked", 
                failed_login_attempts as "failedLoginAttempts",
                last_login_at as "lastLoginAt", totp_secret as "totpSecret",
                created_at as "createdAt", updated_at as "updatedAt"
    `;
        const result = await database_1.default.query(query, values);
        return result.rows[0] || null;
    }
    static async updateLoginAttempts(id, attempts) {
        const query = `
      UPDATE users 
      SET failed_login_attempts = $1, 
          is_locked = CASE WHEN $1 >= 5 THEN true ELSE is_locked END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
        await database_1.default.query(query, [attempts, id]);
    }
    static async updateLastLogin(id) {
        const query = `
      UPDATE users 
      SET last_login_at = CURRENT_TIMESTAMP, 
          failed_login_attempts = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
        await database_1.default.query(query, [id]);
    }
    static async resetPassword(id, newPassword) {
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
        const query = `
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
        await database_1.default.query(query, [hashedPassword, id]);
    }
    static async findAll(limit = 50, offset = 0) {
        const countQuery = "SELECT COUNT(*) FROM users";
        const countResult = await database_1.default.query(countQuery);
        const total = Number.parseInt(countResult.rows[0].count);
        const query = `
      SELECT id, username, email, role, 
             is_active as "isActive", is_locked as "isLocked", 
             failed_login_attempts as "failedLoginAttempts",
             last_login_at as "lastLoginAt",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM users 
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
        const result = await database_1.default.query(query, [limit, offset]);
        return {
            users: result.rows,
            total,
        };
    }
    static async verifyPassword(user, password) {
        return bcryptjs_1.default.compare(password, user.passwordHash);
    }
}
exports.UserModel = UserModel;
//# sourceMappingURL=User.js.map