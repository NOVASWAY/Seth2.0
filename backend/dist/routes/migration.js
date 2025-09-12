"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const MigrationService_1 = require("../services/MigrationService");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const router = (0, express_1.Router)();
/**
 * @route GET /api/migration/status
 * @desc Get migration status and statistics
 * @access Admin only
 */
router.get('/status', (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const status = await MigrationService_1.MigrationService.getMigrationStatus();
        res.json({
            success: true,
            data: status
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get migration status',
            error: error.message
        });
    }
});
/**
 * @route POST /api/migration/patients
 * @desc Migrate patient data from PostgreSQL to MongoDB
 * @access Admin only
 */
router.post('/patients', (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const result = await MigrationService_1.MigrationService.migratePatientData();
        res.json({
            success: result.success,
            message: result.success
                ? `Successfully migrated ${result.recordsProcessed} patient records`
                : `Migration completed with ${result.errors.length} errors`,
            data: {
                recordsProcessed: result.recordsProcessed,
                errors: result.errors,
                duration: result.duration
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Patient migration failed',
            error: error.message
        });
    }
});
/**
 * @route POST /api/migration/visits
 * @desc Migrate visit data from PostgreSQL to MongoDB
 * @access Admin only
 */
router.post('/visits', (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const result = await MigrationService_1.MigrationService.migrateVisitData();
        res.json({
            success: result.success,
            message: result.success
                ? `Successfully migrated ${result.recordsProcessed} visit records`
                : `Migration completed with ${result.errors.length} errors`,
            data: {
                recordsProcessed: result.recordsProcessed,
                errors: result.errors,
                duration: result.duration
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Visit migration failed',
            error: error.message
        });
    }
});
/**
 * @route POST /api/migration/cleanup
 * @desc Clean up migration data from MongoDB
 * @access Admin only
 */
router.post('/cleanup', (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const result = await MigrationService_1.MigrationService.cleanupMigrationData();
        res.json({
            success: result.success,
            message: result.success
                ? `Successfully cleaned up ${result.recordsDeleted} migration records`
                : 'Cleanup failed',
            data: {
                recordsDeleted: result.recordsDeleted
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Migration cleanup failed',
            error: error.message
        });
    }
});
exports.default = router;
