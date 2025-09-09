"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const database_1 = require("../config/database");
const invoiceUtils_1 = require("../utils/invoiceUtils");
const SHAService_1 = require("../services/SHAService");
const crypto_1 = __importDefault(require("crypto"));
const router = express_1.default.Router();
const shaService = new SHAService_1.SHAService();
router.get("/", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLAIMS_MANAGER, types_1.UserRole.CLINICAL_OFFICER]), [
    (0, express_validator_1.query)("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
    (0, express_validator_1.query)("status").optional().isString().withMessage("Status must be a string"),
    (0, express_validator_1.query)("startDate").optional().isISO8601().withMessage("Start date must be valid"),
    (0, express_validator_1.query)("endDate").optional().isISO8601().withMessage("End date must be valid"),
    (0, express_validator_1.query)("search").optional().isString().withMessage("Search must be a string"),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const { status, startDate, endDate, search } = req.query;
        let whereClause = "WHERE 1=1";
        const params = [];
        let paramCount = 0;
        if (status) {
            paramCount++;
            whereClause += ` AND i.status = $${paramCount}`;
            params.push(status);
        }
        if (startDate) {
            paramCount++;
            whereClause += ` AND i.invoice_date >= $${paramCount}`;
            params.push(startDate);
        }
        if (endDate) {
            paramCount++;
            whereClause += ` AND i.invoice_date <= $${paramCount}`;
            params.push(endDate);
        }
        if (search) {
            paramCount++;
            whereClause += ` AND (i.invoice_number ILIKE $${paramCount} OR p.first_name ILIKE $${paramCount} OR p.last_name ILIKE $${paramCount} OR p.op_number ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }
        const result = await database_1.pool.query(`SELECT 
          i.*,
          c.claim_number,
          p.op_number,
          p.first_name,
          p.last_name,
          p.insurance_number,
          u.username as generated_by_username
         FROM sha_invoices i
         JOIN sha_claims c ON i.claim_id = c.id
         JOIN patients p ON i.patient_id = p.id
         JOIN users u ON i.generated_by = u.id
         ${whereClause}
         ORDER BY i.created_at DESC
         LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`, [...params, limit, offset]);
        const countResult = await database_1.pool.query(`SELECT COUNT(*) as total
         FROM sha_invoices i
         JOIN sha_claims c ON i.claim_id = c.id
         JOIN patients p ON i.patient_id = p.id
         ${whereClause}`, params);
        const total = parseInt(countResult.rows[0].total);
        res.json({
            success: true,
            data: {
                invoices: result.rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    }
    catch (error) {
        console.error("Error fetching SHA invoices:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch SHA invoices"
        });
    }
});
router.get("/:id", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLAIMS_MANAGER, types_1.UserRole.CLINICAL_OFFICER]), async (req, res) => {
    try {
        const { id } = req.params;
        const invoiceData = await shaService.getInvoiceForPrinting(id);
        if (!invoiceData) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found"
            });
        }
        res.json({
            success: true,
            data: invoiceData
        });
    }
    catch (error) {
        console.error("Error fetching SHA invoice:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch SHA invoice"
        });
    }
});
router.post("/generate/:claimId", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLAIMS_MANAGER, types_1.UserRole.CLINICAL_OFFICER]), async (req, res) => {
    try {
        const { claimId } = req.params;
        const result = await shaService.generateInvoiceForClaim(claimId, req.user.id);
        res.status(201).json({
            success: true,
            data: result.invoice,
            message: result.message
        });
    }
    catch (error) {
        console.error("Error generating SHA invoice:", error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to generate SHA invoice"
        });
    }
});
router.post("/submit/:claimId", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLAIMS_MANAGER]), async (req, res) => {
    try {
        const { claimId } = req.params;
        const result = await shaService.submitSingleClaim(claimId, req.user.id);
        res.json({
            success: true,
            data: result.data,
            message: result.message
        });
    }
    catch (error) {
        console.error("Error submitting claim to SHA:", error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to submit claim to SHA"
        });
    }
});
router.get("/ready-for-review", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLAIMS_MANAGER, types_1.UserRole.CLINICAL_OFFICER]), async (req, res) => {
    try {
        const invoices = await shaService.getInvoicesReadyForReview();
        res.json({
            success: true,
            data: invoices,
            message: `Found ${invoices.length} invoices ready for review and printing`
        });
    }
    catch (error) {
        console.error("Error fetching invoices ready for review:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch invoices ready for review"
        });
    }
});
router.get("/submitted-archive", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLAIMS_MANAGER]), [
    (0, express_validator_1.query)("startDate").optional().isISO8601().withMessage("Start date must be valid"),
    (0, express_validator_1.query)("endDate").optional().isISO8601().withMessage("End date must be valid"),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const { startDate, endDate } = req.query;
        const invoices = await shaService.getSubmittedInvoices(startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
        res.json({
            success: true,
            data: invoices,
            message: `Found ${invoices.length} submitted invoices in archive`
        });
    }
    catch (error) {
        console.error("Error fetching submitted invoices:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch submitted invoices"
        });
    }
});
router.post("/generate/batch/:batchId", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLAIMS_MANAGER]), async (req, res) => {
    try {
        const { batchId } = req.params;
        const batchResult = await database_1.pool.query(`SELECT * FROM sha_claim_batches WHERE id = $1`, [batchId]);
        if (batchResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Batch not found"
            });
        }
        const invoices = await shaService.generateInvoicesForBatch(batchId, req.user.id);
        res.status(201).json({
            success: true,
            data: invoices,
            message: `Generated ${invoices.length} invoices successfully`
        });
    }
    catch (error) {
        console.error("Error generating batch invoices:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate batch invoices"
        });
    }
});
router.patch("/:id/print", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLAIMS_MANAGER, types_1.UserRole.CLINICAL_OFFICER]), async (req, res) => {
    try {
        const { id } = req.params;
        await shaService.markInvoiceAsPrinted(id, req.user.id);
        res.json({
            success: true,
            message: "Invoice marked as printed successfully"
        });
    }
    catch (error) {
        console.error("Error marking invoice as printed:", error);
        res.status(500).json({
            success: false,
            message: "Failed to mark invoice as printed"
        });
    }
});
router.patch("/:id/submit", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLAIMS_MANAGER]), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await shaService.submitInvoiceToSHA(id, req.user.id);
        if (result.success) {
            res.json({
                success: true,
                data: result.data,
                message: "Invoice submitted to SHA successfully"
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: "Failed to submit invoice to SHA",
                error: result.error
            });
        }
    }
    catch (error) {
        console.error("Error submitting invoice to SHA:", error);
        res.status(500).json({
            success: false,
            message: "Failed to submit invoice to SHA"
        });
    }
});
router.get("/ready-for-printing/:batchType", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLAIMS_MANAGER]), async (req, res) => {
    try {
        const { batchType } = req.params;
        if (!["weekly", "monthly"].includes(batchType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid batch type. Must be 'weekly' or 'monthly'"
            });
        }
        const invoices = await shaService.getInvoicesReadyForPrinting(batchType);
        res.json({
            success: true,
            data: invoices,
            message: `Found ${invoices.length} invoices ready for printing`
        });
    }
    catch (error) {
        console.error("Error fetching invoices ready for printing:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch invoices ready for printing"
        });
    }
});
router.get("/compliance/report", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLAIMS_MANAGER]), [
    (0, express_validator_1.query)("startDate").isISO8601().withMessage("Start date is required and must be valid"),
    (0, express_validator_1.query)("endDate").isISO8601().withMessage("End date is required and must be valid"),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const { startDate, endDate } = req.query;
        const report = await shaService.getComplianceReport(new Date(startDate), new Date(endDate));
        const summary = {
            totalClaims: report.length,
            totalInvoicesGenerated: report.filter((r) => r.invoice_number).length,
            totalInvoicesPrinted: report.filter((r) => r.printed_at).length,
            totalInvoicesSubmitted: report.filter((r) => r.submitted_at).length,
            complianceIssues: report.filter((r) => r.compliance_status === 'rejected').length,
            pendingCompliance: report.filter((r) => r.compliance_status === 'pending').length
        };
        res.json({
            success: true,
            data: {
                summary,
                details: report
            }
        });
    }
    catch (error) {
        console.error("Error generating compliance report:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate compliance report"
        });
    }
});
router.patch("/bulk/print", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLAIMS_MANAGER]), [
    (0, express_validator_1.body)("invoiceIds").isArray({ min: 1 }).withMessage("Invoice IDs array is required"),
    (0, express_validator_1.body)("invoiceIds.*").isUUID().withMessage("All invoice IDs must be valid UUIDs"),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const { invoiceIds } = req.body;
        const results = [];
        for (const invoiceId of invoiceIds) {
            try {
                await shaService.markInvoiceAsPrinted(invoiceId, req.user.id);
                results.push({ invoiceId, success: true });
            }
            catch (error) {
                results.push({
                    invoiceId,
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error"
                });
            }
        }
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        res.json({
            success: true,
            data: {
                total: invoiceIds.length,
                successful,
                failed,
                results
            },
            message: `Bulk print completed: ${successful} successful, ${failed} failed`
        });
    }
    catch (error) {
        console.error("Error bulk printing invoices:", error);
        res.status(500).json({
            success: false,
            message: "Failed to bulk print invoices"
        });
    }
});
router.get("/:id/audit", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLAIMS_MANAGER]), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await database_1.pool.query(`SELECT 
          at.*,
          u.username as performed_by_username
         FROM sha_audit_trail at
         JOIN users u ON at.performed_by = u.id
         WHERE at.invoice_id = $1
         ORDER BY at.performed_at DESC`, [id]);
        res.json({
            success: true,
            data: result.rows
        });
    }
    catch (error) {
        console.error("Error fetching audit trail:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch audit trail"
        });
    }
});
router.post("/generate-comprehensive/:claimId", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.CLAIMS_MANAGER]), async (req, res) => {
    try {
        const { claimId } = req.params;
        const claimResult = await database_1.pool.query(`SELECT 
          c.*,
          p.op_number, p.first_name, p.last_name, p.insurance_number, p.phone_number,
          p.date_of_birth, p.gender, p.area,
          u.username as created_by_username
         FROM sha_claims c
         JOIN patients p ON c.patient_id = p.id
         JOIN users u ON c.created_by = u.id
         WHERE c.id = $1`, [claimId]);
        if (claimResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "SHA claim not found"
            });
        }
        const claim = claimResult.rows[0];
        const clinicalDataQuery = `
        SELECT 
          -- Patient encounters
          pe.id as encounter_id, pe.encounter_type, pe.encounter_date, pe.chief_complaint,
          pe.department, pe.location, pe.sha_eligible,
          -- Diagnoses
          d.diagnosis_code, d.diagnosis_description, d.diagnosis_type,
          -- Prescriptions
          pr.id as prescription_id, pr.status as prescription_status,
          pi.item_name, pi.dosage, pi.frequency, pi.duration, pi.quantity_prescribed,
          -- Lab requests
          lr.id as lab_request_id, lr.status as lab_status, lr.urgency,
          lri.test_name, lri.test_code, lri.cost as test_cost, lri.result,
          -- Services
          s.service_name, s.service_code, s.cost as service_cost, s.quantity as service_quantity
        FROM patient_encounters pe
        LEFT JOIN encounter_diagnoses ed ON pe.id = ed.encounter_id
        LEFT JOIN diagnoses d ON ed.diagnosis_id = d.id
        LEFT JOIN prescriptions pr ON pe.id = pr.consultation_id
        LEFT JOIN prescription_items pi ON pr.id = pi.prescription_id
        LEFT JOIN lab_requests lr ON pe.visit_id = lr.visit_id
        LEFT JOIN lab_request_items lri ON lr.id = lri.lab_request_id
        LEFT JOIN encounter_services es ON pe.id = es.encounter_id
        LEFT JOIN services s ON es.service_id = s.id
        WHERE pe.patient_id = $1 AND pe.visit_id = $2
        ORDER BY pe.encounter_date DESC
      `;
        const clinicalResult = await database_1.pool.query(clinicalDataQuery, [claim.patient_id, claim.visit_id]);
        const clinicalData = clinicalResult.rows;
        const invoiceData = {
            patient: {
                name: `${claim.first_name} ${claim.last_name}`,
                op_number: claim.op_number,
                sha_number: claim.insurance_number,
                phone_number: claim.phone_number,
                date_of_birth: claim.date_of_birth,
                gender: claim.gender,
                area: claim.area
            },
            claim: {
                id: claim.id,
                claim_number: claim.claim_number,
                visit_id: claim.visit_id,
                visit_date: claim.visit_date,
                primary_diagnosis_code: claim.primary_diagnosis_code,
                primary_diagnosis_description: claim.primary_diagnosis_description,
                secondary_diagnosis_codes: claim.secondary_diagnosis_codes,
                secondary_diagnosis_descriptions: claim.secondary_diagnosis_descriptions,
                claim_amount: claim.claim_amount,
                status: claim.status,
                created_at: claim.created_at
            },
            services: [],
            diagnoses: [],
            prescriptions: [],
            lab_tests: [],
            invoice: {
                invoice_number: (0, invoiceUtils_1.generateInvoiceNumber)(),
                generated_at: new Date().toISOString(),
                due_date: (0, invoiceUtils_1.calculateInvoiceDueDate)(new Date()),
                total_amount: 0,
                provider_code: claim.provider_code,
                provider_name: claim.provider_name,
                facility_level: claim.facility_level
            }
        };
        let totalAmount = 0;
        const processedServices = new Set();
        const processedDiagnoses = new Set();
        const processedPrescriptions = new Set();
        const processedLabTests = new Set();
        clinicalData.forEach(row => {
            if (row.service_name && !processedServices.has(row.service_name)) {
                const serviceAmount = (parseFloat(row.service_cost) || 0) * (parseInt(row.service_quantity) || 1);
                invoiceData.services.push({
                    service_name: row.service_name,
                    service_code: row.service_code,
                    amount_charged: serviceAmount,
                    quantity: row.service_quantity || 1
                });
                totalAmount += serviceAmount;
                processedServices.add(row.service_name);
            }
            if (row.diagnosis_code && !processedDiagnoses.has(row.diagnosis_code)) {
                invoiceData.diagnoses.push({
                    code: row.diagnosis_code,
                    description: row.diagnosis_description,
                    type: row.diagnosis_type
                });
                processedDiagnoses.add(row.diagnosis_code);
            }
            if (row.prescription_id && !processedPrescriptions.has(row.prescription_id)) {
                invoiceData.prescriptions.push({
                    prescription_id: row.prescription_id,
                    status: row.prescription_status,
                    items: [{
                            name: row.item_name,
                            dosage: row.dosage,
                            frequency: row.frequency,
                            duration: row.duration,
                            quantity: row.quantity_prescribed
                        }]
                });
                processedPrescriptions.add(row.prescription_id);
            }
            if (row.lab_request_id && !processedLabTests.has(row.lab_request_id)) {
                const testAmount = parseFloat(row.test_cost) || 0;
                invoiceData.lab_tests.push({
                    lab_request_id: row.lab_request_id,
                    status: row.lab_status,
                    urgency: row.urgency,
                    tests: [{
                            name: row.test_name,
                            code: row.test_code,
                            cost: testAmount,
                            result: row.result
                        }]
                });
                totalAmount += testAmount;
                processedLabTests.add(row.lab_request_id);
            }
        });
        invoiceData.invoice.total_amount = totalAmount;
        const invoiceId = crypto_1.default.randomUUID();
        const invoiceResult = await database_1.pool.query(`INSERT INTO sha_invoices (
          id, claim_id, invoice_number, patient_name, sha_beneficiary_id,
          op_number, visit_date, service_given, amount_charged, diagnosis,
          status, generated_at, generated_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`, [
            invoiceId,
            claimId,
            invoiceData.invoice.invoice_number,
            invoiceData.patient.name,
            invoiceData.patient.sha_number,
            invoiceData.patient.op_number,
            claim.visit_date,
            JSON.stringify(invoiceData.services),
            totalAmount,
            JSON.stringify(invoiceData.diagnoses),
            'GENERATED',
            new Date(),
            req.user.id,
            new Date(),
            new Date()
        ]);
        res.json({
            success: true,
            data: {
                invoice: invoiceResult.rows[0],
                invoice_data: invoiceData,
                message: "Comprehensive SHA invoice generated successfully"
            }
        });
    }
    catch (error) {
        console.error('Error generating comprehensive SHA invoice:', error);
        res.status(500).json({
            success: false,
            message: "Failed to generate comprehensive SHA invoice"
        });
    }
});
exports.default = router;
//# sourceMappingURL=sha-invoices.js.map