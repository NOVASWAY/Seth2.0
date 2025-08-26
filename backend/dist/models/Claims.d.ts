export interface Claim {
    id: string;
    claim_number: string;
    batch_id?: string;
    op_number: string;
    patient_id: string;
    provider_code: string;
    member_number?: string;
    visit_date: Date;
    diagnosis_code: string;
    diagnosis_description: string;
    total_amount: number;
    approved_amount?: number;
    status: "draft" | "ready_to_submit" | "submitted" | "approved" | "rejected" | "paid";
    submission_date?: Date;
    approval_date?: Date;
    payment_date?: Date;
    sha_reference?: string;
    rejection_reason?: string;
    created_by: string;
    created_at: Date;
    updated_at: Date;
}
export interface ClaimItem {
    id: string;
    claim_id: string;
    service_code: string;
    service_description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    approved_price?: number;
    item_type: "consultation" | "medication" | "lab_test" | "procedure" | "other";
    item_reference_id?: string;
    created_at: Date;
}
export interface ClaimBatch {
    id: string;
    batch_number: string;
    batch_date: Date;
    total_claims: number;
    total_amount: number;
    status: "draft" | "submitted" | "processing" | "completed" | "failed";
    submission_date?: Date;
    completion_date?: Date;
    sha_batch_reference?: string;
    created_by: string;
    created_at: Date;
    updated_at: Date;
}
export interface ClaimSubmissionLog {
    id: string;
    claim_id?: string;
    batch_id?: string;
    submission_type: "single" | "batch";
    request_payload: any;
    response_payload?: any;
    status: "pending" | "success" | "failed" | "retry";
    error_message?: string;
    retry_count: number;
    next_retry_at?: Date;
    created_at: Date;
    updated_at: Date;
}
//# sourceMappingURL=Claims.d.ts.map