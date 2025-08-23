import { Router } from "express"
import { pool } from "../config/database"
import { authenticateToken, requireRole } from "../middleware/auth"
import { body, validationResult } from "express-validator"
import bcrypt from "bcrypt"
import multer from "multer"
import * as XLSX from "xlsx"
import path from "path"

const router = Router()

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".xlsx", ".xls", ".csv"]
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowedTypes.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error("Only Excel and CSV files are allowed"))
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
})

// Get admin dashboard data
router.get("/dashboard", authenticateToken, requireRole(["admin"]), async (req, res) => {
  try {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

    // System statistics
    const stats = await Promise.all([
      // Total patients
      pool.query("SELECT COUNT(*) as count FROM patients"),
      // Today's visits
      pool.query("SELECT COUNT(*) as count FROM visits WHERE created_at >= $1 AND created_at < $2", [
        startOfDay,
        endOfDay,
      ]),
      // Active users
      pool.query("SELECT COUNT(*) as count FROM users WHERE is_active = true"),
      // Today's revenue
      pool.query(
        "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_date >= $1 AND payment_date < $2",
        [startOfDay, endOfDay],
      ),
      // Low stock items
      pool.query(`
        SELECT COUNT(*) as count 
        FROM inventory_items ii
        JOIN (
          SELECT item_id, SUM(quantity) as total_qty
          FROM inventory_batches 
          WHERE expiry_date > NOW()
          GROUP BY item_id
        ) ib ON ii.id = ib.item_id
        WHERE ib.total_qty <= ii.reorder_level
      `),
      // Pending claims
      pool.query("SELECT COUNT(*) as count FROM claims WHERE status = 'ready_to_submit'"),
      // Recent audit logs
      pool.query(`
        SELECT al.*, u.username 
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT 10
      `),
    ])

    const [totalPatients, todayVisits, activeUsers, todayRevenue, lowStockItems, pendingClaims, recentAuditLogs] = stats

    res.json({
      success: true,
      data: {
        total_patients: Number.parseInt(totalPatients.rows[0].count),
        today_visits: Number.parseInt(todayVisits.rows[0].count),
        active_users: Number.parseInt(activeUsers.rows[0].count),
        today_revenue: Number.parseFloat(todayRevenue.rows[0].total),
        low_stock_items: Number.parseInt(lowStockItems.rows[0].count),
        pending_claims: Number.parseInt(pendingClaims.rows[0].count),
        recent_audit_logs: recentAuditLogs.rows,
      },
    })
  } catch (error) {
    console.error("Error fetching admin dashboard:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
    })
  }
})

// Get all users
router.get("/users", authenticateToken, requireRole(["admin"]), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, email, first_name, last_name, role, is_active, 
             is_locked, failed_login_attempts, last_login, created_at
      FROM users
      ORDER BY created_at DESC
    `)

    res.json({
      success: true,
      data: result.rows,
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    })
  }
})

// Create user
router.post(
  "/users",
  authenticateToken,
  requireRole(["admin"]),
  [
    body("username").isLength({ min: 3 }).withMessage("Username must be at least 3 characters"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("first_name").notEmpty().withMessage("First name is required"),
    body("last_name").notEmpty().withMessage("Last name is required"),
    body("role")
      .isIn(["admin", "receptionist", "nurse", "clinical_officer", "pharmacist", "inventory_manager", "claims_manager"])
      .withMessage("Invalid role"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { username, email, first_name, last_name, role } = req.body

      // Check if username or email already exists
      const existingUser = await pool.query("SELECT id FROM users WHERE username = $1 OR email = $2", [username, email])

      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Username or email already exists",
        })
      }

      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-8)
      const hashedPassword = await bcrypt.hash(tempPassword, 10)

      const result = await pool.query(
        `
        INSERT INTO users (
          id, username, email, password_hash, first_name, last_name, role,
          is_active, is_locked, failed_login_attempts, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, username, email, first_name, last_name, role, is_active
      `,
        [
          crypto.randomUUID(),
          username,
          email,
          hashedPassword,
          first_name,
          last_name,
          role,
          true,
          false,
          0,
          new Date(),
          new Date(),
        ],
      )

      // Log user creation
      await pool.query(
        `
        INSERT INTO audit_logs (
          id, user_id, action, target_type, target_id, details, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
        [
          crypto.randomUUID(),
          req.user.id,
          "create_user",
          "user",
          result.rows[0].id,
          JSON.stringify({ username, role }),
          req.ip,
          new Date(),
        ],
      )

      res.status(201).json({
        success: true,
        data: {
          user: result.rows[0],
          temp_password: tempPassword,
        },
      })
    } catch (error) {
      console.error("Error creating user:", error)
      res.status(500).json({
        success: false,
        message: "Failed to create user",
      })
    }
  },
)

