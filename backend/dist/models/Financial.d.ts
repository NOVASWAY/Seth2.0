export interface Invoice {
    id: string;
    invoice_number: string;
    op_number?: string;
    patient_id?: string;
    buyer_name?: string;
    buyer_phone?: string;
    invoice_date: Date;
    due_date: Date;
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    amount_paid: number;
    balance: number;
    status: "paid" | "partial" | "unpaid" | "overdue";
    payment_terms: string;
    notes?: string;
    created_by: string;
    created_at: Date;
    updated_at: Date;
}
export interface InvoiceItem {
    id: string;
    invoice_id: string;
    item_type: "consultation" | "medication" | "lab_test" | "procedure" | "other";
    item_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    batch_id?: string;
    created_at: Date;
}
export interface Payment {
    id: string;
    invoice_id: string;
    payment_reference: string;
    payment_method: "cash" | "mpesa" | "bank_transfer" | "insurance" | "other";
    amount: number;
    mpesa_receipt?: string;
    mpesa_transaction_id?: string;
    payment_date: Date;
    received_by: string;
    notes?: string;
    reconciled: boolean;
    reconciled_at?: Date;
    created_at: Date;
}
export interface AccountsReceivable {
    id: string;
    invoice_id: string;
    op_number?: string;
    patient_id?: string;
    amount: number;
    due_date: Date;
    days_overdue: number;
    aging_bucket: "0-30" | "31-60" | "61-90" | "90+";
    status: "current" | "overdue" | "collection" | "written_off";
    last_reminder_sent?: Date;
    notes?: string;
    created_at: Date;
    updated_at: Date;
}
export interface CashReconciliation {
    id: string;
    shift_date: Date;
    opening_float: number;
    expected_cash: number;
    actual_cash: number;
    variance: number;
    variance_reason?: string;
    reconciled_by: string;
    reconciled_at: Date;
    notes?: string;
}
export interface MPesaTransaction {
    id: string;
    transaction_type: "stk_push" | "c2b" | "b2c";
    merchant_request_id?: string;
    checkout_request_id?: string;
    transaction_id?: string;
    receipt_number?: string;
    phone_number: string;
    amount: number;
    account_reference?: string;
    transaction_desc?: string;
    status: "pending" | "success" | "failed" | "cancelled";
    result_code?: string;
    result_desc?: string;
    invoice_id?: string;
    created_at: Date;
    updated_at: Date;
}
//# sourceMappingURL=Financial.d.ts.map