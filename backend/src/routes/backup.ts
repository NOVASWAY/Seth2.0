import { Router, Request, Response } from 'express'
import { BackupService } from '../services/BackupService'
import { authorize } from '../middleware/auth'
import { UserRole } from '../types'

const router = Router()

/**
 * @route POST /api/backup/full
 * @desc Create full backup of both databases
 * @access Admin only
 */
router.post('/full', authorize([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const backupService = BackupService.getInstance()
    const result = await backupService.createFullBackup()
    
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
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Full backup failed',
      error: error.message
    })
  }
})

/**
 * @route POST /api/backup/incremental
 * @desc Create incremental backup
 * @access Admin only
 */
router.post('/incremental', authorize([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { lastBackupTime } = req.body
    
    if (!lastBackupTime) {
      return res.status(400).json({
        success: false,
        message: 'lastBackupTime is required'
      })
    }

    const backupService = BackupService.getInstance()
    const result = await backupService.createIncrementalBackup(new Date(lastBackupTime))
    
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
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Incremental backup failed',
      error: error.message
    })
  }
})

/**
 * @route GET /api/backup/list
 * @desc List available backups
 * @access Admin only
 */
router.get('/list', authorize([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const backupService = BackupService.getInstance()
    const backups = await backupService.listBackups()
    
    res.json({
      success: true,
      data: backups
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to list backups',
      error: error.message
    })
  }
})

/**
 * @route GET /api/backup/status
 * @desc Get backup service status
 * @access Admin only
 */
router.get('/status', authorize([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const backupService = BackupService.getInstance()
    const status = backupService.getStatus()
    
    res.json({
      success: true,
      data: status
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get backup status',
      error: error.message
    })
  }
})

export default router
