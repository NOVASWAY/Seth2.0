import { Router, Request, Response } from 'express'
import { PerformanceMonitoringService } from '../services/PerformanceMonitoringService'
import { authorize } from '../middleware/auth'
import { UserRole } from '../types'

const router = Router()

/**
 * @route GET /api/performance/current
 * @desc Get current performance metrics
 * @access Admin, Clinical Officer
 */
router.get('/current', authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER]), async (req: Request, res: Response) => {
  try {
    const monitoringService = PerformanceMonitoringService.getInstance()
    const metrics = monitoringService.getCurrentMetrics()
    
    res.json({
      success: true,
      data: metrics
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get current metrics',
      error: error.message
    })
  }
})

/**
 * @route GET /api/performance/history
 * @desc Get performance metrics history
 * @access Admin, Clinical Officer
 */
router.get('/history', authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER]), async (req: Request, res: Response) => {
  try {
    const { limit = '100' } = req.query
    const monitoringService = PerformanceMonitoringService.getInstance()
    const metrics = monitoringService.getMetricsHistory(parseInt(limit as string))
    
    res.json({
      success: true,
      data: metrics
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get metrics history',
      error: error.message
    })
  }
})

/**
 * @route GET /api/performance/summary
 * @desc Get performance summary with trends
 * @access Admin, Clinical Officer
 */
router.get('/summary', authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER]), async (req: Request, res: Response) => {
  try {
    const monitoringService = PerformanceMonitoringService.getInstance()
    const summary = monitoringService.getPerformanceSummary()
    
    res.json({
      success: true,
      data: summary
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get performance summary',
      error: error.message
    })
  }
})

/**
 * @route POST /api/performance/collect
 * @desc Manually collect performance metrics
 * @access Admin only
 */
router.post('/collect', authorize([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const monitoringService = PerformanceMonitoringService.getInstance()
    const metrics = await monitoringService.collectMetrics()
    
    res.json({
      success: true,
      message: 'Metrics collected successfully',
      data: metrics
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to collect metrics',
      error: error.message
    })
  }
})

/**
 * @route GET /api/performance/status
 * @desc Get monitoring service status
 * @access Admin only
 */
router.get('/status', authorize([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const monitoringService = PerformanceMonitoringService.getInstance()
    const status = monitoringService.getStatus()
    
    res.json({
      success: true,
      data: status
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get monitoring status',
      error: error.message
    })
  }
})

/**
 * @route POST /api/performance/start
 * @desc Start performance monitoring
 * @access Admin only
 */
router.post('/start', authorize([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { interval = 30000 } = req.body
    const monitoringService = PerformanceMonitoringService.getInstance()
    monitoringService.start(interval)
    
    res.json({
      success: true,
      message: 'Performance monitoring started',
      data: { interval }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to start monitoring',
      error: error.message
    })
  }
})

/**
 * @route POST /api/performance/stop
 * @desc Stop performance monitoring
 * @access Admin only
 */
router.post('/stop', authorize([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const monitoringService = PerformanceMonitoringService.getInstance()
    monitoringService.stop()
    
    res.json({
      success: true,
      message: 'Performance monitoring stopped'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to stop monitoring',
      error: error.message
    })
  }
})

/**
 * @route DELETE /api/performance/clear
 * @desc Clear metrics history
 * @access Admin only
 */
router.delete('/clear', authorize([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const monitoringService = PerformanceMonitoringService.getInstance()
    monitoringService.clearMetrics()
    
    res.json({
      success: true,
      message: 'Metrics history cleared'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear metrics',
      error: error.message
    })
  }
})

export default router
