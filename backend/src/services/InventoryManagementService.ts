import { DatabaseService } from './DatabaseService'

export interface InventoryItem {
  id: string
  itemName: string
  itemCode: string
  quantityAvailable: number
  unitOfMeasure: string
  costPricePerUnit: number
  sellingPricePerUnit: number
  supplierDetails: string
  expiryDate: Date
  batchNumber?: string
  category: string
  minimumStockLevel: number
  maximumStockLevel: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}

export interface StockMovement {
  id: string
  itemId: string
  movementType: 'IN' | 'OUT' | 'ADJUSTMENT' | 'EXPIRED' | 'DAMAGED'
  quantity: number
  previousQuantity: number
  newQuantity: number
  unitPrice: number
  totalValue: number
  reason: string
  reference?: string // OP number for patients, receipt number for non-patients
  patientId?: string
  invoiceId?: string
  receiptNumber?: string
  dispensedBy: string
  dispensedAt: Date
  notes?: string
}

export interface DispensingRecord {
  id: string
  type: 'PATIENT' | 'NON_PATIENT'
  opNumber?: string
  patientId?: string
  diagnosis?: string
  invoiceId?: string
  serviceGiven?: string
  receiptNumber?: string
  items: DispensingItem[]
  totalAmount: number
  dispensedBy: string
  dispensedAt: Date
  notes?: string
}

export interface DispensingItem {
  itemId: string
  itemName: string
  itemCode: string
  quantityDispensed: number
  unitPrice: number
  totalPrice: number
  batchNumber?: string
  expiryDate?: Date
}

export class InventoryManagementService {
  private db: DatabaseService

  constructor() {
    this.db = DatabaseService.getInstance()
  }

