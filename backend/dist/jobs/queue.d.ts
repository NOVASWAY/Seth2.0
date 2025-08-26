import Queue from "bull";
export declare const claimsQueue: Queue.Queue<any>;
export declare const inventoryQueue: Queue.Queue<any>;
export declare const notificationQueue: Queue.Queue<any>;
export declare const backupQueue: Queue.Queue<any>;
export interface ClaimSubmissionJob {
    type: "submit_single_claim" | "submit_claim_batch" | "reconcile_claims";
    claimId?: string;
    batchId?: string;
}
export interface InventoryAlertJob {
    type: "check_low_stock" | "check_expiring_items" | "generate_reorder_report";
}
export interface NotificationJob {
    type: "send_sms" | "send_email" | "send_overdue_reminder";
    recipient: string;
    message: string;
    metadata?: any;
}
export interface BackupJob {
    type: "database_backup" | "file_backup";
    destination?: string;
}
//# sourceMappingURL=queue.d.ts.map