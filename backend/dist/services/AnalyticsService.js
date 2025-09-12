"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const mongodb_1 = require("../models/mongodb");
const logger_1 = require("../utils/logger");
class AnalyticsService {
    /**
     * Get comprehensive analytics data
     */
    static async getAnalytics(query = {}) {
        try {
            const { startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            endDate = new Date(), eventType, patientId, groupBy = 'day' } = query;
            // Build match criteria
            const matchCriteria = {
                timestamp: {
                    $gte: startDate,
                    $lte: endDate
                }
            };
            if (eventType)
                matchCriteria.event_type = eventType;
            if (patientId)
                matchCriteria['data.patientId'] = patientId;
            // Get total events count
            const totalEvents = await mongodb_1.mongoModels.Analytics.countDocuments(matchCriteria);
            // Get unique patients count
            const uniquePatientsResult = await mongodb_1.mongoModels.Analytics.aggregate([
                { $match: matchCriteria },
                { $group: { _id: '$data.patientId' } },
                { $count: 'uniquePatients' }
            ]);
            const uniquePatients = uniquePatientsResult[0]?.uniquePatients || 0;
            // Get event types distribution
            const eventTypesResult = await mongodb_1.mongoModels.Analytics.aggregate([
                { $match: matchCriteria },
                { $group: { _id: '$event_type', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]);
            const eventTypes = eventTypesResult.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {});
            // Get time series data
            const timeSeries = await this.getTimeSeriesData(matchCriteria, groupBy);
            // Get top patients by event count
            const topPatientsResult = await mongodb_1.mongoModels.Analytics.aggregate([
                { $match: matchCriteria },
                { $group: {
                        _id: '$data.patientId',
                        eventCount: { $sum: 1 },
                        lastEvent: { $max: '$timestamp' }
                    } },
                { $sort: { eventCount: -1 } },
                { $limit: 10 }
            ]);
            const topPatients = topPatientsResult.map(item => ({
                patientId: item._id,
                eventCount: item.eventCount,
                lastEvent: item.lastEvent
            }));
            return {
                totalEvents,
                uniquePatients,
                eventTypes,
                timeSeries,
                topPatients
            };
        }
        catch (error) {
            logger_1.logger.error('Analytics query failed:', error);
            throw error;
        }
    }
    /**
     * Get time series data for charts
     */
    static async getTimeSeriesData(matchCriteria, groupBy) {
        const dateFormat = this.getDateFormat(groupBy);
        const groupFormat = this.getGroupFormat(groupBy);
        const result = await mongodb_1.mongoModels.Analytics.aggregate([
            { $match: matchCriteria },
            {
                $group: {
                    _id: {
                        period: { $dateToString: { format: dateFormat, date: '$timestamp' } },
                        group: groupFormat
                    },
                    count: { $sum: 1 },
                    events: { $sum: 1 }
                }
            },
            { $sort: { '_id.period': 1 } }
        ]);
        return result.map(item => ({
            period: item._id.period,
            count: item.count,
            events: item.events
        }));
    }
    /**
     * Get date format for grouping
     */
    static getDateFormat(groupBy) {
        switch (groupBy) {
            case 'day': return '%Y-%m-%d';
            case 'week': return '%Y-%U';
            case 'month': return '%Y-%m';
            case 'year': return '%Y';
            default: return '%Y-%m-%d';
        }
    }
    /**
     * Get group format for aggregation
     */
    static getGroupFormat(groupBy) {
        switch (groupBy) {
            case 'day': return { $dayOfYear: '$timestamp' };
            case 'week': return { $week: '$timestamp' };
            case 'month': return { $month: '$timestamp' };
            case 'year': return { $year: '$timestamp' };
            default: return { $dayOfYear: '$timestamp' };
        }
    }
    /**
     * Get patient-specific analytics
     */
    static async getPatientAnalytics(patientId, days = 30) {
        try {
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            const endDate = new Date();
            const matchCriteria = {
                'data.patientId': patientId,
                timestamp: { $gte: startDate, $lte: endDate }
            };
            // Get total events
            const totalEvents = await mongodb_1.mongoModels.Analytics.countDocuments(matchCriteria);
            // Get event types
            const eventTypesResult = await mongodb_1.mongoModels.Analytics.aggregate([
                { $match: matchCriteria },
                { $group: { _id: '$event_type', count: { $sum: 1 } } }
            ]);
            const eventTypes = eventTypesResult.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {});
            // Get recent events
            const recentEvents = await mongodb_1.mongoModels.Analytics
                .find(matchCriteria)
                .sort({ timestamp: -1 })
                .limit(10)
                .select('event_type data timestamp');
            // Get health trends (if clinical data exists)
            const healthTrends = await mongodb_1.mongoModels.ClinicalData.aggregate([
                { $match: { patient_id: patientId, created_at: { $gte: startDate, $lte: endDate } } },
                { $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
                        records: { $sum: 1 },
                        dataTypes: { $addToSet: '$data_type' }
                    } },
                { $sort: { _id: 1 } }
            ]);
            return {
                totalEvents,
                eventTypes,
                recentEvents,
                healthTrends
            };
        }
        catch (error) {
            logger_1.logger.error('Patient analytics query failed:', error);
            throw error;
        }
    }
    /**
     * Get system performance metrics
     */
    static async getSystemMetrics() {
        try {
            // Get MongoDB collection stats
            const clinicalDataCount = await mongodb_1.mongoModels.ClinicalData.countDocuments();
            const analyticsCount = await mongodb_1.mongoModels.Analytics.countDocuments();
            const auditLogsCount = await mongodb_1.mongoModels.AuditLog.countDocuments();
            const syncEventsCount = await mongodb_1.mongoModels.SyncEvent.countDocuments();
            // Get recent activity
            const recentActivity = await mongodb_1.mongoModels.Analytics
                .find({})
                .sort({ timestamp: -1 })
                .limit(20)
                .select('event_type data timestamp');
            return {
                databaseStats: {
                    postgresql: { status: 'connected' }, // Would need actual stats
                    mongodb: { status: 'connected' }
                },
                collectionStats: {
                    clinicalData: clinicalDataCount,
                    analytics: analyticsCount,
                    auditLogs: auditLogsCount,
                    syncEvents: syncEventsCount
                },
                recentActivity
            };
        }
        catch (error) {
            logger_1.logger.error('System metrics query failed:', error);
            throw error;
        }
    }
    /**
     * Track custom event
     */
    static async trackEvent(eventType, data, patientId) {
        try {
            const analytics = new mongodb_1.mongoModels.Analytics({
                event_type: eventType,
                data: {
                    ...data,
                    patientId: patientId || data.patientId
                },
                timestamp: new Date()
            });
            await analytics.save();
            logger_1.logger.info(`Event tracked: ${eventType}`, { patientId, data });
        }
        catch (error) {
            logger_1.logger.error('Failed to track event:', error);
            throw error;
        }
    }
}
exports.AnalyticsService = AnalyticsService;
