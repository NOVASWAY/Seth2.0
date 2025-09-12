import mongoose, { Document, Schema } from 'mongoose'

export interface IDocumentMetadata extends Document {
  filename: string
  file_type: string
  file_size: number
  file_path: string
  patient_id?: string
  visit_id?: string
  created_at: Date
  created_by: string
  tags: string[]
  metadata?: {
    original_name?: string
    mime_type?: string
    checksum?: string
    dimensions?: {
      width?: number
      height?: number
    }
    [key: string]: any
  }
}

const DocumentMetadataSchema = new Schema<IDocumentMetadata>({
  filename: {
    type: String,
    required: true
  },
  file_type: {
    type: String,
    required: true,
    index: true
  },
  file_size: {
    type: Number,
    required: true
  },
  file_path: {
    type: String,
    required: true,
    unique: true
  },
  patient_id: {
    type: String,
    index: true
  },
  visit_id: {
    type: String,
    index: true
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  created_by: {
    type: String,
    required: true,
    index: true
  },
  tags: {
    type: [String],
    default: [],
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  collection: 'document_metadata'
})

// Compound indexes for better query performance
DocumentMetadataSchema.index({ patient_id: 1, created_at: -1 })
DocumentMetadataSchema.index({ visit_id: 1, created_at: -1 })
DocumentMetadataSchema.index({ file_type: 1, created_at: -1 })
DocumentMetadataSchema.index({ tags: 1 })

export const DocumentMetadata = mongoose.model<IDocumentMetadata>('DocumentMetadata', DocumentMetadataSchema)
export default DocumentMetadata
