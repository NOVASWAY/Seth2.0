import { Router } from "express"
import { body, query, validationResult } from "express-validator"
import { pool } from "../config/database"
import { authorize } from "../middleware/auth"
import { UserRole } from "../types"
import { AuthenticatedRequest } from "../types/auth"
import { SHAExportService, ExportFilters, ExportOptions } from "../services/SHAExportService"
import fs from "fs"
import path from "path"

const router = Router()
const exportService = new SHAExportService()

// Export single invoice as PDF
router.post(
  "/invoice/:invoiceId/pdf",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER, UserRole.CLINICAL_OFFICER]),
  [
    body("reason").notEmpty().withMessage("Export reason is required"),
    body("complianceApproved").optional().isBoolean(),
    body("approvedBy").optional().isUUID()
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(err => err.msg)
        })
      }

      const { invoiceId } = req.params
      const { reason, complianceApproved = false, approvedBy } = req.body

      const options: ExportOptions = {
        type: 'PDF',
        scope: 'SINGLE_INVOICE',
        reason,
        complianceApproved,
        approvedBy
      }

      const result = await exportService.exportInvoicePDF(invoiceId, options, req.user!.id)

      res.json({
        success: true,
        data: {
          exportId: result.exportId,
          filename: path.basename(result.filePath),
          downloadUrl: `/api/sha-exports/download/${result.exportId}`
        },
        message: "Invoice PDF generated successfully"
      })

    } catch (error) {
      console.error("Error exporting invoice PDF:", error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to export invoice PDF"
      })
    }
  }
)

// Export multiple invoices as Excel
router.post(
  "/invoices/excel",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER]),
  [
    body("reason").notEmpty().withMessage("Export reason is required"),
    body("filters").optional().isObject(),
    body("filters.dateFrom").optional().isISO8601(),
    body("filters.dateTo").optional().isISO8601(),
    body("filters.claimStatuses").optional().isArray(),
    body("filters.invoiceIds").optional().isArray(),
    body("complianceApproved").optional().isBoolean(),
    body("approvedBy").optional().isUUID()
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(err => err.msg)
        })
      }

      const { reason, filters = {}, complianceApproved = false, approvedBy } = req.body

      const exportFilters: ExportFilters = {
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
        claimStatuses: filters.claimStatuses,
        invoiceIds: filters.invoiceIds
      }

      const options: ExportOptions = {
        type: 'EXCEL',
        scope: 'CUSTOM_FILTER',
        reason,
        complianceApproved,
        approvedBy
      }

      const result = await exportService.exportInvoicesExcel(exportFilters, options, req.user!.id)

      res.json({
        success: true,
        data: {
          exportId: result.exportId,
          filename: path.basename(result.filePath),
          downloadUrl: `/api/sha-exports/download/${result.exportId}`
        },
        message: "Invoices Excel export generated successfully"
      })

    } catch (error) {
      console.error("Error exporting invoices Excel:", error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to export invoices Excel"
      })
    }
  }
)

// Export claims as CSV for SHA portal upload
router.post(
  "/claims/csv",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER]),
  [
    body("reason").notEmpty().withMessage("Export reason is required"),
    body("filters").optional().isObject(),
    body("filters.dateFrom").optional().isISO8601(),
    body("filters.dateTo").optional().isISO8601(),
    body("filters.claimStatuses").optional().isArray(),
    body("complianceApproved").isBoolean().withMessage("Compliance approval required for CSV export"),
    body("approvedBy").isUUID().withMessage("Approver ID required for CSV export")
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(err => err.msg)
        })
      }

      const { reason, filters = {}, complianceApproved, approvedBy } = req.body

      const exportFilters: ExportFilters = {
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
        claimStatuses: filters.claimStatuses || ['READY_TO_SUBMIT']
      }

      const options: ExportOptions = {
        type: 'CSV',
        scope: 'CUSTOM_FILTER',
        reason,
        complianceApproved,
        approvedBy
      }

      const result = await exportService.exportClaimsCSV(exportFilters, options, req.user!.id)

      res.json({
        success: true,
        data: {
          exportId: result.exportId,
          filename: path.basename(result.filePath),
          downloadUrl: `/api/sha-exports/download/${result.exportId}`
        },
        message: "Claims CSV export generated successfully for SHA portal upload"
      })

    } catch (error) {
      console.error("Error exporting claims CSV:", error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to export claims CSV"
      })
    }
  }
)

