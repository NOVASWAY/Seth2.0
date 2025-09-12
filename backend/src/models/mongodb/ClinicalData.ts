import mongoose, { Document, Schema } from 'mongoose'

export interface IClinicalData extends Document {
  patient_id: string
  data_type: 'lab_result' | 'imaging' | 'vital_signs' | 'symptoms' | 'diagnosis' | 'treatment_plan'
  data: Record<string, any>
  metadata?: {
    source?: string
    device?: string
    location?: string
    notes?: string
    [key: string]: any
  }
  created_at: Date
  updated_at: Date
  created_by: string
}

const ClinicalDataSchema = new Schema<IClinicalData>({
  patient_id: {
    type: String,
    required: true,
    index: true
  },
  data_type: {
    type: String,
    required: true,
    enum: ['lab_result', 'imaging', 'vital_signs', 'symptoms', 'diagnosis', 'treatment_plan'],
    index: true
  },
  data: {
    type: Schema.Types.Mixed,
    required: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  created_by: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'clinical_data'
})

// Compound indexes for better query performance
ClinicalDataSchema.index({ patient_id: 1, data_type: 1 })
ClinicalDataSchema.index({ patient_id: 1, created_at: -1 })
ClinicalDataSchema.index({ data_type: 1, created_at: -1 })

// Pre-save middleware to update updated_at
ClinicalDataSchema.pre('save', function(next) {
  this.updated_at = new Date()
  next()
})

export const ClinicalData = mongoose.model<IClinicalData>('ClinicalData', ClinicalDataSchema)
export default ClinicalData
