"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseService = exports.DatabaseService = void 0;
const database_1 = require("../config/database");
const mongodb_1 = require("../config/mongodb");
class DatabaseService {
    constructor() {
        this.postgresConnected = false;
        this.mongodbConnected = false;
    }
    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }
    /**
     * Initialize both database connections
     */
    async initialize() {
        try {
            await this.connectPostgreSQL();
            await this.connectMongoDB();
            console.log('✅ Both databases initialized successfully');
        }
        catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }
    /**
     * Alias for initialize method
     */
    async initializeDatabases() {
        return this.initialize();
    }
    /**
     * Connect to PostgreSQL
     */
    async connectPostgreSQL() {
        try {
            // Test PostgreSQL connection
            await database_1.pool.query('SELECT 1');
            this.postgresConnected = true;
            console.log('✅ PostgreSQL connection established');
        }
        catch (error) {
            this.postgresConnected = false;
            console.error('❌ PostgreSQL connection failed:', error);
            throw error;
        }
    }
    /**
     * Connect to MongoDB
     */
    async connectMongoDB() {
        try {
            await (0, mongodb_1.connectMongoDB)();
            this.mongodbConnected = true;
            console.log('✅ MongoDB connection established');
        }
        catch (error) {
            this.mongodbConnected = false;
            console.error('❌ MongoDB connection failed:', error);
            throw error;
        }
    }
    /**
     * Get database status
     */
    async getStatus() {
        const postgresStatus = await this.checkPostgreSQLStatus();
        const mongodbStatus = await this.checkMongoDBStatus();
        return {
            postgres: postgresStatus,
            mongodb: mongodbStatus,
            overall: {
                healthy: postgresStatus.connected && mongodbStatus.connected,
                timestamp: new Date().toISOString()
            }
        };
    }
    /**
     * Check PostgreSQL status
     */
    async checkPostgreSQLStatus() {
        try {
            await database_1.pool.query('SELECT 1');
            return {
                connected: true,
                status: 'healthy'
            };
        }
        catch (error) {
            return {
                connected: false,
                status: 'unhealthy',
                error: error.message
            };
        }
    }
    /**
     * Check MongoDB status
     */
    async checkMongoDBStatus() {
        try {
            if (mongodb_1.mongoose.connection.readyState === 1) {
                return {
                    connected: true,
                    status: 'healthy'
                };
            }
            else {
                return {
                    connected: false,
                    status: 'unhealthy',
                    error: 'Connection not established'
                };
            }
        }
        catch (error) {
            return {
                connected: false,
                status: 'unhealthy',
                error: error.message
            };
        }
    }
    /**
     * Execute PostgreSQL query
     */
    async queryPostgreSQL(text, params) {
        if (!this.postgresConnected) {
            throw new Error('PostgreSQL not connected');
        }
        return await database_1.pool.query(text, params);
    }
    /**
     * Get MongoDB collection
     */
    getMongoCollection(collectionName) {
        if (!this.mongodbConnected) {
            throw new Error('MongoDB not connected');
        }
        return mongodb_1.mongoose.connection.db.collection(collectionName);
    }
    /**
     * Get MongoDB model
     */
    getMongoModel(modelName) {
        if (!this.mongodbConnected) {
            throw new Error('MongoDB not connected');
        }
        return mongodb_1.mongoose.model(modelName);
    }
    /**
     * Execute PostgreSQL query
     */
    async query(sql, params) {
        if (!this.postgresConnected) {
            throw new Error('PostgreSQL not connected');
        }
        return await database_1.pool.query(sql, params);
    }
    /**
     * Close all database connections
     */
    async close() {
        try {
            await database_1.pool.end();
            await (0, mongodb_1.disconnectMongoDB)();
            this.postgresConnected = false;
            this.mongodbConnected = false;
            console.log('✅ All database connections closed');
        }
        catch (error) {
            console.error('❌ Error closing database connections:', error);
            throw error;
        }
    }
    /**
     * Alias for close method
     */
    async closeConnections() {
        return this.close();
    }
    /**
     * Health check for both databases
     */
    async healthCheck() {
        try {
            const status = await this.getStatus();
            return status.overall.healthy;
        }
        catch (error) {
            console.error('❌ Health check failed:', error);
            return false;
        }
    }
}
exports.DatabaseService = DatabaseService;
// Export singleton instance
exports.databaseService = DatabaseService.getInstance();
exports.default = exports.databaseService;
