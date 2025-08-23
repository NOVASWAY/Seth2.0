import { db } from "../config/database"

export interface AuditLogData {
  id?: string
  userId?: string
  action: string
  resource: string
  resourceId?: string
  opNumber?: string
  details?: any
  ipAddress?: string
  userAgent?: string
  createdAt?: Date
}

export class AuditLog {
  static async query(text: string, params?: any[]) {
    return db.query(text, params)
  }

  static async create(data: Omit<AuditLogData, "id" | "createdAt">) {
    const result = await db.query(
      `
      INSERT INTO audit_logs (
        user_id, action, resource, resource_id, op_number, 
        details, ip_address, user_agent, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      RETURNING *
      `,
      [
        data.userId,
        data.action,
        data.resource,
        data.resourceId,
        data.opNumber,
        JSON.stringify(data.details || {}),
        data.ipAddress,
        data.userAgent,
      ],
    )

    return result.rows[0]
  }

  static async findById(id: string) {
    const result = await db.query(
      `
      SELECT al.*, u.username, u.full_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.id = $1
      `,
      [id],
    )

    return result.rows[0]
  }

  static async findByResource(resource: string, resourceId: string) {
    const result = await db.query(
      `
      SELECT al.*, u.username, u.full_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.resource = $1 AND al.resource_id = $2
      ORDER BY al.created_at DESC
      `,
      [resource, resourceId],
    )

    return result.rows
  }

  static async findByUser(userId: string, limit = 50) {
    const result = await db.query(
      `
      SELECT al.*, u.username, u.full_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.user_id = $1
      ORDER BY al.created_at DESC
      LIMIT $2
      `,
      [userId, limit],
    )

    return result.rows
  }
}
