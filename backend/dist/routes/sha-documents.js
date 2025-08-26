"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(process.cwd(), 'uploads', 'sha-documents');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${crypto_1.default.randomUUID()}-${Date.now()}${path_1.default.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'));
        }
    }
});
router.post("/upload/:claimId", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.CLAIMS_MANAGER, types_1.UserRole.DOCTOR]), upload.single('document'), [
    (0, express_validator_1.body)("documentType").isIn([
        'LAB_RESULTS', 'DISCHARGE_SUMMARY', 'PRESCRIPTION', 'REFERRAL_LETTER',
        'MEDICAL_REPORT', 'IMAGING_REPORT', 'CONSENT_FORM', 'INSURANCE_CARD',
        'IDENTIFICATION', 'OTHER'
    ]).withMessage("Invalid document type"),
    (0, express_validator_1.body)("documentDescription").optional().trim().isLength({ max: 500 }),
    (0, express_validator_1.body)("isRequired").optional().isBoolean()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }
        const { claimId } = req.params;
        const { documentType, documentDescription = "", isRequired = false } = req.body;
        const claimResult = await database_1.pool.query(`SELECT id FROM sha_claims WHERE id = $1`, [claimId]);
        if (claimResult.rows.length === 0) {
            fs_1.default.unlinkSync(req.file.path);
            return res.status(404).json({
                success: false,
                message: "Claim not found"
            });
        }
        const documentId = crypto_1.default.randomUUID();
        const result = await database_1.pool.query(`INSERT INTO sha_document_attachments (
          id, claim_id, document_type, document_name, document_description,
          file_path, file_size, mime_type, is_required, uploaded_by,
          uploaded_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`, [
            documentId,
            claimId,
            documentType,
            req.file.originalname,
            documentDescription,
            req.file.path,
            req.file.size,
            req.file.mimetype,
            isRequired,
            req.user.id,
            new Date(),
            new Date(),
            new Date()
        ]);
        await database_1.pool.query(`UPDATE sha_claims 
         SET documents_attached = (
           SELECT COUNT(*) FROM sha_document_attachments 
           WHERE claim_id = $1
         ),
         updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`, [claimId]);
        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: "Document uploaded successfully"
        });
    }
    catch (error) {
        console.error("Error uploading document:", error);
        if (req.file && fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        res.status(500).json({
            success: false,
            message: "Failed to upload document"
        });
    }
});
router.get("/claim/:claimId", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.CLAIMS_MANAGER, types_1.UserRole.DOCTOR]), async (req, res) => {
    try {
        const { claimId } = req.params;
        const result = await database_1.pool.query(`SELECT d.*,
                u.username as uploaded_by_name,
                u2.username as last_accessed_by_name
         FROM sha_document_attachments d
         JOIN users u ON d.uploaded_by = u.id
         LEFT JOIN users u2 ON d.last_accessed_by = u2.id
         WHERE d.claim_id = $1
         ORDER BY d.uploaded_at DESC`, [claimId]);
        res.json({
            success: true,
            data: result.rows,
            message: `Found ${result.rows.length} documents for claim`
        });
    }
    catch (error) {
        console.error("Error fetching claim documents:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch claim documents"
        });
    }
});
router.get("/:documentId/download", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.CLAIMS_MANAGER, types_1.UserRole.DOCTOR]), async (req, res) => {
    try {
        const { documentId } = req.params;
        const result = await database_1.pool.query(`SELECT * FROM sha_document_attachments WHERE id = $1`, [documentId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Document not found"
            });
        }
        const document = result.rows[0];
        if (!fs_1.default.existsSync(document.file_path)) {
            return res.status(404).json({
                success: false,
                message: "Document file not found on disk"
            });
        }
        await database_1.pool.query(`UPDATE sha_document_attachments 
         SET access_count = access_count + 1,
             last_accessed_at = CURRENT_TIMESTAMP,
             last_accessed_by = $1
         WHERE id = $2`, [req.user.id, documentId]);
        res.setHeader('Content-Type', document.mime_type);
        res.setHeader('Content-Disposition', `attachment; filename="${document.document_name}"`);
        res.setHeader('Content-Length', document.file_size);
        const fileStream = fs_1.default.createReadStream(document.file_path);
        fileStream.pipe(res);
    }
    catch (error) {
        console.error("Error downloading document:", error);
        res.status(500).json({
            success: false,
            message: "Failed to download document"
        });
    }
});
router.patch("/:documentId", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.CLAIMS_MANAGER]), [
    (0, express_validator_1.body)("documentType").optional().isIn([
        'LAB_RESULTS', 'DISCHARGE_SUMMARY', 'PRESCRIPTION', 'REFERRAL_LETTER',
        'MEDICAL_REPORT', 'IMAGING_REPORT', 'CONSENT_FORM', 'INSURANCE_CARD',
        'IDENTIFICATION', 'OTHER'
    ]),
    (0, express_validator_1.body)("documentDescription").optional().trim().isLength({ max: 500 }),
    (0, express_validator_1.body)("isRequired").optional().isBoolean(),
    (0, express_validator_1.body)("complianceVerified").optional().isBoolean(),
    (0, express_validator_1.body)("verificationNotes").optional().trim().isLength({ max: 1000 }),
    (0, express_validator_1.body)("shaDocumentReference").optional().trim().isLength({ max: 100 })
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const { documentId } = req.params;
        const updateData = req.body;
        const existingResult = await database_1.pool.query(`SELECT * FROM sha_document_attachments WHERE id = $1`, [documentId]);
        if (existingResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Document not found"
            });
        }
        const updateFields = [];
        const values = [];
        let paramCount = 1;
        Object.entries(updateData).forEach(([key, value]) => {
            if (value !== undefined) {
                const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                updateFields.push(`${dbField} = $${paramCount++}`);
                values.push(value);
            }
        });
        if (updateData.complianceVerified) {
            updateFields.push(`verification_date = CURRENT_TIMESTAMP`);
        }
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(documentId);
        const query = `
        UPDATE sha_document_attachments 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
        const result = await database_1.pool.query(query, values);
        res.json({
            success: true,
            data: result.rows[0],
            message: "Document updated successfully"
        });
    }
    catch (error) {
        console.error("Error updating document:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update document"
        });
    }
});
router.delete("/:documentId", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLAIMS_MANAGER]), async (req, res) => {
    try {
        const { documentId } = req.params;
        const result = await database_1.pool.query(`SELECT * FROM sha_document_attachments WHERE id = $1`, [documentId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Document not found"
            });
        }
        const document = result.rows[0];
        if (fs_1.default.existsSync(document.file_path)) {
            fs_1.default.unlinkSync(document.file_path);
        }
        await database_1.pool.query(`DELETE FROM sha_document_attachments WHERE id = $1`, [documentId]);
        await database_1.pool.query(`UPDATE sha_claims 
         SET documents_attached = (
           SELECT COUNT(*) FROM sha_document_attachments 
           WHERE claim_id = $1
         ),
         updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`, [document.claim_id]);
        res.json({
            success: true,
            message: "Document deleted successfully"
        });
    }
    catch (error) {
        console.error("Error deleting document:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete document"
        });
    }
});
router.get("/checklist/:claimId", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.CLAIMS_MANAGER]), async (req, res) => {
    try {
        const { claimId } = req.params;
        const claimResult = await database_1.pool.query(`SELECT c.*, 
                ci.service_type,
                COUNT(DISTINCT ci.id) as service_count
         FROM sha_claims c
         LEFT JOIN sha_claim_items ci ON c.id = ci.claim_id
         WHERE c.id = $1
         GROUP BY c.id, ci.service_type`, [claimId]);
        if (claimResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Claim not found"
            });
        }
        const claim = claimResult.rows[0];
        const requiredDocuments = [];
        requiredDocuments.push({ type: 'INSURANCE_CARD', description: 'Patient SHA insurance card copy', required: true }, { type: 'IDENTIFICATION', description: 'Patient national ID copy', required: true });
        if (claim.service_type?.includes('LABORATORY')) {
            requiredDocuments.push({ type: 'LAB_RESULTS', description: 'Laboratory test results', required: true });
        }
        if (claim.service_type?.includes('PHARMACY')) {
            requiredDocuments.push({ type: 'PRESCRIPTION', description: 'Prescription form', required: true });
        }
        if (claim.service_type?.includes('INPATIENT')) {
            requiredDocuments.push({ type: 'DISCHARGE_SUMMARY', description: 'Patient discharge summary', required: true });
        }
        if (claim.service_type?.includes('PROCEDURE')) {
            requiredDocuments.push({ type: 'CONSENT_FORM', description: 'Procedure consent form', required: true });
        }
        const uploadedResult = await database_1.pool.query(`SELECT document_type, COUNT(*) as count,
                BOOL_AND(compliance_verified) as all_verified
         FROM sha_document_attachments 
         WHERE claim_id = $1
         GROUP BY document_type`, [claimId]);
        const uploadedDocs = uploadedResult.rows.reduce((acc, row) => {
            acc[row.document_type] = {
                count: Number.parseInt(row.count),
                verified: row.all_verified
            };
            return acc;
        }, {});
        const checklist = requiredDocuments.map(doc => ({
            ...doc,
            uploaded: uploadedDocs[doc.type]?.count || 0,
            verified: uploadedDocs[doc.type]?.verified || false,
            status: uploadedDocs[doc.type]?.count > 0 ? 'uploaded' : 'missing'
        }));
        const summary = {
            total_required: requiredDocuments.length,
            uploaded: checklist.filter(item => item.uploaded > 0).length,
            verified: checklist.filter(item => item.verified).length,
            missing: checklist.filter(item => item.uploaded === 0).length,
            compliance_ready: checklist.every(item => !item.required || (item.uploaded > 0 && item.verified))
        };
        res.json({
            success: true,
            data: {
                claim_id: claimId,
                checklist,
                summary
            },
            message: "Document checklist generated successfully"
        });
    }
    catch (error) {
        console.error("Error generating document checklist:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate document checklist"
        });
    }
});
router.post("/bulk-upload", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLAIMS_MANAGER]), upload.array('documents', 10), [
    (0, express_validator_1.body)("claimMappings").isArray().withMessage("Claim mappings must be an array"),
    (0, express_validator_1.body)("documentType").isIn([
        'LAB_RESULTS', 'DISCHARGE_SUMMARY', 'PRESCRIPTION', 'REFERRAL_LETTER',
        'MEDICAL_REPORT', 'IMAGING_REPORT', 'CONSENT_FORM', 'INSURANCE_CARD',
        'IDENTIFICATION', 'OTHER'
    ]).withMessage("Invalid document type")
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No files uploaded"
            });
        }
        const files = req.files;
        const { claimMappings, documentType } = req.body;
        const results = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const claimId = claimMappings[i]?.claimId;
            if (!claimId) {
                fs_1.default.unlinkSync(file.path);
                continue;
            }
            try {
                const documentId = crypto_1.default.randomUUID();
                const result = await database_1.pool.query(`INSERT INTO sha_document_attachments (
              id, claim_id, document_type, document_name, file_path,
              file_size, mime_type, uploaded_by, uploaded_at,
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, document_name`, [
                    documentId,
                    claimId,
                    documentType,
                    file.originalname,
                    file.path,
                    file.size,
                    file.mimetype,
                    req.user.id,
                    new Date(),
                    new Date(),
                    new Date()
                ]);
                results.push({
                    success: true,
                    claim_id: claimId,
                    document_id: documentId,
                    filename: file.originalname
                });
            }
            catch (error) {
                fs_1.default.unlinkSync(file.path);
                results.push({
                    success: false,
                    claim_id: claimId,
                    filename: file.originalname,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        res.json({
            success: true,
            data: results,
            message: `Processed ${files.length} files`
        });
    }
    catch (error) {
        console.error("Error in bulk upload:", error);
        if (req.files) {
            req.files.forEach(file => {
                if (fs_1.default.existsSync(file.path)) {
                    fs_1.default.unlinkSync(file.path);
                }
            });
        }
        res.status(500).json({
            success: false,
            message: "Failed to process bulk upload"
        });
    }
});
exports.default = router;
//# sourceMappingURL=sha-documents.js.map