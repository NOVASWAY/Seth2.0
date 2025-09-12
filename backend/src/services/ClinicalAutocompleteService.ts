import { pool } from "../config/database"
import * as crypto from "crypto"

export interface SearchResult {
  id: string
  code?: string
  name: string
  description?: string
  category?: string
  subcategory?: string
  additionalInfo?: Record<string, any>
  usageCount: number
  isFavorite: boolean
}

export interface SearchOptions {
  limit?: number
  offset?: number
  category?: string
  includeInactive?: boolean
  userFavoritesFirst?: boolean
  userId?: string
  minScore?: number
}

export class ClinicalAutocompleteService {
  private readonly DEFAULT_LIMIT = 20
  private readonly MIN_SEARCH_LENGTH = 2

  /**
   * Search diagnosis codes (ICD-10) with intelligent ranking
   */
  async searchDiagnosisCodes(
    searchTerm: string, 
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (searchTerm.length < this.MIN_SEARCH_LENGTH) {
      return this.getUserFavorites('DIAGNOSIS', options.userId)
    }

    const startTime = Date.now()
    const {
      limit = this.DEFAULT_LIMIT,
      offset = 0,
      category,
      includeInactive = false,
      userFavoritesFirst = true,
      userId
    } = options

    let whereClause = "WHERE is_active = true"
    const params: any[] = []
    let paramCount = 1

    if (!includeInactive) {
      // Already handled above
    }

    if (category) {
      whereClause += ` AND category = $${paramCount++}`
      params.push(category)
    }

    // Add search term matching
    whereClause += ` AND (
      code ILIKE $${paramCount} OR
      description ILIKE $${paramCount + 1} OR
      to_tsvector('english', description) @@ plainto_tsquery('english', $${paramCount + 2}) OR
      search_keywords && ARRAY[$${paramCount + 3}]
    )`
    params.push(
      `%${searchTerm}%`,
      `%${searchTerm}%`,
      searchTerm,
      searchTerm.toLowerCase()
    )
    paramCount += 4

    // Build the main query with ranking
    const query = `
      SELECT 
        d.*,
        COALESCE(f.usage_frequency, 0) as favorite_score,
        (
          CASE 
            WHEN d.code ILIKE $${paramCount} THEN 100
            WHEN d.description ILIKE $${paramCount + 1} THEN 80
            WHEN position(lower($${paramCount + 2}) in lower(d.description)) = 1 THEN 60
            WHEN to_tsvector('english', d.description) @@ plainto_tsquery('english', $${paramCount + 3}) THEN 40
            ELSE 20
          END +
          (d.usage_count / 100.0) +
          COALESCE(f.usage_frequency * 10, 0)
        ) as relevance_score
      FROM clinical_diagnosis_codes d
      LEFT JOIN user_clinical_favorites f ON (
        f.user_id = $${paramCount + 4} AND 
        f.item_type = 'DIAGNOSIS' AND 
        f.item_id = d.id
      )
      ${whereClause}
      ORDER BY 
        relevance_score DESC,
        d.usage_count DESC,
        d.code ASC
      LIMIT $${paramCount + 5} OFFSET $${paramCount + 6}
    `

    params.push(
      `${searchTerm}%`,
      `${searchTerm}%`, 
      searchTerm,
      searchTerm,
      userId || null,
      limit,
      offset
    )

    const result = await pool.query(query, params)

    // Log search analytics
    if (userId) {
      await this.logSearchAnalytics(
        userId,
        searchTerm,
        'DIAGNOSIS',
        result.rows.length,
        Date.now() - startTime
      )
    }

    return result.rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.description,
      category: row.category,
      subcategory: row.sub_category,
      additionalInfo: {
        icdVersion: row.icd_version,
        keywords: row.search_keywords
      },
      usageCount: row.usage_count,
      isFavorite: row.favorite_score > 0
    }))
  }

  /**
   * Search medications with comprehensive matching
   */
  async searchMedications(
    searchTerm: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (searchTerm.length < this.MIN_SEARCH_LENGTH) {
      return this.getUserFavorites('MEDICATION', options.userId)
    }

    const startTime = Date.now()
    const {
      limit = this.DEFAULT_LIMIT,
      offset = 0,
      category,
      includeInactive = false,
      userId
    } = options

    let whereClause = "WHERE is_active = true"
    const params: any[] = []
    let paramCount = 1

    if (category) {
      whereClause += ` AND drug_class = $${paramCount++}`
      params.push(category)
    }

    // Complex search across multiple fields
    whereClause += ` AND (
      generic_name ILIKE $${paramCount} OR
      brand_names::text ILIKE $${paramCount + 1} OR
      medication_code ILIKE $${paramCount + 2} OR
      to_tsvector('english', generic_name || ' ' || COALESCE(array_to_string(brand_names, ' '), '')) 
        @@ plainto_tsquery('english', $${paramCount + 3}) OR
      search_keywords && ARRAY[$${paramCount + 4}]
    )`
    params.push(
      `%${searchTerm}%`,
      `%${searchTerm}%`,
      `%${searchTerm}%`,
      searchTerm,
      searchTerm.toLowerCase()
    )
    paramCount += 5

    const query = `
      SELECT 
        m.*,
        COALESCE(f.usage_frequency, 0) as favorite_score,
        (
          CASE 
            WHEN m.generic_name ILIKE $${paramCount} THEN 100
            WHEN m.brand_names::text ILIKE $${paramCount + 1} THEN 90
            WHEN m.medication_code ILIKE $${paramCount + 2} THEN 85
            WHEN position(lower($${paramCount + 3}) in lower(m.generic_name)) = 1 THEN 70
            ELSE 30
          END +
          (m.usage_count / 50.0) +
          COALESCE(f.usage_frequency * 15, 0)
        ) as relevance_score
      FROM clinical_medications m
      LEFT JOIN user_clinical_favorites f ON (
        f.user_id = $${paramCount + 4} AND 
        f.item_type = 'MEDICATION' AND 
        f.item_id = m.id
      )
      ${whereClause}
      ORDER BY 
        relevance_score DESC,
        m.usage_count DESC,
        m.generic_name ASC
      LIMIT $${paramCount + 5} OFFSET $${paramCount + 6}
    `

    params.push(
      `${searchTerm}%`,
      `${searchTerm}%`,
      `${searchTerm}%`,
      searchTerm,
      userId || null,
      limit,
      offset
    )

    const result = await pool.query(query, params)

    if (userId) {
      await this.logSearchAnalytics(
        userId,
        searchTerm,
        'MEDICATION',
        result.rows.length,
        Date.now() - startTime
      )
    }

    return result.rows.map(row => ({
      id: row.id,
      code: row.medication_code,
      name: row.generic_name,
      category: row.drug_class,
      subcategory: row.therapeutic_category,
      additionalInfo: {
        brandNames: row.brand_names,
        dosageForms: row.dosage_forms,
        strengths: row.strengths,
        routes: row.route_of_administration,
        adultDose: row.average_adult_dose,
        pediatricDose: row.pediatric_dose,
        isControlled: row.is_controlled_substance,
        requiresPrescription: row.requires_prescription,
        contraindications: row.contraindications,
        sideEffects: row.side_effects,
        pregnancyCategory: row.pregnancy_category
      },
      usageCount: row.usage_count,
      isFavorite: row.favorite_score > 0
    }))
  }

  /**
   * Search lab tests with enhanced matching
   */
  async searchLabTests(
    searchTerm: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (searchTerm.length < this.MIN_SEARCH_LENGTH) {
      return this.getUserFavorites('LAB_TEST', options.userId)
    }

    const startTime = Date.now()
    const {
      limit = this.DEFAULT_LIMIT,
      offset = 0,
      category,
      includeInactive = false,
      userId
    } = options

    let whereClause = "WHERE is_active = true"
    const params: any[] = []
    let paramCount = 1

    if (category) {
      whereClause += ` AND test_category = $${paramCount++}`
      params.push(category)
    }

    whereClause += ` AND (
      test_code ILIKE $${paramCount} OR
      test_name ILIKE $${paramCount + 1} OR
      to_tsvector('english', test_name || ' ' || COALESCE(clinical_significance, '')) 
        @@ plainto_tsquery('english', $${paramCount + 2}) OR
      search_keywords && ARRAY[$${paramCount + 3}]
    )`
    params.push(
      `%${searchTerm}%`,
      `%${searchTerm}%`,
      searchTerm,
      searchTerm.toLowerCase()
    )
    paramCount += 4

    const query = `
      SELECT 
        t.*,
        COALESCE(f.usage_frequency, 0) as favorite_score,
        (
          CASE 
            WHEN t.test_code ILIKE $${paramCount} THEN 100
            WHEN t.test_name ILIKE $${paramCount + 1} THEN 90
            WHEN position(lower($${paramCount + 2}) in lower(t.test_name)) = 1 THEN 80
            ELSE 40
          END +
          (t.usage_count / 30.0) +
          COALESCE(f.usage_frequency * 12, 0)
        ) as relevance_score
      FROM clinical_lab_test_catalog t
      LEFT JOIN user_clinical_favorites f ON (
        f.user_id = $${paramCount + 3} AND 
        f.item_type = 'LAB_TEST' AND 
        f.item_id = t.id
      )
      ${whereClause}
      ORDER BY 
        relevance_score DESC,
        t.usage_count DESC,
        t.test_code ASC
      LIMIT $${paramCount + 4} OFFSET $${paramCount + 5}
    `

    params.push(
      `${searchTerm}%`,
      `${searchTerm}%`,
      searchTerm,
      userId || null,
      limit,
      offset
    )

    const result = await pool.query(query, params)

    if (userId) {
      await this.logSearchAnalytics(
        userId,
        searchTerm,
        'LAB_TEST',
        result.rows.length,
        Date.now() - startTime
      )
    }

    return result.rows.map(row => ({
      id: row.id,
      code: row.test_code,
      name: row.test_name,
      category: row.test_category,
      subcategory: row.test_sub_category,
      additionalInfo: {
        specimenType: row.specimen_type,
        specimenVolume: row.specimen_volume,
        fastingRequired: row.fasting_required,
        turnaroundTime: row.turnaround_time_hours,
        price: row.price,
        normalRangeMale: row.normal_range_male,
        normalRangeFemale: row.normal_range_female,
        normalRangePediatric: row.normal_range_pediatric,
        units: row.units,
        clinicalSignificance: row.clinical_significance,
        preparationInstructions: row.preparation_instructions,
        isProfile: row.is_profile,
        profileTests: row.profile_tests
      },
      usageCount: row.usage_count,
      isFavorite: row.favorite_score > 0
    }))
  }

  /**
   * Search procedures
   */
  async searchProcedures(
    searchTerm: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (searchTerm.length < this.MIN_SEARCH_LENGTH) {
      return this.getUserFavorites('PROCEDURE', options.userId)
    }

    const startTime = Date.now()
    const {
      limit = this.DEFAULT_LIMIT,
      offset = 0,
      category,
      includeInactive = false,
      userId
    } = options

    let whereClause = "WHERE is_active = true"
    const params: any[] = []
    let paramCount = 1

    if (category) {
      whereClause += ` AND procedure_category = $${paramCount++}`
      params.push(category)
    }

    whereClause += ` AND (
      procedure_code ILIKE $${paramCount} OR
      procedure_name ILIKE $${paramCount + 1} OR
      to_tsvector('english', procedure_name || ' ' || COALESCE(description, '')) 
        @@ plainto_tsquery('english', $${paramCount + 2}) OR
      search_keywords && ARRAY[$${paramCount + 3}]
    )`
    params.push(
      `%${searchTerm}%`,
      `%${searchTerm}%`,
      searchTerm,
      searchTerm.toLowerCase()
    )
    paramCount += 4

    const query = `
      SELECT 
        p.*,
        COALESCE(f.usage_frequency, 0) as favorite_score,
        (
          CASE 
            WHEN p.procedure_code ILIKE $${paramCount} THEN 100
            WHEN p.procedure_name ILIKE $${paramCount + 1} THEN 90
            WHEN position(lower($${paramCount + 2}) in lower(p.procedure_name)) = 1 THEN 80
            ELSE 40
          END +
          (p.usage_count / 20.0) +
          COALESCE(f.usage_frequency * 12, 0)
        ) as relevance_score
      FROM clinical_procedures p
      LEFT JOIN user_clinical_favorites f ON (
        f.user_id = $${paramCount + 3} AND 
        f.item_type = 'PROCEDURE' AND 
        f.item_id = p.id
      )
      ${whereClause}
      ORDER BY 
        relevance_score DESC,
        p.usage_count DESC,
        p.procedure_code ASC
      LIMIT $${paramCount + 4} OFFSET $${paramCount + 5}
    `

    params.push(
      `${searchTerm}%`,
      `${searchTerm}%`,
      searchTerm,
      userId || null,
      limit,
      offset
    )

    const result = await pool.query(query, params)

    if (userId) {
      await this.logSearchAnalytics(
        userId,
        searchTerm,
        'PROCEDURE',
        result.rows.length,
        Date.now() - startTime
      )
    }

    return result.rows.map(row => ({
      id: row.id,
      code: row.procedure_code,
      name: row.procedure_name,
      category: row.procedure_category,
      subcategory: row.procedure_type,
      additionalInfo: {
        description: row.description,
        durationMinutes: row.duration_minutes,
        anesthesiaRequired: row.anesthesia_required,
        consentRequired: row.consent_required,
        preparationInstructions: row.preparation_instructions,
        postProcedureCare: row.post_procedure_care,
        complications: row.complications,
        contraindications: row.contraindications,
        price: row.price,
        facilityLevelRequired: row.facility_level_required,
        specializedEquipment: row.specialized_equipment
      },
      usageCount: row.usage_count,
      isFavorite: row.favorite_score > 0
    }))
  }

  /**
   * Get user's favorite clinical items for quick access
   */
  async getUserFavorites(
    itemType: 'DIAGNOSIS' | 'MEDICATION' | 'LAB_TEST' | 'PROCEDURE' | 'SYMPTOM',
    userId?: string,
    limit: number = 10
  ): Promise<SearchResult[]> {
    if (!userId) return []

    const result = await pool.query(`
      SELECT 
        f.*,
        CASE 
          WHEN f.item_type = 'DIAGNOSIS' THEN d.code
          WHEN f.item_type = 'MEDICATION' THEN m.medication_code
          WHEN f.item_type = 'LAB_TEST' THEN t.test_code
          WHEN f.item_type = 'PROCEDURE' THEN p.procedure_code
          ELSE null
        END as code,
        CASE 
          WHEN f.item_type = 'DIAGNOSIS' THEN d.category
          WHEN f.item_type = 'MEDICATION' THEN m.drug_class
          WHEN f.item_type = 'LAB_TEST' THEN t.test_category
          WHEN f.item_type = 'PROCEDURE' THEN p.procedure_category
          ELSE null
        END as category
      FROM user_clinical_favorites f
      LEFT JOIN clinical_diagnosis_codes d ON (f.item_type = 'DIAGNOSIS' AND f.item_id = d.id)
      LEFT JOIN clinical_medications m ON (f.item_type = 'MEDICATION' AND f.item_id = m.id)
      LEFT JOIN clinical_lab_test_catalog t ON (f.item_type = 'LAB_TEST' AND f.item_id = t.id)
      LEFT JOIN clinical_procedures p ON (f.item_type = 'PROCEDURE' AND f.item_id = p.id)
      WHERE f.user_id = $1 AND f.item_type = $2
      ORDER BY f.usage_frequency DESC, f.last_used_at DESC
      LIMIT $3
    `, [userId, itemType, limit])

    return result.rows.map(row => ({
      id: row.item_id,
      code: row.code,
      name: row.item_name,
      category: row.category,
      usageCount: row.usage_frequency,
      isFavorite: true,
      additionalInfo: {
        lastUsed: row.last_used_at
      }
    }))
  }

  /**
   * Add or update user favorite
   */
  async toggleFavorite(
    userId: string,
    itemType: 'DIAGNOSIS' | 'MEDICATION' | 'LAB_TEST' | 'PROCEDURE' | 'SYMPTOM',
    itemId: string,
    itemName: string
  ): Promise<boolean> {
    const result = await pool.query(`
      INSERT INTO user_clinical_favorites (
        id, user_id, item_type, item_id, item_name, usage_frequency, last_used_at
      ) VALUES ($1, $2, $3, $4, $5, 1, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, item_type, item_id) 
      DO UPDATE SET 
        usage_frequency = user_clinical_favorites.usage_frequency + 1,
        last_used_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING usage_frequency
    `, [crypto.randomUUID(), userId, itemType, itemId, itemName])

    // Update the main table usage count
    const tableMap = {
      'DIAGNOSIS': 'clinical_diagnosis_codes',
      'MEDICATION': 'clinical_medications',
      'LAB_TEST': 'clinical_lab_test_catalog',
      'PROCEDURE': 'clinical_procedures',
      'SYMPTOM': 'clinical_symptoms'
    }

    await pool.query(`
      UPDATE ${tableMap[itemType]} 
      SET usage_count = usage_count + 1 
      WHERE id = $1
    `, [itemId])

    return result.rows[0].usage_frequency === 1 // true if newly added
  }

  /**
   * Get categories for a specific clinical data type
   */
  async getCategories(
    itemType: 'DIAGNOSIS' | 'MEDICATION' | 'LAB_TEST' | 'PROCEDURE' | 'SYMPTOM'
  ): Promise<string[]> {
    const tableMap = {
      'DIAGNOSIS': { table: 'clinical_diagnosis_codes', field: 'category' },
      'MEDICATION': { table: 'clinical_medications', field: 'drug_class' },
      'LAB_TEST': { table: 'clinical_lab_test_catalog', field: 'test_category' },
      'PROCEDURE': { table: 'clinical_procedures', field: 'procedure_category' },
      'SYMPTOM': { table: 'clinical_symptoms', field: 'body_system' }
    }

    const config = tableMap[itemType]
    const result = await pool.query(`
      SELECT DISTINCT ${config.field} as category
      FROM ${config.table}
      WHERE is_active = true AND ${config.field} IS NOT NULL
      ORDER BY category
    `)

    return result.rows.map(row => row.category)
  }

  /**
   * Get search suggestions based on popular terms
   */
  async getSearchSuggestions(
    itemType: 'DIAGNOSIS' | 'MEDICATION' | 'LAB_TEST' | 'PROCEDURE' | 'SYMPTOM',
    limit: number = 10
  ): Promise<string[]> {
    const result = await pool.query(`
      SELECT search_term, COUNT(*) as frequency
      FROM clinical_search_analytics
      WHERE search_type = $1 
        AND created_at > CURRENT_DATE - INTERVAL '30 days'
        AND results_count > 0
      GROUP BY search_term
      ORDER BY frequency DESC, search_term ASC
      LIMIT $2
    `, [itemType, limit])

    return result.rows.map(row => row.search_term)
  }

  /**
   * Log search analytics for improving autocomplete
   */
  private async logSearchAnalytics(
    userId: string,
    searchTerm: string,
    searchType: string,
    resultsCount: number,
    durationMs: number,
    selectedItemId?: string,
    selectedItemName?: string
  ): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO clinical_search_analytics (
          id, user_id, search_term, search_type, results_count,
          selected_item_id, selected_item_name, search_duration_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        crypto.randomUUID(),
        userId,
        searchTerm,
        searchType,
        resultsCount,
        selectedItemId,
        selectedItemName,
        durationMs
      ])
    } catch (error) {
      console.error('Failed to log search analytics:', error)
    }
  }

  /**
   * Record when a user selects an item from search results
   */
  async recordSelection(
    userId: string,
    searchTerm: string,
    searchType: string,
    selectedItemId: string,
    selectedItemName: string
  ): Promise<void> {
    await this.logSearchAnalytics(
      userId,
      searchTerm,
      searchType,
      1,
      0,
      selectedItemId,
      selectedItemName
    )
  }
}
