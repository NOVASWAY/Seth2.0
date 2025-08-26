export interface PatientEncounter {
    id: string;
    patient_id: string;
    visit_id: string;
    encounter_type: string;
    encounter_date: Date;
    completion_date?: Date;
    chief_complaint?: string;
    diagnosis_codes: string[];
    diagnosis_descriptions: string[];
    treatment_summary?: string;
    services_provided: any[];
    medications_prescribed: any[];
    lab_tests_ordered: any[];
    procedures_performed: any[];
    primary_provider: string;
    consulting_providers: string[];
    department?: string;
    location?: string;
    total_charges: number;
    insurance_eligible: boolean;
    sha_eligible: boolean;
    private_pay: boolean;
    status: string;
    completion_triggered_invoice: boolean;
    invoice_id?: string;
    sha_claim_id?: string;
    created_by: string;
    completed_by?: string;
    billed_by?: string;
    created_at: Date;
    updated_at: Date;
}
export declare class AutoInvoiceService {
    private shaService;
    constructor();
    generateInvoiceOnEncounterCompletion(encounterId: string, completedBy: string): Promise<any>;
    private generateSHAInvoice;
    private generateClinicInvoice;
    private addClaimItems;
    private addInvoiceItems;
    completeEncounterWithServices(encounterId: string, services: any[], medications: any[], labTests: any[], procedures: any[], diagnosisCodes: string[], diagnosisDescriptions: string[], treatmentSummary: string, completedBy: string): Promise<any>;
    private generateClaimNumber;
    private mapServiceType;
    getEncountersReadyForBilling(): Promise<PatientEncounter[]>;
    manuallyTriggerInvoiceGeneration(encounterId: string, triggeredBy: string): Promise<any>;
}
//# sourceMappingURL=AutoInvoiceService.d.ts.map