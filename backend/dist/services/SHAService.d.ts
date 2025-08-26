import type { Claim, ClaimBatch } from "../models/Claims";
export interface SHAConfig {
    baseUrl: string;
    apiKey: string;
    providerCode: string;
    timeout: number;
    requireInvoiceBeforeSubmission: boolean;
}
export declare class SHAService {
    private config;
    constructor();
    private makeRequest;
    generateInvoiceForClaim(claimId: string, userId: string): Promise<any>;
    submitSingleClaim(claimId: string, userId: string): Promise<any>;
    submitClaimBatch(batch: ClaimBatch, claims: Claim[]): Promise<any>;
    checkClaimStatus(shaReference: string): Promise<any>;
    checkBatchStatus(shaBatchReference: string): Promise<any>;
    reconcileClaims(): Promise<void>;
    private createAuditTrail;
    getInvoicesReadyForReview(): Promise<any[]>;
    getSubmittedInvoices(startDate?: Date, endDate?: Date): Promise<any[]>;
    getInvoiceForPrinting(id: string): Promise<any>;
    generateInvoicesForBatch(batchId: string, userId: string): Promise<any[]>;
    markInvoiceAsPrinted(id: string, userId: string): Promise<any>;
    submitInvoiceToSHA(id: string, userId: string): Promise<any>;
    getInvoicesReadyForPrinting(batchType: "weekly" | "monthly"): Promise<any[]>;
    getComplianceReport(startDate?: Date, endDate?: Date): Promise<any>;
}
//# sourceMappingURL=SHAService.d.ts.map