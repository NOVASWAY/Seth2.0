import pool from "../config/database"
import bcrypt from "bcryptjs"
import type { UserRole } from "../types"

export interface User {
  id: string
  username: string
  email?: string
  passwordHash: string
  role: UserRole
  isActive: boolean
  isLocked: boolean
  failedLoginAttempts: number
  lastLoginAt?: Date
  totpSecret?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateUserData {
  username: string
  email?: string
  password: string
  role: UserRole
}

export interface UpdateUserData {
  email?: string
  role?: UserRole
  isActive?: boolean
  isLocked?: boolean
}

export class UserModel {
  static async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, username, email, password_hash as "passwordHash", role, 
             is_active as "isActive", is_locked as "isLocked", 
             failed_login_attempts as "failedLoginAttempts",
             last_login_at as "lastLoginAt", totp_secret as "totpSecret",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM users WHERE id = $1
    `
    const result = await pool.query(query, [id])
    return result.rows[0] || null
  }

  static async findByUsername(username: string): Promise<User | null> {
    const query = `
      SELECT id, username, email, password_hash as "passwordHash", role, 
             is_active as "isActive", is_locked as "isLocked", 
             failed_login_attempts as "failedLoginAttempts",
             last_login_at as "lastLoginAt", totp_secret as "totpSecret",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM users WHERE username = $1
    `
    const result = await pool.query(query, [username])
    return result.rows[0] || null
  }

  static async create(userData: CreateUserData): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 12)

    const query = `
      INSERT INTO users (username, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, email, password_hash as "passwordHash", role, 
                is_active as "isActive", is_locked as "isLocked", 
                failed_login_attempts as "failedLoginAttempts",
                last_login_at as "lastLoginAt", totp_secret as "totpSecret",
                created_at as "createdAt", updated_at as "updatedAt"
    `

    const result = await pool.query(query, [userData.username, userData.email, hashedPassword, userData.role])

    return result.rows[0]
  }

  static async update(id: string, userData: UpdateUserData): Promise<User | null> {
    const fields = []
    const values = []
    let paramCount = 1

    if (userData.email !== undefined) {
      fields.push(`email = $${paramCount}`)
      values.push(userData.email)
      paramCount++
    }

    if (userData.role !== undefined) {
      fields.push(`role = $${paramCount}`)
      values.push(userData.role)
      paramCount++
    }

    if (userData.isActive !== undefined) {
      fields.push(`is_active = $${paramCount}`)
      values.push(userData.isActive)
      paramCount++
    }

    if (userData.isLocked !== undefined) {
      fields.push(`is_locked = $${paramCount}`)
      values.push(userData.isLocked)
      paramCount++
    }

    if (fields.length === 0) {
      return this.findById(id)
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    const query = `
      UPDATE users SET ${fields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id, username, email, password_hash as "passwordHash", role, 
                is_active as "isActive", is_locked as "isLocked", 
                failed_login_attempts as "failedLoginAttempts",
                last_login_at as "lastLoginAt", totp_secret as "totpSecret",
                created_at as "createdAt", updated_at as "updatedAt"
    `

    const result = await pool.query(query, values)
    return result.rows[0] || null
  }

  static async updateLoginAttempts(id: string, attempts: number): Promise<void> {
    const query = `
      UPDATE users 
      SET failed_login_attempts = $1, 
          is_locked = CASE WHEN $1 >= 5 THEN true ELSE is_locked END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `
    await pool.query(query, [attempts, id])
  }

  static async updateLastLogin(id: string): Promise<void> {
    const query = `
      UPDATE users 
      SET last_login_at = CURRENT_TIMESTAMP, 
          failed_login_attempts = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `
    await pool.query(query, [id])
  }

  static async resetPassword(id: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    const query = `
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `
    await pool.query(query, [hashedPassword, id])
  }

  static async findAll(limit = 50, offset = 0): Promise<{ users: Omit<User, "passwordHash">[]; total: number }> {
    const countQuery = "SELECT COUNT(*) FROM users"
    const countResult = await pool.query(countQuery)
    const total = Number.parseInt(countResult.rows[0].count)

    const query = `
      SELECT id, username, email, role, 
             is_active as "isActive", is_locked as "isLocked", 
             failed_login_attempts as "failedLoginAttempts",
             last_login_at as "lastLoginAt",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM users 
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `

    const result = await pool.query(query, [limit, offset])

    return {
      users: result.rows,
      total,
    }
  }

  static async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash)
  }
}