// Update user
router.put(
  "/users/:id",
  authenticateToken,
  requireRole(["admin"]),
  [
    body("first_name").optional().notEmpty().withMessage("First name cannot be empty"),
    body("last_name").optional().notEmpty().withMessage("Last name cannot be empty"),
    body("role")
      .optional()
      .isIn(["admin", "receptionist", "nurse", "clinical_officer", "pharmacist", "inventory_manager", "claims_manager"])
      .withMessage("Invalid role"),
    body("is_active").optional().isBoolean().withMessage("is_active must be boolean"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { id } = req.params
      const { first_name, last_name, role, is_active } = req.body

      const updates: string[] = []
      const values: any[] = []
      let paramCount = 0

      if (first_name !== undefined) {
        paramCount++
        updates.push(`first_name = $${paramCount}`)
        values.push(first_name)
      }

      if (last_name !== undefined) {
        paramCount++
        updates.push(`last_name = $${paramCount}`)
        values.push(last_name)
      }

      if (role !== undefined) {
        paramCount++
        updates.push(`role = $${paramCount}`)
        values.push(role)
      }

      if (is_active !== undefined) {
        paramCount++
        updates.push(`is_active = $${paramCount}`)
        values.push(is_active)
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No fields to update",
        })
      }

      paramCount++
      updates.push(`updated_at = $${paramCount}`)
      values.push(new Date())

      paramCount++
      values.push(id)

      const result = await pool.query(
        `
        UPDATE users 
        SET ${updates.join(", ")}
        WHERE id = $${paramCount}
        RETURNING id, username, email, first_name, last_name, role, is_active
      `,
        values,
      )

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        })
      }

      // Log user update
      await pool.query(
        `
        INSERT INTO audit_logs (
          id, user_id, action, target_type, target_id, details, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
        [crypto.randomUUID(), req.user.id, "update_user", "user", id, JSON.stringify(req.body), req.ip, new Date()],
      )

      res.json({
        success: true,
        data: result.rows[0],
      })
    } catch (error) {
      console.error("Error updating user:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update user",
      })
    }
  },
)

// Reset user password
router.post("/users/:id/reset-password", authenticateToken, requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params

    // Generate new temporary password
    const tempPassword = Math.random().toString(36).slice(-8)
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    const result = await pool.query(
      `
      UPDATE users 
      SET password_hash = $1, failed_login_attempts = 0, is_locked = false, updated_at = $2
      WHERE id = $3
      RETURNING username
    `,
      [hashedPassword, new Date(), id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Log password reset
    await pool.query(
      `
      INSERT INTO audit_logs (
        id, user_id, action, target_type, target_id, details, ip_address, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
      [
        crypto.randomUUID(),
        req.user.id,
        "reset_password",
        "user",
        id,
        JSON.stringify({ username: result.rows[0].username }),
        req.ip,
        new Date(),
      ],
    )

    res.json({
      success: true,
      data: {
        temp_password: tempPassword,
      },
    })
  } catch (error) {
    console.error("Error resetting password:", error)
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
    })
  }
})

