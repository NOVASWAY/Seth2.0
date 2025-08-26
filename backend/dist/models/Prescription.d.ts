import type { Prescription, PrescriptionItem } from "../types";
export interface CreatePrescriptionData {
    consultationId: string;
    visitId: string;
    patientId: string;
    prescribedBy: string;
    items: Array<{
        inventoryItemId: string;
        itemName: string;
        dosage: string;
        frequency: string;
        duration: string;
        quantityPrescribed: number;
        instructions?: string;
    }>;
}
export interface UpdatePrescriptionStatusData {
    status: "PENDING" | "PARTIALLY_DISPENSED" | "FULLY_DISPENSED" | "CANCELLED";
}
export declare class PrescriptionModel {
    static create(data: CreatePrescriptionData): Promise<Prescription>;
    static findById(id: string): Promise<Prescription | null>;
    static findByPatientId(patientId: string): Promise<Prescription[]>;
    static updateStatus(id: string, status: string): Promise<Prescription | null>;
    static updateDispensedQuantity(itemId: string, quantityDispensed: number): Promise<PrescriptionItem | null>;
    static findByVisitId(visitId: string): Promise<Prescription[]>;
}
//# sourceMappingURL=Prescription.d.ts.map