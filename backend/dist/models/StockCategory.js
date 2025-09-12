"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockCategoryModel = void 0;
const database_1 = require("../config/database");
class StockCategoryModel {
    static async findAll() {
        const query = `
      SELECT id, name, description, parent_category_id as "parentCategoryId",
             is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM stock_categories
      WHERE is_active = true
      ORDER BY name
    `;
        const result = await database_1.pool.query(query);
        return result.rows;
    }
    static async findById(id) {
        const query = `
      SELECT id, name, description, parent_category_id as "parentCategoryId",
             is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM stock_categories
      WHERE id = $1
    `;
        const result = await database_1.pool.query(query, [id]);
        return result.rows[0] || null;
    }
    static async findByName(name) {
        const query = `
      SELECT id, name, description, parent_category_id as "parentCategoryId",
             is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM stock_categories
      WHERE name = $1 AND is_active = true
    `;
        const result = await database_1.pool.query(query, [name]);
        return result.rows[0] || null;
    }
    static async findByParentId(parentId) {
        const query = `
      SELECT id, name, description, parent_category_id as "parentCategoryId",
             is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM stock_categories
      WHERE parent_category_id = $1 AND is_active = true
      ORDER BY name
    `;
        const result = await database_1.pool.query(query, [parentId]);
        return result.rows;
    }
    static async findMainCategories() {
        const query = `
      SELECT id, name, description, parent_category_id as "parentCategoryId",
             is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM stock_categories
      WHERE parent_category_id IS NULL AND is_active = true
      ORDER BY name
    `;
        const result = await database_1.pool.query(query);
        return result.rows;
    }
    static async create(categoryData) {
        const query = `
      INSERT INTO stock_categories (name, description, parent_category_id, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, description, parent_category_id as "parentCategoryId",
                is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
    `;
        const result = await database_1.pool.query(query, [
            categoryData.name,
            categoryData.description || null,
            categoryData.parentCategoryId || null,
            categoryData.isActive !== false
        ]);
        return result.rows[0];
    }
    static async update(id, categoryData) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        if (categoryData.name !== undefined) {
            fields.push(`name = $${paramCount}`);
            values.push(categoryData.name);
            paramCount++;
        }
        if (categoryData.description !== undefined) {
            fields.push(`description = $${paramCount}`);
            values.push(categoryData.description);
            paramCount++;
        }
        if (categoryData.parentCategoryId !== undefined) {
            fields.push(`parent_category_id = $${paramCount}`);
            values.push(categoryData.parentCategoryId);
            paramCount++;
        }
        if (categoryData.isActive !== undefined) {
            fields.push(`is_active = $${paramCount}`);
            values.push(categoryData.isActive);
            paramCount++;
        }
        if (fields.length === 0) {
            return this.findById(id);
        }
        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);
        const query = `
      UPDATE stock_categories 
      SET ${fields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id, name, description, parent_category_id as "parentCategoryId",
                is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
    `;
        const result = await database_1.pool.query(query, values);
        return result.rows[0] || null;
    }
    static async delete(id) {
        const query = `
      UPDATE stock_categories 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
        const result = await database_1.pool.query(query, [id]);
        return result.rowCount > 0;
    }
    static async getCategoryHierarchy() {
        const query = `
      WITH RECURSIVE category_tree AS (
        SELECT 
          id, name, description, parent_category_id, is_active,
          created_at, updated_at, 0 as level, ARRAY[name] as path
        FROM stock_categories 
        WHERE parent_category_id IS NULL AND is_active = true
        
        UNION ALL
        
        SELECT 
          c.id, c.name, c.description, c.parent_category_id, c.is_active,
          c.created_at, c.updated_at, ct.level + 1, ct.path || c.name
        FROM stock_categories c
        JOIN category_tree ct ON c.parent_category_id = ct.id
        WHERE c.is_active = true
      )
      SELECT 
        id, name, description, parent_category_id as "parentCategoryId",
        is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt",
        level, path
      FROM category_tree
      ORDER BY path
    `;
        const result = await database_1.pool.query(query);
        return result.rows;
    }
    static async getCategoryStats() {
        const query = `
      SELECT 
        sc.id,
        sc.name,
        sc.description,
        COUNT(si.id) as item_count,
        COALESCE(SUM(si.current_stock), 0) as total_stock,
        COALESCE(SUM(si.current_stock * si.cost_price), 0) as total_cost_value,
        COALESCE(SUM(si.current_stock * si.selling_price), 0) as total_selling_value
      FROM stock_categories sc
      LEFT JOIN stock_items si ON sc.id = si.category_id AND si.is_active = true
      WHERE sc.is_active = true
      GROUP BY sc.id, sc.name, sc.description
      ORDER BY sc.name
    `;
        const result = await database_1.pool.query(query);
        return result.rows;
    }
}
exports.StockCategoryModel = StockCategoryModel;
