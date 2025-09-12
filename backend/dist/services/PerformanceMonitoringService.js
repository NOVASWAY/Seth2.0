"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitoringService = void 0;
const mongodb_1 = require("../models/mongodb");
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
class PerformanceMonitoringService {
    constructor() {
        this.metrics = [];
        this.maxMetricsHistory = 1000;
        this.monitoringInterval = null;
        this.isMonitoring = false;
    }
    static getInstance() {
        if (!PerformanceMonitoringService.instance) {
            PerformanceMonitoringService.instance = new PerformanceMonitoringService();
        }
        return PerformanceMonitoringService.instance;
    }
    /**
     * Start performance monitoring
     */
    start(intervalMs = 30000) {
        if (this.isMonitoring) {
            logger_1.logger.warn('Performance monitoring already running');
            return;
        }
        this.monitoringInterval = setInterval(async () => {
            try {
                await this.collectMetrics();
            }
            catch (error) {
                logger_1.logger.error('Error collecting performance metrics:', error);
            }
        }, intervalMs);
        this.isMonitoring = true;
        logger_1.logger.info(`Performance monitoring started (interval: ${intervalMs}ms)`);
    }
    /**
     * Stop performance monitoring
     */
    stop() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.isMonitoring = false;
        logger_1.logger.info('Performance monitoring stopped');
    }
    /**
     * Collect current performance metrics
     */
    async collectMetrics() {
        const timestamp = new Date();
        try {
            // System metrics
            const systemMetrics = await this.getSystemMetrics();
            // Database metrics
            const databaseMetrics = await this.getDatabaseMetrics();
            // API metrics
            const apiMetrics = await this.getApiMetrics();
            // Custom metrics
            const customMetrics = await this.getCustomMetrics();
            const metrics = {
                timestamp,
                system: systemMetrics,
                databases: databaseMetrics,
                api: apiMetrics,
                custom: customMetrics
            };
            // Store metrics
            this.storeMetrics(metrics);
            // Store in MongoDB for historical analysis
            await this.storeMetricsInMongoDB(metrics);
            return metrics;
        }
        catch (error) {
            logger_1.logger.error('Failed to collect performance metrics:', error);
            throw error;
        }
    }
    /**
     * Get system metrics
     */
    async getSystemMetrics() {
        const memoryUsage = process.memoryUsage();
        const totalMemory = require('os').totalmem();
        const freeMemory = require('os').freemem();
        const usedMemory = totalMemory - freeMemory;
        return {
            memory: {
                used: usedMemory,
                free: freeMemory,
                total: totalMemory,
                percentage: Math.round((usedMemory / totalMemory) * 100)
            },
            cpu: {
                usage: await this.getCpuUsage(),
                loadAverage: require('os').loadavg()
            },
            uptime: process.uptime()
        };
    }
    /**
     * Get CPU usage percentage
     */
    async getCpuUsage() {
        const cpus = require('os').cpus();
        let totalIdle = 0;
        let totalTick = 0;
        for (const cpu of cpus) {
            for (const type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        }
        return Math.round(100 - (100 * totalIdle / totalTick));
    }
    /**
     * Get database metrics
     */
    async getDatabaseMetrics() {
        const startTime = Date.now();
        // PostgreSQL metrics
        const postgresqlMetrics = await this.getPostgreSQLMetrics();
        // MongoDB metrics
        const mongodbMetrics = await this.getMongoDBMetrics();
        const queryTime = Date.now() - startTime;
        return {
            postgresql: {
                ...postgresqlMetrics,
                queryTime
            },
            mongodb: {
                ...mongodbMetrics,
                queryTime
            }
        };
    }
    /**
     * Get PostgreSQL metrics
     */
    async getPostgreSQLMetrics() {
        try {
            // Get connection stats
            const connectionResult = await database_1.pool.query(`
        SELECT 
          count(*) as active_connections,
          (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
        FROM pg_stat_activity 
        WHERE state = 'active'
      `);
            const connections = connectionResult.rows[0];
            // Get slow queries count (queries taking more than 1 second)
            const slowQueriesResult = await database_1.pool.query(`
        SELECT count(*) as slow_queries
        FROM pg_stat_statements 
        WHERE mean_exec_time > 1000
      `).catch(() => ({ rows: [{ slow_queries: 0 }] }));
            return {
                activeConnections: parseInt(connections.active_connections),
                maxConnections: parseInt(connections.max_connections),
                queryTime: 0, // Will be set by parent
                slowQueries: parseInt(slowQueriesResult.rows[0].slow_queries)
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get PostgreSQL metrics:', error);
            return {
                activeConnections: 0,
                maxConnections: 0,
                queryTime: 0,
                slowQueries: 0
            };
        }
    }
    /**
     * Get MongoDB metrics
     */
    async getMongoDBMetrics() {
        try {
            // Get collection stats
            const clinicalDataCount = await mongodb_1.mongoModels.ClinicalData.countDocuments();
            const analyticsCount = await mongodb_1.mongoModels.Analytics.countDocuments();
            const auditLogCount = await mongodb_1.mongoModels.AuditLog.countDocuments();
            const totalOperations = clinicalDataCount + analyticsCount + auditLogCount;
            // Get slow operations (operations taking more than 100ms)
            const slowOperations = await mongodb_1.mongoModels.Analytics.countDocuments({
                'metadata.operationTime': { $gt: 100 }
            });
            return {
                connections: 1, // MongoDB connection count
                operations: totalOperations,
                queryTime: 0, // Will be set by parent
                slowOperations
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get MongoDB metrics:', error);
            return {
                connections: 0,
                operations: 0,
                queryTime: 0,
                slowOperations: 0
            };
        }
    }
    /**
     * Get API metrics
     */
    async getApiMetrics() {
        // This would typically come from middleware or request tracking
        // For now, we'll return mock data
        return {
            requestsPerMinute: 0,
            averageResponseTime: 0,
            errorRate: 0,
            activeConnections: 0
        };
    }
    /**
     * Get custom metrics
     */
    async getCustomMetrics() {
        return {
            customMetric1: Math.random() * 100,
            customMetric2: Date.now() % 1000,
            // Add more custom metrics as needed
        };
    }
    /**
     * Store metrics in memory
     */
    storeMetrics(metrics) {
        this.metrics.push(metrics);
        // Keep only the last N metrics
        if (this.metrics.length > this.maxMetricsHistory) {
            this.metrics = this.metrics.slice(-this.maxMetricsHistory);
        }
    }
    /**
     * Store metrics in MongoDB
     */
    async storeMetricsInMongoDB(metrics) {
        try {
            await mongodb_1.mongoModels.Analytics.create({
                event_type: 'performance_metrics',
                data: {
                    system: metrics.system,
                    databases: metrics.databases,
                    api: metrics.api,
                    custom: metrics.custom
                },
                timestamp: metrics.timestamp
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to store metrics in MongoDB:', error);
        }
    }
    /**
     * Get current metrics
     */
    getCurrentMetrics() {
        return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
    }
    /**
     * Get metrics history
     */
    getMetricsHistory(limit = 100) {
        return this.metrics.slice(-limit);
    }
    /**
     * Get performance summary
     */
    getPerformanceSummary() {
        const current = this.getCurrentMetrics();
        const history = this.getMetricsHistory(10);
        if (history.length === 0) {
            return {
                current: null,
                average: { memoryUsage: 0, cpuUsage: 0, responseTime: 0 },
                trends: { memoryTrend: 'stable', cpuTrend: 'stable', responseTimeTrend: 'stable' }
            };
        }
        // Calculate averages
        const average = {
            memoryUsage: history.reduce((sum, m) => sum + m.system.memory.percentage, 0) / history.length,
            cpuUsage: history.reduce((sum, m) => sum + m.system.cpu.usage, 0) / history.length,
            responseTime: history.reduce((sum, m) => sum + m.api.averageResponseTime, 0) / history.length
        };
        // Calculate trends
        const trends = this.calculateTrends(history);
        return {
            current,
            average,
            trends
        };
    }
    /**
     * Calculate performance trends
     */
    calculateTrends(history) {
        if (history.length < 2) {
            return { memoryTrend: 'stable', cpuTrend: 'stable', responseTimeTrend: 'stable' };
        }
        const getTrend = (values) => {
            const first = values[0];
            const last = values[values.length - 1];
            const diff = last - first;
            const threshold = first * 0.05; // 5% threshold
            if (diff > threshold)
                return 'increasing';
            if (diff < -threshold)
                return 'decreasing';
            return 'stable';
        };
        const memoryValues = history.map(m => m.system.memory.percentage);
        const cpuValues = history.map(m => m.system.cpu.usage);
        const responseTimeValues = history.map(m => m.api.averageResponseTime);
        return {
            memoryTrend: getTrend(memoryValues),
            cpuTrend: getTrend(cpuValues),
            responseTimeTrend: getTrend(responseTimeValues)
        };
    }
    /**
     * Get monitoring status
     */
    getStatus() {
        return {
            isMonitoring: this.isMonitoring,
            metricsCount: this.metrics.length,
            maxHistory: this.maxMetricsHistory
        };
    }
    /**
     * Clear metrics history
     */
    clearMetrics() {
        this.metrics = [];
        logger_1.logger.info('Performance metrics cleared');
    }
}
exports.PerformanceMonitoringService = PerformanceMonitoringService;
