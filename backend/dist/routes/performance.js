"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PerformanceMonitoringService_1 = require("../services/PerformanceMonitoringService");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const router = (0, express_1.Router)();
/**
 * @route GET /api/performance/current
 * @desc Get current performance metrics
 * @access Admin, Clinical Officer
 */
router.get('/current', (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER]), async (req, res) => {
    try {
        const monitoringService = PerformanceMonitoringService_1.PerformanceMonitoringService.getInstance();
        const metrics = monitoringService.getCurrentMetrics();
        res.json({
            success: true,
            data: metrics
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get current metrics',
            error: error.message
        });
    }
});
/**
 * @route GET /api/performance/history
 * @desc Get performance metrics history
 * @access Admin, Clinical Officer
 */
router.get('/history', (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER]), async (req, res) => {
    try {
        const { limit = '100' } = req.query;
        const monitoringService = PerformanceMonitoringService_1.PerformanceMonitoringService.getInstance();
        const metrics = monitoringService.getMetricsHistory(parseInt(limit));
        res.json({
            success: true,
            data: metrics
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get metrics history',
            error: error.message
        });
    }
});
/**
 * @route GET /api/performance/summary
 * @desc Get performance summary with trends
 * @access Admin, Clinical Officer
 */
router.get('/summary', (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.CLINICAL_OFFICER]), async (req, res) => {
    try {
        const monitoringService = PerformanceMonitoringService_1.PerformanceMonitoringService.getInstance();
        const summary = monitoringService.getPerformanceSummary();
        res.json({
            success: true,
            data: summary
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get performance summary',
            error: error.message
        });
    }
});
/**
 * @route POST /api/performance/collect
 * @desc Manually collect performance metrics
 * @access Admin only
 */
router.post('/collect', (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const monitoringService = PerformanceMonitoringService_1.PerformanceMonitoringService.getInstance();
        const metrics = await monitoringService.collectMetrics();
        res.json({
            success: true,
            message: 'Metrics collected successfully',
            data: metrics
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to collect metrics',
            error: error.message
        });
    }
});
/**
 * @route GET /api/performance/status
 * @desc Get monitoring service status
 * @access Admin only
 */
router.get('/status', (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const monitoringService = PerformanceMonitoringService_1.PerformanceMonitoringService.getInstance();
        const status = monitoringService.getStatus();
        res.json({
            success: true,
            data: status
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get monitoring status',
            error: error.message
        });
    }
});
/**
 * @route POST /api/performance/start
 * @desc Start performance monitoring
 * @access Admin only
 */
router.post('/start', (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { interval = 30000 } = req.body;
        const monitoringService = PerformanceMonitoringService_1.PerformanceMonitoringService.getInstance();
        monitoringService.start(interval);
        res.json({
            success: true,
            message: 'Performance monitoring started',
            data: { interval }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to start monitoring',
            error: error.message
        });
    }
});
/**
 * @route POST /api/performance/stop
 * @desc Stop performance monitoring
 * @access Admin only
 */
router.post('/stop', (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const monitoringService = PerformanceMonitoringService_1.PerformanceMonitoringService.getInstance();
        monitoringService.stop();
        res.json({
            success: true,
            message: 'Performance monitoring stopped'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to stop monitoring',
            error: error.message
        });
    }
});
/**
 * @route DELETE /api/performance/clear
 * @desc Clear metrics history
 * @access Admin only
 */
router.delete('/clear', (0, auth_1.authorize)([types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const monitoringService = PerformanceMonitoringService_1.PerformanceMonitoringService.getInstance();
        monitoringService.clearMetrics();
        res.json({
            success: true,
            message: 'Metrics history cleared'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to clear metrics',
            error: error.message
        });
    }
});
exports.default = router;
