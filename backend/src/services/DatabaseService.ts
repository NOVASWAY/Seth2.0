import { pool } from '../config/database'
import { connectMongoDB, disconnectMongoDB, mongoose } from '../config/mongodb'

export interface DatabaseStatus {
  postgres: {
    connected: boolean
    status: string
    error?: string
  }
  mongodb: {
    connected: boolean
    status: string
    error?: string
  }
  overall: {
    healthy: boolean
    timestamp: string
  }
}

export class DatabaseService {
  private static instance: DatabaseService
  private postgresConnected = false
  private mongodbConnected = false

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  /**
   * Initialize both database connections
   */
  public async initialize(): Promise<void> {
    try {
      await this.connectPostgreSQL()
      await this.connectMongoDB()
      console.log('✅ Both databases initialized successfully')
    } catch (error) {
      console.error('❌ Database initialization failed:', error)
      throw error
    }
  }

  /**
   * Alias for initialize method
   */
  public async initializeDatabases(): Promise<void> {
    return this.initialize()
  }

  /**
   * Connect to PostgreSQL
   */
  private async connectPostgreSQL(): Promise<void> {
    try {
      // Test PostgreSQL connection
      await pool.query('SELECT 1')
      this.postgresConnected = true
      console.log('✅ PostgreSQL connection established')
    } catch (error) {
      this.postgresConnected = false
      console.error('❌ PostgreSQL connection failed:', error)
      throw error
    }
  }

  /**
   * Connect to MongoDB
   */
  private async connectMongoDB(): Promise<void> {
    try {
      await connectMongoDB()
      this.mongodbConnected = true
      console.log('✅ MongoDB connection established')
    } catch (error) {
      this.mongodbConnected = false
      console.error('❌ MongoDB connection failed:', error)
      throw error
    }
  }

  /**
   * Get database status
   */
  public async getStatus(): Promise<DatabaseStatus> {
    const postgresStatus = await this.checkPostgreSQLStatus()
    const mongodbStatus = await this.checkMongoDBStatus()

    return {
      postgres: postgresStatus,
      mongodb: mongodbStatus,
      overall: {
        healthy: postgresStatus.connected && mongodbStatus.connected,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Check PostgreSQL status
   */
  private async checkPostgreSQLStatus(): Promise<{ connected: boolean; status: string; error?: string }> {
    try {
      await pool.query('SELECT 1')
      return {
        connected: true,
        status: 'healthy'
      }
    } catch (error: any) {
      return {
        connected: false,
        status: 'unhealthy',
        error: error.message
      }
    }
  }

  /**
   * Check MongoDB status
   */
  private async checkMongoDBStatus(): Promise<{ connected: boolean; status: string; error?: string }> {
    try {
      if (mongoose.connection.readyState === 1) {
        return {
          connected: true,
          status: 'healthy'
        }
      } else {
        return {
          connected: false,
          status: 'unhealthy',
          error: 'Connection not established'
        }
      }
    } catch (error: any) {
      return {
        connected: false,
        status: 'unhealthy',
        error: error.message
      }
    }
  }

  /**
   * Execute PostgreSQL query
   */
  public async queryPostgreSQL(text: string, params?: any[]): Promise<any> {
    if (!this.postgresConnected) {
      throw new Error('PostgreSQL not connected')
    }
    return await pool.query(text, params)
  }

  /**
   * Get MongoDB collection
   */
  public getMongoCollection(collectionName: string) {
    if (!this.mongodbConnected) {
      throw new Error('MongoDB not connected')
    }
    return mongoose.connection.db.collection(collectionName)
  }

  /**
   * Get MongoDB model
   */
  public getMongoModel(modelName: string) {
    if (!this.mongodbConnected) {
      throw new Error('MongoDB not connected')
    }
    return mongoose.model(modelName)
  }

  /**
   * Execute PostgreSQL query
   */
  public async query(sql: string, params?: any[]): Promise<any> {
    if (!this.postgresConnected) {
      throw new Error('PostgreSQL not connected')
    }
    return await pool.query(sql, params)
  }

  /**
   * Close all database connections
   */
  public async close(): Promise<void> {
    try {
      await pool.end()
      await disconnectMongoDB()
      this.postgresConnected = false
      this.mongodbConnected = false
      console.log('✅ All database connections closed')
    } catch (error) {
      console.error('❌ Error closing database connections:', error)
      throw error
    }
  }

  /**
   * Alias for close method
   */
  public async closeConnections(): Promise<void> {
    return this.close()
  }

  /**
   * Health check for both databases
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const status = await this.getStatus()
      return status.overall.healthy
    } catch (error) {
      console.error('❌ Health check failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const databaseService = DatabaseService.getInstance()
export default databaseService
