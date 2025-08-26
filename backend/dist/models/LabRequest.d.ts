import type { LabRequest, LabRequestItem } from "../types";
export interface CreateLabRequestData {
    visitId: string;
    patientId: string;
    requestedBy: string;
    clinicalNotes?: string;
    urgency: "ROUTINE" | "URGENT" | "STAT";
    items: {
        testId: string;
        testName: string;
        testCode: string;
        specimenType: string;
        clinicalNotes?: string;
    }[];
}
export interface UpdateLabRequestStatusData {
    status: "REQUESTED" | "SAMPLE_COLLECTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    specimenCollectedAt?: Date;
    collectedBy?: string;
    expectedCompletionAt?: Date;
}
export interface UpdateLabRequestItemStatusData {
    status: "REQUESTED" | "SAMPLE_COLLECTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    resultData?: Record<string, any>;
    referenceRanges?: Record<string, any>;
    abnormalFlags?: Record<string, boolean>;
    technicianNotes?: string;
    verifiedBy?: string;
    verifiedAt?: Date;
    reportedAt?: Date;
}
export declare class LabRequestModel {
    static create(data: CreateLabRequestData): Promise<LabRequest>;
    static findById(id: string): Promise<LabRequest | null>;
    static findByPatientId(patientId: string): Promise<LabRequest[]>;
    static findByVisitId(visitId: string): Promise<LabRequest[]>;
    static findAll(status?: string, urgency?: string): Promise<LabRequest[]>;
    static updateStatus(id: string, data: UpdateLabRequestStatusData): Promise<LabRequest | null>;
    static updateItemStatus(itemId: string, data: UpdateLabRequestItemStatusData): Promise<LabRequestItem | null>;
    static getRequestItems(requestId: string): Promise<LabRequestItem[]>;
    static getPendingRequests(): Promise<LabRequest[]>;
    static getCompletedRequests(startDate?: Date, endDate?: Date): Promise<LabRequest[]>;
    private static mapRowToLabRequest;
    private static mapRowToLabRequestItem;
}
//# sourceMappingURL=LabRequest.d.ts.map