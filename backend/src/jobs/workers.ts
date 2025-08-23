import { claimsQueue, inventoryQueue, notificationQueue, backupQueue } from "./queue"
import type { ClaimSubmissionJob, NotificationJob } from "./queue"
import { SHAService } from "../services/SHAService"
import { pool } from "../config/database"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)
const shaService = new SHAService()

// Claims processing worker
claimsQueue.process("submit_single_claim", async (job) => {
  const { claimId } = job.data as ClaimSubmissionJob

  try {
    // Get claim data
    const claimResult = await pool.query("SELECT * FROM claims WHERE id = $1", [claimId])
    if (claimResult.rows.length === 0) {
      throw new Error("Claim not found")
    }

    const claim = claimResult.rows[0]

    // Get claim items
    const itemsResult = await pool.query("SELECT * FROM claim_items WHERE claim_id = $1", [claimId])

    // Submit to SHA
    const result = await shaService.submitSingleClaim(claim, itemsResult.rows)

    if (!result.success) {
      throw new Error(`SHA submission failed: ${result.error}`)
    }

    return { success: true, shaReference: result.data?.reference }
  } catch (error) {
    console.error("Error processing claim submission:", error)
    throw error
  }
})

claimsQueue.process("submit_claim_batch", async (job) => {
  const { batchId } = job.data as ClaimSubmissionJob

  try {
    // Get batch data
    const batchResult = await pool.query("SELECT * FROM claim_batches WHERE id = $1", [batchId])
    if (batchResult.rows.length === 0) {
      throw new Error("Batch not found")
    }

    const batch = batchResult.rows[0]

    // Get claims in batch
    const claimsResult = await pool.query("SELECT * FROM claims WHERE batch_id = $1", [batchId])

    // Submit batch to SHA
    const result = await shaService.submitClaimBatch(batch, claimsResult.rows)

    if (!result.success) {
      throw new Error(`SHA batch submission failed: ${result.error}`)
    }

    return { success: true, shaBatchReference: result.data?.batch_reference }
  } catch (error) {
    console.error("Error processing batch submission:", error)
    throw error
  }
})

claimsQueue.process("reconcile_claims", async (job) => {
  try {
    await shaService.reconcileClaims()
    return { success: true, message: "Claims reconciliation completed" }
  } catch (error) {
    console.error("Error reconciling claims:", error)
    throw error
  }
})

// Inventory alerts worker
inventoryQueue.process("check_low_stock", async (job) => {
  try {
    const result = await pool.query(`
      SELECT ii.*, SUM(ib.quantity) as current_stock
      FROM inventory_items ii
      LEFT JOIN inventory_batches ib ON ii.id = ib.item_id AND ib.expiry_date > NOW()
      GROUP BY ii.id
      HAVING SUM(ib.quantity) <= ii.reorder_level OR SUM(ib.quantity) IS NULL
    `)

    const lowStockItems = result.rows

    if (lowStockItems.length > 0) {
      // Create notification job for each low stock item
      for (const item of lowStockItems) {
        await notificationQueue.add("send_email", {
          type: "send_email",
          recipient: process.env.ADMIN_EMAIL || "admin@sethclinic.com",
          message: `Low stock alert: ${item.name} (Current: ${item.current_stock || 0}, Reorder Level: ${item.reorder_level})`,
          metadata: { item_id: item.id, alert_type: "low_stock" },
        })
      }
    }

    return { success: true, lowStockCount: lowStockItems.length }
  } catch (error) {
    console.error("Error checking low stock:", error)
    throw error
  }
})

inventoryQueue.process("check_expiring_items", async (job) => {
  try {
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const result = await pool.query(
      `
      SELECT ib.*, ii.name
      FROM inventory_batches ib
      JOIN inventory_items ii ON ib.item_id = ii.id
      WHERE ib.expiry_date <= $1 AND ib.expiry_date > NOW() AND ib.quantity > 0
      ORDER BY ib.expiry_date ASC
    `,
      [thirtyDaysFromNow],
    )

    const expiringItems = result.rows

    if (expiringItems.length > 0) {
      // Create notification for expiring items
      await notificationQueue.add("send_email", {
        type: "send_email",
        recipient: process.env.ADMIN_EMAIL || "admin@sethclinic.com",
        message: `${expiringItems.length} items expiring within 30 days`,
        metadata: { alert_type: "expiring_items", items: expiringItems },
      })
    }

    return { success: true, expiringCount: expiringItems.length }
  } catch (error) {
    console.error("Error checking expiring items:", error)
    throw error
  }
})

