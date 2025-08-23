import pool from "../config/database"
import type { LabRequest, LabRequestItem } from "../../../types"

export interface CreateLabRequestData {
  visitId: string
  patientId: string
  requestedBy: string
  clinicalNotes?: string
  urgency: "ROUTINE" | "URGENT" | "STAT"
  items: {
    testId: string
    testName: string
    testCode: string
    specimenType: string
    clinicalNotes?: string
  }[]
}

export interface UpdateLabRequestStatusData {
  status: "REQUESTED" | "SAMPLE_COLLECTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  specimenCollectedAt?: Date
  collectedBy?: string
  expectedCompletionAt?: Date
}

export interface UpdateLabRequestItemStatusData {
  status: "REQUESTED" | "SAMPLE_COLLECTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  resultData?: Record<string, any>
  referenceRanges?: Record<string, any>
  abnormalFlags?: Record<string, boolean>
  technicianNotes?: string
  verifiedBy?: string
  verifiedAt?: Date
  reportedAt?: Date
}

export class LabRequestModel {
  static async create(data: CreateLabRequestData): Promise<LabRequest> {
    const client = await pool.connect()
    
    try {
      await client.query("BEGIN")
      
      // Create the main lab request
      const requestQuery = `
        INSERT INTO lab_requests (
          visit_id, patient_id, requested_by, clinical_notes, urgency
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `
      
      const requestValues = [
        data.visitId,
        data.patientId,
        data.requestedBy,
        data.clinicalNotes,
        data.urgency
      ]
      
      const requestResult = await client.query(requestQuery, requestValues)
      const labRequest = requestResult.rows[0]
      
      // Create lab request items
      for (const item of data.items) {
        const itemQuery = `
          INSERT INTO lab_request_items (
            lab_request_id, test_id, test_name, test_code, specimen_type, clinical_notes
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `
        
        const itemValues = [
          labRequest.id,
          item.testId,
          item.testName,
          item.testCode,
          item.specimenType,
          item.clinicalNotes
        ]
        
        await client.query(itemQuery, itemValues)
      }
      
      await client.query("COMMIT")
      
      return this.mapRowToLabRequest(labRequest)
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }

  static async findById(id: string): Promise<LabRequest | null> {
    const query = `
      SELECT lr.*, 
             p.op_number, p.first_name, p.last_name,
             v.visit_date, v.status as visit_status
      FROM lab_requests lr
      JOIN patients p ON lr.patient_id = p.id
      JOIN visits v ON lr.visit_id = v.id
      WHERE lr.id = $1
    `
    const result = await pool.query(query, [id])
    
    if (result.rows.length === 0) {
      return null
    }
    
    return this.mapRowToLabRequest(result.rows[0])
  }

  static async findByPatientId(patientId: string): Promise<LabRequest[]> {
    const query = `
      SELECT lr.*, 
             p.op_number, p.first_name, p.last_name,
             v.visit_date, v.status as visit_status
      FROM lab_requests lr
      JOIN patients p ON lr.patient_id = p.id
      JOIN visits v ON lr.visit_id = v.id
      WHERE lr.patient_id = $1
      ORDER BY lr.requested_at DESC
    `
    const result = await pool.query(query, [patientId])
    return result.rows.map(row => this.mapRowToLabRequest(row))
  }

  static async findByVisitId(visitId: string): Promise<LabRequest[]> {
    const query = `
      SELECT lr.*, 
             p.op_number, p.first_name, p.last_name,
             v.visit_date, v.status as visit_status
      FROM lab_requests lr
      JOIN patients p ON lr.patient_id = p.id
      JOIN visits v ON lr.visit_id = v.id
      WHERE lr.visit_id = $1
      ORDER BY lr.requested_at DESC
    `
    const result = await pool.query(query, [visitId])
    return result.rows.map(row => this.mapRowToLabRequest(row))
  }

  static async findAll(status?: string, urgency?: string): Promise<LabRequest[]> {
    let query = `
      SELECT lr.*, 
             p.op_number, p.first_name, p.last_name,
             v.visit_date, v.status as visit_status
      FROM lab_requests lr
      JOIN patients p ON lr.patient_id = p.id
      JOIN visits v ON lr.visit_id = v.id
    `
    const values: any[] = []
    let paramCount = 1
    
    if (status) {
      query += ` WHERE lr.status = $${paramCount}`
      values.push(status)
      paramCount++
    }
    
    if (urgency) {
      const whereClause = status ? "AND" : "WHERE"
      query += ` ${whereClause} lr.urgency = $${paramCount}`
      values.push(urgency)
      paramCount++
    }
    
    query += " ORDER BY lr.requested_at DESC"
    
    const result = await pool.query(query, values)
    return result.rows.map(row => this.mapRowToLabRequest(row))
  }

  static async updateStatus(id: string, data: UpdateLabRequestStatusData): Promise<LabRequest | null> {
    const client = await pool.connect()
    
    try {
      await client.query("BEGIN")
      
      const updateFields: string[] = []
      const values: any[] = []
      let paramCount = 1
      
      updateFields.push(`status = $${paramCount++}`)
      values.push(data.status)
      
      if (data.specimenCollectedAt) {
        updateFields.push(`specimen_collected_at = $${paramCount++}`)
        values.push(data.specimenCollectedAt)
      }
      
      if (data.collectedBy) {
        updateFields.push(`collected_by = $${paramCount++}`)
        values.push(data.collectedBy)
      }
      
      if (data.expectedCompletionAt) {
        updateFields.push(`expected_completion_at = $${paramCount++}`)
        values.push(data.expectedCompletionAt)
      }
      
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
      values.push(id)
      
      const query = `
        UPDATE lab_requests 
        SET ${updateFields.join(", ")}
        WHERE id = $${paramCount}
        RETURNING *
      `
      
      const result = await client.query(query, values)
      await client.query("COMMIT")
      
      if (result.rows.length === 0) {
        return null
      }
      
      return this.mapRowToLabRequest(result.rows[0])
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }

  static async updateItemStatus(itemId: string, data: UpdateLabRequestItemStatusData): Promise<LabRequestItem | null> {
    const client = await pool.connect()
    
    try {
      await client.query("BEGIN")
      
      const updateFields: string[] = []
      const values: any[] = []
      let paramCount = 1
      
      updateFields.push(`status = $${paramCount++}`)
      values.push(data.status)
      
      if (data.resultData) {
        updateFields.push(`result_data = $${paramCount++}`)
        values.push(JSON.stringify(data.resultData))
      }
      
      if (data.referenceRanges) {
        updateFields.push(`reference_ranges = $${paramCount++}`)
        values.push(JSON.stringify(data.referenceRanges))
      }
      
      if (data.abnormalFlags) {
        updateFields.push(`abnormal_flags = $${paramCount++}`)
        values.push(JSON.stringify(data.abnormalFlags))
      }
      
      if (data.technicianNotes) {
        updateFields.push(`technician_notes = $${paramCount++}`)
        values.push(data.technicianNotes)
      }
      
      if (data.verifiedBy) {
        updateFields.push(`verified_by = $${paramCount++}`)
        values.push(data.verifiedBy)
      }
      
      if (data.verifiedAt) {
        updateFields.push(`verified_at = $${paramCount++}`)
        values.push(data.verifiedAt)
      }
      
      if (data.reportedAt) {
        updateFields.push(`reported_at = $${paramCount++}`)
        values.push(data.reportedAt)
      }
      
      values.push(itemId)
      
      const query = `
        UPDATE lab_request_items 
        SET ${updateFields.join(", ")}
        WHERE id = $${paramCount}
        RETURNING *
      `
      
      const result = await client.query(query, values)
      await client.query("COMMIT")
      
      if (result.rows.length === 0) {
        return null
      }
      
      return this.mapRowToLabRequestItem(result.rows[0])
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }

  static async getRequestItems(requestId: string): Promise<LabRequestItem[]> {
    const query = `
      SELECT lri.*, lt.test_category, lt.description, lt.instructions
      FROM lab_request_items lri
      LEFT JOIN lab_tests lt ON lri.test_id = lt.id
      WHERE lri.lab_request_id = $1
      ORDER BY lri.created_at
    `
    const result = await pool.query(query, [requestId])
    return result.rows.map(row => this.mapRowToLabRequestItem(row))
  }

  static async getPendingRequests(): Promise<LabRequest[]> {
    const query = `
      SELECT lr.*, 
             p.op_number, p.first_name, p.last_name,
             v.visit_date, v.status as visit_status
      FROM lab_requests lr
      JOIN patients p ON lr.patient_id = p.id
      JOIN visits v ON lr.visit_id = v.id
      WHERE lr.status IN ('REQUESTED', 'SAMPLE_COLLECTED', 'IN_PROGRESS')
      ORDER BY 
        CASE lr.urgency 
          WHEN 'STAT' THEN 1 
          WHEN 'URGENT' THEN 2 
          WHEN 'ROUTINE' THEN 3 
        END,
        lr.requested_at ASC
    `
    const result = await pool.query(query)
    return result.rows.map(row => this.mapRowToLabRequest(row))
  }

  static async getCompletedRequests(startDate?: Date, endDate?: Date): Promise<LabRequest[]> {
    let query = `
      SELECT lr.*, 
             p.op_number, p.first_name, p.last_name,
             v.visit_date, v.status as visit_status
      FROM lab_requests lr
      JOIN patients p ON lr.patient_id = p.id
      JOIN visits v ON lr.visit_id = v.id
      WHERE lr.status = 'COMPLETED'
    `
    const values: any[] = []
    let paramCount = 1
    
    if (startDate) {
      query += ` AND lr.reported_at >= $${paramCount}`
      values.push(startDate)
      paramCount++
    }
    
    if (endDate) {
      query += ` AND lr.reported_at <= $${paramCount}`
      values.push(endDate)
      paramCount++
    }
    
    query += " ORDER BY lr.reported_at DESC"
    
    const result = await pool.query(query, values)
    return result.rows.map(row => this.mapRowToLabRequest(row))
  }

  private static mapRowToLabRequest(row: any): LabRequest {
    return {
      id: row.id,
      visitId: row.visit_id,
      patientId: row.patient_id,
      requestedBy: row.requested_by,
      testType: row.test_type,
      testName: row.test_name,
      urgency: row.urgency,
      status: row.status,
      clinicalNotes: row.clinical_notes,
      specimenCollectedAt: row.specimen_collected_at ? new Date(row.specimen_collected_at) : undefined,
      collectedBy: row.collected_by,
      expectedCompletionAt: row.expected_completion_at ? new Date(row.expected_completion_at) : undefined,
      requestedAt: new Date(row.requested_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }

  private static mapRowToLabRequestItem(row: any): LabRequestItem {
    return {
      id: row.id,
      labRequestId: row.lab_request_id,
      testId: row.test_id,
      testName: row.test_name,
      testCode: row.test_code,
      specimenType: row.specimen_type,
      urgency: row.urgency,
      status: row.status,
      clinicalNotes: row.clinical_notes,
      resultData: row.result_data ? JSON.parse(row.result_data) : undefined,
      referenceRanges: row.reference_ranges ? JSON.parse(row.reference_ranges) : undefined,
      abnormalFlags: row.abnormal_flags ? JSON.parse(row.abnormal_flags) : undefined,
      technicianNotes: row.technician_notes,
      verifiedBy: row.verified_by,
      verifiedAt: row.verified_at ? new Date(row.verified_at) : undefined,
      reportedAt: row.reported_at ? new Date(row.reported_at) : undefined
    }
  }
}
