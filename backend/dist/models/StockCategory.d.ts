export interface StockCategory {
    id: string;
    name: string;
    description?: string;
    parentCategoryId?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateStockCategoryData {
    name: string;
    description?: string;
    parentCategoryId?: string;
    isActive?: boolean;
}
export interface UpdateStockCategoryData {
    name?: string;
    description?: string;
    parentCategoryId?: string;
    isActive?: boolean;
}
export declare class StockCategoryModel {
    static findAll(): Promise<StockCategory[]>;
    static findById(id: string): Promise<StockCategory | null>;
    static findByName(name: string): Promise<StockCategory | null>;
    static findByParentId(parentId: string): Promise<StockCategory[]>;
    static findMainCategories(): Promise<StockCategory[]>;
    static create(categoryData: CreateStockCategoryData): Promise<StockCategory>;
    static update(id: string, categoryData: UpdateStockCategoryData): Promise<StockCategory | null>;
    static delete(id: string): Promise<boolean>;
    static getCategoryHierarchy(): Promise<any[]>;
    static getCategoryStats(): Promise<any[]>;
}
//# sourceMappingURL=StockCategory.d.ts.map