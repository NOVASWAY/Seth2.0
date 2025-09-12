import { Router, Request, Response } from 'express'
import { DataSyncService } from '../services/DataSyncService'
import { authorize } from '../middleware/auth'
import { UserRole } from '../types'

const router = Router()

/**
 * @route GET /api/sync/status
 * @desc Get data sync service status
 * @access Admin only
 */
router.get('/status', authorize([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const syncService = DataSyncService.getInstance()
    const status = syncService.getStatus()
    
    res.json({
      success: true,
      data: status
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get sync status',
      error: error.message
    })
  }
})

/**
 * @route POST /api/sync/start
 * @desc Start data sync service
 * @access Admin only
 */
router.post('/start', authorize([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const syncService = DataSyncService.getInstance()
    syncService.start()
    
    res.json({
      success: true,
      message: 'Data sync service started'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to start sync service',
      error: error.message
    })
  }
})

/**
 * @route POST /api/sync/stop
 * @desc Stop data sync service
 * @access Admin only
 */
router.post('/stop', authorize([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const syncService = DataSyncService.getInstance()
    syncService.stop()
    
    res.json({
      success: true,
      message: 'Data sync service stopped'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to stop sync service',
      error: error.message
    })
  }
})

/**
 * @route POST /api/sync/event
 * @desc Add sync event manually
 * @access Admin only
 */
router.post('/event', authorize([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { table, operation, recordId, data } = req.body
    
    if (!table || !operation || !recordId) {
      return res.status(400).json({
        success: false,
        message: 'table, operation, and recordId are required'
      })
    }

    const syncService = DataSyncService.getInstance()
    syncService.addSyncEvent({
      table,
      operation,
      recordId,
      data: data || {},
      timestamp: new Date()
    })
    
    res.json({
      success: true,
      message: 'Sync event added successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add sync event',
      error: error.message
    })
  }
})

/**
 * @route DELETE /api/sync/queue
 * @desc Clear sync queue
 * @access Admin only
 */
router.delete('/queue', authorize([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const syncService = DataSyncService.getInstance()
    syncService.clearQueue()
    
    res.json({
      success: true,
      message: 'Sync queue cleared'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear sync queue',
      error: error.message
    })
  }
})

export default router