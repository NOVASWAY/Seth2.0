"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventLoggerService = void 0;
const database_1 = __importDefault(require("../config/database"));
const crypto = __importStar(require("crypto"));
class EventLoggerService {
    /**
     * Log an event to the system
     */
    static async logEvent(eventData) {
        try {
            const query = `
        INSERT INTO event_logs (
          id, event_type, user_id, username, target_type, target_id,
          action, details, ip_address, user_agent, severity, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;
            const values = [
                crypto.randomUUID(),
                eventData.event_type,
                eventData.user_id || null,
                eventData.username || null,
                eventData.target_type || null,
                eventData.target_id || null,
                eventData.action,
                eventData.details ? JSON.stringify(eventData.details) : null,
                eventData.ip_address || null,
                eventData.user_agent || null,
                eventData.severity || 'LOW',
                new Date()
            ];
            await database_1.default.query(query, values);
        }
        catch (error) {
            console.error('Error logging event:', error);
            // Don't throw error to prevent breaking the main application flow
        }
    }
    /**
     * Get events with filtering and pagination
     */
    static async getEvents(filters = {}) {
        try {
            let whereConditions = [];
            let queryParams = [];
            let paramIndex = 1;
            // Build WHERE conditions
            if (filters.event_type) {
                whereConditions.push(`event_type = $${paramIndex}`);
                queryParams.push(filters.event_type);
                paramIndex++;
            }
            if (filters.user_id) {
                whereConditions.push(`user_id = $${paramIndex}`);
                queryParams.push(filters.user_id);
                paramIndex++;
            }
            if (filters.target_type) {
                whereConditions.push(`target_type = $${paramIndex}`);
                queryParams.push(filters.target_type);
                paramIndex++;
            }
            if (filters.action) {
                whereConditions.push(`action = $${paramIndex}`);
                queryParams.push(filters.action);
                paramIndex++;
            }
            if (filters.severity) {
                whereConditions.push(`severity = $${paramIndex}`);
                queryParams.push(filters.severity);
                paramIndex++;
            }
            if (filters.start_date) {
                whereConditions.push(`created_at >= $${paramIndex}`);
                queryParams.push(filters.start_date);
                paramIndex++;
            }
            if (filters.end_date) {
                whereConditions.push(`created_at <= $${paramIndex}`);
                queryParams.push(filters.end_date);
                paramIndex++;
            }
            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
            // Get total count
            const countQuery = `SELECT COUNT(*) as total FROM event_logs ${whereClause}`;
            const countResult = await database_1.default.query(countQuery, queryParams);
            const total = parseInt(countResult.rows[0].total);
            // Get events with pagination
            const limit = filters.limit || 50;
            const offset = filters.offset || 0;
            const eventsQuery = `
        SELECT 
          id, event_type, user_id, username, target_type, target_id,
          action, details, ip_address, user_agent, severity, created_at
        FROM event_logs 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
            queryParams.push(limit, offset);
            const eventsResult = await database_1.default.query(eventsQuery, queryParams);
            const events = eventsResult.rows.map(row => ({
                id: row.id,
                event_type: row.event_type,
                user_id: row.user_id,
                username: row.username,
                target_type: row.target_type,
                target_id: row.target_id,
                action: row.action,
                details: row.details ? (typeof row.details === 'string' ? JSON.parse(row.details) : row.details) : null,
                ip_address: row.ip_address,
                user_agent: row.user_agent,
                severity: row.severity,
                created_at: new Date(row.created_at)
            }));
            return { events, total };
        }
        catch (error) {
            console.error('Error fetching events:', error);
            throw error;
        }
    }
    /**
     * Get recent events for sync dashboard
     */
    static async getRecentEvents(hours = 24, limit = 50) {
        try {
            const startDate = new Date();
            startDate.setHours(startDate.getHours() - hours);
            const query = `
        SELECT 
          id,
          event_type,
          user_id,
          username,
          target_type,
          target_id,
          action,
          details,
          ip_address,
          user_agent,
          severity,
          created_at
        FROM event_logs 
        WHERE created_at >= $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
            const result = await database_1.default.query(query, [startDate, limit]);
            return result.rows.map(row => ({
                ...row,
                details: row.details ? (typeof row.details === 'string' ? JSON.parse(row.details) : row.details) : null
            }));
        }
        catch (error) {
            console.error('Error fetching recent events:', error);
            throw error;
        }
    }
    /**
     * Get event statistics
     */
    static async getEventStats(days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            // Total events
            const totalQuery = `
        SELECT COUNT(*) as total 
        FROM event_logs 
        WHERE created_at >= $1
      `;
            const totalResult = await database_1.default.query(totalQuery, [startDate]);
            const total_events = parseInt(totalResult.rows[0].total);
            // Events by type
            const typeQuery = `
        SELECT event_type, COUNT(*) as count
        FROM event_logs 
        WHERE created_at >= $1
        GROUP BY event_type
        ORDER BY count DESC
      `;
            const typeResult = await database_1.default.query(typeQuery, [startDate]);
            const events_by_type = typeResult.rows.reduce((acc, row) => {
                acc[row.event_type] = parseInt(row.count);
                return acc;
            }, {});
            // Events by severity
            const severityQuery = `
        SELECT severity, COUNT(*) as count
        FROM event_logs 
        WHERE created_at >= $1
        GROUP BY severity
        ORDER BY count DESC
      `;
            const severityResult = await database_1.default.query(severityQuery, [startDate]);
            const events_by_severity = severityResult.rows.reduce((acc, row) => {
                acc[row.severity] = parseInt(row.count);
                return acc;
            }, {});
            // Recent events
            const recentQuery = `
        SELECT 
          id, event_type, user_id, username, target_type, target_id,
          action, details, ip_address, user_agent, severity, created_at
        FROM event_logs 
        WHERE created_at >= $1
        ORDER BY created_at DESC
        LIMIT 10
      `;
            const recentResult = await database_1.default.query(recentQuery, [startDate]);
            const recent_events = recentResult.rows.map(row => ({
                id: row.id,
                event_type: row.event_type,
                user_id: row.user_id,
                username: row.username,
                target_type: row.target_type,
                target_id: row.target_id,
                action: row.action,
                details: row.details ? (typeof row.details === 'string' ? JSON.parse(row.details) : row.details) : null,
                ip_address: row.ip_address,
                user_agent: row.user_agent,
                severity: row.severity,
                created_at: new Date(row.created_at)
            }));
            return {
                total_events,
                events_by_type,
                events_by_severity,
                recent_events
            };
        }
        catch (error) {
            console.error('Error fetching event stats:', error);
            throw error;
        }
    }
    /**
     * Clean up old events based on retention policy
     */
    static async cleanupOldEvents() {
        try {
            const client = await database_1.default.connect();
            try {
                await client.query('BEGIN');
                // Clean up events based on retention policy
                for (const [eventType, retentionDays] of Object.entries(this.RETENTION_DAYS)) {
                    const cutoffDate = new Date();
                    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
                    const deleteQuery = `
            DELETE FROM event_logs 
            WHERE event_type = $1 AND created_at < $2
          `;
                    const result = await client.query(deleteQuery, [eventType, cutoffDate]);
                    console.log(`Cleaned up ${result.rowCount} ${eventType} events older than ${retentionDays} days`);
                }
                await client.query('COMMIT');
            }
            catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            console.error('Error cleaning up old events:', error);
            throw error;
        }
    }
    /**
     * Get available event types
     */
    static async getEventTypes() {
        try {
            const query = `
        SELECT DISTINCT event_type 
        FROM event_logs 
        ORDER BY event_type
      `;
            const result = await database_1.default.query(query);
            return result.rows.map(row => row.event_type);
        }
        catch (error) {
            console.error('Error fetching event types:', error);
            return [];
        }
    }
    /**
     * Get available actions for a specific event type
     */
    static async getActionsForEventType(eventType) {
        try {
            const query = `
        SELECT DISTINCT action 
        FROM event_logs 
        WHERE event_type = $1
        ORDER BY action
      `;
            const result = await database_1.default.query(query, [eventType]);
            return result.rows.map(row => row.action);
        }
        catch (error) {
            console.error('Error fetching actions:', error);
            return [];
        }
    }
}
exports.EventLoggerService = EventLoggerService;
EventLoggerService.RETENTION_DAYS = {
    LOGIN_EVENTS: 90, // 3 months
    USER_EVENTS: 180, // 6 months
    PATIENT_EVENTS: 365, // 1 year
    SYSTEM_EVENTS: 30, // 1 month
    SECURITY_EVENTS: 365, // 1 year
    AUDIT_EVENTS: 2555 // 7 years (compliance)
};
