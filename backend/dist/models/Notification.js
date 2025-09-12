"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModel = void 0;
const database_1 = __importDefault(require("../config/database"));
class NotificationModel {
    static async create(data) {
        const query = `
      INSERT INTO notifications (
        id, user_id, type, title, message, data, priority, is_read,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, false,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;
        const values = [
            data.user_id,
            data.type,
            data.title,
            data.message,
            data.data ? JSON.stringify(data.data) : null,
            data.priority || 'medium'
        ];
        const result = await database_1.default.query(query, values);
        return this.mapRowToNotification(result.rows[0]);
    }
    static async findById(id) {
        const query = `
      SELECT 
        n.*,
        u.username
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.id = $1
    `;
        const result = await database_1.default.query(query, [id]);
        return result.rows.length > 0 ? this.mapRowToNotification(result.rows[0]) : null;
    }
    static async findByUserId(userId, filters = {}) {
        let whereConditions = ['n.user_id = $1'];
        let queryParams = [userId];
        let paramIndex = 2;
        // Build WHERE conditions
        if (filters.is_read !== undefined) {
            whereConditions.push(`n.is_read = $${paramIndex}`);
            queryParams.push(filters.is_read);
            paramIndex++;
        }
        if (filters.type) {
            whereConditions.push(`n.type = $${paramIndex}`);
            queryParams.push(filters.type);
            paramIndex++;
        }
        if (filters.priority) {
            whereConditions.push(`n.priority = $${paramIndex}`);
            queryParams.push(filters.priority);
            paramIndex++;
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM notifications n ${whereClause}`;
        const countResult = await database_1.default.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);
        // Get notifications with pagination
        const limit = filters.limit || 50;
        const offset = filters.offset || 0;
        const notificationsQuery = `
      SELECT 
        n.*,
        u.username
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      ${whereClause}
      ORDER BY n.priority DESC, n.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        queryParams.push(limit, offset);
        const notificationsResult = await database_1.default.query(notificationsQuery, queryParams);
        const notifications = notificationsResult.rows.map(row => this.mapRowToNotification(row));
        return { notifications, total };
    }
    static async markAsRead(id) {
        const query = `
      UPDATE notifications 
      SET is_read = true, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
        const result = await database_1.default.query(query, [id]);
        return result.rows.length > 0 ? this.mapRowToNotification(result.rows[0]) : null;
    }
    static async markAllAsRead(userId) {
        const query = `
      UPDATE notifications 
      SET is_read = true, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND is_read = false
    `;
        const result = await database_1.default.query(query, [userId]);
        return result.rowCount || 0;
    }
    static async delete(id) {
        const query = `DELETE FROM notifications WHERE id = $1`;
        const result = await database_1.default.query(query, [id]);
        return result.rowCount > 0;
    }
    static async deleteOldNotifications(daysOld = 30) {
        const query = `
      DELETE FROM notifications 
      WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
    `;
        const result = await database_1.default.query(query);
        return result.rowCount || 0;
    }
    static async getNotificationStats(userId) {
        // Total notifications
        const totalResult = await database_1.default.query(`SELECT COUNT(*) as total FROM notifications WHERE user_id = $1`, [userId]);
        const total = parseInt(totalResult.rows[0].total);
        // Unread notifications
        const unreadResult = await database_1.default.query(`SELECT COUNT(*) as total FROM notifications WHERE user_id = $1 AND is_read = false`, [userId]);
        const unread = parseInt(unreadResult.rows[0].total);
        // By type
        const typeResult = await database_1.default.query(`
      SELECT type, COUNT(*) as count
      FROM notifications
      WHERE user_id = $1
      GROUP BY type
      ORDER BY count DESC
    `, [userId]);
        const by_type = typeResult.rows.reduce((acc, row) => {
            acc[row.type] = parseInt(row.count);
            return acc;
        }, {});
        // By priority
        const priorityResult = await database_1.default.query(`
      SELECT priority, COUNT(*) as count
      FROM notifications
      WHERE user_id = $1
      GROUP BY priority
      ORDER BY count DESC
    `, [userId]);
        const by_priority = priorityResult.rows.reduce((acc, row) => {
            acc[row.priority] = parseInt(row.count);
            return acc;
        }, {});
        return {
            total,
            unread,
            by_type,
            by_priority
        };
    }
    /**
     * Get unread notifications count for a user
     */
    static async getUnreadCount(userId) {
        const result = await database_1.default.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false', [userId]);
        return parseInt(result.rows[0].count);
    }
    /**
     * Get user notifications with optional filtering
     */
    static async getUserNotifications(userId, options = {}) {
        const { limit = 50, unreadOnly = false } = options;
        let query = `
      SELECT n.*, u.username
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.user_id = $1
    `;
        const params = [userId];
        if (unreadOnly) {
            query += ' AND n.is_read = false';
        }
        query += ' ORDER BY n.created_at DESC LIMIT $2';
        params.push(limit);
        const result = await database_1.default.query(query, params);
        return result.rows.map(this.mapRowToNotification);
    }
    static mapRowToNotification(row) {
        return {
            id: row.id,
            user_id: row.user_id,
            type: row.type,
            title: row.title,
            message: row.message,
            data: row.data ? (typeof row.data === 'string' ? JSON.parse(row.data) : row.data) : null,
            priority: row.priority,
            is_read: row.is_read,
            read_at: row.read_at ? new Date(row.read_at) : undefined,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            username: row.username
        };
    }
}
exports.NotificationModel = NotificationModel;
