"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AnalyticsService_1 = require("../services/AnalyticsService");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const router = (0, express_1.Router)();
/**
 * @route GET /api/analytics
 * @desc Get comprehensive analytics data
 * @access Admin, Doctor, Nurse
 */
router.get('/', (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE]), async (req, res) => {
    try {
        const { startDate, endDate, eventType, patientId, groupBy } = req.query;
        const query = {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            eventType: eventType,
            patientId: patientId,
            groupBy: groupBy
        };
        const analytics = await AnalyticsService_1.AnalyticsService.getAnalytics(query);
        res.json({
            success: true,
            data: analytics
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get analytics data',
            error: error.message
        });
    }
});
/**
 * @route GET /api/analytics/patient/:patientId
 * @desc Get patient-specific analytics
 * @access Admin, Doctor, Nurse
 */
router.get('/patient/:patientId', (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE]), async (req, res) => {
    try {
        const { patientId } = req.params;
        const { days = '30' } = req.query;
        const analytics = await AnalyticsService_1.AnalyticsService.getPatientAnalytics(patientId, parseInt(days));
        res.json({
            success: true,
            data: analytics
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get patient analytics',
            error: error.message
        });
    }
});
/**
 * @route GET /api/analytics/system
 * @desc Get system performance metrics
 * @access Admin only
 */
router.get('/system', (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const metrics = await AnalyticsService_1.AnalyticsService.getSystemMetrics();
        res.json({
            success: true,
            data: metrics
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get system metrics',
            error: error.message
        });
    }
});
/**
 * @route POST /api/analytics/track
 * @desc Track custom event
 * @access Admin, Doctor, Nurse
 */
router.post('/track', (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER, types_1.UserRole.NURSE]), async (req, res) => {
    try {
        const { eventType, data, patientId } = req.body;
        if (!eventType || !data) {
            return res.status(400).json({
                success: false,
                message: 'eventType and data are required'
            });
        }
        await AnalyticsService_1.AnalyticsService.trackEvent(eventType, data, patientId);
        res.json({
            success: true,
            message: 'Event tracked successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to track event',
            error: error.message
        });
    }
});
exports.default = router;
