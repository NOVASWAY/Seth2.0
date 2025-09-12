"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockItemModel = void 0;
const database_1 = require("../config/database");
class StockItemModel {
    static async findAll() {
        const query = `
      SELECT 
        si.id, si.name, si.description, si.category_id as "categoryId",
        si.sku, si.barcode, si.unit_of_measure as "unitOfMeasure",
        si.unit_price as "unitPrice", si.cost_price as "costPrice", 
        si.selling_price as "sellingPrice", si.minimum_stock_level as "minimumStockLevel",
        si.maximum_stock_level as "maximumStockLevel", si.current_stock as "currentStock",
        si.reorder_level as "reorderLevel", si.supplier_id as "supplierId",
        si.expiry_date as "expiryDate", si.batch_number as "batchNumber",
        si.location, si.is_active as "isActive", si.is_controlled_substance as "isControlledSubstance",
        si.requires_prescription as "requiresPrescription", si.created_at as "createdAt",
        si.updated_at as "updatedAt", si.created_by as "createdBy", si.updated_by as "updatedBy",
        sc.name as "categoryName", sc.description as "categoryDescription",
        CASE 
          WHEN si.current_stock <= 0 THEN 'OUT_OF_STOCK'
          WHEN si.current_stock <= si.reorder_level THEN 'LOW_STOCK'
          WHEN si.current_stock <= si.minimum_stock_level THEN 'CRITICAL_STOCK'
          ELSE 'IN_STOCK'
        END as "stockStatus",
        (si.current_stock * si.cost_price) as "totalCostValue",
        (si.current_stock * si.selling_price) as "totalSellingValue"
      FROM stock_items si
      JOIN stock_categories sc ON si.category_id = sc.id
      WHERE si.is_active = true
      ORDER BY si.name
    `;
        const result = await database_1.pool.query(query);
        return result.rows;
    }
    static async findById(id) {
        const query = `
      SELECT 
        si.id, si.name, si.description, si.category_id as "categoryId",
        si.sku, si.barcode, si.unit_of_measure as "unitOfMeasure",
        si.unit_price as "unitPrice", si.cost_price as "costPrice", 
        si.selling_price as "sellingPrice", si.minimum_stock_level as "minimumStockLevel",
        si.maximum_stock_level as "maximumStockLevel", si.current_stock as "currentStock",
        si.reorder_level as "reorderLevel", si.supplier_id as "supplierId",
        si.expiry_date as "expiryDate", si.batch_number as "batchNumber",
        si.location, si.is_active as "isActive", si.is_controlled_substance as "isControlledSubstance",
        si.requires_prescription as "requiresPrescription", si.created_at as "createdAt",
        si.updated_at as "updatedAt", si.created_by as "createdBy", si.updated_by as "updatedBy",
        sc.name as "categoryName", sc.description as "categoryDescription",
        CASE 
          WHEN si.current_stock <= 0 THEN 'OUT_OF_STOCK'
          WHEN si.current_stock <= si.reorder_level THEN 'LOW_STOCK'
          WHEN si.current_stock <= si.minimum_stock_level THEN 'CRITICAL_STOCK'
          ELSE 'IN_STOCK'
        END as "stockStatus",
        (si.current_stock * si.cost_price) as "totalCostValue",
        (si.current_stock * si.selling_price) as "totalSellingValue"
      FROM stock_items si
      JOIN stock_categories sc ON si.category_id = sc.id
      WHERE si.id = $1
    `;
        const result = await database_1.pool.query(query, [id]);
        return result.rows[0] || null;
    }
    static async findByCategory(categoryId) {
        const query = `
      SELECT 
        si.id, si.name, si.description, si.category_id as "categoryId",
        si.sku, si.barcode, si.unit_of_measure as "unitOfMeasure",
        si.unit_price as "unitPrice", si.cost_price as "costPrice", 
        si.selling_price as "sellingPrice", si.minimum_stock_level as "minimumStockLevel",
        si.maximum_stock_level as "maximumStockLevel", si.current_stock as "currentStock",
        si.reorder_level as "reorderLevel", si.supplier_id as "supplierId",
        si.expiry_date as "expiryDate", si.batch_number as "batchNumber",
        si.location, si.is_active as "isActive", si.is_controlled_substance as "isControlledSubstance",
        si.requires_prescription as "requiresPrescription", si.created_at as "createdAt",
        si.updated_at as "updatedAt", si.created_by as "createdBy", si.updated_by as "updatedBy",
        sc.name as "categoryName", sc.description as "categoryDescription",
        CASE 
          WHEN si.current_stock <= 0 THEN 'OUT_OF_STOCK'
          WHEN si.current_stock <= si.reorder_level THEN 'LOW_STOCK'
          WHEN si.current_stock <= si.minimum_stock_level THEN 'CRITICAL_STOCK'
          ELSE 'IN_STOCK'
        END as "stockStatus",
        (si.current_stock * si.cost_price) as "totalCostValue",
        (si.current_stock * si.selling_price) as "totalSellingValue"
      FROM stock_items si
      JOIN stock_categories sc ON si.category_id = sc.id
      WHERE si.category_id = $1 AND si.is_active = true
      ORDER BY si.name
    `;
        const result = await database_1.pool.query(query, [categoryId]);
        return result.rows;
    }
    static async findBySku(sku) {
        const query = `
      SELECT 
        si.id, si.name, si.description, si.category_id as "categoryId",
        si.sku, si.barcode, si.unit_of_measure as "unitOfMeasure",
        si.unit_price as "unitPrice", si.cost_price as "costPrice", 
        si.selling_price as "sellingPrice", si.minimum_stock_level as "minimumStockLevel",
        si.maximum_stock_level as "maximumStockLevel", si.current_stock as "currentStock",
        si.reorder_level as "reorderLevel", si.supplier_id as "supplierId",
        si.expiry_date as "expiryDate", si.batch_number as "batchNumber",
        si.location, si.is_active as "isActive", si.is_controlled_substance as "isControlledSubstance",
        si.requires_prescription as "requiresPrescription", si.created_at as "createdAt",
        si.updated_at as "updatedAt", si.created_by as "createdBy", si.updated_by as "updatedBy",
        sc.name as "categoryName", sc.description as "categoryDescription",
        CASE 
          WHEN si.current_stock <= 0 THEN 'OUT_OF_STOCK'
          WHEN si.current_stock <= si.reorder_level THEN 'LOW_STOCK'
          WHEN si.current_stock <= si.minimum_stock_level THEN 'CRITICAL_STOCK'
          ELSE 'IN_STOCK'
        END as "stockStatus",
        (si.current_stock * si.cost_price) as "totalCostValue",
        (si.current_stock * si.selling_price) as "totalSellingValue"
      FROM stock_items si
      JOIN stock_categories sc ON si.category_id = sc.id
      WHERE si.sku = $1 AND si.is_active = true
    `;
        const result = await database_1.pool.query(query, [sku]);
        return result.rows[0] || null;
    }
    static async findLowStock() {
        const query = `
      SELECT 
        si.id, si.name, si.description, si.category_id as "categoryId",
        si.sku, si.barcode, si.unit_of_measure as "unitOfMeasure",
        si.unit_price as "unitPrice", si.cost_price as "costPrice", 
        si.selling_price as "sellingPrice", si.minimum_stock_level as "minimumStockLevel",
        si.maximum_stock_level as "maximumStockLevel", si.current_stock as "currentStock",
        si.reorder_level as "reorderLevel", si.supplier_id as "supplierId",
        si.expiry_date as "expiryDate", si.batch_number as "batchNumber",
        si.location, si.is_active as "isActive", si.is_controlled_substance as "isControlledSubstance",
        si.requires_prescription as "requiresPrescription", si.created_at as "createdAt",
        si.updated_at as "updatedAt", si.created_by as "createdBy", si.updated_by as "updatedBy",
        sc.name as "categoryName", sc.description as "categoryDescription",
        CASE 
          WHEN si.current_stock <= 0 THEN 'OUT_OF_STOCK'
          WHEN si.current_stock <= si.reorder_level THEN 'LOW_STOCK'
          ELSE 'CRITICAL_STOCK'
        END as "stockStatus",
        (si.current_stock * si.cost_price) as "totalCostValue",
        (si.current_stock * si.selling_price) as "totalSellingValue"
      FROM stock_items si
      JOIN stock_categories sc ON si.category_id = sc.id
      WHERE si.is_active = true AND si.current_stock <= si.reorder_level
      ORDER BY si.current_stock ASC, si.name
    `;
        const result = await database_1.pool.query(query);
        return result.rows;
    }
    static async create(itemData) {
        const query = `
      INSERT INTO stock_items (
        name, description, category_id, sku, barcode, unit_of_measure,
        unit_price, cost_price, selling_price, minimum_stock_level, maximum_stock_level,
        current_stock, reorder_level, supplier_id, expiry_date, batch_number,
        location, is_controlled_substance, requires_prescription, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING id, name, description, category_id as "categoryId",
                sku, barcode, unit_of_measure as "unitOfMeasure",
                unit_price as "unitPrice", cost_price as "costPrice", 
                selling_price as "sellingPrice", minimum_stock_level as "minimumStockLevel",
                maximum_stock_level as "maximumStockLevel", current_stock as "currentStock",
                reorder_level as "reorderLevel", supplier_id as "supplierId",
                expiry_date as "expiryDate", batch_number as "batchNumber",
                location, is_active as "isActive", is_controlled_substance as "isControlledSubstance",
                requires_prescription as "requiresPrescription", created_at as "createdAt",
                updated_at as "updatedAt", created_by as "createdBy", updated_by as "updatedBy"
    `;
        const result = await database_1.pool.query(query, [
            itemData.name,
            itemData.description || null,
            itemData.categoryId,
            itemData.sku || null,
            itemData.barcode || null,
            itemData.unitOfMeasure,
            itemData.unitPrice || 0,
            itemData.costPrice || 0,
            itemData.sellingPrice || 0,
            itemData.minimumStockLevel || 0,
            itemData.maximumStockLevel || 1000,
            itemData.currentStock || 0,
            itemData.reorderLevel || 10,
            itemData.supplierId || null,
            itemData.expiryDate || null,
            itemData.batchNumber || null,
            itemData.location || null,
            itemData.isControlledSubstance || false,
            itemData.requiresPrescription || false,
            itemData.createdBy || null
        ]);
        return result.rows[0];
    }
    static async update(id, itemData) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        Object.entries(itemData).forEach(([key, value]) => {
            if (value !== undefined && key !== 'updatedBy') {
                const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                fields.push(`${dbKey} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        });
        if (fields.length === 0) {
            return this.findById(id);
        }
        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        if (itemData.updatedBy) {
            fields.push(`updated_by = $${paramCount}`);
            values.push(itemData.updatedBy);
            paramCount++;
        }
        values.push(id);
        const query = `
      UPDATE stock_items 
      SET ${fields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id, name, description, category_id as "categoryId",
                sku, barcode, unit_of_measure as "unitOfMeasure",
                unit_price as "unitPrice", cost_price as "costPrice", 
                selling_price as "sellingPrice", minimum_stock_level as "minimumStockLevel",
                maximum_stock_level as "maximumStockLevel", current_stock as "currentStock",
                reorder_level as "reorderLevel", supplier_id as "supplierId",
                expiry_date as "expiryDate", batch_number as "batchNumber",
                location, is_active as "isActive", is_controlled_substance as "isControlledSubstance",
                requires_prescription as "requiresPrescription", created_at as "createdAt",
                updated_at as "updatedAt", created_by as "createdBy", updated_by as "updatedBy"
    `;
        const result = await database_1.pool.query(query, values);
        return result.rows[0] || null;
    }
    static async delete(id) {
        const query = `
      UPDATE stock_items 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
        const result = await database_1.pool.query(query, [id]);
        return result.rowCount > 0;
    }
    static async search(query) {
        const searchQuery = `
      SELECT 
        si.id, si.name, si.description, si.category_id as "categoryId",
        si.sku, si.barcode, si.unit_of_measure as "unitOfMeasure",
        si.unit_price as "unitPrice", si.cost_price as "costPrice", 
        si.selling_price as "sellingPrice", si.minimum_stock_level as "minimumStockLevel",
        si.maximum_stock_level as "maximumStockLevel", si.current_stock as "currentStock",
        si.reorder_level as "reorderLevel", si.supplier_id as "supplierId",
        si.expiry_date as "expiryDate", si.batch_number as "batchNumber",
        si.location, si.is_active as "isActive", si.is_controlled_substance as "isControlledSubstance",
        si.requires_prescription as "requiresPrescription", si.created_at as "createdAt",
        si.updated_at as "updatedAt", si.created_by as "createdBy", si.updated_by as "updatedBy",
        sc.name as "categoryName", sc.description as "categoryDescription",
        CASE 
          WHEN si.current_stock <= 0 THEN 'OUT_OF_STOCK'
          WHEN si.current_stock <= si.reorder_level THEN 'LOW_STOCK'
          WHEN si.current_stock <= si.minimum_stock_level THEN 'CRITICAL_STOCK'
          ELSE 'IN_STOCK'
        END as "stockStatus",
        (si.current_stock * si.cost_price) as "totalCostValue",
        (si.current_stock * si.selling_price) as "totalSellingValue"
      FROM stock_items si
      JOIN stock_categories sc ON si.category_id = sc.id
      WHERE si.is_active = true 
      AND (
        si.name ILIKE $1 OR 
        si.description ILIKE $1 OR 
        si.sku ILIKE $1 OR 
        si.barcode ILIKE $1 OR
        sc.name ILIKE $1
      )
      ORDER BY si.name
    `;
        const result = await database_1.pool.query(searchQuery, [`%${query}%`]);
        return result.rows;
    }
    static async getStockSummary() {
        const query = `
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN current_stock <= 0 THEN 1 END) as out_of_stock,
        COUNT(CASE WHEN current_stock <= reorder_level AND current_stock > 0 THEN 1 END) as low_stock,
        COUNT(CASE WHEN current_stock > reorder_level THEN 1 END) as in_stock,
        COALESCE(SUM(current_stock * cost_price), 0) as total_cost_value,
        COALESCE(SUM(current_stock * selling_price), 0) as total_selling_value
      FROM stock_items
      WHERE is_active = true
    `;
        const result = await database_1.pool.query(query);
        return result.rows[0];
    }
    static async getCategoryStockSummary() {
        const query = `
      SELECT 
        sc.id,
        sc.name as category_name,
        COUNT(si.id) as item_count,
        COALESCE(SUM(si.current_stock), 0) as total_stock,
        COALESCE(SUM(si.current_stock * si.cost_price), 0) as total_cost_value,
        COALESCE(SUM(si.current_stock * si.selling_price), 0) as total_selling_value,
        COUNT(CASE WHEN si.current_stock <= 0 THEN 1 END) as out_of_stock_count,
        COUNT(CASE WHEN si.current_stock <= si.reorder_level AND si.current_stock > 0 THEN 1 END) as low_stock_count
      FROM stock_categories sc
      LEFT JOIN stock_items si ON sc.id = si.category_id AND si.is_active = true
      WHERE sc.is_active = true
      GROUP BY sc.id, sc.name
      ORDER BY sc.name
    `;
        const result = await database_1.pool.query(query);
        return result.rows;
    }
}
exports.StockItemModel = StockItemModel;
