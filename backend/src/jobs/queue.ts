import Queue from "bull"
import Redis from "ioredis"

// Redis connection
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379")

// Job queues
export const claimsQueue = new Queue("claims processing", {
  redis: {
    port: 6379,
    host: process.env.REDIS_HOST || "localhost",
    password: process.env.REDIS_PASSWORD,
  },
})

export const inventoryQueue = new Queue("inventory alerts", {
  redis: {
    port: 6379,
    host: process.env.REDIS_HOST || "localhost",
    password: process.env.REDIS_PASSWORD,
  },
})

export const notificationQueue = new Queue("notifications", {
  redis: {
    port: 6379,
    host: process.env.REDIS_HOST || "localhost",
    password: process.env.REDIS_PASSWORD,
  },
})

export const backupQueue = new Queue("database backup", {
  redis: {
    port: 6379,
    host: process.env.REDIS_HOST || "localhost",
    password: process.env.REDIS_PASSWORD,
  },
})

// Job types
export interface ClaimSubmissionJob {
  type: "submit_single_claim" | "submit_claim_batch" | "reconcile_claims"
  claimId?: string
  batchId?: string
}

export interface InventoryAlertJob {
  type: "check_low_stock" | "check_expiring_items" | "generate_reorder_report"
}

export interface NotificationJob {
  type: "send_sms" | "send_email" | "send_overdue_reminder"
  recipient: string
  message: string
  metadata?: any
}

export interface BackupJob {
  type: "database_backup" | "file_backup"
  destination?: string
}
