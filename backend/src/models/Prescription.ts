import pool from "../config/database"
import type { Prescription, PrescriptionItem } from "../../../types"

export interface CreatePrescriptionData {
  consultationId: string
  visitId: string
  patientId: string
  prescribedBy: string
  items: Array<{
    inventoryItemId: string
    itemName: string
    dosage: string
    frequency: string
    duration: string
    quantityPrescribed: number
    instructions?: string
  }>
}

export interface UpdatePrescriptionStatusData {
  status: "PENDING" | "PARTIALLY_DISPENSED" | "FULLY_DISPENSED" | "CANCELLED"
}

export class PrescriptionModel {
  // Create new prescription with items
  static async create(data: CreatePrescriptionData): Promise<Prescription> {
    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      // Create prescription
      const prescriptionQuery = `
        INSERT INTO prescriptions (
          consultation_id, visit_id, patient_id, prescribed_by, status
        )
        VALUES ($1, $2, $3, $4, 'PENDING')
        RETURNING id, consultation_id as "consultationId", visit_id as "visitId", 
                  patient_id as "patientId", prescribed_by as "prescribedBy", 
                  status, created_at as "createdAt", updated_at as "updatedAt"
      `
      const prescriptionResult = await client.query(prescriptionQuery, [
        data.consultationId,
        data.visitId,
        data.patientId,
        data.prescribedBy,
      ])

      const prescription = prescriptionResult.rows[0]

      // Create prescription items
      const itemQuery = `
        INSERT INTO prescription_items (
          prescription_id, inventory_item_id, item_name, dosage, frequency,
          duration, quantity_prescribed, instructions
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, prescription_id as "prescriptionId", inventory_item_id as "inventoryItemId",
                  item_name as "itemName", dosage, frequency, duration,
                  quantity_prescribed as "quantityPrescribed", quantity_dispensed as "quantityDispensed",
                  instructions
      `

      const items: PrescriptionItem[] = []
      for (const item of data.items) {
        const itemResult = await client.query(itemQuery, [
          prescription.id,
          item.inventoryItemId,
          item.itemName,
          item.dosage,
          item.frequency,
          item.duration,
          item.quantityPrescribed,
          item.instructions || null,
        ])
        items.push(itemResult.rows[0])
      }

      await client.query("COMMIT")

      return {
        ...prescription,
        items,
      }
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }

  // Find prescription by ID
  static async findById(id: string): Promise<Prescription | null> {
    const client = await pool.connect()

    try {
      // Get prescription
      const prescriptionQuery = `
        SELECT id, consultation_id as "consultationId", visit_id as "visitId", 
               patient_id as "patientId", prescribed_by as "prescribedBy", 
               status, created_at as "createdAt", updated_at as "updatedAt"
        FROM prescriptions 
        WHERE id = $1
      `
      const prescriptionResult = await client.query(prescriptionQuery, [id])

      if (prescriptionResult.rows.length === 0) {
        return null
      }

      const prescription = prescriptionResult.rows[0]

      // Get prescription items
      const itemsQuery = `
        SELECT id, prescription_id as "prescriptionId", inventory_item_id as "inventoryItemId",
               item_name as "itemName", dosage, frequency, duration,
               quantity_prescribed as "quantityPrescribed", quantity_dispensed as "quantityDispensed",
               instructions
        FROM prescription_items 
        WHERE prescription_id = $1
      `
      const itemsResult = await client.query(itemsQuery, [id])
      const items = itemsResult.rows

      return {
        ...prescription,
        items,
      }
    } finally {
      client.release()
    }
  }

