import pool from "../config/database"
import type { Visit, VisitStatus, QueueItem } from "../types"

export interface CreateVisitData {
  patientId: string
  opNumber: string
  chiefComplaint?: string
  triageCategory?: "EMERGENCY" | "URGENT" | "NORMAL"
  paymentType?: "SHA" | "PRIVATE" | "CASH" | "NHIF" | "OTHER"
  paymentReference?: string
}

export interface UpdateVisitData {
  status?: VisitStatus
  chiefComplaint?: string
  triageCategory?: "EMERGENCY" | "URGENT" | "NORMAL"
  paymentType?: "SHA" | "PRIVATE" | "CASH" | "NHIF" | "OTHER"
  paymentReference?: string
}

export class VisitModel {
  static async findById(id: string): Promise<Visit | null> {
    const query = `
      SELECT id, patient_id as "patientId", op_number as "opNumber",
             visit_date as "visitDate", status, chief_complaint as "chiefComplaint",
             triage_category as "triageCategory", payment_type as "paymentType",
             payment_reference as "paymentReference", created_at as "createdAt",
             updated_at as "updatedAt"
      FROM visits WHERE id = $1
    `
    const result = await pool.query(query, [id])
    return result.rows[0] || null
  }

  static async findByPatientId(patientId: string, limit = 10): Promise<Visit[]> {
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
    `
    const result = await pool.query(query, [patientId, limit])
    return result.rows
  }

  static async findTodaysVisits(): Promise<Visit[]> {
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
    `
    const result = await pool.query(query)
    return result.rows
  }

  static async getQueueItems(): Promise<QueueItem[]> {
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
    `
    const result = await pool.query(query)
    return result.rows
  }

  static async create(visitData: CreateVisitData): Promise<Visit> {
    const query = `
      INSERT INTO visits (patient_id, op_number, chief_complaint, triage_category, payment_type, payment_reference)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, patient_id as "patientId", op_number as "opNumber",
                visit_date as "visitDate", status, chief_complaint as "chiefComplaint",
                triage_category as "triageCategory", payment_type as "paymentType",
                payment_reference as "paymentReference", created_at as "createdAt",
                updated_at as "updatedAt"
    `

    const result = await pool.query(query, [
      visitData.patientId,
      visitData.opNumber,
      visitData.chiefComplaint,
      visitData.triageCategory || "NORMAL",
      visitData.paymentType || null,
      visitData.paymentReference || null,
    ])

    return result.rows[0]
  }

  static async update(id: string, visitData: UpdateVisitData): Promise<Visit | null> {
    const fields = []
    const values = []
    let paramCount = 1

    if (visitData.status !== undefined) {
      fields.push(`status = $${paramCount}`)
      values.push(visitData.status)
      paramCount++
    }

    if (visitData.chiefComplaint !== undefined) {
      fields.push(`chief_complaint = $${paramCount}`)
      values.push(visitData.chiefComplaint)
      paramCount++
    }

    if (visitData.triageCategory !== undefined) {
      fields.push(`triage_category = $${paramCount}`)
      values.push(visitData.triageCategory)
      paramCount++
    }

    if (visitData.paymentType !== undefined) {
      fields.push(`payment_type = $${paramCount}`)
      values.push(visitData.paymentType)
      paramCount++
    }

    if (visitData.paymentReference !== undefined) {
      fields.push(`payment_reference = $${paramCount}`)
      values.push(visitData.paymentReference)
      paramCount++
    }

    if (fields.length === 0) {
      return this.findById(id)
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    const query = `
      UPDATE visits SET ${fields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id, patient_id as "patientId", op_number as "opNumber",
                visit_date as "visitDate", status, chief_complaint as "chiefComplaint",
                triage_category as "triageCategory", payment_type as "paymentType",
                payment_reference as "paymentReference", created_at as "createdAt",
                updated_at as "updatedAt"
    `

    const result = await pool.query(query, values)
    return result.rows[0] || null
  }

  static async updateStatus(id: string, status: VisitStatus): Promise<Visit | null> {
    return this.update(id, { status })
  }

  static async getVisitStats(): Promise<{
    today: number
    waiting: number
    inProgress: number
    completed: number
  }> {
    const query = `
      SELECT 
        COUNT(*) as today,
        COUNT(CASE WHEN status IN ('REGISTERED', 'TRIAGED', 'WAITING_CONSULTATION', 'WAITING_LAB', 'WAITING_PHARMACY') THEN 1 END) as waiting,
        COUNT(CASE WHEN status IN ('IN_CONSULTATION', 'LAB_RESULTS_READY') THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed
      FROM visits 
      WHERE visit_date = CURRENT_DATE
    `
    const result = await pool.query(query)
    const stats = result.rows[0]

    return {
      today: Number.parseInt(stats.today),
      waiting: Number.parseInt(stats.waiting),
      inProgress: Number.parseInt(stats.in_progress),
      completed: Number.parseInt(stats.completed),
    }
  }

  static async findAll(
    limit = 50, 
    offset = 0, 
    status?: string, 
    date?: string,
    sortBy = 'created_at',
    sortDirection: 'asc' | 'desc' = 'desc',
    filters: { triageCategory?: string } = {}
  ): Promise<{ visits: Visit[]; total: number }> {
    // Build WHERE clause for filters
    let whereClause = "WHERE 1=1"
    const params: any[] = []
    let paramCount = 0

    if (status) {
      paramCount++
      whereClause += ` AND v.status = $${paramCount}`
      params.push(status)
    }

    if (date) {
      paramCount++
      whereClause += ` AND v.visit_date = $${paramCount}`
      params.push(date)
    }

    if (filters.triageCategory) {
      paramCount++
      whereClause += ` AND v.triage_category = $${paramCount}`
      params.push(filters.triageCategory)
    }

    // Validate and map sortBy to actual column names
    const validSortColumns: { [key: string]: string } = {
      'visitDate': 'v.visit_date',
      'createdAt': 'v.created_at',
      'triageCategory': 'v.triage_category',
      'status': 'v.status',
      'patientName': 'p.first_name',
      'opNumber': 'v.op_number'
    }

    const actualSortColumn = validSortColumns[sortBy] || 'v.created_at'
    const orderDirection = sortDirection.toUpperCase() as 'ASC' | 'DESC'

    const countQuery = `
      SELECT COUNT(*) 
      FROM visits v
      JOIN patients p ON v.patient_id = p.id
      ${whereClause}
    `
    const countResult = await pool.query(countQuery, params)
    const total = Number.parseInt(countResult.rows[0].count)

    const query = `
      SELECT 
        v.id, v.patient_id as "patientId", v.op_number as "opNumber",
        v.visit_date as "visitDate", v.status, v.chief_complaint as "chiefComplaint",
        v.triage_category as "triageCategory", v.payment_type as "paymentType",
        v.payment_reference as "paymentReference", v.created_at as "createdAt",
        v.updated_at as "updatedAt",
        p.first_name as "patientFirstName", p.last_name as "patientLastName",
        p.phone_number as "patientPhoneNumber"
      FROM visits v
      JOIN patients p ON v.patient_id = p.id
      ${whereClause}
      ORDER BY ${actualSortColumn} ${orderDirection}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `

    const result = await pool.query(query, [...params, limit, offset])

    return {
      visits: result.rows,
      total,
    }
  }
}
