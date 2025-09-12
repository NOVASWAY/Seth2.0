import pool from "../config/database"
import type { LabTest } from "../types"
import * as crypto from "crypto"

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
        INSERT INTO clinical_lab_tests (
          id, test_code, test_name, test_category, test_sub_category, specimen_type,
          specimen_volume, fasting_required, normal_range_male, normal_range_female,
          normal_range_pediatric, units, turnaround_time_hours, price,
          clinical_significance, preparation_instructions, search_keywords,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `
      
      const values = [
        crypto.randomUUID(), // id
        data.testCode,
        data.testName,
        data.testCategory,
        null, // test_sub_category
        data.specimenType,
        null, // specimen_volume
        false, // fasting_required
        null, // normal_range_male
        null, // normal_range_female
        null, // normal_range_pediatric
        null, // units
        data.turnaroundTime,
        data.price,
        data.description, // clinical_significance
        data.instructions, // preparation_instructions
        [], // search_keywords
        new Date(), // created_at
        new Date()  // updated_at
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
    const query = "SELECT * FROM clinical_lab_tests WHERE id = $1"
    const result = await pool.query(query, [id])
    
    if (result.rows.length === 0) {
      return null
    }
    
    return this.mapRowToLabTest(result.rows[0])
  }

  static async findByTestCode(testCode: string): Promise<LabTest | null> {
    const query = "SELECT * FROM clinical_lab_tests WHERE test_code = $1"
    const result = await pool.query(query, [testCode])
    
    if (result.rows.length === 0) {
      return null
    }
    
    return this.mapRowToLabTest(result.rows[0])
  }

  static async findAll(activeOnly: boolean = true): Promise<LabTest[]> {
    let query = "SELECT * FROM clinical_lab_tests"
    const values: any[] = []
    
    if (activeOnly) {
      query += " WHERE is_active = true"
    }
    
    query += " ORDER BY test_category, test_name"
    
    const result = await pool.query(query, values)
    return result.rows.map(row => this.mapRowToLabTest(row))
  }

  static async findByCategory(category: string, activeOnly: boolean = true): Promise<LabTest[]> {
    let query = "SELECT * FROM clinical_lab_tests WHERE test_category = $1"
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
      SELECT * FROM clinical_lab_tests 
      WHERE (test_name ILIKE $1 OR test_code ILIKE $1 OR clinical_significance ILIKE $1)
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
        UPDATE clinical_lab_tests 
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
    const query = "DELETE FROM clinical_lab_tests WHERE id = $1"
    const result = await pool.query(query, [id])
    return (result.rowCount ?? 0) > 0
  }

  static async getCategories(): Promise<string[]> {
    const query = "SELECT DISTINCT test_category FROM clinical_lab_tests WHERE is_active = true ORDER BY test_category"
    const result = await pool.query(query)
    return result.rows.map(row => row.test_category)
  }

  static async getAvailableTests(search?: string, category?: string): Promise<LabTest[]> {
    let query = "SELECT * FROM clinical_lab_tests WHERE is_active = true"
    const values: any[] = []
    let paramCount = 1
    
    if (search) {
      query += ` AND (test_name ILIKE $${paramCount} OR test_code ILIKE $${paramCount} OR clinical_significance ILIKE $${paramCount})`
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
      name: row.test_name,
      code: row.test_code,
      category: row.test_category,
      price: parseFloat(row.price),
      turnaround_time: `${row.turnaround_time_hours} hours`,
      is_active: row.is_active,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      test_code: row.test_code,
      test_name: row.test_name,
      testCategory: row.test_category,
      description: row.clinical_significance,
      specimenType: row.specimen_type,
      turnaroundTime: `${row.turnaround_time_hours} hours`,
      isActive: row.is_active,
      referenceRanges: {
        male: row.normal_range_male,
        female: row.normal_range_female,
        pediatric: row.normal_range_pediatric,
        units: row.units
      },
      instructions: row.preparation_instructions,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }
}
