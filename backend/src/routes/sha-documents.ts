import { Router } from "express"
import { body, query, validationResult } from "express-validator"
import { pool } from "../config/database"
import { authorize } from "../middleware/auth"
import { UserRole } from "../types"
import { AuthenticatedRequest } from "../types/auth"
import multer from "multer"
import path from "path"
import crypto from "crypto"
import fs from "fs"

const router = Router()

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'sha-documents')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${crypto.randomUUID()}-${Date.now()}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'))
    }
  }
})

// Upload document for a claim
router.post(
  "/upload/:claimId",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.CLAIMS_MANAGER, UserRole.DOCTOR]),
  upload.single('document'),
  [
    body("documentType").isIn([
      'LAB_RESULTS', 'DISCHARGE_SUMMARY', 'PRESCRIPTION', 'REFERRAL_LETTER', 
      'MEDICAL_REPORT', 'IMAGING_REPORT', 'CONSENT_FORM', 'INSURANCE_CARD', 
      'IDENTIFICATION', 'OTHER'
    ]).withMessage("Invalid document type"),
    body("documentDescription").optional().trim().isLength({ max: 500 }),
    body("isRequired").optional().isBoolean()
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

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded"
        })
      }

      const { claimId } = req.params
      const { documentType, documentDescription = "", isRequired = false } = req.body

      // Verify claim exists
      const claimResult = await pool.query(
        `SELECT id FROM sha_claims WHERE id = $1`,
        [claimId]
      )

      if (claimResult.rows.length === 0) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path)
        return res.status(404).json({
          success: false,
          message: "Claim not found"
        })
      }

      // Save document record to database
      const documentId = crypto.randomUUID()
      const result = await pool.query(
        `INSERT INTO sha_document_attachments (
          id, claim_id, document_type, document_name, document_description,
          file_path, file_size, mime_type, is_required, uploaded_by,
          uploaded_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          documentId,
          claimId,
          documentType,
          req.file.originalname,
          documentDescription,
          req.file.path,
          req.file.size,
          req.file.mimetype,
          isRequired,
          req.user!.id,
          new Date(),
          new Date(),
          new Date()
        ]
      )

      // Update claim documents count
      await pool.query(
        `UPDATE sha_claims 
         SET documents_attached = (
           SELECT COUNT(*) FROM sha_document_attachments 
           WHERE claim_id = $1
         ),
         updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [claimId]
      )

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: "Document uploaded successfully"
      })

    } catch (error) {
      console.error("Error uploading document:", error)
      
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
      }

      res.status(500).json({
        success: false,
        message: "Failed to upload document"
      })
    }
  }
)

// Get documents for a claim
router.get(
  "/claim/:claimId",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.CLAIMS_MANAGER, UserRole.DOCTOR]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { claimId } = req.params

      const result = await pool.query(
        `SELECT d.*,
                u.username as uploaded_by_name,
                u2.username as last_accessed_by_name
         FROM sha_document_attachments d
         JOIN users u ON d.uploaded_by = u.id
         LEFT JOIN users u2 ON d.last_accessed_by = u2.id
         WHERE d.claim_id = $1
         ORDER BY d.uploaded_at DESC`,
        [claimId]
      )

      res.json({
        success: true,
        data: result.rows,
        message: `Found ${result.rows.length} documents for claim`
      })

    } catch (error) {
      console.error("Error fetching claim documents:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch claim documents"
      })
    }
  }
)

// Download document
router.get(
  "/:documentId/download",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.CLAIMS_MANAGER, UserRole.DOCTOR]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { documentId } = req.params

      const result = await pool.query(
        `SELECT * FROM sha_document_attachments WHERE id = $1`,
        [documentId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Document not found"
        })
      }

      const document = result.rows[0]

      // Check if file exists
      if (!fs.existsSync(document.file_path)) {
        return res.status(404).json({
          success: false,
          message: "Document file not found on disk"
        })
      }

      // Update access tracking
      await pool.query(
        `UPDATE sha_document_attachments 
         SET access_count = access_count + 1,
             last_accessed_at = CURRENT_TIMESTAMP,
             last_accessed_by = $1
         WHERE id = $2`,
        [req.user!.id, documentId]
      )

      // Set appropriate headers
      res.setHeader('Content-Type', document.mime_type)
      res.setHeader('Content-Disposition', `attachment; filename="${document.document_name}"`)
      res.setHeader('Content-Length', document.file_size)

      // Stream file
      const fileStream = fs.createReadStream(document.file_path)
      fileStream.pipe(res)

    } catch (error) {
      console.error("Error downloading document:", error)
      res.status(500).json({
        success: false,
        message: "Failed to download document"
      })
    }
  }
)

