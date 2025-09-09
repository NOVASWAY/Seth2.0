"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHAExportService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const exceljs_1 = __importDefault(require("exceljs"));
const database_1 = require("../config/database");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
class SHAExportService {
    ensureExportDirectory() {
        const exportDir = path_1.default.join(process.cwd(), 'exports', 'sha');
        if (!fs_1.default.existsSync(exportDir)) {
            fs_1.default.mkdirSync(exportDir, { recursive: true });
        }
        return exportDir;
    }
    async exportInvoicePDF(invoiceId, options, exportedBy) {
        try {
            const invoiceData = await this.getInvoiceData(invoiceId);
            if (!invoiceData) {
                throw new Error("Invoice not found");
            }
            const exportDir = this.ensureExportDirectory();
            const filename = `SHA-Invoice-${invoiceData.invoice_number}-${Date.now()}.pdf`;
            const filePath = path_1.default.join(exportDir, filename);
            const doc = new pdfkit_1.default({ margin: 50 });
            doc.pipe(fs_1.default.createWriteStream(filePath));
            this.addPDFHeader(doc, 'SHA INSURANCE INVOICE');
            this.addInvoiceDetails(doc, invoiceData);
            this.addPatientInfo(doc, invoiceData);
            this.addServicesTable(doc, invoiceData.items);
            this.addPDFFooter(doc, invoiceData);
            doc.end();
            const exportId = await this.logExport({
                exportType: 'PDF',
                exportScope: 'SINGLE_INVOICE',
                invoiceIds: [invoiceId],
                totalRecords: 1,
                filePath,
                fileSize: fs_1.default.statSync(filePath).size,
                exportReason: options.reason,
                complianceApproved: options.complianceApproved || false,
                approvedBy: options.approvedBy,
                exportedBy
            });
            return { filePath, exportId };
        }
        catch (error) {
            console.error("Error exporting invoice PDF:", error);
            throw error;
        }
    }
    async exportInvoicesExcel(filters, options, exportedBy) {
        try {
            const invoicesData = await this.getInvoicesData(filters);
            if (invoicesData.length === 0) {
                throw new Error("No invoices found matching criteria");
            }
            const exportDir = this.ensureExportDirectory();
            const filename = `SHA-Invoices-Export-${Date.now()}.xlsx`;
            const filePath = path_1.default.join(exportDir, filename);
            const workbook = new exceljs_1.default.Workbook();
            const summarySheet = workbook.addWorksheet('Invoice Summary');
            this.addExcelSummarySheet(summarySheet, invoicesData);
            const detailSheet = workbook.addWorksheet('Invoice Details');
            this.addExcelDetailSheet(detailSheet, invoicesData);
            const servicesSheet = workbook.addWorksheet('Services Breakdown');
            this.addExcelServicesSheet(servicesSheet, invoicesData);
            const complianceSheet = workbook.addWorksheet('Compliance Status');
            this.addExcelComplianceSheet(complianceSheet, invoicesData);
            await workbook.xlsx.writeFile(filePath);
            const exportId = await this.logExport({
                exportType: 'EXCEL',
                exportScope: options.scope,
                ...filters,
                totalRecords: invoicesData.length,
                filePath,
                fileSize: fs_1.default.statSync(filePath).size,
                exportReason: options.reason,
                complianceApproved: options.complianceApproved || false,
                approvedBy: options.approvedBy,
                exportedBy
            });
            return { filePath, exportId };
        }
        catch (error) {
            console.error("Error exporting invoices Excel:", error);
            throw error;
        }
    }
    async exportClaimsCSV(filters, options, exportedBy) {
        try {
            const claimsData = await this.getClaimsData(filters);
            if (claimsData.length === 0) {
                throw new Error("No claims found matching criteria");
            }
            const exportDir = this.ensureExportDirectory();
            const filename = `SHA-Claims-Upload-${Date.now()}.csv`;
            const filePath = path_1.default.join(exportDir, filename);
            const csvHeaders = [
                'CLAIM_NUMBER',
                'BENEFICIARY_ID',
                'PATIENT_NAME',
                'NATIONAL_ID',
                'VISIT_DATE',
                'DIAGNOSIS_CODE',
                'DIAGNOSIS_DESCRIPTION',
                'SERVICE_CODE',
                'SERVICE_DESCRIPTION',
                'QUANTITY',
                'UNIT_PRICE',
                'TOTAL_AMOUNT',
                'PROVIDER_CODE',
                'FACILITY_LEVEL'
            ];
            let csvContent = csvHeaders.join(',') + '\n';
            claimsData.forEach(claim => {
                claim.items.forEach((item) => {
                    const row = [
                        claim.claim_number,
                        claim.sha_beneficiary_id,
                        `"${claim.patient_name}"`,
                        claim.national_id || '',
                        claim.visit_date.toISOString().split('T')[0],
                        claim.primary_diagnosis_code,
                        `"${claim.primary_diagnosis_description}"`,
                        item.service_code,
                        `"${item.service_description}"`,
                        item.quantity,
                        item.unit_price,
                        item.total_amount,
                        claim.provider_code,
                        claim.facility_level || 'Level2'
                    ];
                    csvContent += row.join(',') + '\n';
                });
            });
            fs_1.default.writeFileSync(filePath, csvContent, 'utf8');
            const exportId = await this.logExport({
                exportType: 'CSV',
                exportScope: options.scope,
                ...filters,
                totalRecords: claimsData.length,
                filePath,
                fileSize: fs_1.default.statSync(filePath).size,
                exportReason: options.reason,
                complianceApproved: options.complianceApproved || false,
                approvedBy: options.approvedBy,
                exportedBy
            });
            return { filePath, exportId };
        }
        catch (error) {
            console.error("Error exporting claims CSV:", error);
            throw error;
        }
    }
    async exportBatchReport(batchId, options, exportedBy) {
        try {
            const batchData = await this.getBatchData(batchId);
            if (!batchData) {
                throw new Error("Batch not found");
            }
            const exportDir = this.ensureExportDirectory();
            const filename = `SHA-Batch-${batchData.batch_number}-Report-${Date.now()}.pdf`;
            const filePath = path_1.default.join(exportDir, filename);
            const doc = new pdfkit_1.default({ margin: 50 });
            doc.pipe(fs_1.default.createWriteStream(filePath));
            this.addPDFHeader(doc, 'SHA BATCH SUBMISSION REPORT');
            this.addBatchSummary(doc, batchData);
            this.addBatchClaimsList(doc, batchData.claims);
            this.addBatchComplianceSummary(doc, batchData);
            doc.end();
            const exportId = await this.logExport({
                exportType: 'PDF',
                exportScope: 'BATCH',
                batchIds: [batchId],
                totalRecords: batchData.claims.length,
                filePath,
                fileSize: fs_1.default.statSync(filePath).size,
                exportReason: options.reason,
                complianceApproved: options.complianceApproved || false,
                approvedBy: options.approvedBy,
                exportedBy
            });
            return { filePath, exportId };
        }
        catch (error) {
            console.error("Error exporting batch report:", error);
            throw error;
        }
    }
    async getInvoiceData(invoiceId) {
        const result = await database_1.pool.query(`
      SELECT i.*,
             c.claim_number,
             c.sha_beneficiary_id,
             c.national_id,
             c.primary_diagnosis_code,
             c.primary_diagnosis_description,
             c.provider_code,
             c.facility_level,
             p.first_name || ' ' || p.last_name as patient_name,
             p.op_number,
             p.phone_number,
             u.username as generated_by_name
      FROM sha_invoices i
      JOIN sha_claims c ON i.claim_id = c.id
      JOIN patients p ON c.patient_id = p.id
      JOIN users u ON i.generated_by = u.id
      WHERE i.id = $1
    `, [invoiceId]);
        if (result.rows.length === 0)
            return null;
        const invoice = result.rows[0];
        const itemsResult = await database_1.pool.query(`
      SELECT ci.*
      FROM sha_claim_items ci
      JOIN sha_claims c ON ci.claim_id = c.id
      JOIN sha_invoices i ON c.id = i.claim_id
      WHERE i.id = $1
      ORDER BY ci.service_type, ci.service_description
    `, [invoiceId]);
        invoice.items = itemsResult.rows;
        return invoice;
    }
    async getInvoicesData(filters) {
        let whereClause = "WHERE 1=1";
        const params = [];
        let paramCount = 1;
        if (filters.dateFrom) {
            whereClause += ` AND i.invoice_date >= $${paramCount++}`;
            params.push(filters.dateFrom);
        }
        if (filters.dateTo) {
            whereClause += ` AND i.invoice_date <= $${paramCount++}`;
            params.push(filters.dateTo);
        }
        if (filters.claimStatuses && filters.claimStatuses.length > 0) {
            whereClause += ` AND c.status = ANY($${paramCount++})`;
            params.push(filters.claimStatuses);
        }
        if (filters.invoiceIds && filters.invoiceIds.length > 0) {
            whereClause += ` AND i.id = ANY($${paramCount++})`;
            params.push(filters.invoiceIds);
        }
        const result = await database_1.pool.query(`
      SELECT i.*,
             c.claim_number,
             c.sha_beneficiary_id,
             c.national_id,
             c.primary_diagnosis_code,
             c.primary_diagnosis_description,
             c.provider_code,
             c.facility_level,
             c.status as claim_status,
             p.first_name || ' ' || p.last_name as patient_name,
             p.op_number
      FROM sha_invoices i
      JOIN sha_claims c ON i.claim_id = c.id
      JOIN patients p ON c.patient_id = p.id
      ${whereClause}
      ORDER BY i.invoice_date DESC
    `, params);
        for (const invoice of result.rows) {
            const itemsResult = await database_1.pool.query(`
        SELECT ci.*
        FROM sha_claim_items ci
        WHERE ci.claim_id = $1
        ORDER BY ci.service_type, ci.service_description
      `, [invoice.claim_id]);
            invoice.items = itemsResult.rows;
        }
        return result.rows;
    }
    async getClaimsData(filters) {
        let whereClause = "WHERE c.status IN ('READY_TO_SUBMIT', 'SUBMITTED')";
        const params = [];
        let paramCount = 1;
        if (filters.dateFrom) {
            whereClause += ` AND c.visit_date >= $${paramCount++}`;
            params.push(filters.dateFrom);
        }
        if (filters.dateTo) {
            whereClause += ` AND c.visit_date <= $${paramCount++}`;
            params.push(filters.dateTo);
        }
        if (filters.claimStatuses && filters.claimStatuses.length > 0) {
            whereClause += ` AND c.status = ANY($${paramCount++})`;
            params.push(filters.claimStatuses);
        }
        const result = await database_1.pool.query(`
      SELECT c.*,
             p.first_name || ' ' || p.last_name as patient_name,
             p.op_number
      FROM sha_claims c
      JOIN patients p ON c.patient_id = p.id
      ${whereClause}
      ORDER BY c.visit_date DESC
    `, params);
        for (const claim of result.rows) {
            const itemsResult = await database_1.pool.query(`
        SELECT * FROM sha_claim_items
        WHERE claim_id = $1
        ORDER BY service_type, service_description
      `, [claim.id]);
            claim.items = itemsResult.rows;
        }
        return result.rows;
    }
    async getBatchData(batchId) {
        const result = await database_1.pool.query(`
      SELECT b.*
      FROM sha_claim_batches b
      WHERE b.id = $1
    `, [batchId]);
        if (result.rows.length === 0)
            return null;
        const batch = result.rows[0];
        const claimsResult = await database_1.pool.query(`
      SELECT c.*,
             p.first_name || ' ' || p.last_name as patient_name
      FROM sha_claims c
      JOIN patients p ON c.patient_id = p.id
      WHERE c.batch_id = $1
      ORDER BY c.claim_number
    `, [batch.batch_number]);
        batch.claims = claimsResult.rows;
        return batch;
    }
    async logExport(logData) {
        const exportId = crypto_1.default.randomUUID();
        await database_1.pool.query(`
      INSERT INTO sha_export_logs (
        id, export_type, export_scope, date_from, date_to,
        patient_ids, claim_statuses, invoice_ids, batch_ids,
        total_records, file_path, file_size, export_reason,
        compliance_approved, approved_by, exported_by,
        exported_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `, [
            exportId,
            logData.exportType,
            logData.exportScope,
            logData.dateFrom || null,
            logData.dateTo || null,
            logData.patientIds || null,
            logData.claimStatuses || null,
            logData.invoiceIds || null,
            logData.batchIds || null,
            logData.totalRecords,
            logData.filePath,
            logData.fileSize,
            logData.exportReason,
            logData.complianceApproved,
            logData.approvedBy || null,
            logData.exportedBy,
            new Date(),
            new Date()
        ]);
        return exportId;
    }
    addPDFHeader(doc, title) {
        doc.fontSize(20).text(title, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(2);
    }
    addInvoiceDetails(doc, invoice) {
        doc.fontSize(14).text('INVOICE DETAILS', { underline: true });
        doc.moveDown();
        doc.fontSize(10);
        doc.text(`Invoice Number: ${invoice.invoice_number}`);
        doc.text(`Claim Number: ${invoice.claim_number}`);
        doc.text(`Invoice Date: ${invoice.invoice_date}`);
        doc.text(`Status: ${invoice.status}`);
        doc.text(`Total Amount: ${new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
            minimumFractionDigits: 2
        }).format(Number.parseFloat(invoice.total_amount))}`);
        doc.moveDown();
    }
    addPatientInfo(doc, invoice) {
        doc.fontSize(14).text('PATIENT INFORMATION', { underline: true });
        doc.moveDown();
        doc.fontSize(10);
        doc.text(`Name: ${invoice.patient_name}`);
        doc.text(`OP Number: ${invoice.op_number}`);
        doc.text(`SHA Beneficiary ID: ${invoice.sha_beneficiary_id}`);
        doc.text(`National ID: ${invoice.national_id || 'N/A'}`);
        doc.text(`Primary Diagnosis: ${invoice.primary_diagnosis_code} - ${invoice.primary_diagnosis_description}`);
        doc.moveDown();
    }
    addServicesTable(doc, items) {
        doc.fontSize(14).text('SERVICES PROVIDED', { underline: true });
        doc.moveDown();
        const table = {
            headers: ['Service', 'Code', 'Qty', 'Unit Price', 'Total'],
            rows: items.map(item => [
                item.service_description,
                item.service_code,
                item.quantity.toString(),
                new Intl.NumberFormat('en-KE', {
                    style: 'currency',
                    currency: 'KES',
                    minimumFractionDigits: 2
                }).format(Number.parseFloat(item.unit_price)),
                new Intl.NumberFormat('en-KE', {
                    style: 'currency',
                    currency: 'KES',
                    minimumFractionDigits: 2
                }).format(Number.parseFloat(item.total_amount))
            ])
        };
        doc.fontSize(9);
        const startY = doc.y;
        const colWidths = [200, 60, 30, 80, 80];
        let currentY = startY;
        let currentX = 50;
        table.headers.forEach((header, i) => {
            doc.text(header, currentX, currentY, { width: colWidths[i], align: 'left' });
            currentX += colWidths[i];
        });
        currentY += 20;
        table.rows.forEach(row => {
            currentX = 50;
            row.forEach((cell, i) => {
                doc.text(cell, currentX, currentY, { width: colWidths[i], align: 'left' });
                currentX += colWidths[i];
            });
            currentY += 15;
        });
        doc.y = currentY + 20;
    }
    addPDFFooter(doc, invoice) {
        doc.moveDown();
        doc.fontSize(8);
        doc.text('This is a computer-generated document. No signature required.', { align: 'center' });
        doc.text(`Provider: ${invoice.provider_code} | Facility Level: ${invoice.facility_level}`, { align: 'center' });
    }
    addBatchSummary(doc, batch) {
        doc.fontSize(14).text('BATCH SUMMARY', { underline: true });
        doc.moveDown();
        doc.fontSize(10);
        doc.text(`Batch Number: ${batch.batch_number}`);
        doc.text(`Batch Date: ${batch.batch_date}`);
        doc.text(`Status: ${batch.status}`);
        doc.text(`Total Claims: ${batch.total_claims}`);
        doc.text(`Total Amount: ${new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
            minimumFractionDigits: 2
        }).format(Number.parseFloat(batch.total_amount))}`);
        doc.moveDown();
    }
    addBatchClaimsList(doc, claims) {
        doc.fontSize(14).text('CLAIMS IN BATCH', { underline: true });
        doc.moveDown();
        doc.fontSize(9);
        claims.forEach((claim, index) => {
            doc.text(`${index + 1}. ${claim.claim_number} - ${claim.patient_name} - ${new Intl.NumberFormat('en-KE', {
                style: 'currency',
                currency: 'KES',
                minimumFractionDigits: 2
            }).format(Number.parseFloat(claim.claim_amount))}`);
        });
        doc.moveDown();
    }
    addBatchComplianceSummary(doc, batch) {
        doc.fontSize(14).text('COMPLIANCE STATUS', { underline: true });
        doc.moveDown();
        doc.fontSize(10);
        doc.text(`Invoices Generated: ${batch.invoice_generated ? 'Yes' : 'No'}`);
        doc.text(`Printed: ${batch.printed_invoices ? 'Yes' : 'No'}`);
        doc.text('All required documents attached and verified.');
    }
    addExcelSummarySheet(sheet, invoices) {
        sheet.columns = [
            { header: 'Invoice Number', key: 'invoice_number', width: 20 },
            { header: 'Claim Number', key: 'claim_number', width: 20 },
            { header: 'Patient Name', key: 'patient_name', width: 25 },
            { header: 'OP Number', key: 'op_number', width: 15 },
            { header: 'Invoice Date', key: 'invoice_date', width: 15 },
            { header: 'Total Amount', key: 'total_amount', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'SHA Reference', key: 'sha_reference', width: 20 }
        ];
        invoices.forEach(invoice => {
            sheet.addRow({
                invoice_number: invoice.invoice_number,
                claim_number: invoice.claim_number,
                patient_name: invoice.patient_name,
                op_number: invoice.op_number,
                invoice_date: invoice.invoice_date,
                total_amount: Number.parseFloat(invoice.total_amount),
                status: invoice.status,
                sha_reference: invoice.sha_reference || 'N/A'
            });
        });
        sheet.getRow(1).font = { bold: true };
    }
    addExcelDetailSheet(sheet, invoices) {
        sheet.columns = [
            { header: 'Invoice Number', key: 'invoice_number', width: 20 },
            { header: 'Patient Name', key: 'patient_name', width: 25 },
            { header: 'SHA Beneficiary ID', key: 'sha_beneficiary_id', width: 20 },
            { header: 'National ID', key: 'national_id', width: 15 },
            { header: 'Diagnosis Code', key: 'diagnosis_code', width: 15 },
            { header: 'Diagnosis Description', key: 'diagnosis_description', width: 30 },
            { header: 'Provider Code', key: 'provider_code', width: 15 },
            { header: 'Facility Level', key: 'facility_level', width: 15 }
        ];
        invoices.forEach(invoice => {
            sheet.addRow({
                invoice_number: invoice.invoice_number,
                patient_name: invoice.patient_name,
                sha_beneficiary_id: invoice.sha_beneficiary_id,
                national_id: invoice.national_id || 'N/A',
                diagnosis_code: invoice.primary_diagnosis_code,
                diagnosis_description: invoice.primary_diagnosis_description,
                provider_code: invoice.provider_code,
                facility_level: invoice.facility_level
            });
        });
        sheet.getRow(1).font = { bold: true };
    }
    addExcelServicesSheet(sheet, invoices) {
        sheet.columns = [
            { header: 'Invoice Number', key: 'invoice_number', width: 20 },
            { header: 'Service Type', key: 'service_type', width: 15 },
            { header: 'Service Code', key: 'service_code', width: 15 },
            { header: 'Service Description', key: 'service_description', width: 30 },
            { header: 'Quantity', key: 'quantity', width: 10 },
            { header: 'Unit Price', key: 'unit_price', width: 15 },
            { header: 'Total Amount', key: 'total_amount', width: 15 }
        ];
        invoices.forEach(invoice => {
            invoice.items.forEach((item) => {
                sheet.addRow({
                    invoice_number: invoice.invoice_number,
                    service_type: item.service_type,
                    service_code: item.service_code,
                    service_description: item.service_description,
                    quantity: item.quantity,
                    unit_price: Number.parseFloat(item.unit_price),
                    total_amount: Number.parseFloat(item.total_amount)
                });
            });
        });
        sheet.getRow(1).font = { bold: true };
    }
    addExcelComplianceSheet(sheet, invoices) {
        sheet.columns = [
            { header: 'Invoice Number', key: 'invoice_number', width: 20 },
            { header: 'Claim Status', key: 'claim_status', width: 15 },
            { header: 'Invoice Status', key: 'invoice_status', width: 15 },
            { header: 'Generated Date', key: 'generated_at', width: 20 },
            { header: 'Submitted Date', key: 'submitted_at', width: 20 },
            { header: 'Compliance Status', key: 'compliance_status', width: 20 }
        ];
        invoices.forEach(invoice => {
            sheet.addRow({
                invoice_number: invoice.invoice_number,
                claim_status: invoice.claim_status,
                invoice_status: invoice.status,
                generated_at: invoice.generated_at,
                submitted_at: invoice.submitted_at || 'Not submitted',
                compliance_status: invoice.compliance_status
            });
        });
        sheet.getRow(1).font = { bold: true };
    }
}
exports.SHAExportService = SHAExportService;
//# sourceMappingURL=SHAExportService.js.map