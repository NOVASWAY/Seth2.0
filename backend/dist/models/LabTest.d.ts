import type { LabTest } from "../types";
export interface CreateLabTestData {
    testCode: string;
    testName: string;
    testCategory: string;
    description?: string;
    specimenType: string;
    turnaroundTime: number;
    price: number;
    isActive?: boolean;
    referenceRanges?: Record<string, any>;
    instructions?: string;
}
export interface UpdateLabTestData {
    testCode?: string;
    testName?: string;
    testCategory?: string;
    description?: string;
    specimenType?: string;
    turnaroundTime?: number;
    price?: number;
    isActive?: boolean;
    referenceRanges?: Record<string, any>;
    instructions?: string;
}
export declare class LabTestModel {
    static create(data: CreateLabTestData): Promise<LabTest>;
    static findById(id: string): Promise<LabTest | null>;
    static findByTestCode(testCode: string): Promise<LabTest | null>;
    static findAll(activeOnly?: boolean): Promise<LabTest[]>;
    static findByCategory(category: string, activeOnly?: boolean): Promise<LabTest[]>;
    static search(searchTerm: string, activeOnly?: boolean): Promise<LabTest[]>;
    static update(id: string, data: UpdateLabTestData): Promise<LabTest | null>;
    static delete(id: string): Promise<boolean>;
    static getCategories(): Promise<string[]>;
    static getAvailableTests(search?: string, category?: string): Promise<LabTest[]>;
    private static mapRowToLabTest;
}
//# sourceMappingURL=LabTest.d.ts.map