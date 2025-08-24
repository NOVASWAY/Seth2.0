import { pool } from "../config/database"

export class Invoice {
  static async query(query: string, params: any[] = []) {
    const client = await pool.connect()
    try {
      const result = await client.query(query, params)
      return result
    } finally {
      client.release()
    }
  }

  static async findById(id: string) {
    const result = await this.query(
      "SELECT * FROM invoices WHERE id = $1",
      [id]
    )
    return result.rows[0]
  }

  static async create(invoiceData: any) {
    const result = await this.query(
      `INSERT INTO invoices (
        id, invoice_number, op_number, patient_id, buyer_name, buyer_phone,
        invoice_date, due_date, subtotal, tax_amount, discount_amount,
        total_amount, amount_paid, balance, status, payment_terms, notes,
        created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        invoiceData.id,
        invoiceData.invoice_number,
        invoiceData.op_number,
        invoiceData.patient_id,
        invoiceData.buyer_name,
        invoiceData.buyer_phone,
        invoiceData.invoice_date,
        invoiceData.due_date,
        invoiceData.subtotal,
        invoiceData.tax_amount,
        invoiceData.discount_amount,
        invoiceData.total_amount,
        invoiceData.amount_paid,
        invoiceData.balance,
        invoiceData.status,
        invoiceData.payment_terms,
        invoiceData.notes,
        invoiceData.created_by,
        invoiceData.created_at,
        invoiceData.updated_at,
      ]
    )
    return result.rows[0]
  }

  static async update(id: string, updates: any) {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(", ")
    
    const result = await this.query(
      `UPDATE invoices SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...Object.values(updates)]
    )
    return result.rows[0]
  }

  static async delete(id: string) {
    const result = await this.query(
      "DELETE FROM invoices WHERE id = $1 RETURNING *",
      [id]
    )
    return result.rows[0]
  }
}