// Export batch submission report
router.post(
  "/batch/:batchId/report",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER]),
  [
    body("reason").notEmpty().withMessage("Export reason is required"),
    body("complianceApproved").optional().isBoolean(),
    body("approvedBy").optional().isUUID()
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(err => err.msg)
        })
      }

      const { batchId } = req.params
      const { reason, complianceApproved = false, approvedBy } = req.body

      const options: ExportOptions = {
        type: 'PDF',
        scope: 'BATCH',
        reason,
        complianceApproved,
        approvedBy
      }

      const result = await exportService.exportBatchReport(batchId, options, req.user!.id)

      res.json({
        success: true,
        data: {
          exportId: result.exportId,
          filename: path.basename(result.filePath),
          downloadUrl: `/api/sha-exports/download/${result.exportId}`
        },
        message: "Batch report generated successfully"
      })

    } catch (error) {
      console.error("Error exporting batch report:", error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to export batch report"
      })
    }
  }
)

// Download exported file
router.get(
  "/download/:exportId",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER, UserRole.CLINICAL_OFFICER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { exportId } = req.params

      const result = await pool.query(
        `SELECT * FROM sha_export_logs WHERE id = $1`,
        [exportId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Export not found"
        })
      }

      const exportLog = result.rows[0]

      // Check if file exists
      if (!fs.existsSync(exportLog.file_path)) {
        return res.status(404).json({
          success: false,
          message: "Export file not found on disk"
        })
      }

      // Update download count
      await pool.query(
        `UPDATE sha_export_logs 
         SET download_count = download_count + 1
         WHERE id = $1`,
        [exportId]
      )

      // Determine content type based on export type
      let contentType = 'application/octet-stream'
      if (exportLog.export_type === 'PDF') {
        contentType = 'application/pdf'
      } else if (exportLog.export_type === 'EXCEL') {
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      } else if (exportLog.export_type === 'CSV') {
        contentType = 'text/csv'
      }

      // Set headers
      const filename = path.basename(exportLog.file_path)
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.setHeader('Content-Length', exportLog.file_size)

      // Stream file
      const fileStream = fs.createReadStream(exportLog.file_path)
      fileStream.pipe(res)

    } catch (error) {
      console.error("Error downloading export:", error)
      res.status(500).json({
        success: false,
        message: "Failed to download export"
      })
    }
  }
)

// Get export history
router.get(
  "/history",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER]),
  [
    query("exportType").optional().isIn(['PDF', 'EXCEL', 'CSV']),
    query("exportScope").optional().isIn(['SINGLE_INVOICE', 'BATCH', 'DATE_RANGE', 'CUSTOM_FILTER']),
    query("dateFrom").optional().isISO8601(),
    query("dateTo").optional().isISO8601(),
    query("exportedBy").optional().isUUID(),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("offset").optional().isInt({ min: 0 })
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(err => err.msg)
        })
      }

      const {
        exportType,
        exportScope,
        dateFrom,
        dateTo,
        exportedBy,
        limit = 50,
        offset = 0
      } = req.query

      let whereClause = "WHERE 1=1"
      const params: any[] = []
      let paramCount = 1

      if (exportType) {
        whereClause += ` AND e.export_type = $${paramCount++}`
        params.push(exportType)
      }

      if (exportScope) {
        whereClause += ` AND e.export_scope = $${paramCount++}`
        params.push(exportScope)
      }

      if (dateFrom) {
        whereClause += ` AND e.exported_at >= $${paramCount++}`
        params.push(new Date(dateFrom as string))
      }

      if (dateTo) {
        whereClause += ` AND e.exported_at <= $${paramCount++}`
        params.push(new Date(dateTo as string))
      }

      if (exportedBy) {
        whereClause += ` AND e.exported_by = $${paramCount++}`
        params.push(exportedBy)
      }

      params.push(limit, offset)

      const result = await pool.query(`
        SELECT e.*,
               u1.username as exported_by_name,
               u2.username as approved_by_name
        FROM sha_export_logs e
        JOIN users u1 ON e.exported_by = u1.id
        LEFT JOIN users u2 ON e.approved_by = u2.id
        ${whereClause}
        ORDER BY e.exported_at DESC
        LIMIT $${paramCount++} OFFSET $${paramCount++}
      `, params)

      // Get total count
      const countResult = await pool.query(`
        SELECT COUNT(*) as total
        FROM sha_export_logs e
        ${whereClause.replace(/LIMIT.*$/, '')}
      `, params.slice(0, -2))

      res.json({
        success: true,
        data: {
          exports: result.rows,
          pagination: {
            total: Number.parseInt(countResult.rows[0].total),
            limit: Number.parseInt(limit as string),
            offset: Number.parseInt(offset as string),
            hasMore: Number.parseInt(countResult.rows[0].total) > Number.parseInt(offset as string) + Number.parseInt(limit as string)
          }
        },
        message: `Found ${result.rows.length} export records`
      })

    } catch (error) {
      console.error("Error fetching export history:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch export history"
      })
    }
  }
)

