"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const ClinicalAutocompleteService_1 = require("../services/ClinicalAutocompleteService");
const router = (0, express_1.Router)();
const autocompleteService = new ClinicalAutocompleteService_1.ClinicalAutocompleteService();
router.get("/diagnosis", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.DOCTOR]), [
    (0, express_validator_1.query)("q").isLength({ min: 1 }).withMessage("Search term is required"),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 50 }),
    (0, express_validator_1.query)("offset").optional().isInt({ min: 0 }),
    (0, express_validator_1.query)("category").optional().trim(),
    (0, express_validator_1.query)("includeInactive").optional().isBoolean(),
    (0, express_validator_1.query)("userFavoritesFirst").optional().isBoolean()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const { q: searchTerm, limit = 20, offset = 0, category, includeInactive = false, userFavoritesFirst = true } = req.query;
        const options = {
            limit: Number.parseInt(limit),
            offset: Number.parseInt(offset),
            category: category,
            includeInactive: includeInactive === 'true',
            userFavoritesFirst: userFavoritesFirst === 'true',
            userId: req.user.id
        };
        const results = await autocompleteService.searchDiagnosisCodes(searchTerm, options);
        res.json({
            success: true,
            data: results,
            pagination: {
                limit: options.limit,
                offset: options.offset,
                total: results.length
            },
            message: `Found ${results.length} diagnosis codes`
        });
    }
    catch (error) {
        console.error("Error searching diagnosis codes:", error);
        res.status(500).json({
            success: false,
            message: "Failed to search diagnosis codes"
        });
    }
});
router.get("/medications", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.DOCTOR, types_1.UserRole.PHARMACIST]), [
    (0, express_validator_1.query)("q").isLength({ min: 1 }).withMessage("Search term is required"),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 50 }),
    (0, express_validator_1.query)("offset").optional().isInt({ min: 0 }),
    (0, express_validator_1.query)("category").optional().trim(),
    (0, express_validator_1.query)("includeInactive").optional().isBoolean()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const { q: searchTerm, limit = 20, offset = 0, category, includeInactive = false } = req.query;
        const options = {
            limit: Number.parseInt(limit),
            offset: Number.parseInt(offset),
            category: category,
            includeInactive: includeInactive === 'true',
            userId: req.user.id
        };
        const results = await autocompleteService.searchMedications(searchTerm, options);
        res.json({
            success: true,
            data: results,
            pagination: {
                limit: options.limit,
                offset: options.offset,
                total: results.length
            },
            message: `Found ${results.length} medications`
        });
    }
    catch (error) {
        console.error("Error searching medications:", error);
        res.status(500).json({
            success: false,
            message: "Failed to search medications"
        });
    }
});
router.get("/lab-tests", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.DOCTOR, types_1.UserRole.LAB_TECHNICIAN]), [
    (0, express_validator_1.query)("q").isLength({ min: 1 }).withMessage("Search term is required"),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 50 }),
    (0, express_validator_1.query)("offset").optional().isInt({ min: 0 }),
    (0, express_validator_1.query)("category").optional().trim(),
    (0, express_validator_1.query)("includeInactive").optional().isBoolean()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const { q: searchTerm, limit = 20, offset = 0, category, includeInactive = false } = req.query;
        const options = {
            limit: Number.parseInt(limit),
            offset: Number.parseInt(offset),
            category: category,
            includeInactive: includeInactive === 'true',
            userId: req.user.id
        };
        const results = await autocompleteService.searchLabTests(searchTerm, options);
        res.json({
            success: true,
            data: results,
            pagination: {
                limit: options.limit,
                offset: options.offset,
                total: results.length
            },
            message: `Found ${results.length} lab tests`
        });
    }
    catch (error) {
        console.error("Error searching lab tests:", error);
        res.status(500).json({
            success: false,
            message: "Failed to search lab tests"
        });
    }
});
router.get("/procedures", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.DOCTOR]), [
    (0, express_validator_1.query)("q").isLength({ min: 1 }).withMessage("Search term is required"),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 50 }),
    (0, express_validator_1.query)("offset").optional().isInt({ min: 0 }),
    (0, express_validator_1.query)("category").optional().trim(),
    (0, express_validator_1.query)("includeInactive").optional().isBoolean()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const { q: searchTerm, limit = 20, offset = 0, category, includeInactive = false } = req.query;
        const options = {
            limit: Number.parseInt(limit),
            offset: Number.parseInt(offset),
            category: category,
            includeInactive: includeInactive === 'true',
            userId: req.user.id
        };
        const results = await autocompleteService.searchProcedures(searchTerm, options);
        res.json({
            success: true,
            data: results,
            pagination: {
                limit: options.limit,
                offset: options.offset,
                total: results.length
            },
            message: `Found ${results.length} procedures`
        });
    }
    catch (error) {
        console.error("Error searching procedures:", error);
        res.status(500).json({
            success: false,
            message: "Failed to search procedures"
        });
    }
});
router.get("/favorites/:itemType", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.DOCTOR, types_1.UserRole.PHARMACIST, types_1.UserRole.LAB_TECHNICIAN]), [
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 20 })
], async (req, res) => {
    try {
        const { itemType } = req.params;
        const { limit = 10 } = req.query;
        if (!['DIAGNOSIS', 'MEDICATION', 'LAB_TEST', 'PROCEDURE', 'SYMPTOM'].includes(itemType.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: "Invalid item type"
            });
        }
        const results = await autocompleteService.getUserFavorites(itemType.toUpperCase(), req.user.id, Number.parseInt(limit));
        res.json({
            success: true,
            data: results,
            message: `Found ${results.length} favorite ${itemType}s`
        });
    }
    catch (error) {
        console.error("Error getting user favorites:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get user favorites"
        });
    }
});
router.post("/favorites", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.DOCTOR, types_1.UserRole.PHARMACIST, types_1.UserRole.LAB_TECHNICIAN]), [
    (0, express_validator_1.body)("itemType").isIn(['DIAGNOSIS', 'MEDICATION', 'LAB_TEST', 'PROCEDURE', 'SYMPTOM']).withMessage("Invalid item type"),
    (0, express_validator_1.body)("itemId").isUUID().withMessage("Valid item ID is required"),
    (0, express_validator_1.body)("itemName").notEmpty().withMessage("Item name is required")
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const { itemType, itemId, itemName } = req.body;
        const isNewFavorite = await autocompleteService.toggleFavorite(req.user.id, itemType, itemId, itemName);
        res.json({
            success: true,
            data: {
                isFavorite: true,
                isNew: isNewFavorite
            },
            message: isNewFavorite ? "Item added to favorites" : "Favorite usage count updated"
        });
    }
    catch (error) {
        console.error("Error toggling favorite:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update favorite status"
        });
    }
});
router.get("/categories/:itemType", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.DOCTOR, types_1.UserRole.PHARMACIST, types_1.UserRole.LAB_TECHNICIAN]), async (req, res) => {
    try {
        const { itemType } = req.params;
        if (!['DIAGNOSIS', 'MEDICATION', 'LAB_TEST', 'PROCEDURE', 'SYMPTOM'].includes(itemType.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: "Invalid item type"
            });
        }
        const categories = await autocompleteService.getCategories(itemType.toUpperCase());
        res.json({
            success: true,
            data: categories,
            message: `Found ${categories.length} categories for ${itemType}`
        });
    }
    catch (error) {
        console.error("Error getting categories:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get categories"
        });
    }
});
router.get("/suggestions/:itemType", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.DOCTOR, types_1.UserRole.PHARMACIST, types_1.UserRole.LAB_TECHNICIAN]), [
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 20 })
], async (req, res) => {
    try {
        const { itemType } = req.params;
        const { limit = 10 } = req.query;
        if (!['DIAGNOSIS', 'MEDICATION', 'LAB_TEST', 'PROCEDURE', 'SYMPTOM'].includes(itemType.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: "Invalid item type"
            });
        }
        const suggestions = await autocompleteService.getSearchSuggestions(itemType.toUpperCase(), Number.parseInt(limit));
        res.json({
            success: true,
            data: suggestions,
            message: `Found ${suggestions.length} search suggestions for ${itemType}`
        });
    }
    catch (error) {
        console.error("Error getting search suggestions:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get search suggestions"
        });
    }
});
router.post("/selection", (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.DOCTOR, types_1.UserRole.PHARMACIST, types_1.UserRole.LAB_TECHNICIAN]), [
    (0, express_validator_1.body)("searchTerm").notEmpty().withMessage("Search term is required"),
    (0, express_validator_1.body)("searchType").isIn(['DIAGNOSIS', 'MEDICATION', 'LAB_TEST', 'PROCEDURE', 'SYMPTOM']).withMessage("Invalid search type"),
    (0, express_validator_1.body)("selectedItemId").isUUID().withMessage("Valid selected item ID is required"),
    (0, express_validator_1.body)("selectedItemName").notEmpty().withMessage("Selected item name is required")
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => err.msg)
            });
        }
        const { searchTerm, searchType, selectedItemId, selectedItemName } = req.body;
        await autocompleteService.recordSelection(req.user.id, searchTerm, searchType, selectedItemId, selectedItemName);
        res.json({
            success: true,
            message: "Selection recorded successfully"
        });
    }
    catch (error) {
        console.error("Error recording selection:", error);
        res.status(500).json({
            success: false,
            message: "Failed to record selection"
        });
    }
});
exports.default = router;
//# sourceMappingURL=clinical-autocomplete.js.map