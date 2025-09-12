"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const SHAExportService_1 = require("../services/SHAExportService");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const router = (0, express_1.Router)();
const exportService = new SHAExportService_1.SHAExportService();
// Export single invoice as PDF
router.post("/invoice/:invoiceId/pdf", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLAIMS_MANAGER, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.RECEPTIONIST]), [
    (0, express_validator_1.body)("reason").notEmpty().withMessage("Export reason is required"),
    (0, express_validator_1.body)("complianceApproved").optional().isBoolean(),
    (0, express_validator_1.body)("approvedBy").optional().isUUID()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const { invoiceId } = req.params;
        const { reason, complianceApproved = false, approvedBy } = req.body;
        const options = {
            type: 'PDF',
            scope: 'SINGLE_INVOICE',
            reason,
            complianceApproved,
            approvedBy
        };
        const result = await exportService.exportInvoicePDF(invoiceId, options, req.user.id);
        res.json({
            success: true,
            data: {
                exportId: result.exportId,
                filename: path.basename(result.filePath),
                downloadUrl: `/api/sha-exports/download/${result.exportId}`
            },
            message: "Invoice PDF generated successfully"
        });
    }
    catch (error) {
        console.error("Error exporting invoice PDF:", error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to export invoice PDF"
        });
    }
});
// Export multiple invoices as Excel
router.post("/invoices/excel", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLAIMS_MANAGER]), [
    (0, express_validator_1.body)("reason").notEmpty().withMessage("Export reason is required"),
    (0, express_validator_1.body)("filters").optional().isObject(),
    (0, express_validator_1.body)("filters.dateFrom").optional().isISO8601(),
    (0, express_validator_1.body)("filters.dateTo").optional().isISO8601(),
    (0, express_validator_1.body)("filters.claimStatuses").optional().isArray(),
    (0, express_validator_1.body)("filters.invoiceIds").optional().isArray(),
    (0, express_validator_1.body)("complianceApproved").optional().isBoolean(),
    (0, express_validator_1.body)("approvedBy").optional().isUUID()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const { reason, filters = {}, complianceApproved = false, approvedBy } = req.body;
        const exportFilters = {
            dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
            dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
            claimStatuses: filters.claimStatuses,
            invoiceIds: filters.invoiceIds
        };
        const options = {
            type: 'EXCEL',
            scope: 'CUSTOM_FILTER',
            reason,
            complianceApproved,
            approvedBy
        };
        const result = await exportService.exportInvoicesExcel(exportFilters, options, req.user.id);
        res.json({
            success: true,
            data: {
                exportId: result.exportId,
                filename: path.basename(result.filePath),
                downloadUrl: `/api/sha-exports/download/${result.exportId}`
            },
            message: "Invoices Excel export generated successfully"
        });
    }
    catch (error) {
        console.error("Error exporting invoices Excel:", error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to export invoices Excel"
        });
    }
});
// Export claims as CSV for SHA portal upload
router.post("/claims/csv", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLAIMS_MANAGER]), [
    (0, express_validator_1.body)("reason").notEmpty().withMessage("Export reason is required"),
    (0, express_validator_1.body)("filters").optional().isObject(),
    (0, express_validator_1.body)("filters.dateFrom").optional().isISO8601(),
    (0, express_validator_1.body)("filters.dateTo").optional().isISO8601(),
    (0, express_validator_1.body)("filters.claimStatuses").optional().isArray(),
    (0, express_validator_1.body)("complianceApproved").isBoolean().withMessage("Compliance approval required for CSV export"),
    (0, express_validator_1.body)("approvedBy").isUUID().withMessage("Approver ID required for CSV export")
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const { reason, filters = {}, complianceApproved, approvedBy } = req.body;
        const exportFilters = {
            dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
            dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
            claimStatuses: filters.claimStatuses || ['READY_TO_SUBMIT']
        };
        const options = {
            type: 'CSV',
            scope: 'CUSTOM_FILTER',
            reason,
            complianceApproved,
            approvedBy
        };
        const result = await exportService.exportClaimsCSV(exportFilters, options, req.user.id);
        res.json({
            success: true,
            data: {
                exportId: result.exportId,
                filename: path.basename(result.filePath),
                downloadUrl: `/api/sha-exports/download/${result.exportId}`
            },
            message: "Claims CSV export generated successfully for SHA portal upload"
        });
    }
    catch (error) {
        console.error("Error exporting claims CSV:", error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to export claims CSV"
        });
    }
});
// Export batch submission report
router.post("/batch/:batchId/report", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLAIMS_MANAGER]), [
    (0, express_validator_1.body)("reason").notEmpty().withMessage("Export reason is required"),
    (0, express_validator_1.body)("complianceApproved").optional().isBoolean(),
    (0, express_validator_1.body)("approvedBy").optional().isUUID()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const { batchId } = req.params;
        const { reason, complianceApproved = false, approvedBy } = req.body;
        const options = {
            type: 'PDF',
            scope: 'BATCH',
            reason,
            complianceApproved,
            approvedBy
        };
        const result = await exportService.exportBatchReport(batchId, options, req.user.id);
        res.json({
            success: true,
            data: {
                exportId: result.exportId,
                filename: path.basename(result.filePath),
                downloadUrl: `/api/sha-exports/download/${result.exportId}`
            },
            message: "Batch report generated successfully"
        });
    }
    catch (error) {
        console.error("Error exporting batch report:", error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to export batch report"
        });
    }
});
// Download exported file
router.get("/download/:exportId", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLAIMS_MANAGER, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.RECEPTIONIST]), async (req, res) => {
    try {
        const { exportId } = req.params;
        const result = await database_1.pool.query(`SELECT * FROM sha_export_logs WHERE id = $1`, [exportId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Export not found"
            });
        }
        const exportLog = result.rows[0];
        // Check if file exists
        if (!fs.existsSync(exportLog.file_path)) {
            return res.status(404).json({
                success: false,
                message: "Export file not found on disk"
            });
        }
        // Update download count
        await database_1.pool.query(`UPDATE sha_export_logs 
         SET download_count = download_count + 1
         WHERE id = $1`, [exportId]);
        // Determine content type based on export type
        let contentType = 'application/octet-stream';
        if (exportLog.export_type === 'PDF') {
            contentType = 'application/pdf';
        }
        else if (exportLog.export_type === 'EXCEL') {
            contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        }
        else if (exportLog.export_type === 'CSV') {
            contentType = 'text/csv';
        }
        // Set headers
        const filename = path.basename(exportLog.file_path);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', exportLog.file_size);
        // Stream file
        const fileStream = fs.createReadStream(exportLog.file_path);
        fileStream.pipe(res);
    }
    catch (error) {
        console.error("Error downloading export:", error);
        res.status(500).json({
            success: false,
            message: "Failed to download export"
        });
    }
});
// Get export history
router.get("/history", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLAIMS_MANAGER]), [
    (0, express_validator_1.query)("exportType").optional().isIn(['PDF', 'EXCEL', 'CSV']),
    (0, express_validator_1.query)("exportScope").optional().isIn(['SINGLE_INVOICE', 'BATCH', 'DATE_RANGE', 'CUSTOM_FILTER']),
    (0, express_validator_1.query)("dateFrom").optional().isISO8601(),
    (0, express_validator_1.query)("dateTo").optional().isISO8601(),
    (0, express_validator_1.query)("exportedBy").optional().isUUID(),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)("offset").optional().isInt({ min: 0 })
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const { exportType, exportScope, dateFrom, dateTo, exportedBy, limit = 50, offset = 0 } = req.query;
        let whereClause = "WHERE 1=1";
        const params = [];
        let paramCount = 1;
        if (exportType) {
            whereClause += ` AND e.export_type = $${paramCount++}`;
            params.push(exportType);
        }
        if (exportScope) {
            whereClause += ` AND e.export_scope = $${paramCount++}`;
            params.push(exportScope);
        }
        if (dateFrom) {
            whereClause += ` AND e.exported_at >= $${paramCount++}`;
            params.push(new Date(dateFrom));
        }
        if (dateTo) {
            whereClause += ` AND e.exported_at <= $${paramCount++}`;
            params.push(new Date(dateTo));
        }
        if (exportedBy) {
            whereClause += ` AND e.exported_by = $${paramCount++}`;
            params.push(exportedBy);
        }
        params.push(limit, offset);
        const result = await database_1.pool.query(`
        SELECT e.*,
               u1.username as exported_by_name,
               u2.username as approved_by_name
        FROM sha_export_logs e
        JOIN users u1 ON e.exported_by = u1.id
        LEFT JOIN users u2 ON e.approved_by = u2.id
        ${whereClause}
        ORDER BY e.exported_at DESC
        LIMIT $${paramCount++} OFFSET $${paramCount++}
      `, params);
        // Get total count
        const countResult = await database_1.pool.query(`
        SELECT COUNT(*) as total
        FROM sha_export_logs e
        ${whereClause.replace(/LIMIT.*$/, '')}
      `, params.slice(0, -2));
        res.json({
            success: true,
            data: {
                exports: result.rows,
                pagination: {
                    total: Number.parseInt(countResult.rows[0].total),
                    limit: Number.parseInt(limit),
                    offset: Number.parseInt(offset),
                    hasMore: Number.parseInt(countResult.rows[0].total) > Number.parseInt(offset) + Number.parseInt(limit)
                }
            },
            message: `Found ${result.rows.length} export records`
        });
    }
    catch (error) {
        console.error("Error fetching export history:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch export history"
        });
    }
});
// Delete export file (cleanup)
router.delete("/:exportId", (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { exportId } = req.params;
        const result = await database_1.pool.query(`SELECT * FROM sha_export_logs WHERE id = $1`, [exportId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Export not found"
            });
        }
        const exportLog = result.rows[0];
        // Delete file from disk
        if (fs.existsSync(exportLog.file_path)) {
            fs.unlinkSync(exportLog.file_path);
        }
        // Delete from database
        await database_1.pool.query(`DELETE FROM sha_export_logs WHERE id = $1`, [exportId]);
        res.json({
            success: true,
            message: "Export deleted successfully"
        });
    }
    catch (error) {
        console.error("Error deleting export:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete export"
        });
    }
});
// Get export statistics
router.get("/statistics", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLAIMS_MANAGER]), [
    (0, express_validator_1.query)("period").optional().isIn(['week', 'month', 'quarter', 'year']),
    (0, express_validator_1.query)("dateFrom").optional().isISO8601(),
    (0, express_validator_1.query)("dateTo").optional().isISO8601()
], async (req, res) => {
    try {
        const { period = 'month', dateFrom, dateTo } = req.query;
        let dateFilter = "";
        const params = [];
        if (dateFrom && dateTo) {
            dateFilter = "WHERE exported_at BETWEEN $1 AND $2";
            params.push(new Date(dateFrom), new Date(dateTo));
        }
        else {
            // Default to current period
            const now = new Date();
            let startDate;
            switch (period) {
                case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'quarter':
                    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    break;
                case 'year':
                    startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                    break;
                default: // month
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            }
            dateFilter = "WHERE exported_at >= $1";
            params.push(startDate);
        }
        const stats = await database_1.pool.query(`
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
      `, params);
        const summary = await database_1.pool.query(`
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
      `, params);
        res.json({
            success: true,
            data: {
                period: period,
                summary: summary.rows[0],
                breakdown: stats.rows
            },
            message: "Export statistics retrieved successfully"
        });
    }
    catch (error) {
        console.error("Error fetching export statistics:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch export statistics"
        });
    }
});
exports.default = router;
