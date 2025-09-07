import pool from "../config/database"

export interface UserPresence {
  id: string
  user_id: string
  status: 'online' | 'away' | 'busy' | 'offline'
  last_seen: Date
  current_page?: string
  current_activity?: string
  is_typing?: boolean
  typing_entity_id?: string
  typing_entity_type?: string
  created_at: Date
  updated_at: Date
  // Joined data
  username?: string
  role?: string
}

export interface UpdatePresenceData {
  status?: 'online' | 'away' | 'busy' | 'offline'
  current_page?: string
  current_activity?: string
  is_typing?: boolean
  typing_entity_id?: string
  typing_entity_type?: string
}

export class UserPresenceModel {
  static async createOrUpdate(userId: string, data: UpdatePresenceData): Promise<UserPresence> {
    // First, try to update existing record
    const updateQuery = `
      UPDATE user_presence 
      SET 
        status = COALESCE($2, status),
        current_page = COALESCE($3, current_page),
        current_activity = COALESCE($4, current_activity),
        is_typing = COALESCE($5, is_typing),
        typing_entity_id = COALESCE($6, typing_entity_id),
        typing_entity_type = COALESCE($7, typing_entity_type),
        last_seen = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING *
    `
    
    const updateValues = [
      userId,
      data.status,
      data.current_page,
      data.current_activity,
      data.is_typing,
      data.typing_entity_id,
      data.typing_entity_type
    ]

    const updateResult = await pool.query(updateQuery, updateValues)
    
    if (updateResult.rows.length > 0) {
      return this.mapRowToUserPresence(updateResult.rows[0])
    }

    // If no existing record, create new one
    const insertQuery = `
      INSERT INTO user_presence (
        id, user_id, status, current_page, current_activity,
        is_typing, typing_entity_id, typing_entity_type,
        last_seen, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `
    
    const insertValues = [
      userId,
      data.status || 'online',
      data.current_page,
      data.current_activity,
      data.is_typing || false,
      data.typing_entity_id,
      data.typing_entity_type
    ]

    const insertResult = await pool.query(insertQuery, insertValues)
    return this.mapRowToUserPresence(insertResult.rows[0])
  }

  static async findByUserId(userId: string): Promise<UserPresence | null> {
    const query = `
      SELECT 
        up.*,
        u.username,
        u.role
      FROM user_presence up
      LEFT JOIN users u ON up.user_id = u.id
      WHERE up.user_id = $1
    `
    
    const result = await pool.query(query, [userId])
    return result.rows.length > 0 ? this.mapRowToUserPresence(result.rows[0]) : null
  }

  static async findAllActive(filters: {
    status?: string
    role?: string
    limit?: number
    offset?: number
  } = {}): Promise<{ presences: UserPresence[]; total: number }> {
    let whereConditions: string[] = []
    let queryParams: any[] = []
    let paramIndex = 1

    // Build WHERE conditions
    if (filters.status) {
      whereConditions.push(`up.status = $${paramIndex}`)
      queryParams.push(filters.status)
      paramIndex++
    }

    if (filters.role) {
      whereConditions.push(`u.role = $${paramIndex}`)
      queryParams.push(filters.role)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM user_presence up
      LEFT JOIN users u ON up.user_id = u.id
      ${whereClause}
    `
    const countResult = await pool.query(countQuery, queryParams)
    const total = parseInt(countResult.rows[0].total)

    // Get presences with pagination
    const limit = filters.limit || 50
    const offset = filters.offset || 0

    const presencesQuery = `
      SELECT 
        up.*,
        u.username,
        u.role
      FROM user_presence up
      LEFT JOIN users u ON up.user_id = u.id
      ${whereClause}
      ORDER BY up.last_seen DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    queryParams.push(limit, offset)
    const presencesResult = await pool.query(presencesQuery, queryParams)

    const presences = presencesResult.rows.map(row => this.mapRowToUserPresence(row))

    return { presences, total }
  }

  static async updateLastSeen(userId: string): Promise<void> {
    const query = `
      UPDATE user_presence 
      SET last_seen = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `
    await pool.query(query, [userId])
  }

  static async setOffline(userId: string): Promise<void> {
    const query = `
      UPDATE user_presence 
      SET 
        status = 'offline',
        is_typing = false,
        typing_entity_id = NULL,
        typing_entity_type = NULL,
        last_seen = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `
    await pool.query(query, [userId])
  }

  static async getOnlineUsers(): Promise<UserPresence[]> {
    const query = `
      SELECT 
        up.*,
        u.username,
        u.role
      FROM user_presence up
      LEFT JOIN users u ON up.user_id = u.id
      WHERE up.status = 'online'
      ORDER BY up.last_seen DESC
    `
    
    const result = await pool.query(query)
    return result.rows.map(row => this.mapRowToUserPresence(row))
  }

  static async getUsersByActivity(activity: string): Promise<UserPresence[]> {
    const query = `
      SELECT 
        up.*,
        u.username,
        u.role
      FROM user_presence up
      LEFT JOIN users u ON up.user_id = u.id
      WHERE up.current_activity = $1 AND up.status = 'online'
      ORDER BY up.last_seen DESC
    `
    
    const result = await pool.query(query, [activity])
    return result.rows.map(row => this.mapRowToUserPresence(row))
  }

  static async getTypingUsers(entityId: string, entityType: string): Promise<UserPresence[]> {
    const query = `
      SELECT 
        up.*,
        u.username,
        u.role
      FROM user_presence up
      LEFT JOIN users u ON up.user_id = u.id
      WHERE up.typing_entity_id = $1 
        AND up.typing_entity_type = $2 
        AND up.is_typing = true
        AND up.status = 'online'
      ORDER BY up.last_seen DESC
    `
    
    const result = await pool.query(query, [entityId, entityType])
    return result.rows.map(row => this.mapRowToUserPresence(row))
  }

  static async cleanupOldPresence(minutesOld: number = 30): Promise<number> {
    const query = `
      UPDATE user_presence 
      SET status = 'offline', updated_at = CURRENT_TIMESTAMP
      WHERE last_seen < CURRENT_TIMESTAMP - INTERVAL '${minutesOld} minutes'
        AND status != 'offline'
    `
    const result = await pool.query(query)
    return result.rowCount || 0
  }

  private static mapRowToUserPresence(row: any): UserPresence {
    return {
      id: row.id,
      user_id: row.user_id,
      status: row.status,
      last_seen: new Date(row.last_seen),
      current_page: row.current_page,
      current_activity: row.current_activity,
      is_typing: row.is_typing,
      typing_entity_id: row.typing_entity_id,
      typing_entity_type: row.typing_entity_type,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      username: row.username,
      role: row.role
    }
  }
}
