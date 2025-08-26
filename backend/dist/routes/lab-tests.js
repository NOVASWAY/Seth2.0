"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const LabTest_1 = require("../models/LabTest");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const router = express_1.default.Router();
router.get("/", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.LAB_TECHNICIAN]), [
    (0, express_validator_1.query)("search").optional().isString().withMessage("Search must be a string"),
    (0, express_validator_1.query)("category").optional().isString().withMessage("Category must be a string"),
    (0, express_validator_1.query)("activeOnly").optional().isBoolean().withMessage("Active only must be a boolean"),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const { search, category, activeOnly = true } = req.query;
        let tests;
        if (search) {
            tests = await LabTest_1.LabTestModel.search(search, activeOnly);
        }
        else if (category) {
            tests = await LabTest_1.LabTestModel.findByCategory(category, activeOnly);
        }
        else {
            tests = await LabTest_1.LabTestModel.findAll(activeOnly);
        }
        res.json({
            success: true,
            data: tests
        });
    }
    catch (error) {
        console.error("Error fetching lab tests:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch lab tests"
        });
    }
});
router.get("/available", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.LAB_TECHNICIAN]), [
    (0, express_validator_1.query)("search").optional().isString().withMessage("Search must be a string"),
    (0, express_validator_1.query)("category").optional().isString().withMessage("Category must be a string"),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const { search, category } = req.query;
        const tests = await LabTest_1.LabTestModel.getAvailableTests(search, category);
        res.json({
            success: true,
            data: tests
        });
    }
    catch (error) {
        console.error("Error fetching available lab tests:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch available lab tests"
        });
    }
});
router.get("/categories", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.LAB_TECHNICIAN]), async (req, res) => {
    try {
        const categories = await LabTest_1.LabTestModel.getCategories();
        res.json({
            success: true,
            data: categories
        });
    }
    catch (error) {
        console.error("Error fetching test categories:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch test categories"
        });
    }
});
router.get("/:id", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.LAB_TECHNICIAN]), async (req, res) => {
    try {
        const { id } = req.params;
        const test = await LabTest_1.LabTestModel.findById(id);
        if (!test) {
            return res.status(404).json({
                success: false,
                message: "Lab test not found"
            });
        }
        res.json({
            success: true,
            data: test
        });
    }
    catch (error) {
        console.error("Error fetching lab test:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch lab test"
        });
    }
});
router.post("/", (0, auth_1.authorize)([types_1.UserRole.ADMIN]), [
    (0, express_validator_1.body)("testCode").trim().isLength({ min: 1 }).withMessage("Test code is required"),
    (0, express_validator_1.body)("testName").trim().isLength({ min: 1 }).withMessage("Test name is required"),
    (0, express_validator_1.body)("testCategory").trim().isLength({ min: 1 }).withMessage("Test category is required"),
    (0, express_validator_1.body)("specimenType").trim().isLength({ min: 1 }).withMessage("Specimen type is required"),
    (0, express_validator_1.body)("turnaroundTime").isInt({ min: 1 }).withMessage("Turnaround time must be a positive integer"),
    (0, express_validator_1.body)("price").isFloat({ min: 0 }).withMessage("Price must be a non-negative number"),
    (0, express_validator_1.body)("description").optional().isString().withMessage("Description must be a string"),
    (0, express_validator_1.body)("instructions").optional().isString().withMessage("Instructions must be a string"),
    (0, express_validator_1.body)("referenceRanges").optional().isObject().withMessage("Reference ranges must be an object"),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const { testCode, testName, testCategory, description, specimenType, turnaroundTime, price, isActive = true, referenceRanges, instructions } = req.body;
        const existingTest = await LabTest_1.LabTestModel.findByTestCode(testCode);
        if (existingTest) {
            return res.status(400).json({
                success: false,
                message: "Test code already exists"
            });
        }
        const test = await LabTest_1.LabTestModel.create({
            testCode,
            testName,
            testCategory,
            description,
            specimenType,
            turnaroundTime,
            price,
            isActive,
            referenceRanges,
            instructions
        });
        res.status(201).json({
            success: true,
            data: test,
            message: "Lab test created successfully"
        });
    }
    catch (error) {
        console.error("Error creating lab test:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create lab test"
        });
    }
});
router.put("/:id", (0, auth_1.authorize)([types_1.UserRole.ADMIN]), [
    (0, express_validator_1.body)("testCode").optional().trim().isLength({ min: 1 }).withMessage("Test code cannot be empty"),
    (0, express_validator_1.body)("testName").optional().trim().isLength({ min: 1 }).withMessage("Test name cannot be empty"),
    (0, express_validator_1.body)("testCategory").optional().trim().isLength({ min: 1 }).withMessage("Test category cannot be empty"),
    (0, express_validator_1.body)("specimenType").optional().trim().isLength({ min: 1 }).withMessage("Specimen type cannot be empty"),
    (0, express_validator_1.body)("turnaroundTime").optional().isInt({ min: 1 }).withMessage("Turnaround time must be a positive integer"),
    (0, express_validator_1.body)("price").optional().isFloat({ min: 0 }).withMessage("Price must be a non-negative number"),
    (0, express_validator_1.body)("description").optional().isString().withMessage("Description must be a string"),
    (0, express_validator_1.body)("instructions").optional().isString().withMessage("Instructions must be a string"),
    (0, express_validator_1.body)("referenceRanges").optional().isObject().withMessage("Reference ranges must be an object"),
    (0, express_validator_1.body)("isActive").optional().isBoolean().withMessage("Is active must be a boolean"),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const { id } = req.params;
        const updateData = req.body;
        if (updateData.testCode) {
            const existingTest = await LabTest_1.LabTestModel.findByTestCode(updateData.testCode);
            if (existingTest && existingTest.id !== id) {
                return res.status(400).json({
                    success: false,
                    message: "Test code already exists"
                });
            }
        }
        const test = await LabTest_1.LabTestModel.update(id, updateData);
        if (!test) {
            return res.status(404).json({
                success: false,
                message: "Lab test not found"
            });
        }
        res.json({
            success: true,
            data: test,
            message: "Lab test updated successfully"
        });
    }
    catch (error) {
        console.error("Error updating lab test:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update lab test"
        });
    }
});
router.delete("/:id", (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await LabTest_1.LabTestModel.delete(id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Lab test not found"
            });
        }
        res.json({
            success: true,
            message: "Lab test deleted successfully"
        });
    }
    catch (error) {
        console.error("Error deleting lab test:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete lab test"
        });
    }
});
exports.default = router;
//# sourceMappingURL=lab-tests.js.map