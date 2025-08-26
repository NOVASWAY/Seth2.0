"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoInvoiceService = void 0;
const database_1 = require("../config/database");
const SHAService_1 = require("./SHAService");
const invoiceUtils_1 = require("../utils/invoiceUtils");
const crypto_1 = __importDefault(require("crypto"));
class AutoInvoiceService {
    constructor() {
        this.shaService = new SHAService_1.SHAService();
    }
    async generateInvoiceOnEncounterCompletion(encounterId, completedBy) {
        const client = await database_1.pool.connect();
        try {
            await client.query("BEGIN");
            const encounterResult = await client.query(`SELECT * FROM patient_encounters WHERE id = $1 AND status = 'IN_PROGRESS'`, [encounterId]);
            if (encounterResult.rows.length === 0) {
                throw new Error("Encounter not found or already completed");
            }
            const encounter = encounterResult.rows[0];
            const patientResult = await client.query(`SELECT p.*, 
                p.first_name || ' ' || p.last_name as full_name,
                p.insurance_number as sha_beneficiary_id,
                p.national_id
         FROM patients p 
         WHERE p.id = $1`, [encounter.patient_id]);
            if (patientResult.rows.length === 0) {
                throw new Error("Patient not found");
            }
            const patient = patientResult.rows[0];
            await client.query(`UPDATE patient_encounters 
         SET status = 'COMPLETED', 
             completion_date = CURRENT_TIMESTAMP,
             completed_by = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`, [completedBy, encounterId]);
            let invoiceResult;
            if (encounter.sha_eligible && patient.sha_beneficiary_id) {
                invoiceResult = await this.generateSHAInvoice(encounter, patient, completedBy, client);
            }
            else {
                invoiceResult = await this.generateClinicInvoice(encounter, patient, completedBy, client);
            }
            await client.query(`UPDATE patient_encounters 
         SET completion_triggered_invoice = true,
             invoice_id = $1,
             sha_claim_id = $2,
             billed_by = $3,
             status = 'INVOICE_GENERATED',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`, [
                invoiceResult.invoice_id,
                invoiceResult.sha_claim_id,
                completedBy,
                encounterId
            ]);
            await client.query("COMMIT");
            return {
                success: true,
                encounter_id: encounterId,
                invoice_type: encounter.sha_eligible ? 'SHA' : 'CLINIC',
                invoice_id: invoiceResult.invoice_id,
                sha_claim_id: invoiceResult.sha_claim_id,
                total_amount: encounter.total_charges,
                message: `Invoice automatically generated for ${encounter.encounter_type} encounter`
            };
        }
        catch (error) {
            await client.query("ROLLBACK");
            console.error("Error generating automatic invoice:", error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async generateSHAInvoice(encounter, patient, completedBy, client) {
        const claimId = crypto_1.default.randomUUID();
        const claimNumber = await this.generateClaimNumber();
        await client.query(`INSERT INTO sha_claims (
        id, claim_number, patient_id, op_number, visit_id,
        patient_name, sha_beneficiary_id, national_id, phone_number, visit_date,
        primary_diagnosis_code, primary_diagnosis_description,
        secondary_diagnosis_codes, secondary_diagnosis_descriptions,
        provider_code, provider_name, facility_level,
        claim_amount, status, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`, [
            claimId,
            claimNumber,
            encounter.patient_id,
            patient.op_number,
            encounter.visit_id,
            patient.full_name,
            patient.sha_beneficiary_id,
            patient.national_id,
            patient.phone_number,
            encounter.encounter_date,
            encounter.diagnosis_codes[0] || 'Z00.00',
            encounter.diagnosis_descriptions[0] || 'General examination',
            encounter.diagnosis_codes.slice(1),
            encounter.diagnosis_descriptions.slice(1),
            process.env.SHA_PROVIDER_CODE || 'CLINIC001',
            process.env.CLINIC_NAME || 'Seth Clinic',
            process.env.FACILITY_LEVEL || 'Level2',
            encounter.total_charges,
            'READY_TO_SUBMIT',
            completedBy,
            new Date(),
            new Date()
        ]);
        await this.addClaimItems(claimId, encounter, client);
        const invoiceResult = await this.shaService.generateInvoiceForClaim(claimId, completedBy);
        return {
            invoice_id: invoiceResult.invoice.id,
            sha_claim_id: claimId
        };
    }
    async generateClinicInvoice(encounter, patient, completedBy, client) {
        const invoiceId = crypto_1.default.randomUUID();
        const invoiceNumber = await (0, invoiceUtils_1.generateInvoiceNumber)(encounter.encounter_type.toUpperCase());
        await client.query(`INSERT INTO invoices (
        id, invoice_number, patient_id, op_number,
        invoice_type, subtotal, total_amount, balance_amount,
        status, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [
            invoiceId,
            invoiceNumber,
            encounter.patient_id,
            patient.op_number,
            encounter.encounter_type.toUpperCase(),
            encounter.total_charges,
            encounter.total_charges,
            encounter.total_charges,
            'UNPAID',
            completedBy,
            new Date(),
            new Date()
        ]);
        await this.addInvoiceItems(invoiceId, encounter, client);
        return {
            invoice_id: invoiceId,
            sha_claim_id: null
        };
    }
    async addClaimItems(claimId, encounter, client) {
        const allServices = [
            ...encounter.services_provided.map(s => ({ ...s, type: 'SERVICE' })),
            ...encounter.medications_prescribed.map(m => ({ ...m, type: 'MEDICATION' })),
            ...encounter.lab_tests_ordered.map(l => ({ ...l, type: 'LABORATORY' })),
            ...encounter.procedures_performed.map(p => ({ ...p, type: 'PROCEDURE' }))
        ];
        for (const service of allServices) {
            await client.query(`INSERT INTO sha_claim_items (
          id, claim_id, service_type, service_code, service_description, service_date,
          quantity, unit_price, total_amount, prescription_notes, treatment_notes,
          provided_by, department, is_emergency, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`, [
                crypto_1.default.randomUUID(),
                claimId,
                this.mapServiceType(service.type),
                service.code || 'GEN001',
                service.name || service.description,
                encounter.encounter_date,
                service.quantity || 1,
                service.price || service.unit_price || 0,
                (service.quantity || 1) * (service.price || service.unit_price || 0),
                service.notes || service.instructions,
                service.clinical_notes,
                encounter.primary_provider,
                encounter.department,
                encounter.encounter_type === 'EMERGENCY',
                new Date(),
                new Date()
            ]);
        }
    }
    async addInvoiceItems(invoiceId, encounter, client) {
        const allServices = [
            ...encounter.services_provided,
            ...encounter.medications_prescribed,
            ...encounter.lab_tests_ordered,
            ...encounter.procedures_performed
        ];
        for (const service of allServices) {
            await client.query(`INSERT INTO invoice_items (
          id, invoice_id, item_name, quantity, unit_price, total_price
        ) VALUES ($1, $2, $3, $4, $5, $6)`, [
                crypto_1.default.randomUUID(),
                invoiceId,
                service.name || service.description,
                service.quantity || 1,
                service.price || service.unit_price || 0,
                (service.quantity || 1) * (service.price || service.unit_price || 0)
            ]);
        }
    }
    async completeEncounterWithServices(encounterId, services, medications, labTests, procedures, diagnosisCodes, diagnosisDescriptions, treatmentSummary, completedBy) {
        const client = await database_1.pool.connect();
        try {
            await client.query("BEGIN");
            const totalCharges = [
                ...services,
                ...medications,
                ...labTests,
                ...procedures
            ].reduce((total, item) => total + ((item.quantity || 1) * (item.price || item.unit_price || 0)), 0);
            await client.query(`UPDATE patient_encounters 
         SET services_provided = $1,
             medications_prescribed = $2,
             lab_tests_ordered = $3,
             procedures_performed = $4,
             diagnosis_codes = $5,
             diagnosis_descriptions = $6,
             treatment_summary = $7,
             total_charges = $8,
             status = 'COMPLETED',
             completion_date = CURRENT_TIMESTAMP,
             completed_by = $9,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $10`, [
                JSON.stringify(services),
                JSON.stringify(medications),
                JSON.stringify(labTests),
                JSON.stringify(procedures),
                diagnosisCodes,
                diagnosisDescriptions,
                treatmentSummary,
                totalCharges,
                completedBy,
                encounterId
            ]);
            await client.query("COMMIT");
            return await this.generateInvoiceOnEncounterCompletion(encounterId, completedBy);
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
    }
    async generateClaimNumber() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const result = await database_1.pool.query(`SELECT COUNT(*) as count FROM sha_claims 
       WHERE claim_number LIKE $1`, [`SHA-${year}${month}-%`]);
        const sequence = String(Number.parseInt(result.rows[0].count) + 1).padStart(6, '0');
        return `SHA-${year}${month}-${sequence}`;
    }
    mapServiceType(type) {
        const mapping = {
            'SERVICE': 'CONSULTATION',
            'MEDICATION': 'PHARMACY',
            'LABORATORY': 'LABORATORY',
            'PROCEDURE': 'PROCEDURE'
        };
        return mapping[type] || 'CONSULTATION';
    }
    async getEncountersReadyForBilling() {
        const result = await database_1.pool.query(`SELECT e.*, 
              p.first_name || ' ' || p.last_name as patient_name,
              p.op_number,
              p.insurance_number as sha_beneficiary_id,
              u.username as primary_provider_name
       FROM patient_encounters e
       JOIN patients p ON e.patient_id = p.id
       JOIN users u ON e.primary_provider = u.id
       WHERE e.status = 'COMPLETED' 
         AND e.completion_triggered_invoice = false
       ORDER BY e.completion_date ASC`);
        return result.rows;
    }
    async manuallyTriggerInvoiceGeneration(encounterId, triggeredBy) {
        return await this.generateInvoiceOnEncounterCompletion(encounterId, triggeredBy);
    }
}
exports.AutoInvoiceService = AutoInvoiceService;
//# sourceMappingURL=AutoInvoiceService.js.map