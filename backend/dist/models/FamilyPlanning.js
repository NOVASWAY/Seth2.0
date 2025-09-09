"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FamilyPlanningModel = void 0;
const database_1 = __importDefault(require("../config/database"));
class FamilyPlanningModel {
    static async getMethods() {
        const query = `
      SELECT id, name, method_code as "methodCode", category, description,
             effectiveness_rate as "effectivenessRate", duration_months as "durationMonths",
             side_effects as "sideEffects", contraindications,
             is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM family_planning_methods
      WHERE is_active = true
      ORDER BY category, name
    `;
        const result = await database_1.default.query(query);
        return result.rows;
    }
    static async getMethodsByCategory(category) {
        const query = `
      SELECT id, name, method_code as "methodCode", category, description,
             effectiveness_rate as "effectivenessRate", duration_months as "durationMonths",
             side_effects as "sideEffects", contraindications,
             is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM family_planning_methods
      WHERE category = $1 AND is_active = true
      ORDER BY name
    `;
        const result = await database_1.default.query(query, [category]);
        return result.rows;
    }
    static async getPatientFamilyPlanning(patientId) {
        const query = `
      SELECT pfp.id, pfp.patient_id as "patientId", pfp.visit_id as "visitId",
             pfp.method_id as "methodId", pfp.start_date as "startDate",
             pfp.end_date as "endDate", pfp.provider_id as "providerId",
             pfp.counseling_provided as "counselingProvided", pfp.counseling_notes as "counselingNotes",
             pfp.side_effects_experienced as "sideEffectsExperienced", pfp.satisfaction_rating as "satisfactionRating",
             pfp.follow_up_date as "followUpDate", pfp.status, pfp.discontinuation_reason as "discontinuationReason",
             pfp.notes, pfp.created_at as "createdAt", pfp.updated_at as "updatedAt",
             fpm.name as method_name, fpm.method_code as method_code, fpm.category as method_category,
             u.username as provider_name
      FROM patient_family_planning pfp
      JOIN family_planning_methods fpm ON pfp.method_id = fpm.id
      LEFT JOIN users u ON pfp.provider_id = u.id
      WHERE pfp.patient_id = $1
      ORDER BY pfp.start_date DESC
    `;
        const result = await database_1.default.query(query, [patientId]);
        return result.rows;
    }
    static async getActivePatientFamilyPlanning(patientId) {
        const query = `
      SELECT pfp.id, pfp.patient_id as "patientId", pfp.visit_id as "visitId",
             pfp.method_id as "methodId", pfp.start_date as "startDate",
             pfp.end_date as "endDate", pfp.provider_id as "providerId",
             pfp.counseling_provided as "counselingProvided", pfp.counseling_notes as "counselingNotes",
             pfp.side_effects_experienced as "sideEffectsExperienced", pfp.satisfaction_rating as "satisfactionRating",
             pfp.follow_up_date as "followUpDate", pfp.status, pfp.discontinuation_reason as "discontinuationReason",
             pfp.notes, pfp.created_at as "createdAt", pfp.updated_at as "updatedAt",
             fpm.name as method_name, fpm.method_code as method_code, fpm.category as method_category,
             u.username as provider_name
      FROM patient_family_planning pfp
      JOIN family_planning_methods fpm ON pfp.method_id = fpm.id
      LEFT JOIN users u ON pfp.provider_id = u.id
      WHERE pfp.patient_id = $1 AND pfp.status = 'ACTIVE'
      ORDER BY pfp.start_date DESC
      LIMIT 1
    `;
        const result = await database_1.default.query(query, [patientId]);
        return result.rows[0] || null;
    }
    static async createPatientFamilyPlanning(data) {
        const query = `
      INSERT INTO patient_family_planning (
        patient_id, visit_id, method_id, start_date, end_date, provider_id,
        counseling_provided, counseling_notes, side_effects_experienced,
        satisfaction_rating, follow_up_date, status, discontinuation_reason, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, patient_id as "patientId", visit_id as "visitId",
                method_id as "methodId", start_date as "startDate",
                end_date as "endDate", provider_id as "providerId",
                counseling_provided as "counselingProvided", counseling_notes as "counselingNotes",
                side_effects_experienced as "sideEffectsExperienced", satisfaction_rating as "satisfactionRating",
                follow_up_date as "followUpDate", status, discontinuation_reason as "discontinuationReason",
                notes, created_at as "createdAt", updated_at as "updatedAt"
    `;
        const values = [
            data.patientId,
            data.visitId || null,
            data.methodId,
            data.startDate || new Date(),
            data.endDate || null,
            data.providerId,
            data.counselingProvided || false,
            data.counselingNotes || null,
            data.sideEffectsExperienced || null,
            data.satisfactionRating || null,
            data.followUpDate || null,
            data.status || 'ACTIVE',
            data.discontinuationReason || null,
            data.notes || null
        ];
        const result = await database_1.default.query(query, values);
        return result.rows[0];
    }
    static async updatePatientFamilyPlanning(id, data) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined) {
                const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                fields.push(`${dbKey} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        });
        if (fields.length === 0) {
            return null;
        }
        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);
        const query = `
      UPDATE patient_family_planning 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, patient_id as "patientId", visit_id as "visitId",
                method_id as "methodId", start_date as "startDate",
                end_date as "endDate", provider_id as "providerId",
                counseling_provided as "counselingProvided", counseling_notes as "counselingNotes",
                side_effects_experienced as "sideEffectsExperienced", satisfaction_rating as "satisfactionRating",
                follow_up_date as "followUpDate", status, discontinuation_reason as "discontinuationReason",
                notes, created_at as "createdAt", updated_at as "updatedAt"
    `;
        const result = await database_1.default.query(query, values);
        return result.rows[0] || null;
    }
    static async discontinuePatientFamilyPlanning(patientId, reason, providerId) {
        const query = `
      UPDATE patient_family_planning 
      SET status = 'DISCONTINUED', discontinuation_reason = $1, end_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
      WHERE patient_id = $2 AND status = 'ACTIVE'
    `;
        const result = await database_1.default.query(query, [reason, patientId]);
        return result.rowCount > 0;
    }
    static async getFamilyPlanningStats() {
        const query = `
      SELECT 
        fpm.category,
        COUNT(pfp.id) as total_users,
        COUNT(CASE WHEN pfp.status = 'ACTIVE' THEN 1 END) as active_users,
        COUNT(CASE WHEN pfp.status = 'DISCONTINUED' THEN 1 END) as discontinued_users,
        AVG(pfp.satisfaction_rating) as avg_satisfaction
      FROM family_planning_methods fpm
      LEFT JOIN patient_family_planning pfp ON fpm.id = pfp.method_id
      WHERE fpm.is_active = true
      GROUP BY fpm.category
      ORDER BY fpm.category
    `;
        const result = await database_1.default.query(query);
        return result.rows;
    }
    static async deletePatientFamilyPlanning(id) {
        const query = 'DELETE FROM patient_family_planning WHERE id = $1';
        const result = await database_1.default.query(query, [id]);
        return result.rowCount > 0;
    }
}
exports.FamilyPlanningModel = FamilyPlanningModel;
//# sourceMappingURL=FamilyPlanning.js.map