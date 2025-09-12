"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationService = void 0;
const database_1 = require("../config/database");
const mongodb_1 = require("../models/mongodb");
const logger_1 = require("../utils/logger");
class MigrationService {
    /**
     * Migrate patient data from PostgreSQL to MongoDB
     */
    static async migratePatientData() {
        const startTime = Date.now();
        const errors = [];
        let recordsProcessed = 0;
        try {
            logger_1.logger.info('Starting patient data migration...');
            // Get all patients from PostgreSQL
            const patientsResult = await database_1.pool.query(`
        SELECT p.*
        FROM patients p
        ORDER BY p.created_at
      `);
            for (const patient of patientsResult.rows) {
                try {
                    // Create clinical data entry in MongoDB
                    const clinicalData = new mongodb_1.mongoModels.ClinicalData({
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
                    });
                    await clinicalData.save();
                    recordsProcessed++;
                    // Create analytics entry
                    const analytics = new mongodb_1.mongoModels.Analytics({
                        event_type: 'patient_migration',
                        data: {
                            patientId: patient.id,
                            migrationType: 'postgresql_to_mongodb',
                            recordType: 'patient_profile'
                        },
                        timestamp: new Date()
                    });
                    await analytics.save();
                }
                catch (error) {
                    const errorMsg = `Failed to migrate patient ${patient.id}: ${error.message}`;
                    errors.push(errorMsg);
                    logger_1.logger.error(errorMsg);
                }
            }
            const duration = Date.now() - startTime;
            logger_1.logger.info(`Patient migration completed: ${recordsProcessed} records, ${errors.length} errors, ${duration}ms`);
            return {
                success: errors.length === 0,
                recordsProcessed,
                errors,
                duration
            };
        }
        catch (error) {
            logger_1.logger.error('Migration failed:', error);
            return {
                success: false,
                recordsProcessed,
                errors: [...errors, error.message],
                duration: Date.now() - startTime
            };
        }
    }
    /**
     * Migrate visit data from PostgreSQL to MongoDB
     */
    static async migrateVisitData() {
        const startTime = Date.now();
        const errors = [];
        let recordsProcessed = 0;
        try {
            logger_1.logger.info('Starting visit data migration...');
            // Get all visits from PostgreSQL
            const visitsResult = await database_1.pool.query(`
        SELECT v.*, p.first_name, p.last_name
        FROM visits v
        LEFT JOIN patients p ON v.patient_id = p.id
        ORDER BY v.visit_date
      `);
            for (const visit of visitsResult.rows) {
                try {
                    // Create clinical data entry for visit
                    const clinicalData = new mongodb_1.mongoModels.ClinicalData({
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
                    });
                    await clinicalData.save();
                    recordsProcessed++;
                    // Create analytics entry
                    const analytics = new mongodb_1.mongoModels.Analytics({
                        event_type: 'visit_migration',
                        data: {
                            visitId: visit.id,
                            patientId: visit.patient_id,
                            migrationType: 'postgresql_to_mongodb',
                            recordType: 'visit_record'
                        },
                        timestamp: new Date()
                    });
                    await analytics.save();
                }
                catch (error) {
                    const errorMsg = `Failed to migrate visit ${visit.id}: ${error.message}`;
                    errors.push(errorMsg);
                    logger_1.logger.error(errorMsg);
                }
            }
            const duration = Date.now() - startTime;
            logger_1.logger.info(`Visit migration completed: ${recordsProcessed} records, ${errors.length} errors, ${duration}ms`);
            return {
                success: errors.length === 0,
                recordsProcessed,
                errors,
                duration
            };
        }
        catch (error) {
            logger_1.logger.error('Visit migration failed:', error);
            return {
                success: false,
                recordsProcessed,
                errors: [...errors, error.message],
                duration: Date.now() - startTime
            };
        }
    }
    /**
     * Get migration status and statistics
     */
    static async getMigrationStatus() {
        try {
            // Get PostgreSQL counts
            const patientsResult = await database_1.pool.query('SELECT COUNT(*) as count FROM patients');
            const visitsResult = await database_1.pool.query('SELECT COUNT(*) as count FROM visits');
            // Get MongoDB counts
            const clinicalDataCount = await mongodb_1.mongoModels.ClinicalData.countDocuments();
            const analyticsCount = await mongodb_1.mongoModels.Analytics.countDocuments();
            // Get last migration date
            const lastMigration = await mongodb_1.mongoModels.Analytics
                .findOne({ 'data.migrationType': 'postgresql_to_mongodb' })
                .sort({ timestamp: -1 })
                .select('timestamp');
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
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get migration status:', error);
            throw error;
        }
    }
    /**
     * Clean up migration data
     */
    static async cleanupMigrationData() {
        try {
            logger_1.logger.info('Cleaning up migration data...');
            // Delete all migration-related data
            const clinicalDataResult = await mongodb_1.mongoModels.ClinicalData.deleteMany({
                'metadata.source': 'postgresql_migration'
            });
            const analyticsResult = await mongodb_1.mongoModels.Analytics.deleteMany({
                'data.migrationType': 'postgresql_to_mongodb'
            });
            const recordsDeleted = clinicalDataResult.deletedCount + analyticsResult.deletedCount;
            logger_1.logger.info(`Migration cleanup completed: ${recordsDeleted} records deleted`);
            return {
                success: true,
                recordsDeleted
            };
        }
        catch (error) {
            logger_1.logger.error('Migration cleanup failed:', error);
            return {
                success: false,
                recordsDeleted: 0
            };
        }
    }
}
exports.MigrationService = MigrationService;
