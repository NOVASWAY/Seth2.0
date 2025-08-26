import type { Patient } from "../types";
export interface CreatePatientData {
    opNumber?: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: Date;
    age?: number;
    gender: "MALE" | "FEMALE" | "OTHER";
    phoneNumber?: string;
    area?: string;
    nextOfKin?: string;
    nextOfKinPhone?: string;
    insuranceType: "SHA" | "PRIVATE" | "CASH";
    insuranceNumber?: string;
}
export interface UpdatePatientData {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    age?: number;
    gender?: "MALE" | "FEMALE" | "OTHER";
    phoneNumber?: string;
    area?: string;
    nextOfKin?: string;
    nextOfKinPhone?: string;
    insuranceType?: "SHA" | "PRIVATE" | "CASH";
    insuranceNumber?: string;
}
export declare class PatientModel {
    static generateOpNumber(): Promise<string>;
    static findById(id: string): Promise<Patient | null>;
    static findByOpNumber(opNumber: string): Promise<Patient | null>;
    static search(searchTerm: string, limit?: number): Promise<Patient[]>;
    static create(patientData: CreatePatientData): Promise<Patient>;
    static update(id: string, patientData: UpdatePatientData): Promise<Patient | null>;
    static findAll(limit?: number, offset?: number): Promise<{
        patients: Patient[];
        total: number;
    }>;
}
//# sourceMappingURL=Patient.d.ts.map