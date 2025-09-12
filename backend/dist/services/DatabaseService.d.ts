import { mongoose } from '../config/mongodb';
export interface DatabaseStatus {
    postgres: {
        connected: boolean;
        status: string;
        error?: string;
    };
    mongodb: {
        connected: boolean;
        status: string;
        error?: string;
    };
    overall: {
        healthy: boolean;
        timestamp: string;
    };
}
export declare class DatabaseService {
    private static instance;
    private postgresConnected;
    private mongodbConnected;
    private constructor();
    static getInstance(): DatabaseService;
    initialize(): Promise<void>;
    private connectPostgreSQL;
    private connectMongoDB;
    getStatus(): Promise<DatabaseStatus>;
    private checkPostgreSQLStatus;
    private checkMongoDBStatus;
    queryPostgreSQL(text: string, params?: any[]): Promise<any>;
    getMongoCollection(collectionName: string): mongoose.mongo.Collection<mongoose.mongo.BSON.Document>;
    getMongoModel(modelName: string): mongoose.Model<any, unknown, unknown, unknown, any, any>;
    close(): Promise<void>;
    healthCheck(): Promise<boolean>;
}
export declare const databaseService: DatabaseService;
export default databaseService;
//# sourceMappingURL=DatabaseService.d.ts.map