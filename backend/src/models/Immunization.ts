import pool from "../config/database"

export interface ImmunizationSchedule {
  id: string
  name: string
  description?: string
  ageGroup?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ImmunizationVaccine {
  id: string
  name: string
  vaccineCode: string
  description?: string
  manufacturer?: string
  dosage?: string
  route?: string
  storageRequirements?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PatientImmunization {
  id: string
  patientId: string
  visitId?: string
  vaccineId: string
  immunizationDate: Date
  ageAtImmunizationDays?: number
  batchNumber?: string
  expiryDate?: Date
  administeredBy: string
  site?: string
  route?: string
  dosage?: string
  adverseReactions?: string
  nextDueDate?: Date
  status: 'SCHEDULED' | 'COMPLETED' | 'MISSED' | 'CONTRAINDICATED'
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreatePatientImmunizationData {
  patientId: string
  visitId?: string
  vaccineId: string
  immunizationDate?: Date
  ageAtImmunizationDays?: number
  batchNumber?: string
  expiryDate?: Date
  administeredBy: string
  site?: string
  route?: string
  dosage?: string
  adverseReactions?: string
  nextDueDate?: Date
  status?: 'SCHEDULED' | 'COMPLETED' | 'MISSED' | 'CONTRAINDICATED'
  notes?: string
}

export class ImmunizationModel {
  // Get all immunization schedules
  static async getSchedules(): Promise<ImmunizationSchedule[]> {
    const query = `
      SELECT id, name, description, age_group as "ageGroup", is_active as "isActive",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM immunization_schedules
      WHERE is_active = true
      ORDER BY name
    `
    const result = await pool.query(query)
    return result.rows
  }

  // Get all vaccines
  static async getVaccines(): Promise<ImmunizationVaccine[]> {
    const query = `
      SELECT id, name, vaccine_code as "vaccineCode", description, manufacturer,
             dosage, route, storage_requirements as "storageRequirements",
             is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM immunization_vaccines
      WHERE is_active = true
      ORDER BY name
    `
    const result = await pool.query(query)
    return result.rows
  }

  // Get vaccines by schedule
  static async getVaccinesBySchedule(scheduleId: string): Promise<ImmunizationVaccine[]> {
    const query = `
      SELECT v.id, v.name, v.vaccine_code as "vaccineCode", v.description, v.manufacturer,
             v.dosage, v.route, v.storage_requirements as "storageRequirements",
             v.is_active as "isActive", v.created_at as "createdAt", v.updated_at as "updatedAt",
             sv.recommended_age_days as "recommendedAgeDays", sv.is_required as "isRequired"
      FROM immunization_vaccines v
      JOIN immunization_schedule_vaccines sv ON v.id = sv.vaccine_id
      WHERE sv.schedule_id = $1 AND v.is_active = true
      ORDER BY sv.recommended_age_days
    `
    const result = await pool.query(query, [scheduleId])
    return result.rows
  }

  // Get patient immunizations
  static async getPatientImmunizations(patientId: string): Promise<PatientImmunization[]> {
    const query = `
      SELECT pi.id, pi.patient_id as "patientId", pi.visit_id as "visitId",
             pi.vaccine_id as "vaccineId", pi.immunization_date as "immunizationDate",
             pi.age_at_immunization_days as "ageAtImmunizationDays", pi.batch_number as "batchNumber",
             pi.expiry_date as "expiryDate", pi.administered_by as "administeredBy",
             pi.site, pi.route, pi.dosage, pi.adverse_reactions as "adverseReactions",
             pi.next_due_date as "nextDueDate", pi.status, pi.notes,
             pi.created_at as "createdAt", pi.updated_at as "updatedAt",
             v.name as vaccine_name, v.vaccine_code as vaccine_code
      FROM patient_immunizations pi
      JOIN immunization_vaccines v ON pi.vaccine_id = v.id
      WHERE pi.patient_id = $1
      ORDER BY pi.immunization_date DESC
    `
    const result = await pool.query(query, [patientId])
    return result.rows
  }

  // Create patient immunization
  static async createPatientImmunization(data: CreatePatientImmunizationData): Promise<PatientImmunization> {
    const query = `
      INSERT INTO patient_immunizations (
        patient_id, visit_id, vaccine_id, immunization_date, age_at_immunization_days,
        batch_number, expiry_date, administered_by, site, route, dosage,
        adverse_reactions, next_due_date, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, patient_id as "patientId", visit_id as "visitId",
                vaccine_id as "vaccineId", immunization_date as "immunizationDate",
                age_at_immunization_days as "ageAtImmunizationDays", batch_number as "batchNumber",
                expiry_date as "expiryDate", administered_by as "administeredBy",
                site, route, dosage, adverse_reactions as "adverseReactions",
                next_due_date as "nextDueDate", status, notes,
                created_at as "createdAt", updated_at as "updatedAt"
    `
    const values = [
      data.patientId,
      data.visitId || null,
      data.vaccineId,
      data.immunizationDate || new Date(),
      data.ageAtImmunizationDays || null,
      data.batchNumber || null,
      data.expiryDate || null,
      data.administeredBy,
      data.site || null,
      data.route || null,
      data.dosage || null,
      data.adverseReactions || null,
      data.nextDueDate || null,
      data.status || 'COMPLETED',
      data.notes || null
    ]

    const result = await pool.query(query, values)
    return result.rows[0]
  }

  // Get immunization schedule for patient based on age
  static async getPatientImmunizationSchedule(patientId: string): Promise<any[]> {
    const query = `
      WITH patient_age AS (
        SELECT 
          CASE 
            WHEN date_of_birth IS NOT NULL THEN 
              EXTRACT(DAYS FROM (CURRENT_DATE - date_of_birth))
            ELSE age * 365
          END as age_days
        FROM patients 
        WHERE id = $1
      )
      SELECT 
        s.id as schedule_id,
        s.name as schedule_name,
        s.description as schedule_description,
        s.age_group,
        v.id as vaccine_id,
        v.name as vaccine_name,
        v.vaccine_code,
        v.description as vaccine_description,
        v.dosage,
        v.route,
        sv.recommended_age_days,
        sv.is_required,
        pi.id as immunization_id,
        pi.immunization_date,
        pi.status as immunization_status,
        CASE 
          WHEN pi.id IS NOT NULL THEN 'COMPLETED'
          WHEN pa.age_days >= sv.recommended_age_days THEN 'DUE'
          ELSE 'SCHEDULED'
        END as recommendation_status
      FROM immunization_schedules s
      JOIN immunization_schedule_vaccines sv ON s.id = sv.schedule_id
      JOIN immunization_vaccines v ON sv.vaccine_id = v.id
      CROSS JOIN patient_age pa
      LEFT JOIN patient_immunizations pi ON pi.patient_id = $1 AND pi.vaccine_id = v.id
      WHERE s.is_active = true AND v.is_active = true
      ORDER BY sv.recommended_age_days
    `
    const result = await pool.query(query, [patientId])
    return result.rows
  }

  // Update patient immunization
  static async updatePatientImmunization(id: string, data: Partial<CreatePatientImmunizationData>): Promise<PatientImmunization | null> {
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
      UPDATE patient_immunizations 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, patient_id as "patientId", visit_id as "visitId",
                vaccine_id as "vaccineId", immunization_date as "immunizationDate",
                age_at_immunization_days as "ageAtImmunizationDays", batch_number as "batchNumber",
                expiry_date as "expiryDate", administered_by as "administeredBy",
                site, route, dosage, adverse_reactions as "adverseReactions",
                next_due_date as "nextDueDate", status, notes,
                created_at as "createdAt", updated_at as "updatedAt"
    `

    const result = await pool.query(query, values)
    return result.rows[0] || null
  }

  // Delete patient immunization
  static async deletePatientImmunization(id: string): Promise<boolean> {
    const query = 'DELETE FROM patient_immunizations WHERE id = $1'
    const result = await pool.query(query, [id])
    return result.rowCount > 0
  }
}