// Notification worker
notificationQueue.process("send_email", async (job) => {
  const { recipient, message, metadata } = job.data as NotificationJob

  try {
    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`[EMAIL] To: ${recipient}, Message: ${message}`)

    // Log notification
    await pool.query(
      `
      INSERT INTO audit_logs (
        id, action, target_type, details, created_at
      ) VALUES ($1, $2, $3, $4, $5)
    `,
      [crypto.randomUUID(), "send_notification", "email", JSON.stringify({ recipient, message, metadata }), new Date()],
    )

    return { success: true, recipient, message }
  } catch (error) {
    console.error("Error sending email:", error)
    throw error
  }
})

notificationQueue.process("send_sms", async (job) => {
  const { recipient, message, metadata } = job.data as NotificationJob

  try {
    // In production, integrate with SMS service (Twilio, Africa's Talking, etc.)
    console.log(`[SMS] To: ${recipient}, Message: ${message}`)

    // Log notification
    await pool.query(
      `
      INSERT INTO audit_logs (
        id, action, target_type, details, created_at
      ) VALUES ($1, $2, $3, $4, $5)
    `,
      [crypto.randomUUID(), "send_notification", "sms", JSON.stringify({ recipient, message, metadata }), new Date()],
    )

    return { success: true, recipient, message }
  } catch (error) {
    console.error("Error sending SMS:", error)
    throw error
  }
})

// Backup worker
backupQueue.process("database_backup", async (job) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backupFile = `backup-${timestamp}.sql`
    const backupPath = process.env.BACKUP_PATH || "/tmp"

    // Create database backup using pg_dump
    const command = `pg_dump ${process.env.DATABASE_URL} > ${backupPath}/${backupFile}`
    await execAsync(command)

    // In production, upload to cloud storage (S3, Google Cloud, etc.)
    console.log(`Database backup created: ${backupPath}/${backupFile}`)

    // Log backup
    await pool.query(
      `
      INSERT INTO audit_logs (
        id, action, target_type, details, created_at
      ) VALUES ($1, $2, $3, $4, $5)
    `,
      [
        crypto.randomUUID(),
        "database_backup",
        "system",
        JSON.stringify({ backup_file: backupFile, backup_path: backupPath }),
        new Date(),
      ],
    )

    return { success: true, backupFile, backupPath }
  } catch (error) {
    console.error("Error creating database backup:", error)
    throw error
  }
})

// Schedule recurring jobs
export const scheduleRecurringJobs = () => {
  // Check low stock every 6 hours
  inventoryQueue.add(
    "check_low_stock",
    {},
    {
      repeat: { cron: "0 */6 * * *" },
      removeOnComplete: 10,
      removeOnFail: 5,
    },
  )

  // Check expiring items daily at 9 AM
  inventoryQueue.add(
    "check_expiring_items",
    {},
    {
      repeat: { cron: "0 9 * * *" },
      removeOnComplete: 10,
      removeOnFail: 5,
    },
  )

  // Reconcile claims every 4 hours
  claimsQueue.add(
    "reconcile_claims",
    {},
    {
      repeat: { cron: "0 */4 * * *" },
      removeOnComplete: 10,
      removeOnFail: 5,
    },
  )

  // Database backup daily at 2 AM
  backupQueue.add(
    "database_backup",
    {},
    {
      repeat: { cron: "0 2 * * *" },
      removeOnComplete: 7,
      removeOnFail: 3,
    },
  )

  console.log("Recurring jobs scheduled")
}

// Error handling
claimsQueue.on("failed", (job, err) => {
  console.error(`Claims job ${job.id} failed:`, err)
})

inventoryQueue.on("failed", (job, err) => {
  console.error(`Inventory job ${job.id} failed:`, err)
})

notificationQueue.on("failed", (job, err) => {
  console.error(`Notification job ${job.id} failed:`, err)
})

backupQueue.on("failed", (job, err) => {
  console.error(`Backup job ${job.id} failed:`, err)
})