  // Find prescriptions by patient ID
  static async findByPatientId(patientId: string): Promise<Prescription[]> {
    const client = await pool.connect()

    try {
      // Get prescriptions
      const prescriptionQuery = `
        SELECT id, consultation_id as "consultationId", visit_id as "visitId", 
               patient_id as "patientId", prescribed_by as "prescribedBy", 
               status, created_at as "createdAt", updated_at as "updatedAt"
        FROM prescriptions 
        WHERE patient_id = $1
        ORDER BY created_at DESC
      `
      const prescriptionResult = await client.query(prescriptionQuery, [patientId])
      const prescriptions = prescriptionResult.rows

      // Get items for each prescription
      const prescriptionsWithItems: Prescription[] = []
      for (const prescription of prescriptions) {
        const itemsQuery = `
          SELECT id, prescription_id as "prescriptionId", inventory_item_id as "inventoryItemId",
                 item_name as "itemName", dosage, frequency, duration,
                 quantity_prescribed as "quantityPrescribed", quantity_dispensed as "quantityDispensed",
                 instructions
          FROM prescription_items 
          WHERE prescription_id = $1
        `
        const itemsResult = await client.query(itemsQuery, [prescription.id])
        const items = itemsResult.rows

        prescriptionsWithItems.push({
          ...prescription,
          items,
        })
      }

      return prescriptionsWithItems
    } finally {
      client.release()
    }
  }

  // Update prescription status
  static async updateStatus(id: string, status: string): Promise<Prescription | null> {
    const query = `
      UPDATE prescriptions 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, consultation_id as "consultationId", visit_id as "visitId", 
                patient_id as "patientId", prescribed_by as "prescribedBy", 
                status, created_at as "createdAt", updated_at as "updatedAt"
    `
    const result = await pool.query(query, [status, id])

    if (result.rows.length === 0) {
      return null
    }

    const prescription = result.rows[0]

    // Get prescription items
    const itemsQuery = `
      SELECT id, prescription_id as "prescriptionId", inventory_item_id as "inventoryItemId",
             item_name as "itemName", dosage, frequency, duration,
             quantity_prescribed as "quantityPrescribed", quantity_dispensed as "quantityDispensed",
             instructions
      FROM prescription_items 
      WHERE prescription_id = $1
    `
    const itemsResult = await pool.query(itemsQuery, [id])
    const items = itemsResult.rows

    return {
      ...prescription,
      items,
    }
  }

  // Update dispensed quantity for a prescription item
  static async updateDispensedQuantity(itemId: string, quantityDispensed: number): Promise<PrescriptionItem | null> {
    const query = `
      UPDATE prescription_items 
      SET quantity_dispensed = $1
      WHERE id = $2
      RETURNING id, prescription_id as "prescriptionId", inventory_item_id as "inventoryItemId",
                item_name as "itemName", dosage, frequency, duration,
                quantity_prescribed as "quantityPrescribed", quantity_dispensed as "quantityDispensed",
                instructions
    `
    const result = await pool.query(query, [quantityDispensed, itemId])

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0]
  }

  // Get prescriptions by visit ID
  static async findByVisitId(visitId: string): Promise<Prescription[]> {
    const client = await pool.connect()

    try {
      // Get prescriptions
      const prescriptionQuery = `
        SELECT id, consultation_id as "consultationId", visit_id as "visitId", 
               patient_id as "patientId", prescribed_by as "prescribedBy", 
               status, created_at as "createdAt", updated_at as "updatedAt"
        FROM prescriptions 
        WHERE visit_id = $1
        ORDER BY created_at DESC
      `
      const prescriptionResult = await client.query(prescriptionQuery, [visitId])
      const prescriptions = prescriptionResult.rows

      // Get items for each prescription
      const prescriptionsWithItems: Prescription[] = []
      for (const prescription of prescriptions) {
        const itemsQuery = `
          SELECT id, prescription_id as "prescriptionId", inventory_item_id as "inventoryItemId",
                 item_name as "itemName", dosage, frequency, duration,
                 quantity_prescribed as "quantityPrescribed", quantity_dispensed as "quantityDispensed",
                 instructions
          FROM prescription_items 
          WHERE prescription_id = $1
        `
        const itemsResult = await client.query(itemsQuery, [prescription.id])
        const items = itemsResult.rows

        prescriptionsWithItems.push({
          ...prescription,
          items,
        })
      }

      return prescriptionsWithItems
    } finally {
      client.release()
    }
  }
}
