export declare function generateInvoiceNumber(prefix?: string): Promise<string>;
export declare function generateBatchNumber(type?: string): Promise<string>;
export declare function generateClaimNumber(): Promise<string>;
export declare function validateSHAMemberNumber(memberNumber: string): boolean;
export declare function getSHAServiceCode(serviceType: string, itemType: string): string;
export declare function formatSHACurrency(amount: number): string;
export declare function calculateInvoiceDueDate(invoiceDate: Date, paymentTerms?: number): Date;
export declare function generateInvoiceReference(invoiceNumber: string, providerCode: string): string;
export declare function validateDiagnosisCode(code: string): boolean;
export declare function calculateInvoiceAging(invoiceDate: Date): string;
export declare function generateComplianceChecklist(invoice: any): string[];
//# sourceMappingURL=invoiceUtils.d.ts.map