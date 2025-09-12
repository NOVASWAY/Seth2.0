"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataSyncService = void 0;
const database_1 = require("../config/database");
const mongodb_1 = require("../models/mongodb");
const logger_1 = require("../utils/logger");
class DataSyncService {
    constructor() {
        this.syncQueue = [];
        this.isProcessing = false;
        this.syncInterval = null;
    }
    static getInstance() {
        if (!DataSyncService.instance) {
            DataSyncService.instance = new DataSyncService();
        }
        return DataSyncService.instance;
    }
    /**
     * Start the sync service
     */
    start() {
        if (this.syncInterval) {
            logger_1.logger.warn('Sync service already running');
            return;
        }
        // Process sync queue every 5 seconds
        this.syncInterval = setInterval(() => {
            this.processSyncQueue();
        }, 5000);
        logger_1.logger.info('Data sync service started');
    }
    /**
     * Stop the sync service
     */
    stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        logger_1.logger.info('Data sync service stopped');
    }
    /**
     * Add event to sync queue
     */
    addSyncEvent(event) {
        this.syncQueue.push(event);
        logger_1.logger.debug('Sync event added to queue', { event });
    }
    /**
     * Process sync queue
     */
    async processSyncQueue() {
        if (this.isProcessing || this.syncQueue.length === 0) {
            return;
        }
        this.isProcessing = true;
        const events = [...this.syncQueue];
        this.syncQueue = [];
        try {
            for (const event of events) {
                await this.processSyncEvent(event);
            }
        }
        catch (error) {
            logger_1.logger.error('Error processing sync queue:', error);
            // Re-add failed events to queue
            this.syncQueue.unshift(...events);
        }
        finally {
            this.isProcessing = false;
        }
    }
    /**
     * Process individual sync event
     */
    async processSyncEvent(event) {
        try {
            switch (event.table) {
                case 'patients':
                    await this.syncPatientData(event);
                    break;
                case 'visits':
                    await this.syncVisitData(event);
                    break;
                case 'prescriptions':
                    await this.syncPrescriptionData(event);
                    break;
                case 'invoices':
                    await this.syncInvoiceData(event);
                    break;
                default:
                    logger_1.logger.warn('Unknown table for sync:', event.table);
            }
            // Notify WebSocket clients about the sync
            await this.notifySyncEvent(event);
        }
        catch (error) {
            logger_1.logger.error(`Failed to sync ${event.table} event:`, error);
            throw error;
        }
    }
    /**
     * Sync patient data to MongoDB
     */
    async syncPatientData(event) {
        const { operation, recordId, data } = event;
        switch (operation) {
            case 'INSERT':
            case 'UPDATE':
                // Upsert patient data
                await mongodb_1.mongoModels.ClinicalData.findOneAndUpdate({
                    patient_id: recordId,
                    'metadata.source': 'postgresql_sync'
                }, {
                    patient_id: recordId,
                    data_type: 'vital_signs',
                    data: {
                        opNumber: data.op_number,
                        firstName: data.first_name,
                        lastName: data.last_name,
                        fullName: `${data.first_name} ${data.last_name}`,
                        age: data.age,
                        gender: data.gender,
                        phoneNumber: data.phone_number,
                        area: data.area,
                        nextOfKin: data.next_of_kin,
                        nextOfKinPhone: data.next_of_kin_phone,
                        insuranceType: data.insurance_type,
                        insuranceNumber: data.insurance_number,
                        dateOfBirth: data.date_of_birth
                    },
                    created_by: 'system_sync',
                    metadata: {
                        source: 'postgresql_sync',
                        synced_at: new Date(),
                        original_id: recordId,
                        operation: operation
                    }
                }, { upsert: true, new: true });
                break;
            case 'DELETE':
                // Remove patient data
                await mongodb_1.mongoModels.ClinicalData.deleteMany({
                    patient_id: recordId,
                    'metadata.source': 'postgresql_sync'
                });
                break;
        }
        logger_1.logger.info(`Patient ${operation} synced to MongoDB`, { recordId });
    }
    /**
     * Sync visit data to MongoDB
     */
    async syncVisitData(event) {
        const { operation, recordId, data } = event;
        switch (operation) {
            case 'INSERT':
            case 'UPDATE':
                // Get patient name
                const patientResult = await database_1.pool.query('SELECT first_name, last_name FROM patients WHERE id = $1', [data.patient_id]);
                const patient = patientResult.rows[0];
                await mongodb_1.mongoModels.ClinicalData.findOneAndUpdate({
                    patient_id: data.patient_id,
                    'data.visitId': recordId,
                    'metadata.source': 'postgresql_sync'
                }, {
                    patient_id: data.patient_id,
                    data_type: 'diagnosis',
                    data: {
                        visitId: recordId,
                        visitDate: data.visit_date,
                        visitType: data.visit_type,
                        chiefComplaint: data.chief_complaint,
                        diagnosis: data.diagnosis,
                        treatment: data.treatment,
                        notes: data.notes,
                        patientName: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown',
                        doctorId: data.doctor_id
                    },
                    created_by: 'system_sync',
                    metadata: {
                        source: 'postgresql_sync',
                        synced_at: new Date(),
                        original_id: recordId,
                        operation: operation
                    }
                }, { upsert: true, new: true });
                break;
            case 'DELETE':
                await mongodb_1.mongoModels.ClinicalData.deleteMany({
                    'data.visitId': recordId,
                    'metadata.source': 'postgresql_sync'
                });
                break;
        }
        logger_1.logger.info(`Visit ${operation} synced to MongoDB`, { recordId });
    }
    /**
     * Sync prescription data to MongoDB
     */
    async syncPrescriptionData(event) {
        const { operation, recordId, data } = event;
        // Track prescription events in analytics
        await mongodb_1.mongoModels.Analytics.create({
            event_type: 'prescription_sync',
            data: {
                prescriptionId: recordId,
                patientId: data.patient_id,
                operation: operation,
                medication: data.medication_name,
                dosage: data.dosage,
                quantity: data.quantity
            },
            timestamp: new Date()
        });
        logger_1.logger.info(`Prescription ${operation} tracked in analytics`, { recordId });
    }
    /**
     * Sync invoice data to MongoDB
     */
    async syncInvoiceData(event) {
        const { operation, recordId, data } = event;
        // Track financial events in analytics
        await mongodb_1.mongoModels.Analytics.create({
            event_type: 'invoice_sync',
            data: {
                invoiceId: recordId,
                patientId: data.patient_id,
                operation: operation,
                amount: data.total_amount,
                status: data.status,
                paymentMethod: data.payment_method
            },
            timestamp: new Date()
        });
        logger_1.logger.info(`Invoice ${operation} tracked in analytics`, { recordId });
    }
    /**
     * Notify WebSocket clients about sync events
     */
    async notifySyncEvent(event) {
        try {
            // WebSocket notification would go here
            // const webSocketService = WebSocketService.getInstance()
            // await webSocketService.broadcastSyncEvent({...})
            logger_1.logger.debug('Sync event notification (WebSocket disabled)', { event });
        }
        catch (error) {
            logger_1.logger.error('Failed to notify sync event:', error);
        }
    }
    /**
     * Get sync service status
     */
    getStatus() {
        return {
            running: this.syncInterval !== null,
            queueLength: this.syncQueue.length,
            isProcessing: this.isProcessing
        };
    }
    /**
     * Clear sync queue
     */
    clearQueue() {
        this.syncQueue = [];
        logger_1.logger.info('Sync queue cleared');
    }
}
exports.DataSyncService = DataSyncService;
