export interface ExportFilters {
    dateFrom?: Date;
    dateTo?: Date;
    patientIds?: string[];
    claimStatuses?: string[];
    invoiceIds?: string[];
    batchIds?: string[];
}
export interface ExportOptions {
    type: 'PDF' | 'EXCEL' | 'CSV';
    scope: 'SINGLE_INVOICE' | 'BATCH' | 'DATE_RANGE' | 'CUSTOM_FILTER';
    reason: string;
    includeDocuments?: boolean;
    complianceApproved?: boolean;
    approvedBy?: string;
}
export declare class SHAExportService {
    private ensureExportDirectory;
    exportInvoicePDF(invoiceId: string, options: ExportOptions, exportedBy: string): Promise<{
        filePath: string;
        exportId: string;
    }>;
    exportInvoicesExcel(filters: ExportFilters, options: ExportOptions, exportedBy: string): Promise<{
        filePath: string;
        exportId: string;
    }>;
    exportClaimsCSV(filters: ExportFilters, options: ExportOptions, exportedBy: string): Promise<{
        filePath: string;
        exportId: string;
    }>;
    exportBatchReport(batchId: string, options: ExportOptions, exportedBy: string): Promise<{
        filePath: string;
        exportId: string;
    }>;
    private getInvoiceData;
    private getInvoicesData;
    private getClaimsData;
    private getBatchData;
    private logExport;
    private addPDFHeader;
    private addInvoiceDetails;
    private addPatientInfo;
    private addServicesTable;
    private addPDFFooter;
    private addBatchSummary;
    private addBatchClaimsList;
    private addBatchComplianceSummary;
    private addExcelSummarySheet;
    private addExcelDetailSheet;
    private addExcelServicesSheet;
    private addExcelComplianceSheet;
}
//# sourceMappingURL=SHAExportService.d.ts.map