  // Add new inventory item
  async addInventoryItem(itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem> {
    try {
      const query = `
        INSERT INTO inventory_items (
          item_name, item_code, quantity_available, unit_of_measure,
          cost_price_per_unit, selling_price_per_unit, supplier_details,
          expiry_date, batch_number, category, minimum_stock_level,
          maximum_stock_level, created_by, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `

      const values = [
        itemData.itemName,
        itemData.itemCode,
        itemData.quantityAvailable,
        itemData.unitOfMeasure,
        itemData.costPricePerUnit,
        itemData.sellingPricePerUnit,
        itemData.supplierDetails,
        itemData.expiryDate,
        itemData.batchNumber,
        itemData.category,
        itemData.minimumStockLevel,
        itemData.maximumStockLevel,
        itemData.createdBy,
        itemData.isActive
      ]

      const result = await this.db.query(query, values)
      
      // Record initial stock entry
      await this.recordStockMovement({
        itemId: result.rows[0].id,
        movementType: 'IN',
        quantity: itemData.quantityAvailable,
        previousQuantity: 0,
        newQuantity: itemData.quantityAvailable,
        unitPrice: itemData.costPricePerUnit,
        totalValue: itemData.quantityAvailable * itemData.costPricePerUnit,
        reason: 'Initial stock entry',
        dispensedBy: itemData.createdBy,
        dispensedAt: new Date()
      })

      console.log('✅ Inventory item added:', result.rows[0])
      return this.mapDatabaseRowToInventoryItem(result.rows[0])
    } catch (error: any) {
      console.error('❌ Failed to add inventory item:', error)
      throw new Error(`Failed to add inventory item: ${error.message}`)
    }
  }

  // Dispense items to patient
  async dispenseToPatient(
    patientId: string,
    opNumber: string,
    diagnosis: string,
    invoiceId: string,
    serviceGiven: string,
    items: Array<{ itemId: string; quantity: number }>,
    dispensedBy: string
  ): Promise<DispensingRecord> {
    try {
      // Start transaction
      await this.db.query('BEGIN')

      const dispensingItems: DispensingItem[] = []
      let totalAmount = 0

      // Process each item
      for (const item of items) {
        // Check stock availability
        const stockCheck = await this.checkStockAvailability(item.itemId, item.quantity)
        if (!stockCheck.available) {
          throw new Error(`Insufficient stock for ${stockCheck.itemName}. Available: ${stockCheck.currentStock}, Requested: ${item.quantity}`)
        }

        // Check expiry
        if (stockCheck.isExpired) {
          throw new Error(`Item ${stockCheck.itemName} has expired and cannot be dispensed`)
        }

        // Deduct stock
        const newQuantity = stockCheck.currentStock - item.quantity
        await this.updateItemQuantity(item.itemId, newQuantity)

        // Calculate pricing
        const itemPrice = stockCheck.sellingPrice * item.quantity

        // Record stock movement
        await this.recordStockMovement({
          itemId: item.itemId,
          movementType: 'OUT',
          quantity: item.quantity,
          previousQuantity: stockCheck.currentStock,
          newQuantity: newQuantity,
          unitPrice: stockCheck.sellingPrice,
          totalValue: itemPrice,
          reason: 'Dispensed to patient',
          reference: opNumber,
          patientId,
          invoiceId,
          dispensedBy,
          dispensedAt: new Date()
        })

        dispensingItems.push({
          itemId: item.itemId,
          itemName: stockCheck.itemName,
          itemCode: stockCheck.itemCode,
          quantityDispensed: item.quantity,
          unitPrice: stockCheck.sellingPrice,
          totalPrice: itemPrice,
          batchNumber: stockCheck.batchNumber,
          expiryDate: stockCheck.expiryDate
        })

        totalAmount += itemPrice
      }

      // Create dispensing record
      const dispensingRecord: Omit<DispensingRecord, 'id'> = {
        type: 'PATIENT',
        opNumber,
        patientId,
        diagnosis,
        invoiceId,
        serviceGiven,
        items: dispensingItems,
        totalAmount,
        dispensedBy,
        dispensedAt: new Date()
      }

      const recordQuery = `
        INSERT INTO dispensing_records (
          type, op_number, patient_id, diagnosis, invoice_id, service_given,
          items, total_amount, dispensed_by, dispensed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `

      const recordValues = [
        dispensingRecord.type,
        dispensingRecord.opNumber,
        dispensingRecord.patientId,
        dispensingRecord.diagnosis,
        dispensingRecord.invoiceId,
        dispensingRecord.serviceGiven,
        JSON.stringify(dispensingRecord.items),
        dispensingRecord.totalAmount,
        dispensingRecord.dispensedBy,
        dispensingRecord.dispensedAt
      ]

      const result = await this.db.query(recordQuery, recordValues)

      // Update invoice with itemized charges
      await this.updateInvoiceWithItemizedCharges(invoiceId, dispensingItems)

      // Commit transaction
      await this.db.query('COMMIT')

      console.log('✅ Items dispensed to patient:', result.rows[0])
      return { id: result.rows[0].id, ...dispensingRecord }
    } catch (error: any) {
      // Rollback transaction
      await this.db.query('ROLLBACK')
      console.error('❌ Failed to dispense items to patient:', error)
      throw new Error(`Failed to dispense items: ${error.message}`)
    }
  }

  // Dispense items to non-patient (walk-in sales)
  async dispenseToNonPatient(
    items: Array<{ itemId: string; quantity: number }>,
    dispensedBy: string,
    buyerName?: string,
    notes?: string
  ): Promise<DispensingRecord> {
    try {
      await this.db.query('BEGIN')

      const dispensingItems: DispensingItem[] = []
      let totalAmount = 0
      const receiptNumber = this.generateReceiptNumber()

      // Process each item
      for (const item of items) {
        // Check stock availability
        const stockCheck = await this.checkStockAvailability(item.itemId, item.quantity)
        if (!stockCheck.available) {
          throw new Error(`Insufficient stock for ${stockCheck.itemName}. Available: ${stockCheck.currentStock}, Requested: ${item.quantity}`)
        }

        if (stockCheck.isExpired) {
          throw new Error(`Item ${stockCheck.itemName} has expired and cannot be dispensed`)
        }

        // Deduct stock
        const newQuantity = stockCheck.currentStock - item.quantity
        await this.updateItemQuantity(item.itemId, newQuantity)

        // Calculate pricing
        const itemPrice = stockCheck.sellingPrice * item.quantity

        // Record stock movement
        await this.recordStockMovement({
          itemId: item.itemId,
          movementType: 'OUT',
          quantity: item.quantity,
          previousQuantity: stockCheck.currentStock,
          newQuantity: newQuantity,
          unitPrice: stockCheck.sellingPrice,
          totalValue: itemPrice,
          reason: 'Non-patient sale',
          reference: receiptNumber,
          receiptNumber,
          dispensedBy,
          dispensedAt: new Date()
        })

        dispensingItems.push({
          itemId: item.itemId,
          itemName: stockCheck.itemName,
          itemCode: stockCheck.itemCode,
          quantityDispensed: item.quantity,
          unitPrice: stockCheck.sellingPrice,
          totalPrice: itemPrice,
          batchNumber: stockCheck.batchNumber,
          expiryDate: stockCheck.expiryDate
        })

        totalAmount += itemPrice
      }

      // Create dispensing record
      const dispensingRecord: Omit<DispensingRecord, 'id'> = {
        type: 'NON_PATIENT',
        receiptNumber,
        items: dispensingItems,
        totalAmount,
        dispensedBy,
        dispensedAt: new Date(),
        notes
      }

      const recordQuery = `
        INSERT INTO dispensing_records (
          type, receipt_number, items, total_amount, dispensed_by, dispensed_at, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `

      const recordValues = [
        dispensingRecord.type,
        dispensingRecord.receiptNumber,
        JSON.stringify(dispensingRecord.items),
        dispensingRecord.totalAmount,
        dispensingRecord.dispensedBy,
        dispensingRecord.dispensedAt,
        dispensingRecord.notes
      ]

      const result = await this.db.query(recordQuery, recordValues)

      await this.db.query('COMMIT')

      console.log('✅ Items dispensed to non-patient:', result.rows[0])
      return { id: result.rows[0].id, ...dispensingRecord }
    } catch (error: any) {
      await this.db.query('ROLLBACK')
      console.error('❌ Failed to dispense items to non-patient:', error)
      throw new Error(`Failed to dispense items: ${error.message}`)
    }
  }

  // Check stock availability
  private async checkStockAvailability(itemId: string, requestedQuantity: number) {
    const query = `
      SELECT item_name, item_code, quantity_available, selling_price_per_unit,
             batch_number, expiry_date
      FROM inventory_items 
      WHERE id = $1 AND is_active = true
    `
    
    const result = await this.db.query(query, [itemId])
    
    if (result.rows.length === 0) {
      throw new Error('Item not found or inactive')
    }

    const item = result.rows[0]
    const isExpired = new Date(item.expiry_date) < new Date()
    
    return {
      itemName: item.item_name,
      itemCode: item.item_code,
      currentStock: item.quantity_available,
      sellingPrice: parseFloat(item.selling_price_per_unit),
      batchNumber: item.batch_number,
      expiryDate: new Date(item.expiry_date),
      available: item.quantity_available >= requestedQuantity,
      isExpired
    }
  }

  // Update item quantity
  private async updateItemQuantity(itemId: string, newQuantity: number): Promise<void> {
    const query = `
      UPDATE inventory_items 
      SET quantity_available = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `
    
    await this.db.query(query, [newQuantity, itemId])
  }

  // Record stock movement
  private async recordStockMovement(movement: Omit<StockMovement, 'id'>): Promise<void> {
    const query = `
      INSERT INTO stock_movements (
        item_id, movement_type, quantity, previous_quantity, new_quantity,
        unit_price, total_value, reason, reference, patient_id, invoice_id,
        receipt_number, dispensed_by, dispensed_at, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `

    const values = [
      movement.itemId,
      movement.movementType,
      movement.quantity,
      movement.previousQuantity,
      movement.newQuantity,
      movement.unitPrice,
      movement.totalValue,
      movement.reason,
      movement.reference,
      movement.patientId,
      movement.invoiceId,
      movement.receiptNumber,
      movement.dispensedBy,
      movement.dispensedAt,
      movement.notes
    ]

    await this.db.query(query, values)
  }

  // Update invoice with itemized charges
  private async updateInvoiceWithItemizedCharges(invoiceId: string, items: DispensingItem[]): Promise<void> {
    try {
      const itemizedCharges = items.map(item => ({
        itemName: item.itemName,
        itemCode: item.itemCode,
        quantity: item.quantityDispensed,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      }))

      const query = `
        UPDATE invoices 
        SET itemized_charges = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `

      await this.db.query(query, [JSON.stringify(itemizedCharges), invoiceId])
    } catch (error) {
      console.error('❌ Failed to update invoice with itemized charges:', error)
      // Don't throw error as this is not critical for dispensing
    }
  }

  // Get all inventory items
  async getInventoryItems(includeInactive = false): Promise<InventoryItem[]> {
    try {
      const query = `
        SELECT * FROM inventory_items 
        ${includeInactive ? '' : 'WHERE is_active = true'}
        ORDER BY item_name ASC
      `
      
      const result = await this.db.query(query)
      
      return result.rows.map(row => this.mapDatabaseRowToInventoryItem(row))
    } catch (error: any) {
      console.error('❌ Failed to get inventory items:', error)
      throw new Error(`Failed to get inventory items: ${error.message}`)
    }
  }

  // Get low stock items
  async getLowStockItems(): Promise<InventoryItem[]> {
    try {
      const query = `
        SELECT * FROM inventory_items 
        WHERE quantity_available <= minimum_stock_level 
        AND is_active = true
        ORDER BY quantity_available ASC
      `
      
      const result = await this.db.query(query)
      
      return result.rows.map(row => this.mapDatabaseRowToInventoryItem(row))
    } catch (error: any) {
      console.error('❌ Failed to get low stock items:', error)
      throw new Error(`Failed to get low stock items: ${error.message}`)
    }
  }

  // Get expired items
  async getExpiredItems(): Promise<InventoryItem[]> {
    try {
      const query = `
        SELECT * FROM inventory_items 
        WHERE expiry_date < CURRENT_DATE 
        AND quantity_available > 0
        AND is_active = true
        ORDER BY expiry_date ASC
      `
      
      const result = await this.db.query(query)
      
      return result.rows.map(row => this.mapDatabaseRowToInventoryItem(row))
    } catch (error: any) {
      console.error('❌ Failed to get expired items:', error)
      throw new Error(`Failed to get expired items: ${error.message}`)
    }
  }

  // Generate reports
  async generateStockMovementReport(startDate: Date, endDate: Date): Promise<any> {
    try {
      const query = `
        SELECT 
          ii.item_name,
          ii.item_code,
          SUM(CASE WHEN sm.movement_type = 'IN' THEN sm.quantity ELSE 0 END) as stock_in,
          SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity ELSE 0 END) as stock_out,
          SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.total_value ELSE 0 END) as revenue,
          SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity * ii.cost_price_per_unit ELSE 0 END) as cost,
          COUNT(CASE WHEN sm.movement_type = 'OUT' AND sm.patient_id IS NOT NULL THEN 1 END) as patient_dispensing,
          COUNT(CASE WHEN sm.movement_type = 'OUT' AND sm.receipt_number IS NOT NULL THEN 1 END) as non_patient_sales
        FROM inventory_items ii
        LEFT JOIN stock_movements sm ON ii.id = sm.item_id
        WHERE sm.dispensed_at BETWEEN $1 AND $2
        GROUP BY ii.id, ii.item_name, ii.item_code
        ORDER BY revenue DESC
      `
      
      const result = await this.db.query(query, [startDate, endDate])
      
      return result.rows.map(row => ({
        itemName: row.item_name,
        itemCode: row.item_code,
        stockIn: parseInt(row.stock_in) || 0,
        stockOut: parseInt(row.stock_out) || 0,
        revenue: parseFloat(row.revenue) || 0,
        cost: parseFloat(row.cost) || 0,
        profit: (parseFloat(row.revenue) || 0) - (parseFloat(row.cost) || 0),
        patientDispensing: parseInt(row.patient_dispensing) || 0,
        nonPatientSales: parseInt(row.non_patient_sales) || 0
      }))
    } catch (error: any) {
      console.error('❌ Failed to generate stock movement report:', error)
      throw new Error(`Failed to generate report: ${error.message}`)
    }
  }

  // Update item prices (Inventory Manager only)
  async updateItemPrices(
    itemId: string,
    costPrice: number,
    sellingPrice: number,
    updatedBy: string
  ): Promise<void> {
    try {
      const query = `
        UPDATE inventory_items 
        SET cost_price_per_unit = $1, selling_price_per_unit = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `
      
      await this.db.query(query, [costPrice, sellingPrice, itemId])

      // Record price change
      await this.recordStockMovement({
        itemId,
        movementType: 'ADJUSTMENT',
        quantity: 0,
        previousQuantity: 0,
        newQuantity: 0,
        unitPrice: sellingPrice,
        totalValue: 0,
        reason: `Price updated - Cost: ${costPrice}, Selling: ${sellingPrice}`,
        dispensedBy: updatedBy,
        dispensedAt: new Date(),
        notes: 'Price adjustment by Inventory Manager'
      })

      console.log('✅ Item prices updated')
    } catch (error: any) {
      console.error('❌ Failed to update item prices:', error)
      throw new Error(`Failed to update prices: ${error.message}`)
    }
  }

  // Generate receipt number
  private generateReceiptNumber(): string {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const timestamp = Date.now().toString().slice(-6)
    
    return `RCP-${year}${month}${day}-${timestamp}`
  }

  // Map database row to InventoryItem
  private mapDatabaseRowToInventoryItem(row: any): InventoryItem {
    return {
      id: row.id,
      itemName: row.item_name,
      itemCode: row.item_code,
      quantityAvailable: parseInt(row.quantity_available),
      unitOfMeasure: row.unit_of_measure,
      costPricePerUnit: parseFloat(row.cost_price_per_unit),
      sellingPricePerUnit: parseFloat(row.selling_price_per_unit),
      supplierDetails: row.supplier_details,
      expiryDate: new Date(row.expiry_date),
      batchNumber: row.batch_number,
      category: row.category,
      minimumStockLevel: parseInt(row.minimum_stock_level),
      maximumStockLevel: parseInt(row.maximum_stock_level),
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      isActive: row.is_active
    }
  }
}