// Delete export file (cleanup)
router.delete(
  "/:exportId",
  authorize([UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { exportId } = req.params

      const result = await pool.query(
        `SELECT * FROM sha_export_logs WHERE id = $1`,
        [exportId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Export not found"
        })
      }

      const exportLog = result.rows[0]

      // Delete file from disk
      if (fs.existsSync(exportLog.file_path)) {
        fs.unlinkSync(exportLog.file_path)
      }

      // Delete from database
      await pool.query(
        `DELETE FROM sha_export_logs WHERE id = $1`,
        [exportId]
      )

      res.json({
        success: true,
        message: "Export deleted successfully"
      })

    } catch (error) {
      console.error("Error deleting export:", error)
      res.status(500).json({
        success: false,
        message: "Failed to delete export"
      })
    }
  }
)

// Get export statistics
router.get(
  "/statistics",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER]),
  [
    query("period").optional().isIn(['week', 'month', 'quarter', 'year']),
    query("dateFrom").optional().isISO8601(),
    query("dateTo").optional().isISO8601()
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const { period = 'month', dateFrom, dateTo } = req.query

      let dateFilter = ""
      const params: any[] = []

      if (dateFrom && dateTo) {
        dateFilter = "WHERE exported_at BETWEEN $1 AND $2"
        params.push(new Date(dateFrom as string), new Date(dateTo as string))
      } else {
        // Default to current period
        const now = new Date()
        let startDate: Date

        switch (period) {
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case 'quarter':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
            break
          case 'year':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
            break
          default: // month
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        }

        dateFilter = "WHERE exported_at >= $1"
        params.push(startDate)
      }

      const stats = await pool.query(`
        SELECT 
          export_type,
          export_scope,
          COUNT(*) as count,
          SUM(total_records) as total_records,
          SUM(file_size) as total_file_size,
          SUM(download_count) as total_downloads,
          COUNT(CASE WHEN compliance_approved THEN 1 END) as approved_exports
        FROM sha_export_logs
        ${dateFilter}
        GROUP BY export_type, export_scope
        ORDER BY export_type, export_scope
      `, params)

      const summary = await pool.query(`
        SELECT 
          COUNT(*) as total_exports,
          SUM(total_records) as total_records_exported,
          SUM(file_size) as total_storage_used,
          SUM(download_count) as total_downloads,
          COUNT(DISTINCT exported_by) as unique_exporters,
          COUNT(CASE WHEN compliance_approved THEN 1 END) as approved_exports,
          AVG(file_size) as avg_file_size
        FROM sha_export_logs
        ${dateFilter}
      `, params)

      res.json({
        success: true,
        data: {
          period: period,
          summary: summary.rows[0],
          breakdown: stats.rows
        },
        message: "Export statistics retrieved successfully"
      })

    } catch (error) {
      console.error("Error fetching export statistics:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch export statistics"
      })
    }
  }
)

export default router