// Update document details
router.patch(
  "/:documentId",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.CLAIMS_MANAGER]),
  [
    body("documentType").optional().isIn([
      'LAB_RESULTS', 'DISCHARGE_SUMMARY', 'PRESCRIPTION', 'REFERRAL_LETTER', 
      'MEDICAL_REPORT', 'IMAGING_REPORT', 'CONSENT_FORM', 'INSURANCE_CARD', 
      'IDENTIFICATION', 'OTHER'
    ]),
    body("documentDescription").optional().trim().isLength({ max: 500 }),
    body("isRequired").optional().isBoolean(),
    body("complianceVerified").optional().isBoolean(),
    body("verificationNotes").optional().trim().isLength({ max: 1000 }),
    body("shaDocumentReference").optional().trim().isLength({ max: 100 })
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

      const { documentId } = req.params
      const updateData = req.body

      // Check if document exists
      const existingResult = await pool.query(
        `SELECT * FROM sha_document_attachments WHERE id = $1`,
        [documentId]
      )

      if (existingResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Document not found"
        })
      }

      // Build update query dynamically
      const updateFields: string[] = []
      const values: any[] = []
      let paramCount = 1

      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase()
          updateFields.push(`${dbField} = $${paramCount++}`)
          values.push(value)
        }
      })

      if (updateData.complianceVerified) {
        updateFields.push(`verification_date = CURRENT_TIMESTAMP`)
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
      values.push(documentId)

      const query = `
        UPDATE sha_document_attachments 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `

      const result = await pool.query(query, values)

      res.json({
        success: true,
        data: result.rows[0],
        message: "Document updated successfully"
      })

    } catch (error) {
      console.error("Error updating document:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update document"
      })
    }
  }
)

