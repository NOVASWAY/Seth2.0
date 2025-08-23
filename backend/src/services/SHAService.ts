import axios from "axios"
import type { Claim, ClaimBatch } from "../models/Claims"
import { pool } from "../config/database"

export interface SHAConfig {
  baseUrl: string
  apiKey: string
  providerCode: string
  timeout: number
}

export class SHAService {
  private config: SHAConfig

  constructor() {
    this.config = {
      baseUrl: process.env.SHA_API_URL || "https://api.sha.go.ke",
      apiKey: process.env.SHA_API_KEY || "",
      providerCode: process.env.SHA_PROVIDER_CODE || "",
      timeout: 30000,
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

  async submitSingleClaim(claim: Claim, claimItems: any[]): Promise<any> {
    const payload = {
      claim_number: claim.claim_number,
      member_number: claim.member_number,
      visit_date: claim.visit_date.toISOString().split("T")[0],
      diagnosis: {
        code: claim.diagnosis_code,
        description: claim.diagnosis_description,
      },
      services: claimItems.map((item) => ({
        service_code: item.service_code,
        description: item.service_description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      })),
      total_amount: claim.total_amount,
      provider_code: this.config.providerCode,
    }

    // Log submission attempt
    const logId = crypto.randomUUID()
    await pool.query(
      `
      INSERT INTO claim_submission_logs (
        id, claim_id, submission_type, request_payload, status, retry_count, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
      [logId, claim.id, "single", JSON.stringify(payload), "pending", 0, new Date(), new Date()],
    )

    const result = await this.makeRequest("/claims/submit", payload)

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
      // Update claim status
      await pool.query(
        `
        UPDATE claims 
        SET status = $1, submission_date = $2, sha_reference = $3, updated_at = $4
        WHERE id = $5
      `,
        ["submitted", new Date(), result.data?.reference || result.data?.claim_reference, new Date(), claim.id],
      )
    }

    return result
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
}
