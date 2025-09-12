"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoInvoiceService = void 0;
const database_1 = require("../config/database");
const SHAService_1 = require("./SHAService");
const invoiceUtils_1 = require("../utils/invoiceUtils");
const crypto = __importStar(require("crypto"));
class AutoInvoiceService {
    constructor() {
        this.shaService = new SHAService_1.SHAService();
    }
    /**
     * Automatically generate invoice when a patient encounter is completed
     * This is triggered by completion of consultations, lab tests, pharmacy dispensing, etc.
     */
    async generateInvoiceOnEncounterCompletion(encounterId, completedBy) {
        const client = await database_1.pool.connect();
        try {
            await client.query("BEGIN");
            // Get encounter details
            const encounterResult = await client.query(`SELECT * FROM patient_encounters WHERE id = $1 AND status = 'IN_PROGRESS'`, [encounterId]);
            if (encounterResult.rows.length === 0) {
                throw new Error("Encounter not found or already completed");
            }
            const encounter = encounterResult.rows[0];
            // Get patient details including insurance information
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
            // Mark encounter as completed
            await client.query(`UPDATE patient_encounters 
         SET status = 'COMPLETED', 
             completion_date = CURRENT_TIMESTAMP,
             completed_by = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`, [completedBy, encounterId]);
            // Determine invoice type and generate accordingly
            let invoiceResult;
            if (encounter.sha_eligible && patient.sha_beneficiary_id) {
                // Generate SHA claim and invoice
                invoiceResult = await this.generateSHAInvoice(encounter, patient, completedBy, client);
            }
            else {
                // Generate regular clinic invoice
                invoiceResult = await this.generateClinicInvoice(encounter, patient, completedBy, client);
            }
            // Update encounter with invoice/claim references
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
    /**
     * Generate SHA claim and invoice for insurance-eligible patients
     */
    async generateSHAInvoice(encounter, patient, completedBy, client) {
        // Create SHA claim first
        const claimId = crypto.randomUUID();
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
        // Add claim items from encounter services
        await this.addClaimItems(claimId, encounter, client);
        // Generate internal invoice using the corrected workflow
        const invoiceResult = await this.shaService.generateInvoiceForClaim(claimId, completedBy);
        return {
            invoice_id: invoiceResult.invoice.id,
            sha_claim_id: claimId
        };
    }
    /**
     * Generate regular clinic invoice for private pay patients
     */
    async generateClinicInvoice(encounter, patient, completedBy, client) {
        const invoiceId = crypto.randomUUID();
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
        // Add invoice items from encounter services
        await this.addInvoiceItems(invoiceId, encounter, client);
        return {
            invoice_id: invoiceId,
            sha_claim_id: null
        };
    }
    /**
     * Add claim items from patient encounter services
     */
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
                crypto.randomUUID(),
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
    /**
     * Add invoice items from patient encounter services
     */
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
                crypto.randomUUID(),
                invoiceId,
                service.name || service.description,
                service.quantity || 1,
                service.price || service.unit_price || 0,
                (service.quantity || 1) * (service.price || service.unit_price || 0)
            ]);
        }
    }
    /**
     * Update encounter with services and trigger auto-invoice generation
     */
    async completeEncounterWithServices(encounterId, services, medications, labTests, procedures, diagnosisCodes, diagnosisDescriptions, treatmentSummary, completedBy) {
        const client = await database_1.pool.connect();
        try {
            await client.query("BEGIN");
            // Calculate total charges
            const totalCharges = [
                ...services,
                ...medications,
                ...labTests,
                ...procedures
            ].reduce((total, item) => total + ((item.quantity || 1) * (item.price || item.unit_price || 0)), 0);
            // Update encounter with services and completion
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
            // Now trigger automatic invoice generation
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
    /**
     * Helper methods
     */
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
    /**
     * Get encounters ready for billing (completed but not yet invoiced)
     */
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
    /**
     * Manually trigger invoice generation for a completed encounter
     */
    async manuallyTriggerInvoiceGeneration(encounterId, triggeredBy) {
        return await this.generateInvoiceOnEncounterCompletion(encounterId, triggeredBy);
    }
}
exports.AutoInvoiceService = AutoInvoiceService;