// Upload patient data
router.post("/patients/upload", authenticateToken, requireRole(["admin"]), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      })
    }

    const workbook = XLSX.readFile(req.file.path)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet)

    const importResults = {
      total: data.length,
      imported: 0,
      skipped: 0,
      errors: [] as any[],
    }

    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      for (let i = 0; i < data.length; i++) {
        const row = data[i] as any

        try {
          // Validate required fields
          if (!row.op_number || !row.first_name || !row.last_name) {
            importResults.errors.push({
              row: i + 1,
              error: "Missing required fields (op_number, first_name, last_name)",
              data: row,
            })
            importResults.skipped++
            continue
          }

          // Check if patient already exists
          const existingPatient = await client.query("SELECT id FROM patients WHERE op_number = $1", [row.op_number])

          if (existingPatient.rows.length > 0) {
            // Update existing patient
            await client.query(
              `
                UPDATE patients 
                SET first_name = $1, last_name = $2, date_of_birth = $3, 
                    gender = $4, phone_number = $5, address = $6, 
                    insurance_provider = $7, insurance_number = $8, updated_at = $9
                WHERE op_number = $10
              `,
              [
                row.first_name,
                row.last_name,
                row.date_of_birth ? new Date(row.date_of_birth) : null,
                row.gender,
                row.phone_number,
                row.address,
                row.insurance_provider,
                row.insurance_number,
                new Date(),
                row.op_number,
              ],
            )
          } else {
            // Create new patient
            await client.query(
              `
                INSERT INTO patients (
                  id, op_number, first_name, last_name, date_of_birth, gender,
                  phone_number, address, insurance_provider, insurance_number,
                  created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              `,
              [
                crypto.randomUUID(),
                row.op_number,
                row.first_name,
                row.last_name,
                row.date_of_birth ? new Date(row.date_of_birth) : null,
                row.gender,
                row.phone_number,
                row.address,
                row.insurance_provider,
                row.insurance_number,
                new Date(),
                new Date(),
              ],
            )
          }

          importResults.imported++
        } catch (error) {
          importResults.errors.push({
            row: i + 1,
            error: error instanceof Error ? error.message : "Unknown error",
            data: row,
          })
          importResults.skipped++
        }
      }

      await client.query("COMMIT")

      // Log import
      await pool.query(
        `
          INSERT INTO audit_logs (
            id, user_id, action, target_type, details, ip_address, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          crypto.randomUUID(),
          req.user.id,
          "import_patients",
          "patient",
          JSON.stringify(importResults),
          req.ip,
          new Date(),
        ],
      )

      res.json({
        success: true,
        data: importResults,
      })
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Error importing patients:", error)
    res.status(500).json({
      success: false,
      message: "Failed to import patients",
    })
  }
})

// Get audit logs
router.get("/audit-logs", authenticateToken, requireRole(["admin"]), async (req, res) => {
  try {
    const { action, target_type, user_id, limit = 100, offset = 0 } = req.query

    let query = `
      SELECT al.*, u.username, u.first_name, u.last_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramCount = 0

    if (action) {
      paramCount++
      query += ` AND al.action = $${paramCount}`
      params.push(action)
    }

    if (target_type) {
      paramCount++
      query += ` AND al.target_type = $${paramCount}`
      params.push(target_type)
    }

    if (user_id) {
      paramCount++
      query += ` AND al.user_id = $${paramCount}`
      params.push(user_id)
    }

    query += ` ORDER BY al.created_at DESC`

    if (limit) {
      paramCount++
      query += ` LIMIT $${paramCount}`
      params.push(Number.parseInt(limit as string))
    }

    if (offset) {
      paramCount++
      query += ` OFFSET $${paramCount}`
      params.push(Number.parseInt(offset as string))
    }

    const result = await pool.query(query, params)

    res.json({
      success: true,
      data: result.rows,
    })
  } catch (error) {
    console.error("Error fetching audit logs:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs",
    })
  }
})

export default router
