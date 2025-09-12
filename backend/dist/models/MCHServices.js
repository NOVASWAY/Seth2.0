"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCHServicesModel = void 0;
const database_1 = __importDefault(require("../config/database"));
class MCHServicesModel {
    // Get all MCH services
    static async getServices() {
        const query = `
      SELECT id, name, service_code as "serviceCode", category, description,
             target_population as "targetPopulation", frequency,
             is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM mch_services
      WHERE is_active = true
      ORDER BY category, name
    `;
        const result = await database_1.default.query(query);
        return result.rows;
    }
    // Get services by category
    static async getServicesByCategory(category) {
        const query = `
      SELECT id, name, service_code as "serviceCode", category, description,
             target_population as "targetPopulation", frequency,
             is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM mch_services
      WHERE category = $1 AND is_active = true
      ORDER BY name
    `;
        const result = await database_1.default.query(query, [category]);
        return result.rows;
    }
    // Get patient MCH services history
    static async getPatientMCHServices(patientId) {
        const query = `
      SELECT pms.id, pms.patient_id as "patientId", pms.visit_id as "visitId",
             pms.service_id as "serviceId", pms.service_date as "serviceDate",
             pms.provider_id as "providerId", pms.service_details as "serviceDetails",
             pms.findings, pms.recommendations, pms.next_appointment_date as "nextAppointmentDate",
             pms.status, pms.notes, pms.created_at as "createdAt", pms.updated_at as "updatedAt",
             ms.name as service_name, ms.service_code as service_code, ms.category as service_category,
             u.username as provider_name
      FROM patient_mch_services pms
      JOIN mch_services ms ON pms.service_id = ms.id
      LEFT JOIN users u ON pms.provider_id = u.id
      WHERE pms.patient_id = $1
      ORDER BY pms.service_date DESC
    `;
        const result = await database_1.default.query(query, [patientId]);
        return result.rows;
    }
    // Get patient MCH services by category
    static async getPatientMCHServicesByCategory(patientId, category) {
        const query = `
      SELECT pms.id, pms.patient_id as "patientId", pms.visit_id as "visitId",
             pms.service_id as "serviceId", pms.service_date as "serviceDate",
             pms.provider_id as "providerId", pms.service_details as "serviceDetails",
             pms.findings, pms.recommendations, pms.next_appointment_date as "nextAppointmentDate",
             pms.status, pms.notes, pms.created_at as "createdAt", pms.updated_at as "updatedAt",
             ms.name as service_name, ms.service_code as service_code, ms.category as service_category,
             u.username as provider_name
      FROM patient_mch_services pms
      JOIN mch_services ms ON pms.service_id = ms.id
      LEFT JOIN users u ON pms.provider_id = u.id
      WHERE pms.patient_id = $1 AND ms.category = $2
      ORDER BY pms.service_date DESC
    `;
        const result = await database_1.default.query(query, [patientId, category]);
        return result.rows;
    }
    // Create patient MCH service record
    static async createPatientMCHService(data) {
        const query = `
      INSERT INTO patient_mch_services (
        patient_id, visit_id, service_id, service_date, provider_id,
        service_details, findings, recommendations, next_appointment_date, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, patient_id as "patientId", visit_id as "visitId",
                service_id as "serviceId", service_date as "serviceDate",
                provider_id as "providerId", service_details as "serviceDetails",
                findings, recommendations, next_appointment_date as "nextAppointmentDate",
                status, notes, created_at as "createdAt", updated_at as "updatedAt"
    `;
        const values = [
            data.patientId,
            data.visitId || null,
            data.serviceId,
            data.serviceDate || new Date(),
            data.providerId,
            data.serviceDetails ? JSON.stringify(data.serviceDetails) : null,
            data.findings || null,
            data.recommendations || null,
            data.nextAppointmentDate || null,
            data.status || 'COMPLETED',
            data.notes || null
        ];
        const result = await database_1.default.query(query, values);
        return result.rows[0];
    }
    // Update patient MCH service record
    static async updatePatientMCHService(id, data) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined) {
                const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                if (key === 'serviceDetails' && typeof value === 'object') {
                    fields.push(`${dbKey} = $${paramCount}`);
                    values.push(JSON.stringify(value));
                }
                else {
                    fields.push(`${dbKey} = $${paramCount}`);
                    values.push(value);
                }
                paramCount++;
            }
        });
        if (fields.length === 0) {
            return null;
        }
        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);
        const query = `
      UPDATE patient_mch_services 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, patient_id as "patientId", visit_id as "visitId",
                service_id as "serviceId", service_date as "serviceDate",
                provider_id as "providerId", service_details as "serviceDetails",
                findings, recommendations, next_appointment_date as "nextAppointmentDate",
                status, notes, created_at as "createdAt", updated_at as "updatedAt"
    `;
        const result = await database_1.default.query(query, values);
        return result.rows[0] || null;
    }
    // Get MCH service statistics
    static async getMCHServiceStats() {
        const query = `
      SELECT 
        ms.category,
        ms.name as service_name,
        COUNT(pms.id) as total_services,
        COUNT(CASE WHEN pms.status = 'COMPLETED' THEN 1 END) as completed_services,
        COUNT(CASE WHEN pms.status = 'SCHEDULED' THEN 1 END) as scheduled_services,
        COUNT(CASE WHEN pms.status = 'NO_SHOW' THEN 1 END) as no_show_services,
        AVG(CASE WHEN pms.service_details->>'duration_minutes' IS NOT NULL 
            THEN (pms.service_details->>'duration_minutes')::numeric END) as avg_duration_minutes
      FROM mch_services ms
      LEFT JOIN patient_mch_services pms ON ms.id = pms.service_id
      WHERE ms.is_active = true
      GROUP BY ms.category, ms.name
      ORDER BY ms.category, ms.name
    `;
        const result = await database_1.default.query(query);
        return result.rows;
    }
    // Get upcoming MCH appointments
    static async getUpcomingMCHAppointments(days = 7) {
        const query = `
      SELECT 
        pms.id, pms.patient_id as "patientId", pms.next_appointment_date as "nextAppointmentDate",
        pms.status, pms.notes,
        p.first_name, p.last_name, p.op_number, p.phone_number,
        ms.name as service_name, ms.category as service_category,
        u.username as provider_name
      FROM patient_mch_services pms
      JOIN patients p ON pms.patient_id = p.id
      JOIN mch_services ms ON pms.service_id = ms.id
      LEFT JOIN users u ON pms.provider_id = u.id
      WHERE pms.next_appointment_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'
        AND pms.status IN ('SCHEDULED', 'COMPLETED')
      ORDER BY pms.next_appointment_date, pms.service_date
    `;
        const result = await database_1.default.query(query);
        return result.rows;
    }
    // Delete patient MCH service record
    static async deletePatientMCHService(id) {
        const query = 'DELETE FROM patient_mch_services WHERE id = $1';
        const result = await database_1.default.query(query, [id]);
        return result.rowCount > 0;
    }
}
exports.MCHServicesModel = MCHServicesModel;
