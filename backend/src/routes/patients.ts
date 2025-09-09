import express from "express"
import { body, query, validationResult } from "express-validator"
import { PatientModel } from "../models/Patient"
import { VisitModel } from "../models/Visit"
import { authorize, type AuthenticatedRequest } from "../middleware/auth"
import { UserRole } from "../types"

const router = express.Router()

// Get all patients with pagination and search
router.get(
  "/",
  authorize([UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.NURSE, UserRole.CLINICAL_OFFICER]),
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
    query("search").optional().isString().withMessage("Search must be a string"),
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const page = Number.parseInt(req.query.page as string) || 1
      const limit = Number.parseInt(req.query.limit as string) || 20
      const search = req.query.search as string
      const offset = (page - 1) * limit

      let result
      if (search) {
        const patients = await PatientModel.search(search, limit)
        result = { patients, total: patients.length }
      } else {
        result = await PatientModel.findAll(limit, offset)
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
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch patients",
      })
    }
  },
)

// Get patient by ID
router.get(
  "/:id",
  authorize([UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.NURSE, UserRole.CLINICAL_OFFICER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params
      const patient = await PatientModel.findById(id)

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: "Patient not found",
        })
      }

      // Get patient's recent visits
      const visits = await VisitModel.findByPatientId(id, 5)

      res.json({
        success: true,
        data: {
          patient,
          recentVisits: visits,
        },
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch patient",
      })
    }
  },
)

// Create new patient (Registration)
router.post(
  "/",
  authorize([UserRole.ADMIN, UserRole.RECEPTIONIST]),
  [
    body("firstName").trim().isLength({ min: 1 }).withMessage("First name is required"),
    body("lastName").trim().isLength({ min: 1 }).withMessage("Last name is required"),
    body("gender").isIn(["MALE", "FEMALE", "OTHER"]).withMessage("Invalid gender"),
    body("insuranceType").isIn(["SHA", "PRIVATE", "CASH"]).withMessage("Invalid insurance type"),
    body("age").optional().isInt({ min: 0, max: 150 }).withMessage("Invalid age"),
    body("phoneNumber").optional().isMobilePhone("any").withMessage("Invalid phone number"),
    body("dateOfBirth").optional().isISO8601().withMessage("Invalid date of birth"),
    body("registrationType").optional().isIn(["NEW_PATIENT", "IMPORT_PATIENT"]).withMessage("Invalid registration type"),
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const patientData = req.body
      const registrationType = patientData.registrationType || 'NEW_PATIENT'

      // Convert date string to Date object if provided
      if (patientData.dateOfBirth) {
        patientData.dateOfBirth = new Date(patientData.dateOfBirth)
      }

      // Add registration metadata
      patientData.registrationType = registrationType
      patientData.registeredBy = req.user!.id
      patientData.registrationDate = new Date()

      const patient = await PatientModel.create(patientData)

      // Log the registration type for audit purposes
      console.log(`Patient ${patient.id} registered via ${registrationType} by user ${req.user!.id}`)

      res.status(201).json({
        success: true,
        message: registrationType === 'NEW_PATIENT' 
          ? "New patient registered successfully" 
          : "Patient imported successfully",
        data: {
          ...patient,
          registrationType,
          registeredBy: req.user!.id,
          registrationDate: new Date()
        },
      })
    } catch (error: any) {
      if (error.code === "23505") {
        // Unique constraint violation
        return res.status(409).json({
          success: false,
          message: "Patient with this OP number already exists",
        })
      }

      res.status(500).json({
        success: false,
        message: "Failed to create patient",
      })
    }
  },
)

