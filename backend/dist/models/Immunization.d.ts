export interface ImmunizationSchedule {
    id: string;
    name: string;
    description?: string;
    ageGroup?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface ImmunizationVaccine {
    id: string;
    name: string;
    vaccineCode: string;
    description?: string;
    manufacturer?: string;
    dosage?: string;
    route?: string;
    storageRequirements?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface PatientImmunization {
    id: string;
    patientId: string;
    visitId?: string;
    vaccineId: string;
    immunizationDate: Date;
    ageAtImmunizationDays?: number;
    batchNumber?: string;
    expiryDate?: Date;
    administeredBy: string;
    site?: string;
    route?: string;
    dosage?: string;
    adverseReactions?: string;
    nextDueDate?: Date;
    status: 'SCHEDULED' | 'COMPLETED' | 'MISSED' | 'CONTRAINDICATED';
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreatePatientImmunizationData {
    patientId: string;
    visitId?: string;
    vaccineId: string;
    immunizationDate?: Date;
    ageAtImmunizationDays?: number;
    batchNumber?: string;
    expiryDate?: Date;
    administeredBy: string;
    site?: string;
    route?: string;
    dosage?: string;
    adverseReactions?: string;
    nextDueDate?: Date;
    status?: 'SCHEDULED' | 'COMPLETED' | 'MISSED' | 'CONTRAINDICATED';
    notes?: string;
}
export declare class ImmunizationModel {
    static getSchedules(): Promise<ImmunizationSchedule[]>;
    static getVaccines(): Promise<ImmunizationVaccine[]>;
    static getVaccinesBySchedule(scheduleId: string): Promise<ImmunizationVaccine[]>;
    static getPatientImmunizations(patientId: string): Promise<PatientImmunization[]>;
    static createPatientImmunization(data: CreatePatientImmunizationData): Promise<PatientImmunization>;
    static getPatientImmunizationSchedule(patientId: string): Promise<any[]>;
    static updatePatientImmunization(id: string, data: Partial<CreatePatientImmunizationData>): Promise<PatientImmunization | null>;
    static deletePatientImmunization(id: string): Promise<boolean>;
}
//# sourceMappingURL=Immunization.d.ts.map