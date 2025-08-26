"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleRecurringJobs = void 0;
const queue_1 = require("./queue");
const SHAService_1 = require("../services/SHAService");
const database_1 = require("../config/database");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const shaService = new SHAService_1.SHAService();
queue_1.claimsQueue.process("submit_single_claim", async (job) => {
    const { claimId } = job.data;
    try {
        const claimResult = await database_1.pool.query("SELECT * FROM claims WHERE id = $1", [claimId]);
        if (claimResult.rows.length === 0) {
            throw new Error("Claim not found");
        }
        const claim = claimResult.rows[0];
        const itemsResult = await database_1.pool.query("SELECT * FROM claim_items WHERE claim_id = $1", [claimId]);
        const result = await shaService.submitSingleClaim(claim.id, claim.created_by);
        if (!result.success) {
            throw new Error(`SHA submission failed: ${result.error}`);
        }
        return { success: true, shaReference: result.data?.reference };
    }
    catch (error) {
        console.error("Error processing claim submission:", error);
        throw error;
    }
});
queue_1.claimsQueue.process("submit_claim_batch", async (job) => {
    const { batchId } = job.data;
    try {
        const batchResult = await database_1.pool.query("SELECT * FROM claim_batches WHERE id = $1", [batchId]);
        if (batchResult.rows.length === 0) {
            throw new Error("Batch not found");
        }
        const batch = batchResult.rows[0];
        const claimsResult = await database_1.pool.query("SELECT * FROM claims WHERE batch_id = $1", [batchId]);
        const result = await shaService.submitClaimBatch(batch, claimsResult.rows);
        if (!result.success) {
            throw new Error(`SHA batch submission failed: ${result.error}`);
        }
        return { success: true, shaBatchReference: result.data?.batch_reference };
    }
    catch (error) {
        console.error("Error processing batch submission:", error);
        throw error;
    }
});
queue_1.claimsQueue.process("reconcile_claims", async (job) => {
    try {
        await shaService.reconcileClaims();
        return { success: true, message: "Claims reconciliation completed" };
    }
    catch (error) {
        console.error("Error reconciling claims:", error);
        throw error;
    }
});
queue_1.inventoryQueue.process("check_low_stock", async (job) => {
    try {
        const result = await database_1.pool.query(`
      SELECT ii.*, SUM(ib.quantity) as current_stock
      FROM inventory_items ii
      LEFT JOIN inventory_batches ib ON ii.id = ib.item_id AND ib.expiry_date > NOW()
      GROUP BY ii.id
      HAVING SUM(ib.quantity) <= ii.reorder_level OR SUM(ib.quantity) IS NULL
    `);
        const lowStockItems = result.rows;
        if (lowStockItems.length > 0) {
            for (const item of lowStockItems) {
                await queue_1.notificationQueue.add("send_email", {
                    type: "send_email",
                    recipient: process.env.ADMIN_EMAIL || "admin@sethclinic.com",
                    message: `Low stock alert: ${item.name} (Current: ${item.current_stock || 0}, Reorder Level: ${item.reorder_level})`,
                    metadata: { item_id: item.id, alert_type: "low_stock" },
                });
            }
        }
        return { success: true, lowStockCount: lowStockItems.length };
    }
    catch (error) {
        console.error("Error checking low stock:", error);
        throw error;
    }
});
queue_1.inventoryQueue.process("check_expiring_items", async (job) => {
    try {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const result = await database_1.pool.query(`
      SELECT ib.*, ii.name
      FROM inventory_batches ib
      JOIN inventory_items ii ON ib.item_id = ii.id
      WHERE ib.expiry_date <= $1 AND ib.expiry_date > NOW() AND ib.quantity > 0
      ORDER BY ib.expiry_date ASC
    `, [thirtyDaysFromNow]);
        const expiringItems = result.rows;
        if (expiringItems.length > 0) {
            await queue_1.notificationQueue.add("send_email", {
                type: "send_email",
                recipient: process.env.ADMIN_EMAIL || "admin@sethclinic.com",
                message: `${expiringItems.length} items expiring within 30 days`,
                metadata: { alert_type: "expiring_items", items: expiringItems },
            });
        }
        return { success: true, expiringCount: expiringItems.length };
    }
    catch (error) {
        console.error("Error checking expiring items:", error);
        throw error;
    }
});
queue_1.notificationQueue.process("send_email", async (job) => {
    const { recipient, message, metadata } = job.data;
    try {
        console.log(`[EMAIL] To: ${recipient}, Message: ${message}`);
        await database_1.pool.query(`
      INSERT INTO audit_logs (
        id, action, target_type, details, created_at
      ) VALUES ($1, $2, $3, $4, $5)
    `, [crypto.randomUUID(), "send_notification", "email", JSON.stringify({ recipient, message, metadata }), new Date()]);
        return { success: true, recipient, message };
    }
    catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
});
queue_1.notificationQueue.process("send_sms", async (job) => {
    const { recipient, message, metadata } = job.data;
    try {
        console.log(`[SMS] To: ${recipient}, Message: ${message}`);
        await database_1.pool.query(`
      INSERT INTO audit_logs (
        id, action, target_type, details, created_at
      ) VALUES ($1, $2, $3, $4, $5)
    `, [crypto.randomUUID(), "send_notification", "sms", JSON.stringify({ recipient, message, metadata }), new Date()]);
        return { success: true, recipient, message };
    }
    catch (error) {
        console.error("Error sending SMS:", error);
        throw error;
    }
});
queue_1.backupQueue.process("database_backup", async (job) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupFile = `backup-${timestamp}.sql`;
        const backupPath = process.env.BACKUP_PATH || "/tmp";
        const command = `pg_dump ${process.env.DATABASE_URL} > ${backupPath}/${backupFile}`;
        await execAsync(command);
        console.log(`Database backup created: ${backupPath}/${backupFile}`);
        await database_1.pool.query(`
      INSERT INTO audit_logs (
        id, action, target_type, details, created_at
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
            crypto.randomUUID(),
            "database_backup",
            "system",
            JSON.stringify({ backup_file: backupFile, backup_path: backupPath }),
            new Date(),
        ]);
        return { success: true, backupFile, backupPath };
    }
    catch (error) {
        console.error("Error creating database backup:", error);
        throw error;
    }
});
const scheduleRecurringJobs = () => {
    queue_1.inventoryQueue.add("check_low_stock", {}, {
        repeat: { cron: "0 */6 * * *" },
        removeOnComplete: 10,
        removeOnFail: 5,
    });
    queue_1.inventoryQueue.add("check_expiring_items", {}, {
        repeat: { cron: "0 9 * * *" },
        removeOnComplete: 10,
        removeOnFail: 5,
    });
    queue_1.claimsQueue.add("reconcile_claims", {}, {
        repeat: { cron: "0 */4 * * *" },
        removeOnComplete: 10,
        removeOnFail: 5,
    });
    queue_1.backupQueue.add("database_backup", {}, {
        repeat: { cron: "0 2 * * *" },
        removeOnComplete: 7,
        removeOnFail: 3,
    });
    console.log("Recurring jobs scheduled");
};
exports.scheduleRecurringJobs = scheduleRecurringJobs;
queue_1.claimsQueue.on("failed", (job, err) => {
    console.error(`Claims job ${job.id} failed:`, err);
});
queue_1.inventoryQueue.on("failed", (job, err) => {
    console.error(`Inventory job ${job.id} failed:`, err);
});
queue_1.notificationQueue.on("failed", (job, err) => {
    console.error(`Notification job ${job.id} failed:`, err);
});
queue_1.backupQueue.on("failed", (job, err) => {
    console.error(`Backup job ${job.id} failed:`, err);
});
//# sourceMappingURL=workers.js.map