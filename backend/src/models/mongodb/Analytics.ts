import mongoose, { Document, Schema } from 'mongoose'

export interface IAnalytics extends Document {
  event_type: string
  user_id?: string
  data: Record<string, any>
  timestamp: Date
  session_id?: string
  ip_address?: string
  user_agent?: string
  metadata?: {
    page?: string
    action?: string
    duration?: number
    [key: string]: any
  }
}

const AnalyticsSchema = new Schema<IAnalytics>({
  event_type: {
    type: String,
    required: true,
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
  session_id: {
    type: String,
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
  collection: 'analytics'
})

// Compound indexes for better query performance
AnalyticsSchema.index({ event_type: 1, timestamp: -1 })
AnalyticsSchema.index({ user_id: 1, timestamp: -1 })
AnalyticsSchema.index({ session_id: 1, timestamp: -1 })

export const Analytics = mongoose.model<IAnalytics>('Analytics', AnalyticsSchema)
export default Analytics
