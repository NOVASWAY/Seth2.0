"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const Patient_1 = require("../models/Patient");
const Visit_1 = require("../models/Visit");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const router = express_1.default.Router();
router.get("/", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.RECEPTIONIST, types_1.UserRole.NURSE, types_1.UserRole.CLINICAL_OFFICER]), [
    (0, express_validator_1.query)("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
    (0, express_validator_1.query)("search").optional().isString().withMessage("Search must be a string"),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array(),
            });
        }
        const page = Number.parseInt(req.query.page) || 1;
        const limit = Number.parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const offset = (page - 1) * limit;
        let result;
        if (search) {
            const patients = await Patient_1.PatientModel.search(search, limit);
            result = { patients, total: patients.length };
        }
        else {
            result = await Patient_1.PatientModel.findAll(limit, offset);
        }
        res.json({
            success: true,
            data: {
                patients: result.patients,
                pagination: {
                    page,
                    limit,
                    total: result.total,
                    totalPages: Math.ceil(result.total / limit),
                },
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch patients",
        });
    }
});
router.get("/:id", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.RECEPTIONIST, types_1.UserRole.NURSE, types_1.UserRole.CLINICAL_OFFICER]), async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await Patient_1.PatientModel.findById(id);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found",
            });
        }
        const visits = await Visit_1.VisitModel.findByPatientId(id, 5);
        res.json({
            success: true,
            data: {
                patient,
                recentVisits: visits,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch patient",
        });
    }
});
router.post("/", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.RECEPTIONIST]), [
    (0, express_validator_1.body)("firstName").trim().isLength({ min: 1 }).withMessage("First name is required"),
    (0, express_validator_1.body)("lastName").trim().isLength({ min: 1 }).withMessage("Last name is required"),
    (0, express_validator_1.body)("gender").isIn(["MALE", "FEMALE", "OTHER"]).withMessage("Invalid gender"),
    (0, express_validator_1.body)("insuranceType").isIn(["SHA", "PRIVATE", "CASH"]).withMessage("Invalid insurance type"),
    (0, express_validator_1.body)("age").optional().isInt({ min: 0, max: 150 }).withMessage("Invalid age"),
    (0, express_validator_1.body)("phoneNumber").optional().isMobilePhone("any").withMessage("Invalid phone number"),
    (0, express_validator_1.body)("dateOfBirth").optional().isISO8601().withMessage("Invalid date of birth"),
    (0, express_validator_1.body)("registrationType").optional().isIn(["NEW_PATIENT", "IMPORT_PATIENT"]).withMessage("Invalid registration type"),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array(),
            });
        }
        const patientData = req.body;
        const registrationType = patientData.registrationType || 'NEW_PATIENT';
        if (patientData.dateOfBirth) {
            patientData.dateOfBirth = new Date(patientData.dateOfBirth);
        }
        patientData.registrationType = registrationType;
        patientData.registeredBy = req.user.id;
        patientData.registrationDate = new Date();
        const patient = await Patient_1.PatientModel.create(patientData);
        console.log(`Patient ${patient.id} registered via ${registrationType} by user ${req.user.id}`);
        res.status(201).json({
            success: true,
            message: registrationType === 'NEW_PATIENT'
                ? "New patient registered successfully"
                : "Patient imported successfully",
            data: {
                ...patient,
                registrationType,
                registeredBy: req.user.id,
                registrationDate: new Date()
            },
        });
    }
    catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Patient with this OP number already exists",
            });
        }
        res.status(500).json({
            success: false,
            message: "Failed to create patient",
        });
    }
});
router.put("/:id", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.RECEPTIONIST]), [
    (0, express_validator_1.body)("firstName").optional().trim().isLength({ min: 1 }).withMessage("First name cannot be empty"),
    (0, express_validator_1.body)("lastName").optional().trim().isLength({ min: 1 }).withMessage("Last name cannot be empty"),
    (0, express_validator_1.body)("gender").optional().isIn(["MALE", "FEMALE", "OTHER"]).withMessage("Invalid gender"),
    (0, express_validator_1.body)("insuranceType").optional().isIn(["SHA", "PRIVATE", "CASH"]).withMessage("Invalid insurance type"),
    (0, express_validator_1.body)("age").optional().isInt({ min: 0, max: 150 }).withMessage("Invalid age"),
    (0, express_validator_1.body)("phoneNumber").optional().isMobilePhone("any").withMessage("Invalid phone number"),
    (0, express_validator_1.body)("dateOfBirth").optional().isISO8601().withMessage("Invalid date of birth"),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array(),
            });
        }
        const { id } = req.params;
        const updateData = req.body;
        if (updateData.dateOfBirth) {
            updateData.dateOfBirth = new Date(updateData.dateOfBirth);
        }
        const patient = await Patient_1.PatientModel.update(id, updateData);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found",
            });
        }
        res.json({
            success: true,
            message: "Patient updated successfully",
            data: patient,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to update patient",
        });
    }
});
router.post("/import", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.RECEPTIONIST]), [
    (0, express_validator_1.body)("patients").isArray().withMessage("Patients must be an array"),
    (0, express_validator_1.body)("patients.*.op_number").trim().isLength({ min: 1 }).withMessage("OP number is required"),
    (0, express_validator_1.body)("patients.*.first_name").trim().isLength({ min: 1 }).withMessage("First name is required"),
    (0, express_validator_1.body)("patients.*.last_name").trim().isLength({ min: 1 }).withMessage("Last name is required"),
    (0, express_validator_1.body)("patients.*.insurance_type").isIn(["SHA", "PRIVATE", "CASH"]).withMessage("Invalid insurance type"),
    (0, express_validator_1.body)("patients.*.age").optional().isInt({ min: 0, max: 150 }).withMessage("Invalid age"),
    (0, express_validator_1.body)("patients.*.phone_number").optional().isString().withMessage("Phone number must be a string"),
    (0, express_validator_1.body)("patients.*.date_of_birth").optional().isISO8601().withMessage("Invalid date of birth"),
    (0, express_validator_1.body)("patients.*.area").optional().isString().withMessage("Area must be a string"),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array(),
            });
        }
        const { patients } = req.body;
        const results = {
            successful: [],
            failed: [],
            total: patients.length
        };
        for (const patientData of patients) {
            try {
                const existingPatient = await Patient_1.PatientModel.findByOpNumber(patientData.op_number);
                if (existingPatient) {
                    results.failed.push({
                        op_number: patientData.op_number,
                        name: `${patientData.first_name} ${patientData.last_name}`,
                        error: "Patient with this OP number already exists"
                    });
                    continue;
                }
                if (patientData.date_of_birth) {
                    patientData.date_of_birth = new Date(patientData.date_of_birth);
                }
                const patient = await Patient_1.PatientModel.create({
                    opNumber: patientData.op_number,
                    firstName: patientData.first_name,
                    lastName: patientData.last_name,
                    age: patientData.age,
                    dateOfBirth: patientData.date_of_birth,
                    area: patientData.area,
                    phoneNumber: patientData.phone_number,
                    insuranceType: patientData.insurance_type,
                    gender: "OTHER",
                    registrationType: "IMPORT_PATIENT",
                    registeredBy: req.user.id,
                    registrationDate: new Date()
                });
                results.successful.push({
                    op_number: patient.opNumber,
                    name: `${patient.firstName} ${patient.lastName}`,
                    id: patient.id
                });
            }
            catch (error) {
                results.failed.push({
                    op_number: patientData.op_number,
                    name: `${patientData.first_name} ${patientData.last_name}`,
                    error: error.message || "Failed to create patient"
                });
            }
        }
        res.json({
            success: true,
            message: `Import completed. ${results.successful.length} successful, ${results.failed.length} failed.`,
            data: results
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to import patients",
        });
    }
});
router.get("/search", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.RECEPTIONIST, types_1.UserRole.NURSE, types_1.UserRole.CLINICAL_OFFICER]), [
    (0, express_validator_1.query)("q").trim().isLength({ min: 1 }).withMessage("Search query is required"),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 50 }).withMessage("Limit must be between 1 and 50"),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array(),
            });
        }
        const query = req.query.q;
        const limit = Number.parseInt(req.query.limit) || 20;
        const patients = await Patient_1.PatientModel.search(query, limit);
        res.json({
            success: true,
            data: {
                patients,
                total: patients.length,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to search patients",
        });
    }
});
exports.default = router;
//# sourceMappingURL=patients.js.map