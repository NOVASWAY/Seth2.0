import pool from "../config/database"

export interface Notification {
  id: string
  user_id: string
  type: 'patient_assignment' | 'prescription_update' | 'lab_result' | 'payment_received' | 'visit_update' | 'system_alert' | 'sync_event'
  title: string
  message: string
  data?: any
  priority: 'low' | 'medium' | 'high' | 'urgent'
  is_read: boolean
  read_at?: Date
  created_at: Date
  updated_at: Date
  // Joined data
  username?: string
}

export interface CreateNotificationData {
  user_id: string
  type: 'patient_assignment' | 'prescription_update' | 'lab_result' | 'payment_received' | 'visit_update' | 'system_alert' | 'sync_event'
  title: string
  message: string
  data?: any
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

export class NotificationModel {
  static async create(data: CreateNotificationData): Promise<Notification> {
    const query = `
      INSERT INTO notifications (
        id, user_id, type, title, message, data, priority, is_read,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, false,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `
    
    const values = [
      data.user_id,
      data.type,
      data.title,
      data.message,
      data.data ? JSON.stringify(data.data) : null,
      data.priority || 'medium'
    ]

    const result = await pool.query(query, values)
    return this.mapRowToNotification(result.rows[0])
  }

  static async findById(id: string): Promise<Notification | null> {
    const query = `
      SELECT 
        n.*,
        u.username
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.id = $1
    `
    
    const result = await pool.query(query, [id])
    return result.rows.length > 0 ? this.mapRowToNotification(result.rows[0]) : null
  }

  static async findByUserId(userId: string, filters: {
    is_read?: boolean
    type?: string
    priority?: string
    limit?: number
    offset?: number
  } = {}): Promise<{ notifications: Notification[]; total: number }> {
    let whereConditions: string[] = ['n.user_id = $1']
    let queryParams: any[] = [userId]
    let paramIndex = 2

    // Build WHERE conditions
    if (filters.is_read !== undefined) {
      whereConditions.push(`n.is_read = $${paramIndex}`)
      queryParams.push(filters.is_read)
      paramIndex++
    }

    if (filters.type) {
      whereConditions.push(`n.type = $${paramIndex}`)
      queryParams.push(filters.type)
      paramIndex++
    }

    if (filters.priority) {
      whereConditions.push(`n.priority = $${paramIndex}`)
      queryParams.push(filters.priority)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM notifications n ${whereClause}`
    const countResult = await pool.query(countQuery, queryParams)
    const total = parseInt(countResult.rows[0].total)

    // Get notifications with pagination
    const limit = filters.limit || 50
    const offset = filters.offset || 0

    const notificationsQuery = `
      SELECT 
        n.*,
        u.username
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      ${whereClause}
      ORDER BY n.priority DESC, n.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    queryParams.push(limit, offset)
    const notificationsResult = await pool.query(notificationsQuery, queryParams)

    const notifications = notificationsResult.rows.map(row => this.mapRowToNotification(row))

    return { notifications, total }
  }

  static async markAsRead(id: string): Promise<Notification | null> {
    const query = `
      UPDATE notifications 
      SET is_read = true, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `

    const result = await pool.query(query, [id])
    return result.rows.length > 0 ? this.mapRowToNotification(result.rows[0]) : null
  }

  static async markAllAsRead(userId: string): Promise<number> {
    const query = `
      UPDATE notifications 
      SET is_read = true, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND is_read = false
    `

    const result = await pool.query(query, [userId])
    return result.rowCount || 0
  }

  static async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM notifications WHERE id = $1`
    const result = await pool.query(query, [id])
    return result.rowCount > 0
  }

  static async deleteOldNotifications(daysOld: number = 30): Promise<number> {
    const query = `
      DELETE FROM notifications 
      WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
    `
    const result = await pool.query(query)
    return result.rowCount || 0
  }

  static async getNotificationStats(userId: string): Promise<{
    total: number
    unread: number
    by_type: Record<string, number>
    by_priority: Record<string, number>
  }> {
    // Total notifications
    const totalResult = await pool.query(`SELECT COUNT(*) as total FROM notifications WHERE user_id = $1`, [userId])
    const total = parseInt(totalResult.rows[0].total)

    // Unread notifications
    const unreadResult = await pool.query(`SELECT COUNT(*) as total FROM notifications WHERE user_id = $1 AND is_read = false`, [userId])
    const unread = parseInt(unreadResult.rows[0].total)

    // By type
    const typeResult = await pool.query(`
      SELECT type, COUNT(*) as count
      FROM notifications
      WHERE user_id = $1
      GROUP BY type
      ORDER BY count DESC
    `, [userId])
    const by_type = typeResult.rows.reduce((acc, row) => {
      acc[row.type] = parseInt(row.count)
      return acc
    }, {} as Record<string, number>)

    // By priority
    const priorityResult = await pool.query(`
      SELECT priority, COUNT(*) as count
      FROM notifications
      WHERE user_id = $1
      GROUP BY priority
      ORDER BY count DESC
    `, [userId])
    const by_priority = priorityResult.rows.reduce((acc, row) => {
      acc[row.priority] = parseInt(row.count)
      return acc
    }, {} as Record<string, number>)

    return {
      total,
      unread,
      by_type,
      by_priority
    }
  }

  /**
   * Get unread notifications count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    )
    return parseInt(result.rows[0].count)
  }

  /**
   * Get user notifications with optional filtering
   */
  static async getUserNotifications(
    userId: string, 
    options: { limit?: number; unreadOnly?: boolean } = {}
  ): Promise<Notification[]> {
    const { limit = 50, unreadOnly = false } = options
    
    let query = `
      SELECT n.*, u.username
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.user_id = $1
    `
    const params: any[] = [userId]
    
    if (unreadOnly) {
      query += ' AND n.is_read = false'
    }
    
    query += ' ORDER BY n.created_at DESC LIMIT $2'
    params.push(limit)
    
    const result = await pool.query(query, params)
    return result.rows.map(this.mapRowToNotification)
  }

  private static mapRowToNotification(row: any): Notification {
    return {
      id: row.id,
      user_id: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      data: row.data ? (typeof row.data === 'string' ? JSON.parse(row.data) : row.data) : null,
      priority: row.priority,
      is_read: row.is_read,
      read_at: row.read_at ? new Date(row.read_at) : undefined,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      username: row.username
    }
  }
}
