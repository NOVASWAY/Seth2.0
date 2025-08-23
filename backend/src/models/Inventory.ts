import pool from "../config/database"
import type { InventoryItem, InventoryBatch, InventoryMovement } from "../../../types"

export interface CreateInventoryItemData {
  name: string
  genericName?: string
  category: string
  unit: string
  reorderLevel?: number
  maxLevel?: number
}

export interface UpdateInventoryItemData {
  name?: string
  genericName?: string
  category?: string
  unit?: string
  reorderLevel?: number
  maxLevel?: number
  isActive?: boolean
}

export interface CreateBatchData {
  inventoryItemId: string
  batchNumber: string
  quantity: number
  unitCost: number
  sellingPrice: number
  expiryDate: Date
  supplierName?: string
  receivedBy: string
}

export interface CreateMovementData {
  inventoryItemId: string
  batchId?: string
  movementType: "RECEIVE" | "DISPENSE" | "ADJUST" | "EXPIRE" | "TRANSFER"
  quantity: number
  unitCost?: number
  reference?: string
  performedBy: string
  notes?: string
}

export class InventoryModel {
  // Inventory Items
  static async findAllItems(limit = 50, offset = 0): Promise<{ items: InventoryItem[]; total: number }> {
    const countQuery = "SELECT COUNT(*) FROM inventory_items WHERE is_active = true"
    const countResult = await pool.query(countQuery)
    const total = Number.parseInt(countResult.rows[0].count)

    const query = `
      SELECT id, name, generic_name as "genericName", category, unit,
             reorder_level as "reorderLevel", max_level as "maxLevel",
             is_active as "isActive", created_at as "createdAt",
             updated_at as "updatedAt"
      FROM inventory_items 
      WHERE is_active = true
      ORDER BY name ASC
      LIMIT $1 OFFSET $2
    `

    const result = await pool.query(query, [limit, offset])

    return {
      items: result.rows,
      total,
    }
  }

  static async findItemById(id: string): Promise<InventoryItem | null> {
    const query = `
      SELECT id, name, generic_name as "genericName", category, unit,
             reorder_level as "reorderLevel", max_level as "maxLevel",
             is_active as "isActive", created_at as "createdAt",
             updated_at as "updatedAt"
      FROM inventory_items WHERE id = $1
    `
    const result = await pool.query(query, [id])
    return result.rows[0] || null
  }

  static async searchItems(searchTerm: string, limit = 20): Promise<InventoryItem[]> {
    const query = `
      SELECT id, name, generic_name as "genericName", category, unit,
             reorder_level as "reorderLevel", max_level as "maxLevel",
             is_active as "isActive", created_at as "createdAt",
             updated_at as "updatedAt"
      FROM inventory_items 
      WHERE is_active = true
        AND (name ILIKE $1 OR generic_name ILIKE $1 OR category ILIKE $1)
      ORDER BY name ASC
      LIMIT $2
    `
    const searchPattern = `%${searchTerm}%`
    const result = await pool.query(query, [searchPattern, limit])
    return result.rows
  }

  static async createItem(itemData: CreateInventoryItemData): Promise<InventoryItem> {
    const query = `
      INSERT INTO inventory_items (name, generic_name, category, unit, reorder_level, max_level)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, generic_name as "genericName", category, unit,
                reorder_level as "reorderLevel", max_level as "maxLevel",
                is_active as "isActive", created_at as "createdAt",
                updated_at as "updatedAt"
    `

    const result = await pool.query(query, [
      itemData.name,
      itemData.genericName,
      itemData.category,
      itemData.unit,
      itemData.reorderLevel || 0,
      itemData.maxLevel || 1000,
    ])

    return result.rows[0]
  }

