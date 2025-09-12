import { Router, Request, Response } from 'express'
import { AnalyticsService } from '../services/AnalyticsService'
import { authorize } from '../middleware/auth'
import { UserRole } from '../types'

const router = Router()

/**
 * @route GET /api/analytics
 * @desc Get comprehensive analytics data
 * @access Admin, Doctor, Nurse
 */
router.get('/', authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE]), async (req: Request, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      eventType,
      patientId,
      groupBy
    } = req.query

    const query = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      eventType: eventType as string,
      patientId: patientId as string,
      groupBy: groupBy as 'day' | 'week' | 'month' | 'year'
    }

    const analytics = await AnalyticsService.getAnalytics(query)
    
    res.json({
      success: true,
      data: analytics
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics data',
      error: error.message
    })
  }
})

/**
 * @route GET /api/analytics/patient/:patientId
 * @desc Get patient-specific analytics
 * @access Admin, Doctor, Nurse
 */
router.get('/patient/:patientId', authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE]), async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params
    const { days = '30' } = req.query

    const analytics = await AnalyticsService.getPatientAnalytics(
      patientId, 
      parseInt(days as string)
    )
    
    res.json({
      success: true,
      data: analytics
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get patient analytics',
      error: error.message
    })
  }
})

/**
 * @route GET /api/analytics/system
 * @desc Get system performance metrics
 * @access Admin only
 */
router.get('/system', authorize([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const metrics = await AnalyticsService.getSystemMetrics()
    
    res.json({
      success: true,
      data: metrics
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get system metrics',
      error: error.message
    })
  }
})

/**
 * @route POST /api/analytics/track
 * @desc Track custom event
 * @access Admin, Doctor, Nurse
 */
router.post('/track', authorize([UserRole.ADMIN, UserRole.CLINICAL_OFFICER, UserRole.NURSE]), async (req: Request, res: Response) => {
  try {
    const { eventType, data, patientId } = req.body

    if (!eventType || !data) {
      return res.status(400).json({
        success: false,
        message: 'eventType and data are required'
      })
    }

    await AnalyticsService.trackEvent(eventType, data, patientId)
    
    res.json({
      success: true,
      message: 'Event tracked successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to track event',
      error: error.message
    })
  }
})

export default router
