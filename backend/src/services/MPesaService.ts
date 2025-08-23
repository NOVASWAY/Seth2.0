import axios from "axios"
import type { MPesaTransaction } from "../models/Financial"
import { pool } from "../config/database"

export class MPesaService {
  private consumerKey: string
  private consumerSecret: string
  private shortcode: string
  private passkey: string
  private baseUrl: string
  private callbackUrl: string

  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY || ""
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET || ""
    this.shortcode = process.env.MPESA_SHORTCODE || ""
    this.passkey = process.env.MPESA_PASSKEY || ""
    this.baseUrl = process.env.MPESA_BASE_URL || "https://sandbox.safaricom.co.ke"
    this.callbackUrl = process.env.MPESA_CALLBACK_URL || ""
  }

  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString("base64")

    try {
      const response = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
      })

      return response.data.access_token
    } catch (error) {
      console.error("Error getting M-Pesa access token:", error)
      throw new Error("Failed to get M-Pesa access token")
    }
  }

  private generatePassword(): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, -3)
    const password = Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString("base64")
    return password
  }

  private getTimestamp(): string {
    return new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, -3)
  }

  async initiateSTKPush(
    phoneNumber: string,
    amount: number,
    accountReference: string,
    transactionDesc: string,
  ): Promise<MPesaTransaction> {
    const accessToken = await this.getAccessToken()
    const password = this.generatePassword()
    const timestamp = this.getTimestamp()

    // Format phone number (remove + and ensure it starts with 254)
    const formattedPhone = phoneNumber.replace(/^\+/, "").replace(/^0/, "254")

    const requestBody = {
      BusinessShortCode: this.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: this.shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: this.callbackUrl,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc,
    }

    try {
      const response = await axios.post(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, requestBody, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })

      // Save transaction to database
      const transaction: Partial<MPesaTransaction> = {
        id: crypto.randomUUID(),
        transaction_type: "stk_push",
        merchant_request_id: response.data.MerchantRequestID,
        checkout_request_id: response.data.CheckoutRequestID,
        phone_number: formattedPhone,
        amount: amount,
        account_reference: accountReference,
        transaction_desc: transactionDesc,
        status: "pending",
        created_at: new Date(),
        updated_at: new Date(),
      }

      await pool.query(
        `
        INSERT INTO mpesa_transactions (
          id, transaction_type, merchant_request_id, checkout_request_id,
          phone_number, amount, account_reference, transaction_desc, status,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
        [
          transaction.id,
          transaction.transaction_type,
          transaction.merchant_request_id,
          transaction.checkout_request_id,
          transaction.phone_number,
          transaction.amount,
          transaction.account_reference,
          transaction.transaction_desc,
          transaction.status,
          transaction.created_at,
          transaction.updated_at,
        ],
      )

      return transaction as MPesaTransaction
    } catch (error) {
      console.error("Error initiating STK Push:", error)
      throw new Error("Failed to initiate M-Pesa payment")
    }
  }

  async handleCallback(callbackData: any): Promise<void> {
    const { Body } = callbackData
    const { stkCallback } = Body

    const merchantRequestId = stkCallback.MerchantRequestID
    const checkoutRequestId = stkCallback.CheckoutRequestID
    const resultCode = stkCallback.ResultCode
    const resultDesc = stkCallback.ResultDesc

    let status: "success" | "failed" | "cancelled" = "failed"
    let receiptNumber: string | undefined
    let transactionId: string | undefined

    if (resultCode === 0) {
      status = "success"
      const callbackMetadata = stkCallback.CallbackMetadata?.Item || []

      for (const item of callbackMetadata) {
        if (item.Name === "MpesaReceiptNumber") {
          receiptNumber = item.Value
        }
        if (item.Name === "TransactionId") {
          transactionId = item.Value
        }
      }
    } else if (resultCode === 1032) {
      status = "cancelled"
    }

    // Update transaction in database
    await pool.query(
      `
      UPDATE mpesa_transactions 
      SET status = $1, result_code = $2, result_desc = $3, 
          receipt_number = $4, transaction_id = $5, updated_at = $6
      WHERE checkout_request_id = $7
    `,
      [status, resultCode.toString(), resultDesc, receiptNumber, transactionId, new Date(), checkoutRequestId],
    )

    // If successful, create payment record
    if (status === "success") {
      const transactionResult = await pool.query(
        `
        SELECT * FROM mpesa_transactions WHERE checkout_request_id = $1
      `,
        [checkoutRequestId],
      )

      if (transactionResult.rows.length > 0) {
        const transaction = transactionResult.rows[0]

        // Create payment record
        await pool.query(
          `
          INSERT INTO payments (
            id, invoice_id, payment_reference, payment_method, amount,
            mpesa_receipt, mpesa_transaction_id, payment_date, received_by,
            reconciled, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
          [
            crypto.randomUUID(),
            transaction.invoice_id,
            receiptNumber,
            "mpesa",
            transaction.amount,
            receiptNumber,
            transactionId,
            new Date(),
            "system",
            true,
            new Date(),
          ],
        )

        // Update invoice payment status
        if (transaction.invoice_id) {
          await this.updateInvoicePaymentStatus(transaction.invoice_id)
        }
      }
    }
  }

  private async updateInvoicePaymentStatus(invoiceId: string): Promise<void> {
    // Calculate total payments for invoice
    const paymentsResult = await pool.query(
      `
      SELECT COALESCE(SUM(amount), 0) as total_paid
      FROM payments 
      WHERE invoice_id = $1
    `,
      [invoiceId],
    )

    const totalPaid = Number.parseFloat(paymentsResult.rows[0].total_paid)

    // Get invoice total
    const invoiceResult = await pool.query(
      `
      SELECT total_amount FROM invoices WHERE id = $1
    `,
      [invoiceId],
    )

    if (invoiceResult.rows.length > 0) {
      const totalAmount = Number.parseFloat(invoiceResult.rows[0].total_amount)
      const balance = totalAmount - totalPaid

      let status: "paid" | "partial" | "unpaid" = "unpaid"
      if (balance <= 0) {
        status = "paid"
      } else if (totalPaid > 0) {
        status = "partial"
      }

      await pool.query(
        `
        UPDATE invoices 
        SET amount_paid = $1, balance = $2, status = $3, updated_at = $4
        WHERE id = $5
      `,
        [totalPaid, Math.max(0, balance), status, new Date(), invoiceId],
      )
    }
  }
}