  static async updateItem(id: string, itemData: UpdateInventoryItemData): Promise<InventoryItem | null> {
    const fields = []
    const values = []
    let paramCount = 1

    Object.entries(itemData).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbField = key.replace(/([A-Z])/g, "_$1").toLowerCase()
        fields.push(`${dbField} = $${paramCount}`)
        values.push(value)
        paramCount++
      }
    })

    if (fields.length === 0) {
      return this.findItemById(id)
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    const query = `
      UPDATE inventory_items SET ${fields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id, name, generic_name as "genericName", category, unit,
                reorder_level as "reorderLevel", max_level as "maxLevel",
                is_active as "isActive", created_at as "createdAt",
                updated_at as "updatedAt"
    `

    const result = await pool.query(query, values)
    return result.rows[0] || null
  }

  // Inventory Batches
  static async findBatchesByItemId(itemId: string): Promise<InventoryBatch[]> {
    const query = `
      SELECT id, inventory_item_id as "inventoryItemId", batch_number as "batchNumber",
             quantity, original_quantity as "originalQuantity", unit_cost as "unitCost",
             selling_price as "sellingPrice", expiry_date as "expiryDate",
             supplier_name as "supplierName", received_date as "receivedDate",
             received_by as "receivedBy", is_expired as "isExpired",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM inventory_batches 
      WHERE inventory_item_id = $1 AND quantity > 0
      ORDER BY expiry_date ASC
    `
    const result = await pool.query(query, [itemId])
    return result.rows
  }

  static async findBatchById(id: string): Promise<InventoryBatch | null> {
    const query = `
      SELECT id, inventory_item_id as "inventoryItemId", batch_number as "batchNumber",
             quantity, original_quantity as "originalQuantity", unit_cost as "unitCost",
             selling_price as "sellingPrice", expiry_date as "expiryDate",
             supplier_name as "supplierName", received_date as "receivedDate",
             received_by as "receivedBy", is_expired as "isExpired",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM inventory_batches WHERE id = $1
    `
    const result = await pool.query(query, [id])
    return result.rows[0] || null
  }

  static async createBatch(batchData: CreateBatchData): Promise<InventoryBatch> {
    const query = `
      INSERT INTO inventory_batches (
        inventory_item_id, batch_number, quantity, original_quantity,
        unit_cost, selling_price, expiry_date, supplier_name, received_by
      )
      VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8)
      RETURNING id, inventory_item_id as "inventoryItemId", batch_number as "batchNumber",
                quantity, original_quantity as "originalQuantity", unit_cost as "unitCost",
                selling_price as "sellingPrice", expiry_date as "expiryDate",
                supplier_name as "supplierName", received_date as "receivedDate",
                received_by as "receivedBy", is_expired as "isExpired",
                created_at as "createdAt", updated_at as "updatedAt"
    `

    const result = await pool.query(query, [
      batchData.inventoryItemId,
      batchData.batchNumber,
      batchData.quantity,
      batchData.unitCost,
      batchData.sellingPrice,
      batchData.expiryDate,
      batchData.supplierName,
      batchData.receivedBy,
    ])

    return result.rows[0]
  }

  static async updateBatchQuantity(id: string, newQuantity: number): Promise<InventoryBatch | null> {
    const query = `
      UPDATE inventory_batches 
      SET quantity = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, inventory_item_id as "inventoryItemId", batch_number as "batchNumber",
                quantity, original_quantity as "originalQuantity", unit_cost as "unitCost",
                selling_price as "sellingPrice", expiry_date as "expiryDate",
                supplier_name as "supplierName", received_date as "receivedDate",
                received_by as "receivedBy", is_expired as "isExpired",
                created_at as "createdAt", updated_at as "updatedAt"
    `
    const result = await pool.query(query, [newQuantity, id])
    return result.rows[0] || null
  }

  // Inventory Movements
  static async createMovement(movementData: CreateMovementData): Promise<InventoryMovement> {
    const query = `
      INSERT INTO inventory_movements (
        inventory_item_id, batch_id, movement_type, quantity,
        unit_cost, reference, performed_by, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, inventory_item_id as "inventoryItemId", batch_id as "batchId",
                movement_type as "movementType", quantity, unit_cost as "unitCost",
                reference, performed_by as "performedBy", performed_at as "performedAt",
                notes
    `

    const result = await pool.query(query, [
      movementData.inventoryItemId,
      movementData.batchId,
      movementData.movementType,
      movementData.quantity,
      movementData.unitCost,
      movementData.reference,
      movementData.performedBy,
      movementData.notes,
    ])

    return result.rows[0]
  }

  static async findMovementsByItemId(itemId: string, limit = 50): Promise<InventoryMovement[]> {
    const query = `
      SELECT id, inventory_item_id as "inventoryItemId", batch_id as "batchId",
             movement_type as "movementType", quantity, unit_cost as "unitCost",
             reference, performed_by as "performedBy", performed_at as "performedAt",
             notes
      FROM inventory_movements 
      WHERE inventory_item_id = $1
      ORDER BY performed_at DESC
      LIMIT $2
    `
    const result = await pool.query(query, [itemId, limit])
    return result.rows
  }

  // Stock levels and alerts
  static async getStockLevels(): Promise<
    Array<{
      id: string
      name: string
      category: string
      unit: string
      totalQuantity: number
      reorderLevel: number
      needsReorder: boolean
      expiringBatches: number
    }>
  > {
    const query = `
      SELECT 
        i.id,
        i.name,
        i.category,
        i.unit,
        COALESCE(SUM(b.quantity), 0) as total_quantity,
        i.reorder_level,
        COALESCE(SUM(b.quantity), 0) <= i.reorder_level as needs_reorder,
        COUNT(CASE WHEN b.expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND b.quantity > 0 THEN 1 END) as expiring_batches
      FROM inventory_items i
      LEFT JOIN inventory_batches b ON i.id = b.inventory_item_id AND b.quantity > 0
      WHERE i.is_active = true
      GROUP BY i.id, i.name, i.category, i.unit, i.reorder_level
      ORDER BY needs_reorder DESC, i.name ASC
    `

    const result = await pool.query(query)
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      unit: row.unit,
      totalQuantity: Number.parseInt(row.total_quantity),
      reorderLevel: row.reorder_level,
      needsReorder: row.needs_reorder,
      expiringBatches: Number.parseInt(row.expiring_batches),
    }))
  }

  static async getExpiringBatches(days = 30): Promise<
    Array<{
      id: string
      itemName: string
      batchNumber: string
      quantity: number
      expiryDate: Date
      daysToExpiry: number
    }>
  > {
    const query = `
      SELECT 
        b.id,
        i.name as item_name,
        b.batch_number,
        b.quantity,
        b.expiry_date,
        (b.expiry_date - CURRENT_DATE) as days_to_expiry
      FROM inventory_batches b
      JOIN inventory_items i ON b.inventory_item_id = i.id
      WHERE b.expiry_date <= CURRENT_DATE + INTERVAL '${days} days'
        AND b.quantity > 0
        AND i.is_active = true
      ORDER BY b.expiry_date ASC
    `

    const result = await pool.query(query)
    return result.rows.map((row) => ({
      id: row.id,
      itemName: row.item_name,
      batchNumber: row.batch_number,
      quantity: row.quantity,
      expiryDate: row.expiry_date,
      daysToExpiry: row.days_to_expiry,
    }))
  }

  // Get available stock for prescriptions
  static async getAvailableStock(search?: string, category?: string): Promise<
    Array<{
      id: string
      name: string
      genericName?: string
      category: string
      unit: string
      availableQuantity: number
      sellingPrice: number
      hasExpiringStock: boolean
    }>
  > {
    let query = `
      SELECT 
        i.id,
        i.name,
        i.generic_name,
        i.category,
        i.unit,
        COALESCE(SUM(CASE WHEN b.expiry_date > CURRENT_DATE THEN b.quantity ELSE 0 END), 0) as available_quantity,
        MIN(b.selling_price) as selling_price,
        BOOLEAN_OR(b.expiry_date <= CURRENT_DATE + INTERVAL '30 days') as has_expiring_stock
      FROM inventory_items i
      LEFT JOIN inventory_batches b ON i.id = b.inventory_item_id
      WHERE i.is_active = true
    `

    const params: any[] = []
    let paramCount = 0

    if (search) {
      paramCount++
      query += ` AND (i.name ILIKE $${paramCount} OR i.generic_name ILIKE $${paramCount})`
      params.push(`%${search}%`)
    }

    if (category) {
      paramCount++
      query += ` AND i.category = $${paramCount}`
      params.push(category)
    }

    query += `
      GROUP BY i.id, i.name, i.generic_name, i.category, i.unit
      HAVING COALESCE(SUM(CASE WHEN b.expiry_date > CURRENT_DATE THEN b.quantity ELSE 0 END), 0) > 0
      ORDER BY i.name ASC
    `

    const result = await pool.query(query, params)
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      genericName: row.generic_name,
      category: row.category,
      unit: row.unit,
      availableQuantity: Number.parseInt(row.available_quantity),
      sellingPrice: row.selling_price,
      hasExpiringStock: row.has_expiring_stock,
    }))
  }

  // Dispensing operations
  static async dispenseFromBatch(
    batchId: string,
    quantity: number,
    performedBy: string,
    reference?: string,
  ): Promise<{ success: boolean; message: string; batch?: InventoryBatch }> {
    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      // Get current batch
      const batchQuery = `
        SELECT id, inventory_item_id, quantity, selling_price
        FROM inventory_batches 
        WHERE id = $1 FOR UPDATE
      `
      const batchResult = await client.query(batchQuery, [batchId])

      if (batchResult.rows.length === 0) {
        await client.query("ROLLBACK")
        return { success: false, message: "Batch not found" }
      }

      const batch = batchResult.rows[0]

      if (batch.quantity < quantity) {
        await client.query("ROLLBACK")
        return { success: false, message: "Insufficient stock in batch" }
      }

      // Update batch quantity
      const newQuantity = batch.quantity - quantity
      const updateQuery = `
        UPDATE inventory_batches 
        SET quantity = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `
      await client.query(updateQuery, [newQuantity, batchId])

      // Create movement record
      const movementQuery = `
        INSERT INTO inventory_movements (
          inventory_item_id, batch_id, movement_type, quantity,
          unit_cost, reference, performed_by
        )
        VALUES ($1, $2, 'DISPENSE', $3, $4, $5, $6)
      `
      await client.query(movementQuery, [
        batch.inventory_item_id,
        batchId,
        quantity,
        batch.selling_price,
        reference,
        performedBy,
      ])

      await client.query("COMMIT")

      const updatedBatch = await this.findBatchById(batchId)
      return { success: true, message: "Dispensed successfully", batch: updatedBatch! }
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }
}
