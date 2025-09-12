import { Router } from "express"
import { query, body, validationResult } from "express-validator"
import { authorize } from "../middleware/auth"
import { UserRole } from "../types"
import { AuthenticatedRequest } from "../types/auth"
import { ClinicalAutocompleteService, SearchOptions } from "../services/ClinicalAutocompleteService"

const router = Router()
const autocompleteService = new ClinicalAutocompleteService()

// Search diagnosis codes (ICD-10)
router.get(
  "/diagnosis",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER]),
  [
    query("q").isLength({ min: 1 }).withMessage("Search term is required"),
    query("limit").optional().isInt({ min: 1, max: 50 }),
    query("offset").optional().isInt({ min: 0 }),
    query("category").optional().trim(),
    query("includeInactive").optional().isBoolean(),
    query("userFavoritesFirst").optional().isBoolean()
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(err => err.msg)
        })
      }

      const {
        q: searchTerm,
        limit = 20,
        offset = 0,
        category,
        includeInactive = false,
        userFavoritesFirst = true
      } = req.query

      const options: SearchOptions = {
        limit: Number.parseInt(limit as string),
        offset: Number.parseInt(offset as string),
        category: category as string,
        includeInactive: includeInactive === 'true',
        userFavoritesFirst: userFavoritesFirst === 'true',
        userId: req.user!.id
      }

      const results = await autocompleteService.searchDiagnosisCodes(
        searchTerm as string,
        options
      )

      res.json({
        success: true,
        data: results,
        pagination: {
          limit: options.limit,
          offset: options.offset,
          total: results.length
        },
        message: `Found ${results.length} diagnosis codes`
      })

    } catch (error) {
      console.error("Error searching diagnosis codes:", error)
      res.status(500).json({
        success: false,
        message: "Failed to search diagnosis codes"
      })
    }
  }
)

// Search medications
router.get(
  "/medications",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.PHARMACIST]),
  [
    query("q").isLength({ min: 1 }).withMessage("Search term is required"),
    query("limit").optional().isInt({ min: 1, max: 50 }),
    query("offset").optional().isInt({ min: 0 }),
    query("category").optional().trim(),
    query("includeInactive").optional().isBoolean()
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(err => err.msg)
        })
      }

      const {
        q: searchTerm,
        limit = 20,
        offset = 0,
        category,
        includeInactive = false
      } = req.query

      const options: SearchOptions = {
        limit: Number.parseInt(limit as string),
        offset: Number.parseInt(offset as string),
        category: category as string,
        includeInactive: includeInactive === 'true',
        userId: req.user!.id
      }

      const results = await autocompleteService.searchMedications(
        searchTerm as string,
        options
      )

      res.json({
        success: true,
        data: results,
        pagination: {
          limit: options.limit,
          offset: options.offset,
          total: results.length
        },
        message: `Found ${results.length} medications`
      })

    } catch (error) {
      console.error("Error searching medications:", error)
      res.status(500).json({
        success: false,
        message: "Failed to search medications"
      })
    }
  }
)

// Search lab tests
router.get(
  "/lab-tests",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.LAB_TECHNICIAN]),
  [
    query("q").isLength({ min: 1 }).withMessage("Search term is required"),
    query("limit").optional().isInt({ min: 1, max: 50 }),
    query("offset").optional().isInt({ min: 0 }),
    query("category").optional().trim(),
    query("includeInactive").optional().isBoolean()
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(err => err.msg)
        })
      }

      const {
        q: searchTerm,
        limit = 20,
        offset = 0,
        category,
        includeInactive = false
      } = req.query

      const options: SearchOptions = {
        limit: Number.parseInt(limit as string),
        offset: Number.parseInt(offset as string),
        category: category as string,
        includeInactive: includeInactive === 'true',
        userId: req.user!.id
      }

      const results = await autocompleteService.searchLabTests(
        searchTerm as string,
        options
      )

      res.json({
        success: true,
        data: results,
        pagination: {
          limit: options.limit,
          offset: options.offset,
          total: results.length
        },
        message: `Found ${results.length} lab tests`
      })

    } catch (error) {
      console.error("Error searching lab tests:", error)
      res.status(500).json({
        success: false,
        message: "Failed to search lab tests"
      })
    }
  }
)

// Search procedures
router.get(
  "/procedures",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER]),
  [
    query("q").isLength({ min: 1 }).withMessage("Search term is required"),
    query("limit").optional().isInt({ min: 1, max: 50 }),
    query("offset").optional().isInt({ min: 0 }),
    query("category").optional().trim(),
    query("includeInactive").optional().isBoolean()
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(err => err.msg)
        })
      }

      const {
        q: searchTerm,
        limit = 20,
        offset = 0,
        category,
        includeInactive = false
      } = req.query

      const options: SearchOptions = {
        limit: Number.parseInt(limit as string),
        offset: Number.parseInt(offset as string),
        category: category as string,
        includeInactive: includeInactive === 'true',
        userId: req.user!.id
      }

      const results = await autocompleteService.searchProcedures(
        searchTerm as string,
        options
      )

      res.json({
        success: true,
        data: results,
        pagination: {
          limit: options.limit,
          offset: options.offset,
          total: results.length
        },
        message: `Found ${results.length} procedures`
      })

    } catch (error) {
      console.error("Error searching procedures:", error)
      res.status(500).json({
        success: false,
        message: "Failed to search procedures"
      })
    }
  }
)

