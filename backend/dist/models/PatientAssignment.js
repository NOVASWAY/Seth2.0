"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientAssignmentModel = void 0;
const database_1 = __importDefault(require("../config/database"));
class PatientAssignmentModel {
    static async create(data) {
        const query = `
      INSERT INTO patient_assignments (
        id, patient_id, assigned_to_user_id, assigned_by_user_id,
        assignment_type, assignment_reason, priority, due_date, notes,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;
        const values = [
            data.patient_id,
            data.assigned_to_user_id,
            data.assigned_by_user_id,
            data.assignment_type,
            data.assignment_reason || null,
            data.priority || 'NORMAL',
            data.due_date || null,
            data.notes || null
        ];
        const result = await database_1.default.query(query, values);
        return this.mapRowToPatientAssignment(result.rows[0]);
    }
    static async findById(id) {
        const query = `
      SELECT 
        pa.*,
        p.first_name || ' ' || p.last_name as patient_name,
        u1.username as assigned_to_name,
        u2.username as assigned_by_name
      FROM patient_assignments pa
      LEFT JOIN patients p ON pa.patient_id = p.id
      LEFT JOIN users u1 ON pa.assigned_to_user_id = u1.id
      LEFT JOIN users u2 ON pa.assigned_by_user_id = u2.id
      WHERE pa.id = $1
    `;
        const result = await database_1.default.query(query, [id]);
        return result.rows.length > 0 ? this.mapRowToPatientAssignment(result.rows[0]) : null;
    }
    static async findByPatientId(patientId) {
        const query = `
      SELECT 
        pa.*,
        p.first_name || ' ' || p.last_name as patient_name,
        u1.username as assigned_to_name,
        u2.username as assigned_by_name
      FROM patient_assignments pa
      LEFT JOIN patients p ON pa.patient_id = p.id
      LEFT JOIN users u1 ON pa.assigned_to_user_id = u1.id
      LEFT JOIN users u2 ON pa.assigned_by_user_id = u2.id
      WHERE pa.patient_id = $1
      ORDER BY pa.assigned_at DESC
    `;
        const result = await database_1.default.query(query, [patientId]);
        return result.rows.map(row => this.mapRowToPatientAssignment(row));
    }
    static async findByAssignedToUserId(userId, status) {
        let query = `
      SELECT 
        pa.*,
        p.first_name || ' ' || p.last_name as patient_name,
        u1.username as assigned_to_name,
        u2.username as assigned_by_name
      FROM patient_assignments pa
      LEFT JOIN patients p ON pa.patient_id = p.id
      LEFT JOIN users u1 ON pa.assigned_to_user_id = u1.id
      LEFT JOIN users u2 ON pa.assigned_by_user_id = u2.id
      WHERE pa.assigned_to_user_id = $1
    `;
        const values = [userId];
        if (status) {
            query += ` AND pa.status = $2`;
            values.push(status);
        }
        query += ` ORDER BY pa.priority DESC, pa.assigned_at DESC`;
        const result = await database_1.default.query(query, values);
        return result.rows.map(row => this.mapRowToPatientAssignment(row));
    }
    static async findAll(filters = {}) {
        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;
        if (filters.status) {
            whereConditions.push(`pa.status = $${paramIndex}`);
            queryParams.push(filters.status);
            paramIndex++;
        }
        if (filters.assignment_type) {
            whereConditions.push(`pa.assignment_type = $${paramIndex}`);
            queryParams.push(filters.assignment_type);
            paramIndex++;
        }
        if (filters.priority) {
            whereConditions.push(`pa.priority = $${paramIndex}`);
            queryParams.push(filters.priority);
            paramIndex++;
        }
        if (filters.assigned_to_user_id) {
            whereConditions.push(`pa.assigned_to_user_id = $${paramIndex}`);
            queryParams.push(filters.assigned_to_user_id);
            paramIndex++;
        }
        if (filters.assigned_by_user_id) {
            whereConditions.push(`pa.assigned_by_user_id = $${paramIndex}`);
            queryParams.push(filters.assigned_by_user_id);
            paramIndex++;
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        const countQuery = `SELECT COUNT(*) as total FROM patient_assignments pa ${whereClause}`;
        const countResult = await database_1.default.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);
        const limit = filters.limit || 50;
        const offset = filters.offset || 0;
        const assignmentsQuery = `
      SELECT 
        pa.*,
        p.first_name || ' ' || p.last_name as patient_name,
        u1.username as assigned_to_name,
        u2.username as assigned_by_name
      FROM patient_assignments pa
      LEFT JOIN patients p ON pa.patient_id = p.id
      LEFT JOIN users u1 ON pa.assigned_to_user_id = u1.id
      LEFT JOIN users u2 ON pa.assigned_by_user_id = u2.id
      ${whereClause}
      ORDER BY pa.priority DESC, pa.assigned_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        queryParams.push(limit, offset);
        const assignmentsResult = await database_1.default.query(assignmentsQuery, queryParams);
        const assignments = assignmentsResult.rows.map(row => this.mapRowToPatientAssignment(row));
        return { assignments, total };
    }
    static async update(id, data) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        if (data.status !== undefined) {
            fields.push(`status = $${paramIndex}`);
            values.push(data.status);
            paramIndex++;
        }
        if (data.priority !== undefined) {
            fields.push(`priority = $${paramIndex}`);
            values.push(data.priority);
            paramIndex++;
        }
        if (data.assignment_reason !== undefined) {
            fields.push(`assignment_reason = $${paramIndex}`);
            values.push(data.assignment_reason);
            paramIndex++;
        }
        if (data.due_date !== undefined) {
            fields.push(`due_date = $${paramIndex}`);
            values.push(data.due_date);
            paramIndex++;
        }
        if (data.notes !== undefined) {
            fields.push(`notes = $${paramIndex}`);
            values.push(data.notes);
            paramIndex++;
        }
        if (data.completed_at !== undefined) {
            fields.push(`completed_at = $${paramIndex}`);
            values.push(data.completed_at);
            paramIndex++;
        }
        if (fields.length === 0) {
            return this.findById(id);
        }
        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);
        const query = `
      UPDATE patient_assignments 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
        const result = await database_1.default.query(query, values);
        return result.rows.length > 0 ? this.mapRowToPatientAssignment(result.rows[0]) : null;
    }
    static async delete(id) {
        const query = `DELETE FROM patient_assignments WHERE id = $1`;
        const result = await database_1.default.query(query, [id]);
        return result.rowCount > 0;
    }
    static async getAssignmentStats() {
        const totalResult = await database_1.default.query(`SELECT COUNT(*) as total FROM patient_assignments`);
        const total_assignments = parseInt(totalResult.rows[0].total);
        const activeResult = await database_1.default.query(`SELECT COUNT(*) as total FROM patient_assignments WHERE status = 'ACTIVE'`);
        const active_assignments = parseInt(activeResult.rows[0].total);
        const completedResult = await database_1.default.query(`SELECT COUNT(*) as total FROM patient_assignments WHERE status = 'COMPLETED'`);
        const completed_assignments = parseInt(completedResult.rows[0].total);
        const typeResult = await database_1.default.query(`
      SELECT assignment_type, COUNT(*) as count
      FROM patient_assignments
      GROUP BY assignment_type
      ORDER BY count DESC
    `);
        const assignments_by_type = typeResult.rows.reduce((acc, row) => {
            acc[row.assignment_type] = parseInt(row.count);
            return acc;
        }, {});
        const priorityResult = await database_1.default.query(`
      SELECT priority, COUNT(*) as count
      FROM patient_assignments
      GROUP BY priority
      ORDER BY count DESC
    `);
        const assignments_by_priority = priorityResult.rows.reduce((acc, row) => {
            acc[row.priority] = parseInt(row.count);
            return acc;
        }, {});
        return {
            total_assignments,
            active_assignments,
            completed_assignments,
            assignments_by_type,
            assignments_by_priority
        };
    }
    static mapRowToPatientAssignment(row) {
        return {
            id: row.id,
            patient_id: row.patient_id,
            assigned_to_user_id: row.assigned_to_user_id,
            assigned_by_user_id: row.assigned_by_user_id,
            assignment_type: row.assignment_type,
            assignment_reason: row.assignment_reason,
            status: row.status,
            priority: row.priority,
            assigned_at: new Date(row.assigned_at),
            completed_at: row.completed_at ? new Date(row.completed_at) : undefined,
            due_date: row.due_date ? new Date(row.due_date) : undefined,
            notes: row.notes,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            patient_name: row.patient_name,
            assigned_to_name: row.assigned_to_name,
            assigned_by_name: row.assigned_by_name
        };
    }
}
exports.PatientAssignmentModel = PatientAssignmentModel;
//# sourceMappingURL=PatientAssignment.js.map