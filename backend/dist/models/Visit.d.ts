import type { Visit, VisitStatus, QueueItem } from "../types";
export interface CreateVisitData {
    patientId: string;
    opNumber: string;
    chiefComplaint?: string;
    triageCategory?: "EMERGENCY" | "URGENT" | "NORMAL";
    paymentType?: "SHA" | "PRIVATE" | "CASH" | "NHIF" | "OTHER";
    paymentReference?: string;
}
export interface UpdateVisitData {
    status?: VisitStatus;
    chiefComplaint?: string;
    triageCategory?: "EMERGENCY" | "URGENT" | "NORMAL";
    paymentType?: "SHA" | "PRIVATE" | "CASH" | "NHIF" | "OTHER";
    paymentReference?: string;
}
export declare class VisitModel {
    static findById(id: string): Promise<Visit | null>;
    static findByPatientId(patientId: string, limit?: number): Promise<Visit[]>;
    static findTodaysVisits(): Promise<Visit[]>;
    static getQueueItems(): Promise<QueueItem[]>;
    static create(visitData: CreateVisitData): Promise<Visit>;
    static update(id: string, visitData: UpdateVisitData): Promise<Visit | null>;
    static updateStatus(id: string, status: VisitStatus): Promise<Visit | null>;
    static getVisitStats(): Promise<{
        today: number;
        waiting: number;
        inProgress: number;
        completed: number;
    }>;
}
//# sourceMappingURL=Visit.d.ts.map