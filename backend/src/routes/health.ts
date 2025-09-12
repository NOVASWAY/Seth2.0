import { Router, Request, Response } from 'express'
import { databaseService } from '../services/DatabaseService'
import { DataSyncService } from '../services/DataSyncService'
import { BackupService } from '../services/BackupService'
import { PerformanceMonitoringService } from '../services/PerformanceMonitoringService'
import { mongoModels } from '../models/mongodb'
import { pool } from '../config/database'

const router = Router()

/**
 * @route GET /api/health
 * @desc Comprehensive health check endpoint
 * @access Public
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now()
    
    // Get database status
    const dbStatus = await databaseService.getStatus()
    
    // Get service statuses
    const syncService = DataSyncService.getInstance()
    const backupService = BackupService.getInstance()
    const monitoringService = PerformanceMonitoringService.getInstance()
    
    const syncStatus = syncService.getStatus()
    const backupStatus = backupService.getStatus()
    const monitoringStatus = monitoringService.getStatus()
    
    // Get performance metrics
    const currentMetrics = monitoringService.getCurrentMetrics()
    
    // Get MongoDB collection stats
    const mongoStats = await getMongoDBStats()
    
    // Get PostgreSQL stats
    const pgStats = await getPostgreSQLStats()
    
    const responseTime = Date.now() - startTime
    
    const healthData = {
      status: dbStatus.overall.healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      databases: {
        postgresql: {
          status: dbStatus.postgres.status,
          connected: dbStatus.postgres.connected,
          stats: pgStats
        },
        mongodb: {
          status: dbStatus.mongodb.status,
          connected: dbStatus.mongodb.connected,
          stats: mongoStats
        }
      },
      services: {
        dataSync: {
          running: syncStatus.running,
          queueLength: syncStatus.queueLength,
          isProcessing: syncStatus.isProcessing
        },
        backup: {
          enabled: backupStatus.enabled,
          backupPath: backupStatus.backupPath
        },
        performanceMonitoring: {
          active: monitoringStatus.isMonitoring,
          metricsCount: monitoringStatus.metricsCount
        }
      },
      performance: currentMetrics ? {
        memory: {
          used: `${Math.round(currentMetrics.system.memory.used / 1024 / 1024)}MB`,
          percentage: `${currentMetrics.system.memory.percentage}%`
        },
        cpu: {
          usage: `${currentMetrics.system.cpu.usage}%`,
          loadAverage: currentMetrics.system.cpu.loadAverage
        },
        uptime: `${Math.round(currentMetrics.system.uptime)}s`
      } : null
    }
    
    const statusCode = dbStatus.overall.healthy ? 200 : 503
    res.status(statusCode).json(healthData)
    
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      databases: {
        postgresql: { status: 'error', connected: false },
        mongodb: { status: 'error', connected: false }
      },
      services: {
        dataSync: { running: false, queueLength: 0, isProcessing: false },
        backup: { enabled: false, backupPath: null },
        performanceMonitoring: { active: false, metricsCount: 0 }
      }
    })
  }
})

/**
 * @route GET /api/health/detailed
 * @desc Detailed health check with full diagnostics
 * @access Admin only
 */
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        pid: process.pid
      },
      databases: await getDetailedDatabaseInfo(),
      services: await getDetailedServiceInfo(),
      performance: await getDetailedPerformanceInfo(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        POSTGRES_HOST: process.env.POSTGRES_HOST,
        MONGODB_HOST: process.env.MONGODB_HOST
      }
    }
    
    res.json({
      success: true,
      data: diagnostics
    })
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get detailed health information',
      error: error.message
    })
  }
})

/**
 * @route GET /api/health/ready
 * @desc Kubernetes readiness probe endpoint
 * @access Public
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const dbStatus = await databaseService.getStatus()
    
    if (dbStatus.overall.healthy) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      })
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        reason: 'Database connections not healthy'
      })
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message
    })
  }
})

/**
 * @route GET /api/health/live
 * @desc Kubernetes liveness probe endpoint
 * @access Public
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// Helper functions
async function getMongoDBStats() {
  try {
    const stats = {
      collections: {
        clinicalData: await mongoModels.ClinicalData.countDocuments(),
        analytics: await mongoModels.Analytics.countDocuments(),
        auditLog: await mongoModels.AuditLog.countDocuments(),
        documentMetadata: await mongoModels.DocumentMetadata.countDocuments(),
        syncEvent: await mongoModels.SyncEvent.countDocuments()
      },
      totalDocuments: 0
    }
    
    stats.totalDocuments = Object.values(stats.collections).reduce((sum, count) => sum + count, 0)
    return stats
  } catch (error) {
    return { error: error.message }
  }
}

async function getPostgreSQLStats() {
  try {
    const result = await pool.query(`
      SELECT 
        (SELECT count(*) FROM patients) as patients,
        (SELECT count(*) FROM visits) as visits,
        (SELECT count(*) FROM prescriptions) as prescriptions,
        (SELECT count(*) FROM invoices) as invoices,
        (SELECT count(*) FROM users) as users
    `)
    
    return result.rows[0]
  } catch (error) {
    return { error: error.message }
  }
}

async function getDetailedDatabaseInfo() {
  try {
    const dbStatus = await databaseService.getStatus()
    const mongoStats = await getMongoDBStats()
    const pgStats = await getPostgreSQLStats()
    
    return {
      postgresql: {
        ...dbStatus.postgres,
        stats: pgStats,
        connectionPool: {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount
        }
      },
      mongodb: {
        ...dbStatus.mongodb,
        stats: mongoStats
      }
    }
  } catch (error) {
    return { error: error.message }
  }
}

async function getDetailedServiceInfo() {
  try {
    const syncService = DataSyncService.getInstance()
    const backupService = BackupService.getInstance()
    const monitoringService = PerformanceMonitoringService.getInstance()
    
    return {
      dataSync: syncService.getStatus(),
      backup: backupService.getStatus(),
      performanceMonitoring: monitoringService.getStatus()
    }
  } catch (error) {
    return { error: error.message }
  }
}

async function getDetailedPerformanceInfo() {
  try {
    const monitoringService = PerformanceMonitoringService.getInstance()
    const currentMetrics = monitoringService.getCurrentMetrics()
    const summary = monitoringService.getPerformanceSummary()
    
    return {
      current: currentMetrics,
      summary: summary,
      history: monitoringService.getMetricsHistory(10)
    }
  } catch (error) {
    return { error: error.message }
  }
}

export default router
