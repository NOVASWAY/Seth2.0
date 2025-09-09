"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogModel = exports.AuditLog = void 0;
const database_1 = require("../config/database");
class AuditLog {
    static async query(text, params) {
        return database_1.pool.query(text, params);
    }
    static async create(data) {
        const result = await database_1.pool.query(`
      INSERT INTO audit_logs (
        user_id, action, resource, resource_id, op_number, 
        details, ip_address, user_agent, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      RETURNING *
      `, [
            data.userId,
            data.action,
            data.resource,
            data.resourceId,
            data.opNumber,
            JSON.stringify(data.details || {}),
            data.ipAddress,
            data.userAgent,
        ]);
        return result.rows[0];
    }
    static async findById(id) {
        const result = await database_1.pool.query(`
      SELECT al.*, u.username, u.full_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.id = $1
      `, [id]);
        return result.rows[0];
    }
    static async findByResource(resource, resourceId) {
        const result = await database_1.pool.query(`
      SELECT al.*, u.username, u.full_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.resource = $1 AND al.resource_id = $2
      ORDER BY al.created_at DESC
      `, [resource, resourceId]);
        return result.rows;
    }
    static async findByUser(userId, limit = 50) {
        const result = await database_1.pool.query(`
      SELECT al.*, u.username, u.full_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.user_id = $1
      ORDER BY al.created_at DESC
      LIMIT $2
      `, [userId, limit]);
        return result.rows;
    }
    static async findAll(limit = 50, offset = 0) {
        const result = await database_1.pool.query(`
      SELECT al.*, u.username, u.full_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT $1 OFFSET $2
      `, [limit, offset]);
        return result.rows;
    }
    static async count() {
        const result = await database_1.pool.query(`SELECT COUNT(*) FROM audit_logs`);
        return parseInt(result.rows[0].count);
    }
}
exports.AuditLog = AuditLog;
exports.AuditLogModel = AuditLog;
//# sourceMappingURL=AuditLog.js.map