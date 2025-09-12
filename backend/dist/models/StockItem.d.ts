export interface StockItem {
    id: string;
    name: string;
    description?: string;
    categoryId: string;
    sku?: string;
    barcode?: string;
    unitOfMeasure: string;
    unitPrice: number;
    costPrice: number;
    sellingPrice: number;
    minimumStockLevel: number;
    maximumStockLevel: number;
    currentStock: number;
    reorderLevel: number;
    supplierId?: string;
    expiryDate?: Date;
    batchNumber?: string;
    location?: string;
    isActive: boolean;
    isControlledSubstance: boolean;
    requiresPrescription: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
}
export interface CreateStockItemData {
    name: string;
    description?: string;
    categoryId: string;
    sku?: string;
    barcode?: string;
    unitOfMeasure: string;
    unitPrice?: number;
    costPrice?: number;
    sellingPrice?: number;
    minimumStockLevel?: number;
    maximumStockLevel?: number;
    currentStock?: number;
    reorderLevel?: number;
    supplierId?: string;
    expiryDate?: Date;
    batchNumber?: string;
    location?: string;
    isControlledSubstance?: boolean;
    requiresPrescription?: boolean;
    createdBy?: string;
}
export interface UpdateStockItemData {
    name?: string;
    description?: string;
    categoryId?: string;
    sku?: string;
    barcode?: string;
    unitOfMeasure?: string;
    unitPrice?: number;
    costPrice?: number;
    sellingPrice?: number;
    minimumStockLevel?: number;
    maximumStockLevel?: number;
    currentStock?: number;
    reorderLevel?: number;
    supplierId?: string;
    expiryDate?: Date;
    batchNumber?: string;
    location?: string;
    isActive?: boolean;
    isControlledSubstance?: boolean;
    requiresPrescription?: boolean;
    updatedBy?: string;
}
export interface StockItemWithCategory extends StockItem {
    categoryName: string;
    categoryDescription?: string;
    stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'CRITICAL_STOCK' | 'OUT_OF_STOCK';
    totalCostValue: number;
    totalSellingValue: number;
}
export declare class StockItemModel {
    static findAll(): Promise<StockItemWithCategory[]>;
    static findById(id: string): Promise<StockItemWithCategory | null>;
    static findByCategory(categoryId: string): Promise<StockItemWithCategory[]>;
    static findBySku(sku: string): Promise<StockItemWithCategory | null>;
    static findLowStock(): Promise<StockItemWithCategory[]>;
    static create(itemData: CreateStockItemData): Promise<StockItem>;
    static update(id: string, itemData: UpdateStockItemData): Promise<StockItem | null>;
    static delete(id: string): Promise<boolean>;
    static search(query: string): Promise<StockItemWithCategory[]>;
    static getStockSummary(): Promise<any>;
    static getCategoryStockSummary(): Promise<any[]>;
}
//# sourceMappingURL=StockItem.d.ts.map