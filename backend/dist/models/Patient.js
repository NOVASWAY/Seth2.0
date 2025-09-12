"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientModel = void 0;
const database_1 = __importDefault(require("../config/database"));
class PatientModel {
    static async generateOpNumber() {
        const year = new Date().getFullYear();
        const query = `
      SELECT op_number FROM patients 
      WHERE op_number LIKE $1 
      ORDER BY op_number DESC 
      LIMIT 1
    `;
        const result = await database_1.default.query(query, [`OP-${year}-%`]);
        if (result.rows.length === 0) {
            return `OP-${year}-001`;
        }
        const lastOpNumber = result.rows[0].op_number;
        const lastNumber = Number.parseInt(lastOpNumber.split("-")[2]);
        const nextNumber = (lastNumber + 1).toString().padStart(3, "0");
        return `OP-${year}-${nextNumber}`;
    }
    static async findById(id) {
        const query = `
      SELECT id, op_number as "opNumber", first_name as "firstName", 
             last_name as "lastName", date_of_birth as "dateOfBirth", 
             age, gender, phone_number as "phoneNumber", area,
             next_of_kin as "nextOfKin", next_of_kin_phone as "nextOfKinPhone",
             insurance_type as "insuranceType", insurance_number as "insuranceNumber",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM patients WHERE id = $1
    `;
        const result = await database_1.default.query(query, [id]);
        return result.rows[0] || null;
    }
    static async findByOpNumber(opNumber) {
        const query = `
      SELECT id, op_number as "opNumber", first_name as "firstName", 
             last_name as "lastName", date_of_birth as "dateOfBirth", 
             age, gender, phone_number as "phoneNumber", area,
             next_of_kin as "nextOfKin", next_of_kin_phone as "nextOfKinPhone",
             insurance_type as "insuranceType", insurance_number as "insuranceNumber",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM patients WHERE op_number = $1
    `;
        const result = await database_1.default.query(query, [opNumber]);
        return result.rows[0] || null;
    }
    static async search(searchTerm, limit = 20) {
        const query = `
      SELECT id, op_number as "opNumber", first_name as "firstName", 
             last_name as "lastName", date_of_birth as "dateOfBirth", 
             age, gender, phone_number as "phoneNumber", area,
             next_of_kin as "nextOfKin", next_of_kin_phone as "nextOfKinPhone",
             insurance_type as "insuranceType", insurance_number as "insuranceNumber",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM patients 
      WHERE op_number ILIKE $1 
         OR first_name ILIKE $1 
         OR last_name ILIKE $1 
         OR phone_number ILIKE $1
         OR CONCAT(first_name, ' ', last_name) ILIKE $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
        const searchPattern = `%${searchTerm}%`;
        const result = await database_1.default.query(query, [searchPattern, limit]);
        return result.rows;
    }
    static async create(patientData) {
        const opNumber = patientData.opNumber || (await this.generateOpNumber());
        const query = `
      INSERT INTO patients (
        op_number, first_name, last_name, date_of_birth, age, gender,
        phone_number, area, next_of_kin, next_of_kin_phone,
        insurance_type, insurance_number
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, op_number as "opNumber", first_name as "firstName", 
                last_name as "lastName", date_of_birth as "dateOfBirth", 
                age, gender, phone_number as "phoneNumber", area,
                next_of_kin as "nextOfKin", next_of_kin_phone as "nextOfKinPhone",
                insurance_type as "insuranceType", insurance_number as "insuranceNumber",
                created_at as "createdAt", updated_at as "updatedAt"
    `;
        const result = await database_1.default.query(query, [
            opNumber,
            patientData.firstName,
            patientData.lastName,
            patientData.dateOfBirth,
            patientData.age,
            patientData.gender,
            patientData.phoneNumber,
            patientData.area,
            patientData.nextOfKin,
            patientData.nextOfKinPhone,
            patientData.insuranceType,
            patientData.insuranceNumber,
        ]);
        return result.rows[0];
    }
    static async update(id, patientData) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        Object.entries(patientData).forEach(([key, value]) => {
            if (value !== undefined) {
                const dbField = key.replace(/([A-Z])/g, "_$1").toLowerCase();
                fields.push(`${dbField} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        });
        if (fields.length === 0) {
            return this.findById(id);
        }
        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);
        const query = `
      UPDATE patients SET ${fields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id, op_number as "opNumber", first_name as "firstName", 
                last_name as "lastName", date_of_birth as "dateOfBirth", 
                age, gender, phone_number as "phoneNumber", area,
                next_of_kin as "nextOfKin", next_of_kin_phone as "nextOfKinPhone",
                insurance_type as "insuranceType", insurance_number as "insuranceNumber",
                created_at as "createdAt", updated_at as "updatedAt"
    `;
        const result = await database_1.default.query(query, values);
        return result.rows[0] || null;
    }
    static async findAll(limit = 50, offset = 0) {
        const countQuery = "SELECT COUNT(*) FROM patients";
        const countResult = await database_1.default.query(countQuery);
        const total = Number.parseInt(countResult.rows[0].count);
        const query = `
      SELECT id, op_number as "opNumber", first_name as "firstName", 
             last_name as "lastName", date_of_birth as "dateOfBirth", 
             age, gender, phone_number as "phoneNumber", area,
             next_of_kin as "nextOfKin", next_of_kin_phone as "nextOfKinPhone",
             insurance_type as "insuranceType", insurance_number as "insuranceNumber",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM patients 
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
        const result = await database_1.default.query(query, [limit, offset]);
        return {
            patients: result.rows,
            total,
        };
    }
}
exports.PatientModel = PatientModel;
