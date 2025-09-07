import pool from "../config/database"

export interface PatientAssignment {
  id: string
  patient_id: string
  assigned_to_user_id: string
  assigned_by_user_id: string
  assignment_type: 'GENERAL' | 'PRIMARY_CARE' | 'SPECIALIST' | 'NURSE' | 'PHARMACIST' | 'FOLLOW_UP' | 'REFERRAL'
  assignment_reason?: string
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'TRANSFERRED'
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  assigned_at: Date
  completed_at?: Date
  due_date?: Date
  notes?: string
  created_at: Date
  updated_at: Date
  // Joined data
  patient_name?: string
  assigned_to_name?: string
  assigned_by_name?: string
}

export interface CreatePatientAssignmentData {
  patient_id: string
  assigned_to_user_id: string
  assigned_by_user_id: string
  assignment_type: 'GENERAL' | 'PRIMARY_CARE' | 'SPECIALIST' | 'NURSE' | 'PHARMACIST' | 'FOLLOW_UP' | 'REFERRAL'
  assignment_reason?: string
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  due_date?: Date
  notes?: string
}

export interface UpdatePatientAssignmentData {
  status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'TRANSFERRED'
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  assignment_reason?: string
  due_date?: Date
  notes?: string
  completed_at?: Date
}

export class PatientAssignmentModel {
  static async create(data: CreatePatientAssignmentData): Promise<PatientAssignment> {
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
    `
    
    const values = [
      data.patient_id,
      data.assigned_to_user_id,
      data.assigned_by_user_id,
      data.assignment_type,
      data.assignment_reason || null,
      data.priority || 'NORMAL',
      data.due_date || null,
      data.notes || null
    ]

    const result = await pool.query(query, values)
    return this.mapRowToPatientAssignment(result.rows[0])
  }

  static async findById(id: string): Promise<PatientAssignment | null> {
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
    `
    
    const result = await pool.query(query, [id])
    return result.rows.length > 0 ? this.mapRowToPatientAssignment(result.rows[0]) : null
  }

  static async findByPatientId(patientId: string): Promise<PatientAssignment[]> {
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
    `
    
    const result = await pool.query(query, [patientId])
    return result.rows.map(row => this.mapRowToPatientAssignment(row))
  }

  static async findByAssignedToUserId(userId: string, status?: string): Promise<PatientAssignment[]> {
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
    `
    
    const values = [userId]
    
    if (status) {
      query += ` AND pa.status = $2`
      values.push(status)
    }
    
    query += ` ORDER BY pa.priority DESC, pa.assigned_at DESC`
    
    const result = await pool.query(query, values)
    return result.rows.map(row => this.mapRowToPatientAssignment(row))
  }

  static async findAll(filters: {
    status?: string
    assignment_type?: string
    priority?: string
    assigned_to_user_id?: string
    assigned_by_user_id?: string
    limit?: number
    offset?: number
  } = {}): Promise<{ assignments: PatientAssignment[]; total: number }> {
    let whereConditions: string[] = []
    let queryParams: any[] = []
    let paramIndex = 1

    // Build WHERE conditions
    if (filters.status) {
      whereConditions.push(`pa.status = $${paramIndex}`)
      queryParams.push(filters.status)
      paramIndex++
    }

    if (filters.assignment_type) {
      whereConditions.push(`pa.assignment_type = $${paramIndex}`)
      queryParams.push(filters.assignment_type)
      paramIndex++
    }

    if (filters.priority) {
      whereConditions.push(`pa.priority = $${paramIndex}`)
      queryParams.push(filters.priority)
      paramIndex++
    }

    if (filters.assigned_to_user_id) {
      whereConditions.push(`pa.assigned_to_user_id = $${paramIndex}`)
      queryParams.push(filters.assigned_to_user_id)
      paramIndex++
    }

    if (filters.assigned_by_user_id) {
      whereConditions.push(`pa.assigned_by_user_id = $${paramIndex}`)
      queryParams.push(filters.assigned_by_user_id)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM patient_assignments pa ${whereClause}`
    const countResult = await pool.query(countQuery, queryParams)
    const total = parseInt(countResult.rows[0].total)

    // Get assignments with pagination
    const limit = filters.limit || 50
    const offset = filters.offset || 0

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
    `

    queryParams.push(limit, offset)
    const assignmentsResult = await pool.query(assignmentsQuery, queryParams)

    const assignments = assignmentsResult.rows.map(row => this.mapRowToPatientAssignment(row))

    return { assignments, total }
  }

  static async update(id: string, data: UpdatePatientAssignmentData): Promise<PatientAssignment | null> {
    const fields: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (data.status !== undefined) {
      fields.push(`status = $${paramIndex}`)
      values.push(data.status)
      paramIndex++
    }

    if (data.priority !== undefined) {
      fields.push(`priority = $${paramIndex}`)
      values.push(data.priority)
      paramIndex++
    }

    if (data.assignment_reason !== undefined) {
      fields.push(`assignment_reason = $${paramIndex}`)
      values.push(data.assignment_reason)
      paramIndex++
    }

    if (data.due_date !== undefined) {
      fields.push(`due_date = $${paramIndex}`)
      values.push(data.due_date)
      paramIndex++
    }

    if (data.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`)
      values.push(data.notes)
      paramIndex++
    }

    if (data.completed_at !== undefined) {
      fields.push(`completed_at = $${paramIndex}`)
      values.push(data.completed_at)
      paramIndex++
    }

    if (fields.length === 0) {
      return this.findById(id)
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    const query = `
      UPDATE patient_assignments 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await pool.query(query, values)
    return result.rows.length > 0 ? this.mapRowToPatientAssignment(result.rows[0]) : null
  }

  static async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM patient_assignments WHERE id = $1`
    const result = await pool.query(query, [id])
    return result.rowCount > 0
  }

  static async getAssignmentStats(): Promise<{
    total_assignments: number
    active_assignments: number
    completed_assignments: number
    assignments_by_type: Record<string, number>
    assignments_by_priority: Record<string, number>
  }> {
    // Total assignments
    const totalResult = await pool.query(`SELECT COUNT(*) as total FROM patient_assignments`)
    const total_assignments = parseInt(totalResult.rows[0].total)

    // Active assignments
    const activeResult = await pool.query(`SELECT COUNT(*) as total FROM patient_assignments WHERE status = 'ACTIVE'`)
    const active_assignments = parseInt(activeResult.rows[0].total)

    // Completed assignments
    const completedResult = await pool.query(`SELECT COUNT(*) as total FROM patient_assignments WHERE status = 'COMPLETED'`)
    const completed_assignments = parseInt(completedResult.rows[0].total)

    // Assignments by type
    const typeResult = await pool.query(`
      SELECT assignment_type, COUNT(*) as count
      FROM patient_assignments
      GROUP BY assignment_type
      ORDER BY count DESC
    `)
    const assignments_by_type = typeResult.rows.reduce((acc, row) => {
      acc[row.assignment_type] = parseInt(row.count)
      return acc
    }, {} as Record<string, number>)

    // Assignments by priority
    const priorityResult = await pool.query(`
      SELECT priority, COUNT(*) as count
      FROM patient_assignments
      GROUP BY priority
      ORDER BY count DESC
    `)
    const assignments_by_priority = priorityResult.rows.reduce((acc, row) => {
      acc[row.priority] = parseInt(row.count)
      return acc
    }, {} as Record<string, number>)

    return {
      total_assignments,
      active_assignments,
      completed_assignments,
      assignments_by_type,
      assignments_by_priority
    }
  }

  private static mapRowToPatientAssignment(row: any): PatientAssignment {
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
    }
  }
}
