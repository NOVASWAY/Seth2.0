// MongoDB Models Export
export { ClinicalData, type IClinicalData } from './ClinicalData'
export { Analytics, type IAnalytics } from './Analytics'
export { AuditLog, type IAuditLog } from './AuditLog'
export { DocumentMetadata, type IDocumentMetadata } from './DocumentMetadata'
export { SyncEvent, type ISyncEvent } from './SyncEvent'

// Re-export all models for convenience
import { ClinicalData } from './ClinicalData'
import { Analytics } from './Analytics'
import { AuditLog } from './AuditLog'
import { DocumentMetadata } from './DocumentMetadata'
import { SyncEvent } from './SyncEvent'

export const mongoModels = {
  ClinicalData,
  Analytics,
  AuditLog,
  DocumentMetadata,
  SyncEvent
}

export default mongoModels
