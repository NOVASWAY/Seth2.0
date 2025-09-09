export interface MCHService {
    id: string;
    name: string;
    serviceCode: string;
    category: 'ANTENATAL' | 'POSTNATAL' | 'CHILD_HEALTH' | 'NUTRITION' | 'FAMILY_PLANNING';
    description?: string;
    targetPopulation?: string;
    frequency?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface PatientMCHService {
    id: string;
    patientId: string;
    visitId?: string;
    serviceId: string;
    serviceDate: Date;
    providerId: string;
    serviceDetails?: any;
    findings?: string;
    recommendations?: string;
    nextAppointmentDate?: Date;
    status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreatePatientMCHServiceData {
    patientId: string;
    visitId?: string;
    serviceId: string;
    serviceDate?: Date;
    providerId: string;
    serviceDetails?: any;
    findings?: string;
    recommendations?: string;
    nextAppointmentDate?: Date;
    status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
    notes?: string;
}
export declare class MCHServicesModel {
    static getServices(): Promise<MCHService[]>;
    static getServicesByCategory(category: string): Promise<MCHService[]>;
    static getPatientMCHServices(patientId: string): Promise<PatientMCHService[]>;
    static getPatientMCHServicesByCategory(patientId: string, category: string): Promise<PatientMCHService[]>;
    static createPatientMCHService(data: CreatePatientMCHServiceData): Promise<PatientMCHService>;
    static updatePatientMCHService(id: string, data: Partial<CreatePatientMCHServiceData>): Promise<PatientMCHService | null>;
    static getMCHServiceStats(): Promise<any>;
    static getUpcomingMCHAppointments(days?: number): Promise<any[]>;
    static deletePatientMCHService(id: string): Promise<boolean>;
}
//# sourceMappingURL=MCHServices.d.ts.map