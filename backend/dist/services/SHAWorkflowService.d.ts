export interface WorkflowStep {
    id: string;
    step_name: string;
    step_order: number;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
    required: boolean;
    automated: boolean;
    estimated_duration_minutes: number;
    actual_duration_minutes?: number;
    assigned_to?: string;
    completed_by?: string;
    started_at?: Date;
    completed_at?: Date;
    notes?: string;
    prerequisites: string[];
    next_steps: string[];
}
export interface WorkflowInstance {
    id: string;
    claim_id: string;
    invoice_id?: string;
    workflow_type: 'SHA_CLAIM_PROCESSING';
    current_step: string;
    overall_status: 'not_started' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
    created_at: Date;
    updated_at: Date;
    steps: WorkflowStep[];
}
export declare class SHAWorkflowService {
    private shaService;
    constructor();
    initializeSHAWorkflow(claimId: string, initiatedBy: string): Promise<WorkflowInstance>;
    completeWorkflowStep(workflowId: string, stepName: string, completedBy: string, notes?: string, autoAdvance?: boolean): Promise<WorkflowInstance>;
    processAutomatedSteps(workflowId: string, triggeredBy: string): Promise<void>;
    getWorkflowInstance(workflowId: string): Promise<WorkflowInstance>;
    getWorkflows(filters: {
        status?: string;
        claimId?: string;
        assignedTo?: string;
        dateFrom?: Date;
        dateTo?: Date;
    }): Promise<WorkflowInstance[]>;
    getWorkflowStatistics(dateFrom?: Date, dateTo?: Date): Promise<any>;
    private getDefaultSHAWorkflowSteps;
    private startWorkflowStep;
    private getNextWorkflowStep;
    private executeAutomatedStep;
    private executeComplianceVerification;
    private executeInvoiceGeneration;
    private executePaymentTracking;
    private logWorkflowActivity;
}
//# sourceMappingURL=SHAWorkflowService.d.ts.map