"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const BackupService_1 = require("../services/BackupService");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const router = (0, express_1.Router)();
/**
 * @route POST /api/backup/full
 * @desc Create full backup of both databases
 * @access Admin only
 */
router.post('/full', (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const backupService = BackupService_1.BackupService.getInstance();
        const result = await backupService.createFullBackup();
        res.json({
            success: result.success,
            message: result.success
                ? 'Full backup created successfully'
                : 'Backup completed with errors',
            data: {
                backupPath: result.backupPath,
                size: result.size,
                duration: result.duration,
                errors: result.errors
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Full backup failed',
            error: error.message
        });
    }
});
/**
 * @route POST /api/backup/incremental
 * @desc Create incremental backup
 * @access Admin only
 */
router.post('/incremental', (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { lastBackupTime } = req.body;
        if (!lastBackupTime) {
            return res.status(400).json({
                success: false,
                message: 'lastBackupTime is required'
            });
        }
        const backupService = BackupService_1.BackupService.getInstance();
        const result = await backupService.createIncrementalBackup(new Date(lastBackupTime));
        res.json({
            success: result.success,
            message: result.success
                ? 'Incremental backup created successfully'
                : 'Incremental backup completed with errors',
            data: {
                backupPath: result.backupPath,
                size: result.size,
                duration: result.duration,
                errors: result.errors
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Incremental backup failed',
            error: error.message
        });
    }
});
/**
 * @route GET /api/backup/list
 * @desc List available backups
 * @access Admin only
 */
router.get('/list', (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const backupService = BackupService_1.BackupService.getInstance();
        const backups = await backupService.listBackups();
        res.json({
            success: true,
            data: backups
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to list backups',
            error: error.message
        });
    }
});
/**
 * @route GET /api/backup/status
 * @desc Get backup service status
 * @access Admin only
 */
router.get('/status', (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const backupService = BackupService_1.BackupService.getInstance();
        const status = backupService.getStatus();
        res.json({
            success: true,
            data: status
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get backup status',
            error: error.message
        });
    }
});
exports.default = router;
