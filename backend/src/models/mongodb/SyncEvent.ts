import mongoose, { Document, Schema } from 'mongoose'

export interface ISyncEvent extends Document {
  event_type: string
  entity_type?: string
  entity_id?: string
  action: 'create' | 'update' | 'delete'
  user_id?: string
  data: Record<string, any>
  timestamp: Date
  metadata?: {
    source?: string
    version?: string
    [key: string]: any
  }
}

const SyncEventSchema = new Schema<ISyncEvent>({
  event_type: {
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
  action: {
    type: String,
    required: true,
    enum: ['create', 'update', 'delete'],
    index: true
  },
  user_id: {
    type: String,
    index: true
  },
  data: {
    type: Schema.Types.Mixed,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  collection: 'sync_events'
})

// Compound indexes for better query performance
SyncEventSchema.index({ event_type: 1, timestamp: -1 })
SyncEventSchema.index({ entity_type: 1, entity_id: 1 })
SyncEventSchema.index({ user_id: 1, timestamp: -1 })
SyncEventSchema.index({ action: 1, timestamp: -1 })

export const SyncEvent = mongoose.model<ISyncEvent>('SyncEvent', SyncEventSchema)
export default SyncEvent
