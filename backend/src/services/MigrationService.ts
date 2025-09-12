import { pool } from '../config/database'
import { mongoModels } from '../models/mongodb'
import { logger } from '../utils/logger'

export interface MigrationResult {
  success: boolean
  recordsProcessed: number
  errors: string[]
  duration: number
}

export class MigrationService {
  /**
   * Migrate patient data from PostgreSQL to MongoDB
   */
  static async migratePatientData(): Promise<MigrationResult> {
    const startTime = Date.now()
    const errors: string[] = []
    let recordsProcessed = 0

    try {
      logger.info('Starting patient data migration...')

      // Get all patients from PostgreSQL
      const patientsResult = await pool.query(`
        SELECT p.*
        FROM patients p
        ORDER BY p.created_at
      `)

      for (const patient of patientsResult.rows) {
        try {
          // Create clinical data entry in MongoDB
          const clinicalData = new mongoModels.ClinicalData({
            patient_id: patient.id,
            data_type: 'vital_signs',
            data: {
              opNumber: patient.op_number,
              firstName: patient.first_name,
              lastName: patient.last_name,
              fullName: `${patient.first_name} ${patient.last_name}`,
              age: patient.age,
              gender: patient.gender,
              phoneNumber: patient.phone_number,
              area: patient.area,
              nextOfKin: patient.next_of_kin,
              nextOfKinPhone: patient.next_of_kin_phone,
              insuranceType: patient.insurance_type,
              insuranceNumber: patient.insurance_number,
              dateOfBirth: patient.date_of_birth
            },
            created_by: 'system_migration',
            metadata: {
              source: 'postgresql_migration',
              migrated_at: new Date(),
              original_id: patient.id
            }
          })

          await clinicalData.save()
          recordsProcessed++

          // Create analytics entry
          const analytics = new mongoModels.Analytics({
            event_type: 'patient_migration',
            data: {
              patientId: patient.id,
              migrationType: 'postgresql_to_mongodb',
              recordType: 'patient_profile'
            },
            timestamp: new Date()
          })

          await analytics.save()

        } catch (error) {
          const errorMsg = `Failed to migrate patient ${patient.id}: ${error.message}`
          errors.push(errorMsg)
          logger.error(errorMsg)
        }
      }

      const duration = Date.now() - startTime
      logger.info(`Patient migration completed: ${recordsProcessed} records, ${errors.length} errors, ${duration}ms`)

      return {
        success: errors.length === 0,
        recordsProcessed,
        errors,
        duration
      }

    } catch (error) {
      logger.error('Migration failed:', error)
      return {
        success: false,
        recordsProcessed,
        errors: [...errors, error.message],
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * Migrate visit data from PostgreSQL to MongoDB
   */
  static async migrateVisitData(): Promise<MigrationResult> {
    const startTime = Date.now()
    const errors: string[] = []
    let recordsProcessed = 0

    try {
      logger.info('Starting visit data migration...')

      // Get all visits from PostgreSQL
      const visitsResult = await pool.query(`
        SELECT v.*, p.first_name, p.last_name
        FROM visits v
        LEFT JOIN patients p ON v.patient_id = p.id
        ORDER BY v.visit_date
      `)

      for (const visit of visitsResult.rows) {
        try {
          // Create clinical data entry for visit
          const clinicalData = new mongoModels.ClinicalData({
            patient_id: visit.patient_id,
            data_type: 'diagnosis',
            data: {
              visitId: visit.id,
              visitDate: visit.visit_date,
              visitType: visit.visit_type,
              chiefComplaint: visit.chief_complaint,
              diagnosis: visit.diagnosis,
              treatment: visit.treatment,
              notes: visit.notes,
              patientName: `${visit.first_name} ${visit.last_name}`,
              doctorId: visit.doctor_id
            },
            created_by: 'system_migration',
            metadata: {
              source: 'postgresql_migration',
              migrated_at: new Date(),
              original_id: visit.id
            }
          })

          await clinicalData.save()
          recordsProcessed++

          // Create analytics entry
          const analytics = new mongoModels.Analytics({
            event_type: 'visit_migration',
            data: {
              visitId: visit.id,
              patientId: visit.patient_id,
              migrationType: 'postgresql_to_mongodb',
              recordType: 'visit_record'
            },
            timestamp: new Date()
          })

          await analytics.save()

        } catch (error) {
          const errorMsg = `Failed to migrate visit ${visit.id}: ${error.message}`
          errors.push(errorMsg)
          logger.error(errorMsg)
        }
      }

      const duration = Date.now() - startTime
      logger.info(`Visit migration completed: ${recordsProcessed} records, ${errors.length} errors, ${duration}ms`)

      return {
        success: errors.length === 0,
        recordsProcessed,
        errors,
        duration
      }

    } catch (error) {
      logger.error('Visit migration failed:', error)
      return {
        success: false,
        recordsProcessed,
        errors: [...errors, error.message],
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * Get migration status and statistics
   */
  static async getMigrationStatus(): Promise<{
    postgresql: { patients: number; visits: number }
    mongodb: { clinicalData: number; analytics: number }
    lastMigration?: Date
  }> {
    try {
      // Get PostgreSQL counts
      const patientsResult = await pool.query('SELECT COUNT(*) as count FROM patients')
      const visitsResult = await pool.query('SELECT COUNT(*) as count FROM visits')

      // Get MongoDB counts
      const clinicalDataCount = await mongoModels.ClinicalData.countDocuments()
      const analyticsCount = await mongoModels.Analytics.countDocuments()

      // Get last migration date
      const lastMigration = await mongoModels.Analytics
        .findOne({ 'data.migrationType': 'postgresql_to_mongodb' })
        .sort({ timestamp: -1 })
        .select('timestamp')

      return {
        postgresql: {
          patients: parseInt(patientsResult.rows[0].count),
          visits: parseInt(visitsResult.rows[0].count)
        },
        mongodb: {
          clinicalData: clinicalDataCount,
          analytics: analyticsCount
        },
        lastMigration: lastMigration?.timestamp
      }

    } catch (error) {
      logger.error('Failed to get migration status:', error)
      throw error
    }
  }

  /**
   * Clean up migration data
   */
  static async cleanupMigrationData(): Promise<{ success: boolean; recordsDeleted: number }> {
    try {
      logger.info('Cleaning up migration data...')

      // Delete all migration-related data
      const clinicalDataResult = await mongoModels.ClinicalData.deleteMany({
        'metadata.source': 'postgresql_migration'
      })

      const analyticsResult = await mongoModels.Analytics.deleteMany({
        'data.migrationType': 'postgresql_to_mongodb'
      })

      const recordsDeleted = clinicalDataResult.deletedCount + analyticsResult.deletedCount

      logger.info(`Migration cleanup completed: ${recordsDeleted} records deleted`)

      return {
        success: true,
        recordsDeleted
      }

    } catch (error) {
      logger.error('Migration cleanup failed:', error)
      return {
        success: false,
        recordsDeleted: 0
      }
    }
  }
}
