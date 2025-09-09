"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisitModel = void 0;
const database_1 = __importDefault(require("../config/database"));
class VisitModel {
    static async findById(id) {
        const query = `
      SELECT id, patient_id as "patientId", op_number as "opNumber",
             visit_date as "visitDate", status, chief_complaint as "chiefComplaint",
             triage_category as "triageCategory", payment_type as "paymentType",
             payment_reference as "paymentReference", created_at as "createdAt",
             updated_at as "updatedAt"
      FROM visits WHERE id = $1
    `;
        const result = await database_1.default.query(query, [id]);
        return result.rows[0] || null;
    }
    static async findByPatientId(patientId, limit = 10) {
        const query = `
      SELECT id, patient_id as "patientId", op_number as "opNumber",
             visit_date as "visitDate", status, chief_complaint as "chiefComplaint",
             triage_category as "triageCategory", payment_type as "paymentType",
             payment_reference as "paymentReference", created_at as "createdAt",
             updated_at as "updatedAt"
      FROM visits 
      WHERE patient_id = $1
      ORDER BY visit_date DESC, created_at DESC
      LIMIT $2
    `;
        const result = await database_1.default.query(query, [patientId, limit]);
        return result.rows;
    }
    static async findTodaysVisits() {
        const query = `
      SELECT id, patient_id as "patientId", op_number as "opNumber",
             visit_date as "visitDate", status, chief_complaint as "chiefComplaint",
             triage_category as "triageCategory", payment_type as "paymentType",
             payment_reference as "paymentReference", created_at as "createdAt",
             updated_at as "updatedAt"
      FROM visits 
      WHERE visit_date = CURRENT_DATE
      ORDER BY 
        CASE triage_category 
          WHEN 'EMERGENCY' THEN 1 
          WHEN 'URGENT' THEN 2 
          ELSE 3 
        END,
        created_at ASC
    `;
        const result = await database_1.default.query(query);
        return result.rows;
    }
    static async getQueueItems() {
        const query = `
      SELECT 
        v.id,
        v.patient_id as "patientId",
        v.op_number as "opNumber",
        CONCAT(p.first_name, ' ', p.last_name) as "patientName",
        v.id as "visitId",
        v.status,
        CASE v.triage_category 
          WHEN 'EMERGENCY' THEN 'HIGH'
          WHEN 'URGENT' THEN 'MEDIUM'
          ELSE 'LOW'
        END as priority,
        ROW_NUMBER() OVER (
          ORDER BY 
            CASE v.triage_category 
              WHEN 'EMERGENCY' THEN 1 
              WHEN 'URGENT' THEN 2 
              ELSE 3 
            END,
            v.created_at ASC
        ) as "queuePosition",
        v.created_at as "createdAt"
      FROM visits v
      JOIN patients p ON v.patient_id = p.id
      WHERE v.visit_date = CURRENT_DATE 
        AND v.status NOT IN ('COMPLETED', 'CANCELLED')
      ORDER BY 
        CASE v.triage_category 
          WHEN 'EMERGENCY' THEN 1 
          WHEN 'URGENT' THEN 2 
          ELSE 3 
        END,
        v.created_at ASC
    `;
        const result = await database_1.default.query(query);
        return result.rows;
    }
    static async create(visitData) {
        const query = `
      INSERT INTO visits (patient_id, op_number, chief_complaint, triage_category, payment_type, payment_reference)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, patient_id as "patientId", op_number as "opNumber",
                visit_date as "visitDate", status, chief_complaint as "chiefComplaint",
                triage_category as "triageCategory", payment_type as "paymentType",
                payment_reference as "paymentReference", created_at as "createdAt",
                updated_at as "updatedAt"
    `;
        const result = await database_1.default.query(query, [
            visitData.patientId,
            visitData.opNumber,
            visitData.chiefComplaint,
            visitData.triageCategory || "NORMAL",
            visitData.paymentType || null,
            visitData.paymentReference || null,
        ]);
        return result.rows[0];
    }
    static async update(id, visitData) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        if (visitData.status !== undefined) {
            fields.push(`status = $${paramCount}`);
            values.push(visitData.status);
            paramCount++;
        }
        if (visitData.chiefComplaint !== undefined) {
            fields.push(`chief_complaint = $${paramCount}`);
            values.push(visitData.chiefComplaint);
            paramCount++;
        }
        if (visitData.triageCategory !== undefined) {
            fields.push(`triage_category = $${paramCount}`);
            values.push(visitData.triageCategory);
            paramCount++;
        }
        if (visitData.paymentType !== undefined) {
            fields.push(`payment_type = $${paramCount}`);
            values.push(visitData.paymentType);
            paramCount++;
        }
        if (visitData.paymentReference !== undefined) {
            fields.push(`payment_reference = $${paramCount}`);
            values.push(visitData.paymentReference);
            paramCount++;
        }
        if (fields.length === 0) {
            return this.findById(id);
        }
        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);
        const query = `
      UPDATE visits SET ${fields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id, patient_id as "patientId", op_number as "opNumber",
                visit_date as "visitDate", status, chief_complaint as "chiefComplaint",
                triage_category as "triageCategory", payment_type as "paymentType",
                payment_reference as "paymentReference", created_at as "createdAt",
                updated_at as "updatedAt"
    `;
        const result = await database_1.default.query(query, values);
        return result.rows[0] || null;
    }
    static async updateStatus(id, status) {
        return this.update(id, { status });
    }
    static async getVisitStats() {
        const query = `
      SELECT 
        COUNT(*) as today,
        COUNT(CASE WHEN status IN ('REGISTERED', 'TRIAGED', 'WAITING_CONSULTATION', 'WAITING_LAB', 'WAITING_PHARMACY') THEN 1 END) as waiting,
        COUNT(CASE WHEN status IN ('IN_CONSULTATION', 'LAB_RESULTS_READY') THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed
      FROM visits 
      WHERE visit_date = CURRENT_DATE
    `;
        const result = await database_1.default.query(query);
        const stats = result.rows[0];
        return {
            today: Number.parseInt(stats.today),
            waiting: Number.parseInt(stats.waiting),
            inProgress: Number.parseInt(stats.in_progress),
            completed: Number.parseInt(stats.completed),
        };
    }
}
exports.VisitModel = VisitModel;
//# sourceMappingURL=Visit.js.map