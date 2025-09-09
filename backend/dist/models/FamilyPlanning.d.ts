export interface FamilyPlanningMethod {
    id: string;
    name: string;
    methodCode: string;
    category: 'HORMONAL' | 'BARRIER' | 'IUD' | 'STERILIZATION' | 'NATURAL';
    description?: string;
    effectivenessRate?: number;
    durationMonths?: number;
    sideEffects?: string;
    contraindications?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface PatientFamilyPlanning {
    id: string;
    patientId: string;
    visitId?: string;
    methodId: string;
    startDate: Date;
    endDate?: Date;
    providerId: string;
    counselingProvided: boolean;
    counselingNotes?: string;
    sideEffectsExperienced?: string;
    satisfactionRating?: number;
    followUpDate?: Date;
    status: 'ACTIVE' | 'DISCONTINUED' | 'COMPLETED' | 'SWITCHED';
    discontinuationReason?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreatePatientFamilyPlanningData {
    patientId: string;
    visitId?: string;
    methodId: string;
    startDate?: Date;
    endDate?: Date;
    providerId: string;
    counselingProvided?: boolean;
    counselingNotes?: string;
    sideEffectsExperienced?: string;
    satisfactionRating?: number;
    followUpDate?: Date;
    status?: 'ACTIVE' | 'DISCONTINUED' | 'COMPLETED' | 'SWITCHED';
    discontinuationReason?: string;
    notes?: string;
}
export declare class FamilyPlanningModel {
    static getMethods(): Promise<FamilyPlanningMethod[]>;
    static getMethodsByCategory(category: string): Promise<FamilyPlanningMethod[]>;
    static getPatientFamilyPlanning(patientId: string): Promise<PatientFamilyPlanning[]>;
    static getActivePatientFamilyPlanning(patientId: string): Promise<PatientFamilyPlanning | null>;
    static createPatientFamilyPlanning(data: CreatePatientFamilyPlanningData): Promise<PatientFamilyPlanning>;
    static updatePatientFamilyPlanning(id: string, data: Partial<CreatePatientFamilyPlanningData>): Promise<PatientFamilyPlanning | null>;
    static discontinuePatientFamilyPlanning(patientId: string, reason: string, providerId: string): Promise<boolean>;
    static getFamilyPlanningStats(): Promise<any>;
    static deletePatientFamilyPlanning(id: string): Promise<boolean>;
}
//# sourceMappingURL=FamilyPlanning.d.ts.map