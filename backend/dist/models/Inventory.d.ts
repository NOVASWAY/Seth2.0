import type { InventoryItem, InventoryBatch, InventoryMovement } from "../types";
export interface CreateInventoryItemData {
    name: string;
    genericName?: string;
    category: string;
    unit: string;
    reorderLevel?: number;
    maxLevel?: number;
}
export interface UpdateInventoryItemData {
    name?: string;
    genericName?: string;
    category?: string;
    unit?: string;
    reorderLevel?: number;
    maxLevel?: number;
    isActive?: boolean;
}
export interface CreateBatchData {
    inventoryItemId: string;
    batchNumber: string;
    quantity: number;
    unitCost: number;
    sellingPrice: number;
    expiryDate: Date;
    supplierName?: string;
    receivedBy: string;
}
export interface CreateMovementData {
    inventoryItemId: string;
    batchId?: string;
    movementType: "RECEIVE" | "DISPENSE" | "ADJUST" | "EXPIRE" | "TRANSFER";
    quantity: number;
    unitCost?: number;
    reference?: string;
    performedBy: string;
    notes?: string;
}
export declare class InventoryModel {
    static findAllItems(limit?: number, offset?: number): Promise<{
        items: InventoryItem[];
        total: number;
    }>;
    static findItemById(id: string): Promise<InventoryItem | null>;
    static searchItems(searchTerm: string, limit?: number): Promise<InventoryItem[]>;
    static createItem(itemData: CreateInventoryItemData): Promise<InventoryItem>;
    static updateItem(id: string, itemData: UpdateInventoryItemData): Promise<InventoryItem | null>;
    static findBatchesByItemId(itemId: string): Promise<InventoryBatch[]>;
    static findBatchById(id: string): Promise<InventoryBatch | null>;
    static createBatch(batchData: CreateBatchData): Promise<InventoryBatch>;
    static updateBatchQuantity(id: string, newQuantity: number): Promise<InventoryBatch | null>;
    static createMovement(movementData: CreateMovementData): Promise<InventoryMovement>;
    static findMovementsByItemId(itemId: string, limit?: number): Promise<InventoryMovement[]>;
    static getStockLevels(): Promise<Array<{
        id: string;
        name: string;
        category: string;
        unit: string;
        totalQuantity: number;
        reorderLevel: number;
        needsReorder: boolean;
        expiringBatches: number;
    }>>;
    static getExpiringBatches(days?: number): Promise<Array<{
        id: string;
        itemName: string;
        batchNumber: string;
        quantity: number;
        expiryDate: Date;
        daysToExpiry: number;
    }>>;
    static getAvailableStock(search?: string, category?: string): Promise<Array<{
        id: string;
        name: string;
        genericName?: string;
        category: string;
        unit: string;
        availableQuantity: number;
        sellingPrice: number;
        hasExpiringStock: boolean;
    }>>;
    static dispenseFromBatch(batchId: string, quantity: number, performedBy: string, reference?: string): Promise<{
        success: boolean;
        message: string;
        batch?: InventoryBatch;
    }>;
}
//# sourceMappingURL=Inventory.d.ts.map