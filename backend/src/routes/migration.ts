import { Router, Request, Response } from 'express'
import { MigrationService } from '../services/MigrationService'
import { authorize } from '../middleware/auth'
import { UserRole } from '../types'

const router = Router()

/**
 * @route GET /api/migration/status
 * @desc Get migration status and statistics
 * @access Admin only
 */
router.get('/status', authorize([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const status = await MigrationService.getMigrationStatus()
    res.json({
      success: true,
      data: status
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get migration status',
      error: error.message
    })
  }
})

/**
 * @route POST /api/migration/patients
 * @desc Migrate patient data from PostgreSQL to MongoDB
 * @access Admin only
 */
router.post('/patients', authorize([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const result = await MigrationService.migratePatientData()
    
    res.json({
      success: result.success,
      message: result.success 
        ? `Successfully migrated ${result.recordsProcessed} patient records`
        : `Migration completed with ${result.errors.length} errors`,
      data: {
        recordsProcessed: result.recordsProcessed,
        errors: result.errors,
        duration: result.duration
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Patient migration failed',
      error: error.message
    })
  }
})

/**
 * @route POST /api/migration/visits
 * @desc Migrate visit data from PostgreSQL to MongoDB
 * @access Admin only
 */
router.post('/visits', authorize([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const result = await MigrationService.migrateVisitData()
    
    res.json({
      success: result.success,
      message: result.success 
        ? `Successfully migrated ${result.recordsProcessed} visit records`
        : `Migration completed with ${result.errors.length} errors`,
      data: {
        recordsProcessed: result.recordsProcessed,
        errors: result.errors,
        duration: result.duration
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Visit migration failed',
      error: error.message
    })
  }
})

/**
 * @route POST /api/migration/cleanup
 * @desc Clean up migration data from MongoDB
 * @access Admin only
 */
router.post('/cleanup', authorize([UserRole.ADMIN]), async (req: Request, res: Response) => {
  try {
    const result = await MigrationService.cleanupMigrationData()
    
    res.json({
      success: result.success,
      message: result.success 
        ? `Successfully cleaned up ${result.recordsDeleted} migration records`
        : 'Cleanup failed',
      data: {
        recordsDeleted: result.recordsDeleted
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Migration cleanup failed',
      error: error.message
    })
  }
})

export default router