// Get user favorites
router.get(
  "/favorites/:itemType",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.PHARMACIST, UserRole.LAB_TECHNICIAN]),
  [
    query("limit").optional().isInt({ min: 1, max: 20 })
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const { itemType } = req.params
      const { limit = 10 } = req.query

      if (!['DIAGNOSIS', 'MEDICATION', 'LAB_TEST', 'PROCEDURE', 'SYMPTOM'].includes(itemType.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: "Invalid item type"
        })
      }

      const results = await autocompleteService.getUserFavorites(
        itemType.toUpperCase() as any,
        req.user!.id,
        Number.parseInt(limit as string)
      )

      res.json({
        success: true,
        data: results,
        message: `Found ${results.length} favorite ${itemType}s`
      })

    } catch (error) {
      console.error("Error getting user favorites:", error)
      res.status(500).json({
        success: false,
        message: "Failed to get user favorites"
      })
    }
  }
)

// Toggle favorite status
router.post(
  "/favorites",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.PHARMACIST, UserRole.LAB_TECHNICIAN]),
  [
    body("itemType").isIn(['DIAGNOSIS', 'MEDICATION', 'LAB_TEST', 'PROCEDURE', 'SYMPTOM']).withMessage("Invalid item type"),
    body("itemId").isUUID().withMessage("Valid item ID is required"),
    body("itemName").notEmpty().withMessage("Item name is required")
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(err => err.msg)
        })
      }

      const { itemType, itemId, itemName } = req.body

      const isNewFavorite = await autocompleteService.toggleFavorite(
        req.user!.id,
        itemType,
        itemId,
        itemName
      )

      res.json({
        success: true,
        data: {
          isFavorite: true,
          isNew: isNewFavorite
        },
        message: isNewFavorite ? "Item added to favorites" : "Favorite usage count updated"
      })

    } catch (error) {
      console.error("Error toggling favorite:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update favorite status"
      })
    }
  }
)

// Get categories for a clinical data type
router.get(
  "/categories/:itemType",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.PHARMACIST, UserRole.LAB_TECHNICIAN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { itemType } = req.params

      if (!['DIAGNOSIS', 'MEDICATION', 'LAB_TEST', 'PROCEDURE', 'SYMPTOM'].includes(itemType.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: "Invalid item type"
        })
      }

      const categories = await autocompleteService.getCategories(
        itemType.toUpperCase() as any
      )

      res.json({
        success: true,
        data: categories,
        message: `Found ${categories.length} categories for ${itemType}`
      })

    } catch (error) {
      console.error("Error getting categories:", error)
      res.status(500).json({
        success: false,
        message: "Failed to get categories"
      })
    }
  }
)

// Get search suggestions
router.get(
  "/suggestions/:itemType",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.PHARMACIST, UserRole.LAB_TECHNICIAN]),
  [
    query("limit").optional().isInt({ min: 1, max: 20 })
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const { itemType } = req.params
      const { limit = 10 } = req.query

      if (!['DIAGNOSIS', 'MEDICATION', 'LAB_TEST', 'PROCEDURE', 'SYMPTOM'].includes(itemType.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: "Invalid item type"
        })
      }

      const suggestions = await autocompleteService.getSearchSuggestions(
        itemType.toUpperCase() as any,
        Number.parseInt(limit as string)
      )

      res.json({
        success: true,
        data: suggestions,
        message: `Found ${suggestions.length} search suggestions for ${itemType}`
      })

    } catch (error) {
      console.error("Error getting search suggestions:", error)
      res.status(500).json({
        success: false,
        message: "Failed to get search suggestions"
      })
    }
  }
)

// Record selection (for analytics)
router.post(
  "/selection",
  authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.PHARMACIST, UserRole.LAB_TECHNICIAN]),
  [
    body("searchTerm").notEmpty().withMessage("Search term is required"),
    body("searchType").isIn(['DIAGNOSIS', 'MEDICATION', 'LAB_TEST', 'PROCEDURE', 'SYMPTOM']).withMessage("Invalid search type"),
    body("selectedItemId").isUUID().withMessage("Valid selected item ID is required"),
    body("selectedItemName").notEmpty().withMessage("Selected item name is required")
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(err => err.msg)
        })
      }

      const { searchTerm, searchType, selectedItemId, selectedItemName } = req.body

      await autocompleteService.recordSelection(
        req.user!.id,
        searchTerm,
        searchType,
        selectedItemId,
        selectedItemName
      )

      res.json({
        success: true,
        message: "Selection recorded successfully"
      })

    } catch (error) {
      console.error("Error recording selection:", error)
      res.status(500).json({
        success: false,
        message: "Failed to record selection"
      })
    }
  }
)

export default router
