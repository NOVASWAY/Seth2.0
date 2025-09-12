import { mongoModels } from '../models/mongodb'
import { logger } from '../utils/logger'

export interface AnalyticsQuery {
  startDate?: Date
  endDate?: Date
  eventType?: string
  patientId?: string
  groupBy?: 'day' | 'week' | 'month' | 'year'
}

export interface AnalyticsResult {
  totalEvents: number
  uniquePatients: number
  eventTypes: { [key: string]: number }
  timeSeries: Array<{
    period: string
    count: number
    events: number
  }>
  topPatients: Array<{
    patientId: string
    eventCount: number
    lastEvent: Date
  }>
}

export class AnalyticsService {
  /**
   * Get comprehensive analytics data
   */
  static async getAnalytics(query: AnalyticsQuery = {}): Promise<AnalyticsResult> {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate = new Date(),
        eventType,
        patientId,
        groupBy = 'day'
      } = query

      // Build match criteria
      const matchCriteria: any = {
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      }

      if (eventType) matchCriteria.event_type = eventType
      if (patientId) matchCriteria['data.patientId'] = patientId

      // Get total events count
      const totalEvents = await mongoModels.Analytics.countDocuments(matchCriteria)

      // Get unique patients count
      const uniquePatientsResult = await mongoModels.Analytics.aggregate([
        { $match: matchCriteria },
        { $group: { _id: '$data.patientId' } },
        { $count: 'uniquePatients' }
      ])
      const uniquePatients = uniquePatientsResult[0]?.uniquePatients || 0

      // Get event types distribution
      const eventTypesResult = await mongoModels.Analytics.aggregate([
        { $match: matchCriteria },
        { $group: { _id: '$event_type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
      const eventTypes = eventTypesResult.reduce((acc, item) => {
        acc[item._id] = item.count
        return acc
      }, {})

      // Get time series data
      const timeSeries = await this.getTimeSeriesData(matchCriteria, groupBy)

      // Get top patients by event count
      const topPatientsResult = await mongoModels.Analytics.aggregate([
        { $match: matchCriteria },
        { $group: {
          _id: '$data.patientId',
          eventCount: { $sum: 1 },
          lastEvent: { $max: '$timestamp' }
        }},
        { $sort: { eventCount: -1 } },
        { $limit: 10 }
      ])
      const topPatients = topPatientsResult.map(item => ({
        patientId: item._id,
        eventCount: item.eventCount,
        lastEvent: item.lastEvent
      }))

      return {
        totalEvents,
        uniquePatients,
        eventTypes,
        timeSeries,
        topPatients
      }

    } catch (error) {
      logger.error('Analytics query failed:', error)
      throw error
    }
  }

  /**
   * Get time series data for charts
   */
  private static async getTimeSeriesData(matchCriteria: any, groupBy: string) {
    const dateFormat = this.getDateFormat(groupBy)
    const groupFormat = this.getGroupFormat(groupBy)

    const result = await mongoModels.Analytics.aggregate([
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
    ])

    return result.map(item => ({
      period: item._id.period,
      count: item.count,
      events: item.events
    }))
  }

  /**
   * Get date format for grouping
   */
  private static getDateFormat(groupBy: string): string {
    switch (groupBy) {
      case 'day': return '%Y-%m-%d'
      case 'week': return '%Y-%U'
      case 'month': return '%Y-%m'
      case 'year': return '%Y'
      default: return '%Y-%m-%d'
    }
  }

  /**
   * Get group format for aggregation
   */
  private static getGroupFormat(groupBy: string): any {
    switch (groupBy) {
      case 'day': return { $dayOfYear: '$timestamp' }
      case 'week': return { $week: '$timestamp' }
      case 'month': return { $month: '$timestamp' }
      case 'year': return { $year: '$timestamp' }
      default: return { $dayOfYear: '$timestamp' }
    }
  }

  /**
   * Get patient-specific analytics
   */
  static async getPatientAnalytics(patientId: string, days: number = 30): Promise<{
    totalEvents: number
    eventTypes: { [key: string]: number }
    recentEvents: any[]
    healthTrends: any[]
  }> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      const endDate = new Date()

      const matchCriteria = {
        'data.patientId': patientId,
        timestamp: { $gte: startDate, $lte: endDate }
      }

      // Get total events
      const totalEvents = await mongoModels.Analytics.countDocuments(matchCriteria)

      // Get event types
      const eventTypesResult = await mongoModels.Analytics.aggregate([
        { $match: matchCriteria },
        { $group: { _id: '$event_type', count: { $sum: 1 } } }
      ])
      const eventTypes = eventTypesResult.reduce((acc, item) => {
        acc[item._id] = item.count
        return acc
      }, {})

      // Get recent events
      const recentEvents = await mongoModels.Analytics
        .find(matchCriteria)
        .sort({ timestamp: -1 })
        .limit(10)
        .select('event_type data timestamp')

      // Get health trends (if clinical data exists)
      const healthTrends = await mongoModels.ClinicalData.aggregate([
        { $match: { patient_id: patientId, created_at: { $gte: startDate, $lte: endDate } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
          records: { $sum: 1 },
          dataTypes: { $addToSet: '$data_type' }
        }},
        { $sort: { _id: 1 } }
      ])

      return {
        totalEvents,
        eventTypes,
        recentEvents,
        healthTrends
      }

    } catch (error) {
      logger.error('Patient analytics query failed:', error)
      throw error
    }
  }

  /**
   * Get system performance metrics
   */
  static async getSystemMetrics(): Promise<{
    databaseStats: {
      postgresql: any
      mongodb: any
    }
    collectionStats: {
      clinicalData: number
      analytics: number
      auditLogs: number
      syncEvents: number
    }
    recentActivity: any[]
  }> {
    try {
      // Get MongoDB collection stats
      const clinicalDataCount = await mongoModels.ClinicalData.countDocuments()
      const analyticsCount = await mongoModels.Analytics.countDocuments()
      const auditLogsCount = await mongoModels.AuditLog.countDocuments()
      const syncEventsCount = await mongoModels.SyncEvent.countDocuments()

      // Get recent activity
      const recentActivity = await mongoModels.Analytics
        .find({})
        .sort({ timestamp: -1 })
        .limit(20)
        .select('event_type data timestamp')

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
      }

    } catch (error) {
      logger.error('System metrics query failed:', error)
      throw error
    }
  }

  /**
   * Track custom event
   */
  static async trackEvent(eventType: string, data: any, patientId?: string): Promise<void> {
    try {
      const analytics = new mongoModels.Analytics({
        event_type: eventType,
        data: {
          ...data,
          patientId: patientId || data.patientId
        },
        timestamp: new Date()
      })

      await analytics.save()
      logger.info(`Event tracked: ${eventType}`, { patientId, data })

    } catch (error) {
      logger.error('Failed to track event:', error)
      throw error
    }
  }
}