// Delete document
router.delete(
  "/:documentId",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { documentId } = req.params

      const result = await pool.query(
        `SELECT * FROM sha_document_attachments WHERE id = $1`,
        [documentId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Document not found"
        })
      }

      const document = result.rows[0]

      // Delete file from disk
      if (fs.existsSync(document.file_path)) {
        fs.unlinkSync(document.file_path)
      }

      // Delete from database
      await pool.query(
        `DELETE FROM sha_document_attachments WHERE id = $1`,
        [documentId]
      )

      // Update claim documents count
      await pool.query(
        `UPDATE sha_claims 
         SET documents_attached = (
           SELECT COUNT(*) FROM sha_document_attachments 
           WHERE claim_id = $1
         ),
         updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [document.claim_id]
      )

      res.json({
        success: true,
        message: "Document deleted successfully"
      })

    } catch (error) {
      console.error("Error deleting document:", error)
      res.status(500).json({
        success: false,
        message: "Failed to delete document"
      })
    }
  }
)

// Get required documents checklist for a claim
router.get(
  "/checklist/:claimId",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.CLAIMS_MANAGER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { claimId } = req.params

      // Get claim details
      const claimResult = await pool.query(
        `SELECT c.*, 
                ci.service_type,
                COUNT(DISTINCT ci.id) as service_count
         FROM sha_claims c
         LEFT JOIN sha_claim_items ci ON c.id = ci.claim_id
         WHERE c.id = $1
         GROUP BY c.id, ci.service_type`,
        [claimId]
      )

      if (claimResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Claim not found"
        })
      }

      const claim = claimResult.rows[0]

      // Define required documents based on service types and encounter type
      const requiredDocuments = []

      // Always required
      requiredDocuments.push(
        { type: 'INSURANCE_CARD', description: 'Patient SHA insurance card copy', required: true },
        { type: 'IDENTIFICATION', description: 'Patient national ID copy', required: true }
      )

      // Service-specific requirements
      if (claim.service_type?.includes('LABORATORY')) {
        requiredDocuments.push({ type: 'LAB_RESULTS', description: 'Laboratory test results', required: true })
      }

      if (claim.service_type?.includes('PHARMACY')) {
        requiredDocuments.push({ type: 'PRESCRIPTION', description: 'Prescription form', required: true })
      }

      if (claim.service_type?.includes('INPATIENT')) {
        requiredDocuments.push({ type: 'DISCHARGE_SUMMARY', description: 'Patient discharge summary', required: true })
      }

      if (claim.service_type?.includes('PROCEDURE')) {
        requiredDocuments.push({ type: 'CONSENT_FORM', description: 'Procedure consent form', required: true })
      }

      // Get uploaded documents
      const uploadedResult = await pool.query(
        `SELECT document_type, COUNT(*) as count,
                BOOL_AND(compliance_verified) as all_verified
         FROM sha_document_attachments 
         WHERE claim_id = $1
         GROUP BY document_type`,
        [claimId]
      )

      const uploadedDocs = uploadedResult.rows.reduce((acc, row) => {
        acc[row.document_type] = {
          count: Number.parseInt(row.count),
          verified: row.all_verified
        }
        return acc
      }, {} as Record<string, any>)

      // Build checklist
      const checklist = requiredDocuments.map(doc => ({
        ...doc,
        uploaded: uploadedDocs[doc.type]?.count || 0,
        verified: uploadedDocs[doc.type]?.verified || false,
        status: uploadedDocs[doc.type]?.count > 0 ? 'uploaded' : 'missing'
      }))

      const summary = {
        total_required: requiredDocuments.length,
        uploaded: checklist.filter(item => item.uploaded > 0).length,
        verified: checklist.filter(item => item.verified).length,
        missing: checklist.filter(item => item.uploaded === 0).length,
        compliance_ready: checklist.every(item => !item.required || (item.uploaded > 0 && item.verified))
      }

      res.json({
        success: true,
        data: {
          claim_id: claimId,
          checklist,
          summary
        },
        message: "Document checklist generated successfully"
      })

    } catch (error) {
      console.error("Error generating document checklist:", error)
      res.status(500).json({
        success: false,
        message: "Failed to generate document checklist"
      })
    }
  }
)

// Bulk upload documents for multiple claims
router.post(
  "/bulk-upload",
  authorize([UserRole.ADMIN, UserRole.CLAIMS_MANAGER]),
  upload.array('documents', 10),
  [
    body("claimMappings").isArray().withMessage("Claim mappings must be an array"),
    body("documentType").isIn([
      'LAB_RESULTS', 'DISCHARGE_SUMMARY', 'PRESCRIPTION', 'REFERRAL_LETTER', 
      'MEDICAL_REPORT', 'IMAGING_REPORT', 'CONSENT_FORM', 'INSURANCE_CARD', 
      'IDENTIFICATION', 'OTHER'
    ]).withMessage("Invalid document type")
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

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No files uploaded"
        })
      }

      const files = req.files as Express.Multer.File[]
      const { claimMappings, documentType } = req.body

      const results = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const claimId = claimMappings[i]?.claimId

        if (!claimId) {
          // Clean up file
          fs.unlinkSync(file.path)
          continue
        }

        try {
          // Save document record
          const documentId = crypto.randomUUID()
          const result = await pool.query(
            `INSERT INTO sha_document_attachments (
              id, claim_id, document_type, document_name, file_path,
              file_size, mime_type, uploaded_by, uploaded_at,
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, document_name`,
            [
              documentId,
              claimId,
              documentType,
              file.originalname,
              file.path,
              file.size,
              file.mimetype,
              req.user!.id,
              new Date(),
              new Date(),
              new Date()
            ]
          )

          results.push({
            success: true,
            claim_id: claimId,
            document_id: documentId,
            filename: file.originalname
          })

        } catch (error) {
          // Clean up file on error
          fs.unlinkSync(file.path)
          results.push({
            success: false,
            claim_id: claimId,
            filename: file.originalname,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      res.json({
        success: true,
        data: results,
        message: `Processed ${files.length} files`
      })

    } catch (error) {
      console.error("Error in bulk upload:", error)
      
      // Clean up uploaded files on error
      if (req.files) {
        (req.files as Express.Multer.File[]).forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path)
          }
        })
      }

      res.status(500).json({
        success: false,
        message: "Failed to process bulk upload"
      })
    }
  }
)

export default router
