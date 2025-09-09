import pool from "../config/database"

export interface FamilyPlanningMethod {
  id: string
  name: string
  methodCode: string
  category: 'HORMONAL' | 'BARRIER' | 'IUD' | 'STERILIZATION' | 'NATURAL'
  description?: string
  effectivenessRate?: number
  durationMonths?: number
  sideEffects?: string
  contraindications?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PatientFamilyPlanning {
  id: string
  patientId: string
  visitId?: string
  methodId: string
  startDate: Date
  endDate?: Date
  providerId: string
  counselingProvided: boolean
  counselingNotes?: string
  sideEffectsExperienced?: string
  satisfactionRating?: number
  followUpDate?: Date
  status: 'ACTIVE' | 'DISCONTINUED' | 'COMPLETED' | 'SWITCHED'
  discontinuationReason?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreatePatientFamilyPlanningData {
  patientId: string
  visitId?: string
  methodId: string
  startDate?: Date
  endDate?: Date
  providerId: string
  counselingProvided?: boolean
  counselingNotes?: string
  sideEffectsExperienced?: string
  satisfactionRating?: number
  followUpDate?: Date
  status?: 'ACTIVE' | 'DISCONTINUED' | 'COMPLETED' | 'SWITCHED'
  discontinuationReason?: string
  notes?: string
}

export class FamilyPlanningModel {
  // Get all family planning methods
  static async getMethods(): Promise<FamilyPlanningMethod[]> {
    const query = `
      SELECT id, name, method_code as "methodCode", category, description,
             effectiveness_rate as "effectivenessRate", duration_months as "durationMonths",
             side_effects as "sideEffects", contraindications,
             is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM family_planning_methods
      WHERE is_active = true
      ORDER BY category, name
    `
    const result = await pool.query(query)
    return result.rows
  }

  // Get methods by category
  static async getMethodsByCategory(category: string): Promise<FamilyPlanningMethod[]> {
    const query = `
      SELECT id, name, method_code as "methodCode", category, description,
             effectiveness_rate as "effectivenessRate", duration_months as "durationMonths",
             side_effects as "sideEffects", contraindications,
             is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM family_planning_methods
      WHERE category = $1 AND is_active = true
      ORDER BY name
    `
    const result = await pool.query(query, [category])
    return result.rows
  }

  // Get patient family planning history
  static async getPatientFamilyPlanning(patientId: string): Promise<PatientFamilyPlanning[]> {
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
    `
    const result = await pool.query(query, [patientId])
    return result.rows
  }

  // Get active family planning for patient
  static async getActivePatientFamilyPlanning(patientId: string): Promise<PatientFamilyPlanning | null> {
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
    `
    const result = await pool.query(query, [patientId])
    return result.rows[0] || null
  }

  // Create patient family planning record
  static async createPatientFamilyPlanning(data: CreatePatientFamilyPlanningData): Promise<PatientFamilyPlanning> {
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
    `
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
    ]

    const result = await pool.query(query, values)
    return result.rows[0]
  }

  // Update patient family planning record
  static async updatePatientFamilyPlanning(id: string, data: Partial<CreatePatientFamilyPlanningData>): Promise<PatientFamilyPlanning | null> {
    const fields = []
    const values = []
    let paramCount = 1

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
        fields.push(`${dbKey} = $${paramCount}`)
        values.push(value)
        paramCount++
      }
    })

    if (fields.length === 0) {
      return null
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

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
    `

    const result = await pool.query(query, values)
    return result.rows[0] || null
  }

  // Discontinue current family planning method
  static async discontinuePatientFamilyPlanning(patientId: string, reason: string, providerId: string): Promise<boolean> {
    const query = `
      UPDATE patient_family_planning 
      SET status = 'DISCONTINUED', discontinuation_reason = $1, end_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
      WHERE patient_id = $2 AND status = 'ACTIVE'
    `
    const result = await pool.query(query, [reason, patientId])
    return result.rowCount > 0
  }

  // Get family planning statistics
  static async getFamilyPlanningStats(): Promise<any> {
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
    `
    const result = await pool.query(query)
    return result.rows
  }

  // Delete patient family planning record
  static async deletePatientFamilyPlanning(id: string): Promise<boolean> {
    const query = 'DELETE FROM patient_family_planning WHERE id = $1'
    const result = await pool.query(query, [id])
    return result.rowCount > 0
  }
}
