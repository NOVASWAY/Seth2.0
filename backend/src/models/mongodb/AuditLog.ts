import mongoose, { Document, Schema } from 'mongoose'

export interface IAuditLog extends Document {
  action: string
  user_id: string
  entity_type?: string
  entity_id?: string
  changes?: Record<string, any>
  timestamp: Date
  ip_address?: string
  user_agent?: string
  metadata?: {
    reason?: string
    source?: string
    [key: string]: any
  }
}

const AuditLogSchema = new Schema<IAuditLog>({
  action: {
    type: String,
    required: true,
    index: true
  },
  user_id: {
    type: String,
    required: true,
    index: true
  },
  entity_type: {
    type: String,
    index: true
  },
  entity_id: {
    type: String,
    index: true
  },
  changes: {
    type: Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  ip_address: {
    type: String
  },
  user_agent: {
    type: String
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  collection: 'audit_logs'
})

// Compound indexes for better query performance
AuditLogSchema.index({ user_id: 1, timestamp: -1 })
AuditLogSchema.index({ action: 1, timestamp: -1 })
AuditLogSchema.index({ entity_type: 1, entity_id: 1 })
AuditLogSchema.index({ timestamp: -1 })

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema)
export default AuditLog