// Update patient
router.put(
  "/:id",
  authorize([UserRole.ADMIN, UserRole.RECEPTIONIST]),
  [
    body("firstName").optional().trim().isLength({ min: 1 }).withMessage("First name cannot be empty"),
    body("lastName").optional().trim().isLength({ min: 1 }).withMessage("Last name cannot be empty"),
    body("gender").optional().isIn(["MALE", "FEMALE", "OTHER"]).withMessage("Invalid gender"),
    body("insuranceType").optional().isIn(["SHA", "PRIVATE", "CASH"]).withMessage("Invalid insurance type"),
    body("age").optional().isInt({ min: 0, max: 150 }).withMessage("Invalid age"),
    body("phoneNumber").optional().isMobilePhone("any").withMessage("Invalid phone number"),
    body("dateOfBirth").optional().isISO8601().withMessage("Invalid date of birth"),
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { id } = req.params
      const updateData = req.body

      // Convert date string to Date object if provided
      if (updateData.dateOfBirth) {
        updateData.dateOfBirth = new Date(updateData.dateOfBirth)
      }

      const patient = await PatientModel.update(id, updateData)

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: "Patient not found",
        })
      }

      res.json({
        success: true,
        message: "Patient updated successfully",
        data: patient,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update patient",
      })
    }
  },
)

// Import patients from CSV
router.post(
  "/import",
  authorize([UserRole.ADMIN, UserRole.RECEPTIONIST]),
  [
    body("patients").isArray().withMessage("Patients must be an array"),
    body("patients.*.op_number").trim().isLength({ min: 1 }).withMessage("OP number is required"),
    body("patients.*.first_name").trim().isLength({ min: 1 }).withMessage("First name is required"),
    body("patients.*.last_name").trim().isLength({ min: 1 }).withMessage("Last name is required"),
    body("patients.*.insurance_type").isIn(["SHA", "PRIVATE", "CASH"]).withMessage("Invalid insurance type"),
    body("patients.*.age").optional().isInt({ min: 0, max: 150 }).withMessage("Invalid age"),
    body("patients.*.phone_number").optional().isString().withMessage("Phone number must be a string"),
    body("patients.*.date_of_birth").optional().isISO8601().withMessage("Invalid date of birth"),
    body("patients.*.area").optional().isString().withMessage("Area must be a string"),
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { patients } = req.body
      const results = {
        successful: [],
        failed: [],
        total: patients.length
      }

      // Process each patient
      for (const patientData of patients) {
        try {
          // Check if patient with OP number already exists
          const existingPatient = await PatientModel.findByOpNumber(patientData.op_number)
          if (existingPatient) {
            results.failed.push({
              op_number: patientData.op_number,
              name: `${patientData.first_name} ${patientData.last_name}`,
              error: "Patient with this OP number already exists"
            })
            continue
          }

          // Convert date string to Date object if provided
          if (patientData.date_of_birth) {
            patientData.date_of_birth = new Date(patientData.date_of_birth)
          }

          // Create patient with import metadata
          const patient = await PatientModel.create({
            opNumber: patientData.op_number,
            firstName: patientData.first_name,
            lastName: patientData.last_name,
            age: patientData.age,
            dateOfBirth: patientData.date_of_birth,
            area: patientData.area,
            phoneNumber: patientData.phone_number,
            insuranceType: patientData.insurance_type,
            gender: "OTHER", // Default gender since it's not provided in CSV
            registrationType: "IMPORT_PATIENT",
            registeredBy: req.user!.id,
            registrationDate: new Date()
          })

          results.successful.push({
            op_number: patient.opNumber,
            name: `${patient.first_name} ${patient.last_name}`,
            id: patient.id
          })
        } catch (error: any) {
          results.failed.push({
            op_number: patientData.op_number,
            name: `${patientData.first_name} ${patientData.last_name}`,
            error: error.message || "Failed to create patient"
          })
        }
      }

      res.json({
        success: true,
        message: `Import completed. ${results.successful.length} successful, ${results.failed.length} failed.`,
        data: results
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to import patients",
      })
    }
  },
)

// Search patients endpoint
router.get(
  "/search",
  authorize([UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.NURSE, UserRole.CLINICAL_OFFICER]),
  [
    query("q").trim().isLength({ min: 1 }).withMessage("Search query is required"),
    query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("Limit must be between 1 and 50"),
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const query = req.query.q as string
      const limit = Number.parseInt(req.query.limit as string) || 20

      const patients = await PatientModel.search(query, limit)

      res.json({
        success: true,
        data: {
          patients,
          total: patients.length,
        },
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to search patients",
      })
    }
  },
)

export default router
