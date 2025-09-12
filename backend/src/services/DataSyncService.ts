import { pool } from '../config/database'
import { mongoModels } from '../models/mongodb'
import { logger } from '../utils/logger'
// import { WebSocketService } from './WebSocketService'

export interface SyncEvent {
  table: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  recordId: string
  data: any
  timestamp: Date
}

export class DataSyncService {
  private static instance: DataSyncService
  private syncQueue: SyncEvent[] = []
  private isProcessing = false
  private syncInterval: NodeJS.Timeout | null = null

  private constructor() {}

  public static getInstance(): DataSyncService {
    if (!DataSyncService.instance) {
      DataSyncService.instance = new DataSyncService()
    }
    return DataSyncService.instance
  }

  /**
   * Start the sync service
   */
  public start(): void {
    if (this.syncInterval) {
      logger.warn('Sync service already running')
      return
    }

    // Process sync queue every 5 seconds
    this.syncInterval = setInterval(() => {
      this.processSyncQueue()
    }, 5000)

    logger.info('Data sync service started')
  }

  /**
   * Stop the sync service
   */
  public stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
    logger.info('Data sync service stopped')
  }

  /**
   * Add event to sync queue
   */
  public addSyncEvent(event: SyncEvent): void {
    this.syncQueue.push(event)
    logger.debug('Sync event added to queue', { event })
  }

  /**
   * Process sync queue
   */
  private async processSyncQueue(): Promise<void> {
    if (this.isProcessing || this.syncQueue.length === 0) {
      return
    }

    this.isProcessing = true
    const events = [...this.syncQueue]
    this.syncQueue = []

    try {
      for (const event of events) {
        await this.processSyncEvent(event)
      }
    } catch (error) {
      logger.error('Error processing sync queue:', error)
      // Re-add failed events to queue
      this.syncQueue.unshift(...events)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Process individual sync event
   */
  private async processSyncEvent(event: SyncEvent): Promise<void> {
    try {
      switch (event.table) {
        case 'patients':
          await this.syncPatientData(event)
          break
        case 'visits':
          await this.syncVisitData(event)
          break
        case 'prescriptions':
          await this.syncPrescriptionData(event)
          break
        case 'invoices':
          await this.syncInvoiceData(event)
          break
        default:
          logger.warn('Unknown table for sync:', event.table)
      }

      // Notify WebSocket clients about the sync
      await this.notifySyncEvent(event)

    } catch (error) {
      logger.error(`Failed to sync ${event.table} event:`, error)
      throw error
    }
  }

  /**
   * Sync patient data to MongoDB
   */
  private async syncPatientData(event: SyncEvent): Promise<void> {
    const { operation, recordId, data } = event

    switch (operation) {
      case 'INSERT':
      case 'UPDATE':
        // Upsert patient data
        await mongoModels.ClinicalData.findOneAndUpdate(
          { 
            patient_id: recordId,
            'metadata.source': 'postgresql_sync'
          },
          {
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
          },
          { upsert: true, new: true }
        )
        break

      case 'DELETE':
        // Remove patient data
        await mongoModels.ClinicalData.deleteMany({
          patient_id: recordId,
          'metadata.source': 'postgresql_sync'
        })
        break
    }

    logger.info(`Patient ${operation} synced to MongoDB`, { recordId })
  }

  /**
   * Sync visit data to MongoDB
   */
  private async syncVisitData(event: SyncEvent): Promise<void> {
    const { operation, recordId, data } = event

    switch (operation) {
      case 'INSERT':
      case 'UPDATE':
        // Get patient name
        const patientResult = await pool.query(
          'SELECT first_name, last_name FROM patients WHERE id = $1',
          [data.patient_id]
        )
        const patient = patientResult.rows[0]

        await mongoModels.ClinicalData.findOneAndUpdate(
          { 
            patient_id: data.patient_id,
            'data.visitId': recordId,
            'metadata.source': 'postgresql_sync'
          },
          {
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
          },
          { upsert: true, new: true }
        )
        break

      case 'DELETE':
        await mongoModels.ClinicalData.deleteMany({
          'data.visitId': recordId,
          'metadata.source': 'postgresql_sync'
        })
        break
    }

    logger.info(`Visit ${operation} synced to MongoDB`, { recordId })
  }

  /**
   * Sync prescription data to MongoDB
   */
  private async syncPrescriptionData(event: SyncEvent): Promise<void> {
    const { operation, recordId, data } = event

    // Track prescription events in analytics
    await mongoModels.Analytics.create({
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
    })

    logger.info(`Prescription ${operation} tracked in analytics`, { recordId })
  }

  /**
   * Sync invoice data to MongoDB
   */
  private async syncInvoiceData(event: SyncEvent): Promise<void> {
    const { operation, recordId, data } = event

    // Track financial events in analytics
    await mongoModels.Analytics.create({
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
    })

    logger.info(`Invoice ${operation} tracked in analytics`, { recordId })
  }

  /**
   * Notify WebSocket clients about sync events
   */
  private async notifySyncEvent(event: SyncEvent): Promise<void> {
    try {
      // WebSocket notification would go here
      // const webSocketService = WebSocketService.getInstance()
      // await webSocketService.broadcastSyncEvent({...})
      logger.debug('Sync event notification (WebSocket disabled)', { event })
    } catch (error) {
      logger.error('Failed to notify sync event:', error)
    }
  }

  /**
   * Get sync service status
   */
  public getStatus(): {
    running: boolean
    queueLength: number
    isProcessing: boolean
  } {
    return {
      running: this.syncInterval !== null,
      queueLength: this.syncQueue.length,
      isProcessing: this.isProcessing
    }
  }

  /**
   * Clear sync queue
   */
  public clearQueue(): void {
    this.syncQueue = []
    logger.info('Sync queue cleared')
  }
}
