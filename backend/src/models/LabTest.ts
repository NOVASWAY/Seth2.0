import pool from "../config/database"
import type { LabTest } from "../types"

export interface CreateLabTestData {
  testCode: string
  testName: string
  testCategory: string
  description?: string
  specimenType: string
  turnaroundTime: number
  price: number
  isActive?: boolean
  referenceRanges?: Record<string, any>
  instructions?: string
}

export interface UpdateLabTestData {
  testCode?: string
  testName?: string
  testCategory?: string
  description?: string
  specimenType?: string
  turnaroundTime?: number
  price?: number
  isActive?: boolean
  referenceRanges?: Record<string, any>
  instructions?: string
}

export class LabTestModel {
  static async create(data: CreateLabTestData): Promise<LabTest> {
    const client = await pool.connect()
    
    try {
      await client.query("BEGIN")
      
      const query = `
        INSERT INTO lab_tests (
          test_code, test_name, test_category, description, specimen_type,
          turnaround_time, price, is_active, reference_ranges, instructions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `
      
      const values = [
        data.testCode,
        data.testName,
        data.testCategory,
        data.description,
        data.specimenType,
        data.turnaroundTime,
        data.price,
        data.isActive ?? true,
        data.referenceRanges ? JSON.stringify(data.referenceRanges) : null,
        data.instructions
      ]
      
      const result = await client.query(query, values)
      await client.query("COMMIT")
      
      return this.mapRowToLabTest(result.rows[0])
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }

  static async findById(id: string): Promise<LabTest | null> {
    const query = "SELECT * FROM lab_tests WHERE id = $1"
    const result = await pool.query(query, [id])
    
    if (result.rows.length === 0) {
      return null
    }
    
    return this.mapRowToLabTest(result.rows[0])
  }

  static async findByTestCode(testCode: string): Promise<LabTest | null> {
    const query = "SELECT * FROM lab_tests WHERE test_code = $1"
    const result = await pool.query(query, [testCode])
    
    if (result.rows.length === 0) {
      return null
    }
    
    return this.mapRowToLabTest(result.rows[0])
  }

  static async findAll(activeOnly: boolean = true): Promise<LabTest[]> {
    let query = "SELECT * FROM lab_tests"
    const values: any[] = []
    
    if (activeOnly) {
      query += " WHERE is_active = true"
    }
    
    query += " ORDER BY test_category, test_name"
    
    const result = await pool.query(query, values)
    return result.rows.map(row => this.mapRowToLabTest(row))
  }

  static async findByCategory(category: string, activeOnly: boolean = true): Promise<LabTest[]> {
    let query = "SELECT * FROM lab_tests WHERE test_category = $1"
    const values: any[] = [category]
    
    if (activeOnly) {
      query += " AND is_active = true"
    }
    
    query += " ORDER BY test_name"
    
    const result = await pool.query(query, values)
    return result.rows.map(row => this.mapRowToLabTest(row))
  }

  static async search(searchTerm: string, activeOnly: boolean = true): Promise<LabTest[]> {
    let query = `
      SELECT * FROM lab_tests 
      WHERE (test_name ILIKE $1 OR test_code ILIKE $1 OR description ILIKE $1)
    `
    const values: any[] = [`%${searchTerm}%`]
    
    if (activeOnly) {
      query += " AND is_active = true"
    }
    
    query += " ORDER BY test_category, test_name"
    
    const result = await pool.query(query, values)
    return result.rows.map(row => this.mapRowToLabTest(row))
  }

  static async update(id: string, data: UpdateLabTestData): Promise<LabTest | null> {
    const client = await pool.connect()
    
    try {
      await client.query("BEGIN")
      
      const updateFields: string[] = []
      const values: any[] = []
      let paramCount = 1
      
      if (data.testCode !== undefined) {
        updateFields.push(`test_code = $${paramCount++}`)
        values.push(data.testCode)
      }
      
      if (data.testName !== undefined) {
        updateFields.push(`test_name = $${paramCount++}`)
        values.push(data.testName)
      }
      
      if (data.testCategory !== undefined) {
        updateFields.push(`test_category = $${paramCount++}`)
        values.push(data.testCategory)
      }
      
      if (data.description !== undefined) {
        updateFields.push(`description = $${paramCount++}`)
        values.push(data.description)
      }
      
      if (data.specimenType !== undefined) {
        updateFields.push(`specimen_type = $${paramCount++}`)
        values.push(data.specimenType)
      }
      
      if (data.turnaroundTime !== undefined) {
        updateFields.push(`turnaround_time = $${paramCount++}`)
        values.push(data.turnaroundTime)
      }
      
      if (data.price !== undefined) {
        updateFields.push(`price = $${paramCount++}`)
        values.push(data.price)
      }
      
      if (data.isActive !== undefined) {
        updateFields.push(`is_active = $${paramCount++}`)
        values.push(data.isActive)
      }
      
      if (data.referenceRanges !== undefined) {
        updateFields.push(`reference_ranges = $${paramCount++}`)
        values.push(data.referenceRanges ? JSON.stringify(data.referenceRanges) : null)
      }
      
      if (data.instructions !== undefined) {
        updateFields.push(`instructions = $${paramCount++}`)
        values.push(data.instructions)
      }
      
      if (updateFields.length === 0) {
        return await this.findById(id)
      }
      
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
      values.push(id)
      
      const query = `
        UPDATE lab_tests 
        SET ${updateFields.join(", ")}
        WHERE id = $${paramCount}
        RETURNING *
      `
      
      const result = await client.query(query, values)
      await client.query("COMMIT")
      
      if (result.rows.length === 0) {
        return null
      }
      
      return this.mapRowToLabTest(result.rows[0])
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }

  static async delete(id: string): Promise<boolean> {
    const query = "DELETE FROM lab_tests WHERE id = $1"
    const result = await pool.query(query, [id])
    return result.rowCount > 0
  }

  static async getCategories(): Promise<string[]> {
    const query = "SELECT DISTINCT test_category FROM lab_tests WHERE is_active = true ORDER BY test_category"
    const result = await pool.query(query)
    return result.rows.map(row => row.test_category)
  }

  static async getAvailableTests(search?: string, category?: string): Promise<LabTest[]> {
    let query = "SELECT * FROM lab_tests WHERE is_active = true"
    const values: any[] = []
    let paramCount = 1
    
    if (search) {
      query += ` AND (test_name ILIKE $${paramCount} OR test_code ILIKE $${paramCount} OR description ILIKE $${paramCount})`
      values.push(`%${search}%`)
      paramCount++
    }
    
    if (category) {
      query += ` AND test_category = $${paramCount}`
      values.push(category)
      paramCount++
    }
    
    query += " ORDER BY test_category, test_name"
    
    const result = await pool.query(query, values)
    return result.rows.map(row => this.mapRowToLabTest(row))
  }

  private static mapRowToLabTest(row: any): LabTest {
    return {
      id: row.id,
              test_code: row.test_code,
              test_name: row.test_name,
      testCategory: row.test_category,
      description: row.description,
      specimenType: row.specimen_type,
      turnaroundTime: row.turnaround_time,
      price: parseFloat(row.price),
      isActive: row.is_active,
      referenceRanges: row.reference_ranges ? JSON.parse(row.reference_ranges) : undefined,
      instructions: row.instructions,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }
}
