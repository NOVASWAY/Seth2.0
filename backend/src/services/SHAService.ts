import axios from "axios"
import type { Claim, ClaimBatch } from "../models/Claims"
import { pool } from "../config/database"
import { generateInvoiceNumber } from "../utils/invoiceUtils"

export interface SHAConfig {
  baseUrl: string
  apiKey: string
  providerCode: string
  timeout: number
  requireInvoiceBeforeSubmission: boolean
}

export class SHAService {
  private config: SHAConfig

  constructor() {
    this.config = {
      baseUrl: process.env.SHA_API_URL || "https://api.sha.go.ke",
      apiKey: process.env.SHA_API_KEY || "",
      providerCode: process.env.SHA_PROVIDER_CODE || "",
      timeout: 30000,
      requireInvoiceBeforeSubmission: process.env.SHA_REQUIRE_INVOICE_BEFORE_SUBMISSION !== "false", // Default true
    }
  }

  private async makeRequest(endpoint: string, data: any, method: "GET" | "POST" | "PUT" = "POST") {
    try {
      const response = await axios({
        method,
        url: `${this.config.baseUrl}${endpoint}`,
        data: method !== "GET" ? data : undefined,
        params: method === "GET" ? data : undefined,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
          "X-Provider-Code": this.config.providerCode,
        },
        timeout: this.config.timeout,
      })

      return {
        success: true,
        data: response.data,
        status: response.status,
      }
    } catch (error: any) {
      console.error("SHA API Error:", error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status || 500,
      }
    }
  }

  // CORRECTED WORKFLOW: Generate invoice for clinic records BEFORE submission
  async generateInvoiceForClaim(claimId: string, userId: string): Promise<any> {
    try {
      // Get claim details
      const claimResult = await pool.query(
        `SELECT c.*, p.op_number, p.first_name, p.last_name, p.insurance_number
         FROM claims c
         JOIN patients p ON c.patient_id = p.id
         WHERE c.id = $1 AND c.status = 'ready_to_submit'`,
        [claimId]
      )

      if (claimResult.rows.length === 0) {
        throw new Error("Claim not found or not ready for submission")
      }

      const claim = claimResult.rows[0]

      // Check if invoice already exists
      const existingInvoice = await pool.query(
        `SELECT id FROM sha_invoices WHERE claim_id = $1`,
        [claimId]
      )

      if (existingInvoice.rows.length > 0) {
        throw new Error("Invoice already exists for this claim")
      }

      // Generate invoice number
      const invoiceNumber = await generateInvoiceNumber("SHA")
      const invoiceDate = new Date()
      const dueDate = new Date(invoiceDate.getTime() + (30 * 24 * 60 * 60 * 1000)) // 30 days

      // Get claim items
      const itemsResult = await pool.query(
        `SELECT * FROM claim_items WHERE claim_id = $1`,
        [claimId]
      )

      // Create internal invoice record (for clinic records)
      const invoiceResult = await pool.query(
        `INSERT INTO sha_invoices (
          id, invoice_number, claim_id, patient_id, op_number, visit_id,
          invoice_date, due_date, total_amount, status, generated_at,
          generated_by, compliance_status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          crypto.randomUUID(),
          invoiceNumber,
          claimId,
          claim.patient_id,
          claim.op_number,
          claim.visit_id,
          invoiceDate,
          dueDate,
          claim.claim_amount,
          "generated", // Status: ready for review/printing
          invoiceDate,
          userId,
          "pending",
          invoiceDate,
          invoiceDate
        ]
      )

      const invoice = invoiceResult.rows[0]

      // Update claim to show invoice is ready
      await pool.query(
        `UPDATE claims SET 
          invoice_number = $1,
          invoice_date = $2,
          status = 'invoice_ready',
          updated_at = $3
        WHERE id = $4`,
        [invoiceNumber, invoiceDate, invoiceDate, claimId]
      )

      // Create audit trail
      await this.createAuditTrail(claimId, invoice.id, "INVOICE_GENERATED_PRE_SUBMISSION", userId, {
        invoice_number: invoiceNumber,
        total_amount: claim.claim_amount,
        items_count: itemsResult.rows.length,
        workflow_step: "pre_submission_invoice_generation"
      })

      return {
        success: true,
        invoice,
        message: "Invoice generated successfully. Ready for review and printing before submission."
      }

    } catch (error) {
      console.error("Error generating invoice for claim:", error)
      throw error
    }
  }

  // CORRECTED WORKFLOW: Submit claim to SHA (invoice becomes "submitted" and no longer editable)
  async submitSingleClaim(claimId: string, userId: string): Promise<any> {
    try {
      // First check if invoice exists and is ready for submission
      const invoiceResult = await pool.query(
        `SELECT i.*, c.* FROM sha_invoices i
         JOIN claims c ON i.claim_id = c.id
         WHERE i.claim_id = $1 AND i.status IN ('generated', 'printed')`,
        [claimId]
      )

      if (invoiceResult.rows.length === 0) {
        throw new Error("Invoice must be generated and optionally printed before submission. Please generate invoice first.")
      }

      const invoice = invoiceResult.rows[0]
      const claim = invoiceResult.rows[0]

      // Get claim items
      const itemsResult = await pool.query(
        `SELECT * FROM claim_items WHERE claim_id = $1`,
        [claimId]
      )

      const payload = {
        claim_number: claim.claim_number,
        member_number: claim.member_number,
        invoice_number: invoice.invoice_number, // Include internal invoice number for reference
        visit_date: claim.visit_date.toISOString().split("T")[0],
        diagnosis: {
          code: claim.diagnosis_code,
          description: claim.diagnosis_description,
        },
        services: itemsResult.rows.map((item) => ({
          service_code: item.service_code,
          description: item.service_description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })),
        total_amount: claim.claim_amount,
        provider_code: this.config.providerCode,
      }

      // Log submission attempt
      const logId = crypto.randomUUID()
      await pool.query(
        `INSERT INTO sha_submission_logs (
          id, claim_id, invoice_id, submission_type, request_payload, 
          status, retry_count, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [logId, claimId, invoice.id, "single", JSON.stringify(payload), "pending", 0, new Date(), new Date()]
      )

      // Submit to SHA API
      const result = await this.makeRequest("/claims/submit", payload)

      // Update log with response
      await pool.query(
        `UPDATE sha_submission_logs 
         SET response_payload = $1, status = $2, error_message = $3, updated_at = $4
         WHERE id = $5`,
        [
          JSON.stringify(result.data),
          result.success ? "success" : "failed",
          result.success ? null : JSON.stringify(result.error),
          new Date(),
          logId,
        ]
      )

      if (result.success) {
        const submissionDate = new Date()
        const shaReference = result.data?.reference || result.data?.claim_reference

        // Update claim status to submitted
        await pool.query(
          `UPDATE claims 
           SET status = $1, submission_date = $2, sha_reference = $3, updated_at = $4
           WHERE id = $5`,
          ["submitted", submissionDate, shaReference, submissionDate, claimId]
        )

        // CRITICAL: Mark invoice as submitted (no longer visible/editable)
        await pool.query(
          `UPDATE sha_invoices 
           SET status = 'submitted', 
               submitted_at = $1, 
               submitted_by = $2,
               sha_reference = $3,
               updated_at = $4
           WHERE id = $5`,
          [submissionDate, userId, shaReference, submissionDate, invoice.id]
        )

        // Create audit trail for submission
        await this.createAuditTrail(claimId, invoice.id, "CLAIM_SUBMITTED_TO_SHA", userId, {
          sha_reference: shaReference,
          invoice_number: invoice.invoice_number,
          submission_date: submissionDate,
          workflow_step: "claim_submission_invoice_locked",
          note: "Invoice is now locked and no longer editable after SHA submission"
        })

        return {
          success: true,
          data: {
            sha_reference: shaReference,
            submission_date: submissionDate,
            invoice_number: invoice.invoice_number,
            status: "submitted"
          },
          message: "Claim submitted successfully to SHA. Invoice is now locked and archived."
        }
      } else {
        throw new Error(result.error || "Failed to submit claim to SHA")
      }

    } catch (error) {
      console.error("Error submitting claim:", error)
      throw error
    }
  }

  async submitClaimBatch(batch: ClaimBatch, claims: Claim[]): Promise<any> {
    const claimsData = []

    for (const claim of claims) {
      const itemsResult = await pool.query(
        `
        SELECT * FROM claim_items WHERE claim_id = $1
      `,
        [claim.id],
      )

      claimsData.push({
        claim_number: claim.claim_number,
        member_number: claim.member_number,
        visit_date: claim.visit_date.toISOString().split("T")[0],
        diagnosis: {
          code: claim.diagnosis_code,
          description: claim.diagnosis_description,
        },
        services: itemsResult.rows.map((item) => ({
          service_code: item.service_code,
          description: item.service_description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })),
        total_amount: claim.total_amount,
      })
    }

    const payload = {
      batch_number: batch.batch_number,
      batch_date: batch.batch_date.toISOString().split("T")[0],
      provider_code: this.config.providerCode,
      claims: claimsData,
      total_claims: batch.total_claims,
      total_amount: batch.total_amount,
    }

    // Log batch submission attempt
    const logId = crypto.randomUUID()
    await pool.query(
      `
      INSERT INTO claim_submission_logs (
        id, batch_id, submission_type, request_payload, status, retry_count, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
      [logId, batch.id, "batch", JSON.stringify(payload), "pending", 0, new Date(), new Date()],
    )

    const result = await this.makeRequest("/claims/batch-submit", payload)

    // Update log with response
    await pool.query(
      `
      UPDATE claim_submission_logs 
      SET response_payload = $1, status = $2, error_message = $3, updated_at = $4
      WHERE id = $5
    `,
      [
        JSON.stringify(result.data),
        result.success ? "success" : "failed",
        result.success ? null : JSON.stringify(result.error),
        new Date(),
        logId,
      ],
    )

    if (result.success) {
      // Update batch status
      await pool.query(
        `
        UPDATE claim_batches 
        SET status = $1, submission_date = $2, sha_batch_reference = $3, updated_at = $4
        WHERE id = $5
      `,
        ["submitted", new Date(), result.data?.batch_reference || result.data?.reference, new Date(), batch.id],
      )

      // Update all claims in batch
      for (const claim of claims) {
        await pool.query(
          `
          UPDATE claims 
          SET status = $1, submission_date = $2, updated_at = $3
          WHERE id = $4
        `,
          ["submitted", new Date(), new Date(), claim.id],
        )
      }
    }

    return result
  }

  async checkClaimStatus(shaReference: string): Promise<any> {
    return await this.makeRequest(`/claims/status/${shaReference}`, {}, "GET")
  }

  async checkBatchStatus(shaBatchReference: string): Promise<any> {
    return await this.makeRequest(`/claims/batch-status/${shaBatchReference}`, {}, "GET")
  }

  async reconcileClaims(): Promise<void> {
    // Get all submitted claims that haven't been reconciled
    const claimsResult = await pool.query(`
      SELECT * FROM claims 
      WHERE status = 'submitted' AND sha_reference IS NOT NULL
    `)

    for (const claim of claimsResult.rows) {
      try {
        const statusResult = await this.checkClaimStatus(claim.sha_reference)

        if (statusResult.success && statusResult.data) {
          const shaStatus = statusResult.data.status
          const approvedAmount = statusResult.data.approved_amount

          let newStatus = claim.status
          if (shaStatus === "approved") {
            newStatus = "approved"
          } else if (shaStatus === "rejected") {
            newStatus = "rejected"
          } else if (shaStatus === "paid") {
            newStatus = "paid"
          }

          if (newStatus !== claim.status) {
            await pool.query(
              `
              UPDATE claims 
              SET status = $1, approved_amount = $2, 
                  approval_date = $3, rejection_reason = $4, updated_at = $5
              WHERE id = $6
            `,
              [
                newStatus,
                approvedAmount,
                shaStatus === "approved" || shaStatus === "paid" ? new Date() : null,
                statusResult.data.rejection_reason,
                new Date(),
                claim.id,
              ],
            )
          }
        }
      } catch (error) {
        console.error(`Error reconciling claim ${claim.id}:`, error)
      }
    }
  }

  // Helper method to create audit trail
  private async createAuditTrail(claimId: string, invoiceId: string | null, action: string, userId: string, details: Record<string, any>): Promise<void> {
    await pool.query(
      `INSERT INTO sha_audit_trail (
        id, claim_id, invoice_id, action, performed_by, performed_at, 
        details, compliance_check, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        crypto.randomUUID(),
        claimId,
        invoiceId,
        action,
        userId,
        new Date(),
        JSON.stringify(details),
        true, // Always compliance check
        new Date()
      ]
    )
  }

  // Get invoices that are ready for review/printing (before submission)
  async getInvoicesReadyForReview(): Promise<any[]> {
    const result = await pool.query(
      `SELECT 
        i.*,
        c.claim_number,
        c.diagnosis_code,
        c.diagnosis_description,
        p.op_number,
        p.first_name,
        p.last_name,
        p.insurance_number,
        u.username as generated_by_username
       FROM sha_invoices i
       JOIN claims c ON i.claim_id = c.id
       JOIN patients p ON i.patient_id = p.id
       JOIN users u ON i.generated_by = u.id
       WHERE i.status IN ('generated', 'printed')
       ORDER BY i.created_at DESC`
    )

    return result.rows
  }

  // Get submitted invoices (archived, read-only)
  async getSubmittedInvoices(startDate?: Date, endDate?: Date): Promise<any[]> {
    let whereClause = "WHERE i.status = 'submitted'"
    const params: any[] = []

    if (startDate) {
      params.push(startDate)
      whereClause += ` AND i.submitted_at >= $${params.length}`
    }

    if (endDate) {
      params.push(endDate)
      whereClause += ` AND i.submitted_at <= $${params.length}`
    }

    const result = await pool.query(
      `SELECT 
        i.*,
        c.claim_number,
        c.diagnosis_code,
        c.diagnosis_description,
        c.sha_reference as claim_sha_reference,
        p.op_number,
        p.first_name,
        p.last_name,
        p.insurance_number,
        u1.username as generated_by_username,
        u2.username as submitted_by_username
       FROM sha_invoices i
       JOIN claims c ON i.claim_id = c.id
       JOIN patients p ON i.patient_id = p.id
       JOIN users u1 ON i.generated_by = u1.id
       LEFT JOIN users u2 ON i.submitted_by = u2.id
       ${whereClause}
       ORDER BY i.submitted_at DESC`,
      params
    )

    return result.rows
  }

  // Missing methods that are referenced in routes
  async getInvoiceForPrinting(id: string): Promise<any> {
    const result = await pool.query(
      `SELECT 
        i.*,
        c.claim_number,
        c.diagnosis_code,
        c.diagnosis_description,
        p.op_number,
        p.first_name,
        p.last_name,
        p.insurance_number,
        u.username as generated_by_username
       FROM sha_invoices i
       JOIN claims c ON i.claim_id = c.id
       JOIN patients p ON i.patient_id = p.id
       JOIN users u ON i.generated_by = u.id
       WHERE i.id = $1`,
      [id]
    )
    return result.rows[0]
  }

  async generateInvoicesForBatch(batchId: string, userId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT 
        c.*,
        p.op_number,
        p.first_name,
        p.last_name,
        p.insurance_number
       FROM claims c
       WHERE c.batch_id = $1 AND c.status = 'ready_to_submit'`,
      [batchId]
    )
    return result.rows
  }

  async markInvoiceAsPrinted(id: string, userId: string): Promise<any> {
    const result = await pool.query(
      `UPDATE sha_invoices 
       SET status = 'printed', printed_at = NOW(), printed_by = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, userId]
    )
    return result.rows[0]
  }

  async submitInvoiceToSHA(id: string, userId: string): Promise<any> {
    const result = await pool.query(
      `UPDATE sha_invoices 
       SET status = 'submitted', submitted_at = NOW(), submitted_by = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, userId]
    )
    return result.rows[0]
  }

  async getInvoicesReadyForPrinting(batchType: "weekly" | "monthly"): Promise<any[]> {
    const result = await pool.query(
      `SELECT 
        i.*,
        c.claim_number,
        c.diagnosis_code,
        c.diagnosis_description,
        p.op_number,
        p.first_name,
        p.last_name,
        p.insurance_number,
        u.username as generated_by_username
       FROM sha_invoices i
       JOIN claims c ON i.claim_id = c.id
       JOIN patients p ON i.patient_id = p.id
       JOIN users u ON i.generated_by = u.id
       WHERE i.status = 'generated'
       ORDER BY i.created_at DESC`
    )
    return result.rows
  }

  async getComplianceReport(startDate?: Date, endDate?: Date): Promise<any> {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_claims,
        COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted_claims,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_claims,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_claims,
        AVG(CASE WHEN status = 'approved' THEN EXTRACT(EPOCH FROM (approved_at - submitted_at))/86400 END) as avg_approval_days
       FROM claims
       WHERE created_at >= $1 AND created_at <= $2`,
      [startDate || new Date(0), endDate || new Date()]
    )
    return result.rows[0]
  }
}
