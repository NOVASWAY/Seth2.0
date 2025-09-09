"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabTestModel = void 0;
const database_1 = __importDefault(require("../config/database"));
const crypto_1 = __importDefault(require("crypto"));
class LabTestModel {
    static async create(data) {
        const client = await database_1.default.connect();
        try {
            await client.query("BEGIN");
            const query = `
        INSERT INTO clinical_lab_tests (
          id, test_code, test_name, test_category, test_sub_category, specimen_type,
          specimen_volume, fasting_required, normal_range_male, normal_range_female,
          normal_range_pediatric, units, turnaround_time_hours, price,
          clinical_significance, preparation_instructions, search_keywords,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `;
            const values = [
                crypto_1.default.randomUUID(),
                data.testCode,
                data.testName,
                data.testCategory,
                null,
                data.specimenType,
                null,
                false,
                null,
                null,
                null,
                null,
                data.turnaroundTime,
                data.price,
                data.description,
                data.instructions,
                [],
                new Date(),
                new Date()
            ];
            const result = await client.query(query, values);
            await client.query("COMMIT");
            return this.mapRowToLabTest(result.rows[0]);
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
    }
    static async findById(id) {
        const query = "SELECT * FROM clinical_lab_tests WHERE id = $1";
        const result = await database_1.default.query(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToLabTest(result.rows[0]);
    }
    static async findByTestCode(testCode) {
        const query = "SELECT * FROM clinical_lab_tests WHERE test_code = $1";
        const result = await database_1.default.query(query, [testCode]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToLabTest(result.rows[0]);
    }
    static async findAll(activeOnly = true) {
        let query = "SELECT * FROM clinical_lab_tests";
        const values = [];
        if (activeOnly) {
            query += " WHERE is_active = true";
        }
        query += " ORDER BY test_category, test_name";
        const result = await database_1.default.query(query, values);
        return result.rows.map(row => this.mapRowToLabTest(row));
    }
    static async findByCategory(category, activeOnly = true) {
        let query = "SELECT * FROM clinical_lab_tests WHERE test_category = $1";
        const values = [category];
        if (activeOnly) {
            query += " AND is_active = true";
        }
        query += " ORDER BY test_name";
        const result = await database_1.default.query(query, values);
        return result.rows.map(row => this.mapRowToLabTest(row));
    }
    static async search(searchTerm, activeOnly = true) {
        let query = `
      SELECT * FROM clinical_lab_tests 
      WHERE (test_name ILIKE $1 OR test_code ILIKE $1 OR clinical_significance ILIKE $1)
    `;
        const values = [`%${searchTerm}%`];
        if (activeOnly) {
            query += " AND is_active = true";
        }
        query += " ORDER BY test_category, test_name";
        const result = await database_1.default.query(query, values);
        return result.rows.map(row => this.mapRowToLabTest(row));
    }
    static async update(id, data) {
        const client = await database_1.default.connect();
        try {
            await client.query("BEGIN");
            const updateFields = [];
            const values = [];
            let paramCount = 1;
            if (data.testCode !== undefined) {
                updateFields.push(`test_code = $${paramCount++}`);
                values.push(data.testCode);
            }
            if (data.testName !== undefined) {
                updateFields.push(`test_name = $${paramCount++}`);
                values.push(data.testName);
            }
            if (data.testCategory !== undefined) {
                updateFields.push(`test_category = $${paramCount++}`);
                values.push(data.testCategory);
            }
            if (data.description !== undefined) {
                updateFields.push(`description = $${paramCount++}`);
                values.push(data.description);
            }
            if (data.specimenType !== undefined) {
                updateFields.push(`specimen_type = $${paramCount++}`);
                values.push(data.specimenType);
            }
            if (data.turnaroundTime !== undefined) {
                updateFields.push(`turnaround_time = $${paramCount++}`);
                values.push(data.turnaroundTime);
            }
            if (data.price !== undefined) {
                updateFields.push(`price = $${paramCount++}`);
                values.push(data.price);
            }
            if (data.isActive !== undefined) {
                updateFields.push(`is_active = $${paramCount++}`);
                values.push(data.isActive);
            }
            if (data.referenceRanges !== undefined) {
                updateFields.push(`reference_ranges = $${paramCount++}`);
                values.push(data.referenceRanges ? JSON.stringify(data.referenceRanges) : null);
            }
            if (data.instructions !== undefined) {
                updateFields.push(`instructions = $${paramCount++}`);
                values.push(data.instructions);
            }
            if (updateFields.length === 0) {
                return await this.findById(id);
            }
            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(id);
            const query = `
        UPDATE clinical_lab_tests 
        SET ${updateFields.join(", ")}
        WHERE id = $${paramCount}
        RETURNING *
      `;
            const result = await client.query(query, values);
            await client.query("COMMIT");
            if (result.rows.length === 0) {
                return null;
            }
            return this.mapRowToLabTest(result.rows[0]);
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
    }
    static async delete(id) {
        const query = "DELETE FROM clinical_lab_tests WHERE id = $1";
        const result = await database_1.default.query(query, [id]);
        return (result.rowCount ?? 0) > 0;
    }
    static async getCategories() {
        const query = "SELECT DISTINCT test_category FROM clinical_lab_tests WHERE is_active = true ORDER BY test_category";
        const result = await database_1.default.query(query);
        return result.rows.map(row => row.test_category);
    }
    static async getAvailableTests(search, category) {
        let query = "SELECT * FROM clinical_lab_tests WHERE is_active = true";
        const values = [];
        let paramCount = 1;
        if (search) {
            query += ` AND (test_name ILIKE $${paramCount} OR test_code ILIKE $${paramCount} OR clinical_significance ILIKE $${paramCount})`;
            values.push(`%${search}%`);
            paramCount++;
        }
        if (category) {
            query += ` AND test_category = $${paramCount}`;
            values.push(category);
            paramCount++;
        }
        query += " ORDER BY test_category, test_name";
        const result = await database_1.default.query(query, values);
        return result.rows.map(row => this.mapRowToLabTest(row));
    }
    static mapRowToLabTest(row) {
        return {
            id: row.id,
            name: row.test_name,
            code: row.test_code,
            category: row.test_category,
            price: parseFloat(row.price),
            turnaround_time: `${row.turnaround_time_hours} hours`,
            is_active: row.is_active,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            test_code: row.test_code,
            test_name: row.test_name,
            testCategory: row.test_category,
            description: row.clinical_significance,
            specimenType: row.specimen_type,
            turnaroundTime: `${row.turnaround_time_hours} hours`,
            isActive: row.is_active,
            referenceRanges: {
                male: row.normal_range_male,
                female: row.normal_range_female,
                pediatric: row.normal_range_pediatric,
                units: row.units
            },
            instructions: row.preparation_instructions,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
}
exports.LabTestModel = LabTestModel;
//# sourceMappingURL=LabTest.js.map