import express from "express"
import { requireRole } from "../middleware/auth"
import { auditLog } from "../middleware/auditLogger"
import { UserRole } from "../types"
import { Invoice } from "../models/Invoice"

const router = express.Router()

// Get all invoices with pagination and filtering
router.get("/", requireRole([UserRole.ADMIN, UserRole.PHARMACIST, UserRole.CLAIMS_MANAGER]), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, patientId, opNumber, startDate, endDate } = req.query

    const offset = (Number(page) - 1) * Number(limit)

    let whereClause = "WHERE 1=1"
    const params: any[] = []
    let paramIndex = 1

    if (status) {
      whereClause += ` AND i.status = $${paramIndex++}`
      params.push(status)
    }

    if (patientId) {
      whereClause += ` AND i.patient_id = $${paramIndex++}`
      params.push(patientId)
    }

    if (opNumber) {
      whereClause += ` AND p.op_number = $${paramIndex++}`
      params.push(opNumber)
    }

    if (startDate) {
      whereClause += ` AND i.created_at >= $${paramIndex++}`
      params.push(startDate)
    }

    if (endDate) {
      whereClause += ` AND i.created_at <= $${paramIndex++}`
      params.push(endDate)
    }

    const countQuery = `
      SELECT COUNT(*) 
      FROM invoices i
      LEFT JOIN patients p ON i.patient_id = p.id
      ${whereClause}
    `

    const dataQuery = `
      SELECT 
        i.*,
        p.op_number,
        p.first_name,
        p.last_name,
        p.phone_number,
        (
          SELECT COALESCE(SUM(amount), 0)
          FROM payments 
          WHERE invoice_id = i.id
        ) as paid_amount
      FROM invoices i
      LEFT JOIN patients p ON i.patient_id = p.id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `

    params.push(Number(limit), offset)

    const [countResult, dataResult] = await Promise.all([
      Invoice.query(countQuery, params.slice(0, -2)),
      Invoice.query(dataQuery, params),
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
    console.error("Error fetching invoices:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch invoices",
    })
  }
})

// Get invoice by ID with line items
router.get("/:id", requireRole([UserRole.ADMIN, UserRole.PHARMACIST, UserRole.CLAIMS_MANAGER]), async (req, res) => {
  try {
    const { id } = req.params

    const invoiceQuery = `
      SELECT 
        i.*,
        p.op_number,
        p.first_name,
        p.last_name,
        p.phone_number,
        p.insurance_number,
        p.insurance_provider,
        (
          SELECT COALESCE(SUM(amount), 0)
          FROM payments 
          WHERE invoice_id = i.id
        ) as paid_amount
      FROM invoices i
      LEFT JOIN patients p ON i.patient_id = p.id
      WHERE i.id = $1
    `

    const lineItemsQuery = `
      SELECT 
        il.*,
        ii.name as item_name,
        ii.unit
      FROM invoice_lines il
      LEFT JOIN inventory_items ii ON il.item_id = ii.id
      WHERE il.invoice_id = $1
      ORDER BY il.created_at
    `

    const paymentsQuery = `
      SELECT *
      FROM payments
      WHERE invoice_id = $1
      ORDER BY created_at DESC
    `

    const [invoiceResult, lineItemsResult, paymentsResult] = await Promise.all([
      Invoice.query(invoiceQuery, [id]),
      Invoice.query(lineItemsQuery, [id]),
      Invoice.query(paymentsQuery, [id]),
    ])

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      })
    }

    const invoice = invoiceResult.rows[0]
    invoice.line_items = lineItemsResult.rows
    invoice.payments = paymentsResult.rows

    res.json({
      success: true,
      data: invoice,
    })
  } catch (error) {
    console.error("Error fetching invoice:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch invoice",
    })
  }
})

// Update invoice status
router.patch("/:id/status", requireRole([UserRole.ADMIN, UserRole.PHARMACIST]), async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!["draft", "pending", "paid", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      })
    }

    const result = await Invoice.query(
      `
      UPDATE invoices 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
      `,
      [status, id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      })
    }

    await auditLog({
      userId: req.user?.id,
      action: "update",
      resource: "invoice",
      resourceId: id,
      details: { status, previousStatus: result.rows[0].status },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    })

    res.json({
      success: true,
      data: result.rows[0],
      message: "Invoice status updated successfully",
    })
  } catch (error) {
    console.error("Error updating invoice status:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update invoice status",
    })
  }
})

// Delete invoice (admin only)
router.delete("/:id", requireRole([UserRole.ADMIN]), async (req, res) => {
  try {
    const { id } = req.params

    // Check if invoice has payments
    const paymentsResult = await Invoice.query("SELECT COUNT(*) FROM payments WHERE invoice_id = $1", [id])

    if (Number.parseInt(paymentsResult.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete invoice with payments",
      })
    }

    // Delete line items first
    await Invoice.query("DELETE FROM invoice_lines WHERE invoice_id = $1", [id])

    // Delete invoice
    const result = await Invoice.query("DELETE FROM invoices WHERE id = $1 RETURNING *", [id])

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      })
    }

    await auditLog({
      userId: req.user?.id,
      action: "delete",
      resource: "invoice",
      resourceId: id,
      details: { deletedInvoice: result.rows[0] },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    })

    res.json({
      success: true,
      message: "Invoice deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting invoice:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete invoice",
    })
  }
})

export default router
