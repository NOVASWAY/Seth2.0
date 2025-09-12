"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const database_1 = require("../config/database");
const router = express_1.default.Router();
// Get comprehensive patient clinical data for SHA claims
router.get("/patient/:patientId/clinical-data", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.CLAIMS_MANAGER, types_1.UserRole.RECEPTIONIST]), [
    (0, express_validator_1.query)("visitId").optional().isUUID().withMessage("Visit ID must be a valid UUID"),
    (0, express_validator_1.query)("includeHistory").optional().isBoolean().withMessage("Include history must be a boolean")
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array()
            });
        }
        const { patientId } = req.params;
        const { visitId, includeHistory = false } = req.query;
        // Get patient basic information
        const patientResult = await database_1.pool.query(`SELECT 
          p.id, p.op_number, p.first_name, p.last_name, p.date_of_birth, p.age, p.gender,
          p.phone_number, p.area, p.insurance_type, p.insurance_number,
          p.next_of_kin, p.next_of_kin_phone, p.created_at
         FROM patients p 
         WHERE p.id = $1`, [patientId]);
        if (patientResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }
        const patient = patientResult.rows[0];
        // Get visits for the patient
        let visitsQuery = `
        SELECT 
          v.id, v.visit_date, v.visit_type, v.status, v.notes,
          u.username as provider_name
        FROM visits v
        LEFT JOIN users u ON v.provider_id = u.id
        WHERE v.patient_id = $1
      `;
        const visitsParams = [patientId];
        if (visitId) {
            visitsQuery += ` AND v.id = $2`;
            visitsParams.push(visitId);
        }
        visitsQuery += ` ORDER BY v.visit_date DESC`;
        if (!includeHistory) {
            visitsQuery += ` LIMIT 5`;
        }
        const visitsResult = await database_1.pool.query(visitsQuery, visitsParams);
        const visits = visitsResult.rows;
        // Get patient encounters with diagnoses and treatments
        let encountersQuery = `
        SELECT 
          pe.id, pe.encounter_type, pe.encounter_date, pe.chief_complaint,
          pe.department, pe.location, pe.sha_eligible, pe.private_pay,
          pe.primary_provider, pe.created_at,
          u.username as provider_name,
          -- Get diagnoses
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', d.id,
                'code', d.diagnosis_code,
                'description', d.diagnosis_description,
                'type', d.diagnosis_type,
                'created_at', d.created_at
              )
            ) FILTER (WHERE d.id IS NOT NULL), 
            '[]'::json
          ) as diagnoses,
          -- Get treatments/procedures
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', t.id,
                'name', t.treatment_name,
                'description', t.description,
                'cost', t.cost,
                'created_at', t.created_at
              )
            ) FILTER (WHERE t.id IS NOT NULL), 
            '[]'::json
          ) as treatments
        FROM patient_encounters pe
        LEFT JOIN users u ON pe.primary_provider = u.id
        LEFT JOIN encounter_diagnoses ed ON pe.id = ed.encounter_id
        LEFT JOIN diagnoses d ON ed.diagnosis_id = d.id
        LEFT JOIN encounter_treatments et ON pe.id = et.encounter_id
        LEFT JOIN treatments t ON et.treatment_id = t.id
        WHERE pe.patient_id = $1
      `;
        const encountersParams = [patientId];
        if (visitId) {
            encountersQuery += ` AND pe.visit_id = $2`;
            encountersParams.push(visitId);
        }
        encountersQuery += `
        GROUP BY pe.id, pe.encounter_type, pe.encounter_date, pe.chief_complaint,
                 pe.department, pe.location, pe.sha_eligible, pe.private_pay,
                 pe.primary_provider, pe.created_at, u.username
        ORDER BY pe.encounter_date DESC
      `;
        if (!includeHistory) {
            encountersQuery += ` LIMIT 10`;
        }
        const encountersResult = await database_1.pool.query(encountersQuery, encountersParams);
        const encounters = encountersResult.rows;
        // Get prescriptions for the patient
        let prescriptionsQuery = `
        SELECT 
          pr.id, pr.consultation_id, pr.visit_id, pr.status, pr.created_at,
          u.username as prescribed_by_name,
          -- Get prescription items
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', pi.id,
                'item_name', pi.item_name,
                'dosage', pi.dosage,
                'frequency', pi.frequency,
                'duration', pi.duration,
                'quantity_prescribed', pi.quantity_prescribed,
                'quantity_dispensed', pi.quantity_dispensed,
                'instructions', pi.instructions
              )
            ) FILTER (WHERE pi.id IS NOT NULL), 
            '[]'::json
          ) as items
        FROM prescriptions pr
        LEFT JOIN users u ON pr.prescribed_by = u.id
        LEFT JOIN prescription_items pi ON pr.id = pi.prescription_id
        WHERE pr.patient_id = $1
      `;
        const prescriptionsParams = [patientId];
        if (visitId) {
            prescriptionsQuery += ` AND pr.visit_id = $2`;
            prescriptionsParams.push(visitId);
        }
        prescriptionsQuery += `
        GROUP BY pr.id, pr.consultation_id, pr.visit_id, pr.status, pr.created_at, u.username
        ORDER BY pr.created_at DESC
      `;
        if (!includeHistory) {
            prescriptionsQuery += ` LIMIT 5`;
        }
        const prescriptionsResult = await database_1.pool.query(prescriptionsQuery, prescriptionsParams);
        const prescriptions = prescriptionsResult.rows;
        // Get lab requests and results
        let labRequestsQuery = `
        SELECT 
          lr.id, lr.request_date, lr.status, lr.urgency, lr.notes,
          u.username as requested_by_name,
          -- Get lab test items
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', lri.id,
                'test_name', lri.test_name,
                'test_code', lri.test_code,
                'cost', lri.cost,
                'status', lri.status,
                'result', lri.result,
                'normal_range', lri.normal_range,
                'unit', lri.unit
              )
            ) FILTER (WHERE lri.id IS NOT NULL), 
            '[]'::json
          ) as test_items
        FROM lab_requests lr
        LEFT JOIN users u ON lr.requested_by = u.id
        LEFT JOIN lab_request_items lri ON lr.id = lri.lab_request_id
        WHERE lr.patient_id = $1
      `;
        const labRequestsParams = [patientId];
        if (visitId) {
            labRequestsQuery += ` AND lr.visit_id = $2`;
            labRequestsParams.push(visitId);
        }
        labRequestsQuery += `
        GROUP BY lr.id, lr.request_date, lr.status, lr.urgency, lr.notes, u.username
        ORDER BY lr.request_date DESC
      `;
        if (!includeHistory) {
            labRequestsQuery += ` LIMIT 5`;
        }
        const labRequestsResult = await database_1.pool.query(labRequestsQuery, labRequestsParams);
        const labRequests = labRequestsResult.rows;
        // Get existing SHA claims for this patient
        let claimsQuery = `
        SELECT 
          sc.id, sc.claim_number, sc.visit_id, sc.claim_amount, sc.status,
          sc.primary_diagnosis_code, sc.primary_diagnosis_description,
          sc.created_at, sc.updated_at,
          u.username as created_by_name
        FROM sha_claims sc
        LEFT JOIN users u ON sc.created_by = u.id
        WHERE sc.patient_id = $1
        ORDER BY sc.created_at DESC
      `;
        const claimsParams = [patientId];
        if (visitId) {
            claimsQuery += ` AND sc.visit_id = $2`;
            claimsParams.push(visitId);
        }
        const claimsResult = await database_1.pool.query(claimsQuery, claimsParams);
        const existingClaims = claimsResult.rows;
        // Calculate total costs for SHA eligibility
        let totalCost = 0;
        encounters.forEach(encounter => {
            if (encounter.treatments && Array.isArray(encounter.treatments)) {
                encounter.treatments.forEach((treatment) => {
                    if (treatment.cost) {
                        totalCost += parseFloat(treatment.cost) || 0;
                    }
                });
            }
        });
        labRequests.forEach(labRequest => {
            if (labRequest.test_items && Array.isArray(labRequest.test_items)) {
                labRequest.test_items.forEach((item) => {
                    if (item.cost) {
                        totalCost += parseFloat(item.cost) || 0;
                    }
                });
            }
        });
        res.json({
            success: true,
            data: {
                patient: {
                    id: patient.id,
                    op_number: patient.op_number,
                    name: `${patient.first_name} ${patient.last_name}`,
                    first_name: patient.first_name,
                    last_name: patient.last_name,
                    date_of_birth: patient.date_of_birth,
                    age: patient.age,
                    gender: patient.gender,
                    phone_number: patient.phone_number,
                    area: patient.area,
                    insurance_type: patient.insurance_type,
                    insurance_number: patient.insurance_number,
                    sha_beneficiary_id: patient.insurance_number, // For SHA claims
                    next_of_kin: patient.next_of_kin,
                    next_of_kin_phone: patient.next_of_kin_phone,
                    created_at: patient.created_at
                },
                visits,
                encounters,
                prescriptions,
                lab_requests: labRequests,
                existing_claims: existingClaims,
                summary: {
                    total_encounters: encounters.length,
                    total_prescriptions: prescriptions.length,
                    total_lab_requests: labRequests.length,
                    total_cost: totalCost,
                    sha_eligible: patient.insurance_type === 'SHA' && patient.insurance_number,
                    has_existing_claims: existingClaims.length > 0
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching patient clinical data:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch patient clinical data"
        });
    }
});
// Get patient data for SHA invoice generation
router.get("/patient/:patientId/sha-invoice-data", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.CLAIMS_MANAGER, types_1.UserRole.RECEPTIONIST]), [
    (0, express_validator_1.query)("visitId").isUUID().withMessage("Visit ID is required"),
    (0, express_validator_1.query)("encounterId").optional().isUUID().withMessage("Encounter ID must be a valid UUID")
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array()
            });
        }
        const { patientId } = req.params;
        const { visitId, encounterId } = req.query;
        // Get patient data
        const patientResult = await database_1.pool.query(`SELECT 
          p.op_number, p.first_name, p.last_name, p.insurance_number,
          p.phone_number, p.date_of_birth, p.gender
         FROM patients p 
         WHERE p.id = $1`, [patientId]);
        if (patientResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }
        const patient = patientResult.rows[0];
        // Get visit data
        const visitResult = await database_1.pool.query(`SELECT v.*, u.username as provider_name
         FROM visits v
         LEFT JOIN users u ON v.provider_id = u.id
         WHERE v.id = $1 AND v.patient_id = $2`, [visitId, patientId]);
        if (visitResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Visit not found"
            });
        }
        const visit = visitResult.rows[0];
        // Get encounter data with services
        let encounterQuery = `
        SELECT 
          pe.*, u.username as provider_name,
          -- Get services provided
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'service_name', s.service_name,
                'service_code', s.service_code,
                'cost', s.cost,
                'quantity', s.quantity
              )
            ) FILTER (WHERE s.id IS NOT NULL), 
            '[]'::json
          ) as services
        FROM patient_encounters pe
        LEFT JOIN users u ON pe.primary_provider = u.id
        LEFT JOIN encounter_services es ON pe.id = es.encounter_id
        LEFT JOIN services s ON es.service_id = s.id
        WHERE pe.patient_id = $1 AND pe.visit_id = $2
      `;
        const encounterParams = [patientId, visitId];
        if (encounterId) {
            encounterQuery += ` AND pe.id = $3`;
            encounterParams.push(encounterId);
        }
        encounterQuery += `
        GROUP BY pe.id, pe.encounter_type, pe.encounter_date, pe.chief_complaint,
                 pe.department, pe.location, pe.sha_eligible, pe.private_pay,
                 pe.primary_provider, pe.created_at, u.username
        ORDER BY pe.encounter_date DESC
      `;
        const encounterResult = await database_1.pool.query(encounterQuery, encounterParams);
        const encounters = encounterResult.rows;
        // Calculate total amount
        let totalAmount = 0;
        encounters.forEach(encounter => {
            if (encounter.services && Array.isArray(encounter.services)) {
                encounter.services.forEach((service) => {
                    if (service.cost && service.quantity) {
                        totalAmount += (parseFloat(service.cost) * parseInt(service.quantity)) || 0;
                    }
                });
            }
        });
        // Generate invoice data in SHA format
        const invoiceData = {
            patient: {
                name: `${patient.first_name} ${patient.last_name}`,
                sha_number: patient.insurance_number,
                op_number: patient.op_number,
                phone_number: patient.phone_number,
                date_of_birth: patient.date_of_birth,
                gender: patient.gender
            },
            visit: {
                id: visit.id,
                date: visit.visit_date,
                type: visit.visit_type,
                provider: visit.provider_name
            },
            services: encounters.flatMap(encounter => encounter.services.map((service) => ({
                service_given: service.service_name,
                service_code: service.service_code,
                amount_charged: (parseFloat(service.cost) * parseInt(service.quantity)) || 0,
                quantity: service.quantity
            }))),
            diagnosis: encounters.map(encounter => ({
                code: encounter.primary_diagnosis_code || 'N/A',
                description: encounter.primary_diagnosis_description || encounter.chief_complaint || 'N/A'
            })),
            total_amount: totalAmount,
            invoice_number: `INV-${Date.now()}-${patient.op_number}`,
            generated_at: new Date().toISOString()
        };
        res.json({
            success: true,
            data: invoiceData
        });
    }
    catch (error) {
        console.error('Error generating SHA invoice data:', error);
        res.status(500).json({
            success: false,
            message: "Failed to generate SHA invoice data"
        });
    }
});
exports.default = router;
