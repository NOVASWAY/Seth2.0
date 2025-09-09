export interface PatientAssignment {
    id: string;
    patient_id: string;
    assigned_to_user_id: string;
    assigned_by_user_id: string;
    assignment_type: 'GENERAL' | 'PRIMARY_CARE' | 'SPECIALIST' | 'NURSE' | 'PHARMACIST' | 'FOLLOW_UP' | 'REFERRAL';
    assignment_reason?: string;
    status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'TRANSFERRED';
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    assigned_at: Date;
    completed_at?: Date;
    due_date?: Date;
    notes?: string;
    created_at: Date;
    updated_at: Date;
    patient_name?: string;
    assigned_to_name?: string;
    assigned_by_name?: string;
}
export interface CreatePatientAssignmentData {
    patient_id: string;
    assigned_to_user_id: string;
    assigned_by_user_id: string;
    assignment_type: 'GENERAL' | 'PRIMARY_CARE' | 'SPECIALIST' | 'NURSE' | 'PHARMACIST' | 'FOLLOW_UP' | 'REFERRAL';
    assignment_reason?: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    due_date?: Date;
    notes?: string;
}
export interface UpdatePatientAssignmentData {
    status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'TRANSFERRED';
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    assignment_reason?: string;
    due_date?: Date;
    notes?: string;
    completed_at?: Date;
}
export declare class PatientAssignmentModel {
    static create(data: CreatePatientAssignmentData): Promise<PatientAssignment>;
    static findById(id: string): Promise<PatientAssignment | null>;
    static findByPatientId(patientId: string): Promise<PatientAssignment[]>;
    static findByAssignedToUserId(userId: string, status?: string): Promise<PatientAssignment[]>;
    static findAll(filters?: {
        status?: string;
        assignment_type?: string;
        priority?: string;
        assigned_to_user_id?: string;
        assigned_by_user_id?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        assignments: PatientAssignment[];
        total: number;
    }>;
    static update(id: string, data: UpdatePatientAssignmentData): Promise<PatientAssignment | null>;
    static delete(id: string): Promise<boolean>;
    static getAssignmentStats(): Promise<{
        total_assignments: number;
        active_assignments: number;
        completed_assignments: number;
        assignments_by_type: Record<string, number>;
        assignments_by_priority: Record<string, number>;
    }>;
    private static mapRowToPatientAssignment;
}
//# sourceMappingURL=PatientAssignment.d.ts.map