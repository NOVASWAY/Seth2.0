import express from "express"
import { requireRole } from "../middleware/auth"
import { AuditLog } from "../models/AuditLog"

const router = express.Router()

// Get audit logs with filtering and pagination
router.get("/", requireRole(["admin"]), async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, action, resource, startDate, endDate, opNumber } = req.query

    const offset = (Number(page) - 1) * Number(limit)

    let whereClause = "WHERE 1=1"
    const params: any[] = []
    let paramIndex = 1

    if (userId) {
      whereClause += ` AND user_id = $${paramIndex++}`
      params.push(userId)
    }

    if (action) {
      whereClause += ` AND action = $${paramIndex++}`
      params.push(action)
    }

    if (resource) {
      whereClause += ` AND resource = $${paramIndex++}`
      params.push(resource)
    }

    if (opNumber) {
      whereClause += ` AND op_number = $${paramIndex++}`
      params.push(opNumber)
    }

    if (startDate) {
      whereClause += ` AND created_at >= $${paramIndex++}`
      params.push(startDate)
    }

    if (endDate) {
      whereClause += ` AND created_at <= $${paramIndex++}`
      params.push(endDate)
    }

    const countQuery = `SELECT COUNT(*) FROM audit_logs ${whereClause}`
    const dataQuery = `
      SELECT al.*, u.username, u.full_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `

    params.push(Number(limit), offset)

    const [countResult, dataResult] = await Promise.all([
      AuditLog.query(countQuery, params.slice(0, -2)),
      AuditLog.query(dataQuery, params),
    ])

    const total = Number.parseInt(countResult.rows[0].count)
    const totalPages = Math.ceil(total / Number(limit))

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1,
      },
    })
  } catch (error) {
    console.error("Error fetching audit logs:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs",
    })
  }
})

// Get audit log by ID
router.get("/:id", requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params

    const result = await AuditLog.query(
      `
      SELECT al.*, u.username, u.full_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.id = $1
      `,
      [id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found",
      })
    }

    res.json({
      success: true,
      data: result.rows[0],
    })
  } catch (error) {
    console.error("Error fetching audit log:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit log",
    })
  }
})

// Export audit logs to CSV
router.get("/export/csv", requireRole(["admin"]), async (req, res) => {
  try {
    const { userId, action, resource, startDate, endDate, opNumber } = req.query

    let whereClause = "WHERE 1=1"
    const params: any[] = []
    let paramIndex = 1

    if (userId) {
      whereClause += ` AND user_id = $${paramIndex++}`
      params.push(userId)
    }

    if (action) {
      whereClause += ` AND action = $${paramIndex++}`
      params.push(action)
    }

    if (resource) {
      whereClause += ` AND resource = $${paramIndex++}`
      params.push(resource)
    }

    if (opNumber) {
      whereClause += ` AND op_number = $${paramIndex++}`
      params.push(opNumber)
    }

    if (startDate) {
      whereClause += ` AND created_at >= $${paramIndex++}`
      params.push(startDate)
    }

    if (endDate) {
      whereClause += ` AND created_at <= $${paramIndex++}`
      params.push(endDate)
    }

    const query = `
      SELECT 
        al.id,
        al.user_id,
        u.username,
        u.full_name,
        al.action,
        al.resource,
        al.resource_id,
        al.op_number,
        al.details,
        al.ip_address,
        al.user_agent,
        al.created_at
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
    `

    const result = await AuditLog.query(query, params)

    // Convert to CSV
    const headers = [
      "ID",
      "User ID",
      "Username",
      "Full Name",
      "Action",
      "Resource",
      "Resource ID",
      "OP Number",
      "Details",
      "IP Address",
      "User Agent",
      "Created At",
    ]

    const csvRows = [headers.join(",")]

    result.rows.forEach((row) => {
      const values = [
        row.id,
        row.user_id || "",
        row.username || "",
        row.full_name || "",
        row.action,
        row.resource,
        row.resource_id || "",
        row.op_number || "",
        JSON.stringify(row.details || {}),
        row.ip_address || "",
        row.user_agent || "",
        row.created_at,
      ]
      csvRows.push(values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    })

    const csv = csvRows.join("\n")
    const filename = `audit_logs_${new Date().toISOString().split("T")[0]}.csv`

    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.send(csv)
  } catch (error) {
    console.error("Error exporting audit logs:", error)
    res.status(500).json({
      success: false,
      message: "Failed to export audit logs",
    })
  }
})

export default router
