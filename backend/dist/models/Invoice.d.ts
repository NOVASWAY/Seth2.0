export declare class Invoice {
    static query(query: string, params?: any[]): Promise<import("pg").QueryResult<any>>;
    static findById(id: string): Promise<any>;
    static create(invoiceData: any): Promise<any>;
    static update(id: string, updates: any): Promise<any>;
    static delete(id: string): Promise<any>;
}
//# sourceMappingURL=Invoice.d.ts.map