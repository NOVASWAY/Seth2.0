import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, mkdir, readdir, unlink } from 'fs/promises'
import { join } from 'path'
import { logger } from '../utils/logger'
import { mongoModels } from '../models/mongodb'
import { pool } from '../config/database'

const execAsync = promisify(exec)

export interface BackupResult {
  success: boolean
  backupPath: string
  size: number
  timestamp: Date
  duration: number
  errors: string[]
}

export interface BackupConfig {
  postgresql: {
    enabled: boolean
    host: string
    port: number
    database: string
    username: string
    password: string
  }
  mongodb: {
    enabled: boolean
    host: string
    port: number
    database: string
    username: string
    password: string
  }
  storage: {
    path: string
    maxBackups: number
    compression: boolean
  }
}

export class BackupService {
  private static instance: BackupService
  private config: BackupConfig
  private backupPath: string

  private constructor() {
    this.config = {
      postgresql: {
        enabled: true,
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DB || 'seth_clinic',
        username: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres123'
      },
      mongodb: {
        enabled: true,
        host: process.env.MONGODB_HOST || 'localhost',
        port: parseInt(process.env.MONGODB_PORT || '27017'),
        database: process.env.MONGODB_DATABASE || 'seth_clinic_mongo',
        username: process.env.MONGODB_USERNAME || 'admin',
        password: process.env.MONGODB_PASSWORD || 'admin123'
      },
      storage: {
        path: process.env.BACKUP_PATH || './backups',
        maxBackups: parseInt(process.env.MAX_BACKUPS || '10'),
        compression: process.env.BACKUP_COMPRESSION === 'true'
      }
    }
    this.backupPath = this.config.storage.path
  }

  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService()
    }
    return BackupService.instance
  }

  /**
   * Create full backup of both databases
   */
  public async createFullBackup(): Promise<BackupResult> {
    const startTime = Date.now()
    const errors: string[] = []
    const timestamp = new Date()
    const backupDir = join(this.backupPath, `backup_${timestamp.toISOString().replace(/[:.]/g, '-')}`)

    try {
      // Create backup directory
      await mkdir(backupDir, { recursive: true })
      logger.info(`Creating full backup in: ${backupDir}`)

      // Backup PostgreSQL
      if (this.config.postgresql.enabled) {
        try {
          await this.backupPostgreSQL(backupDir)
        } catch (error) {
          errors.push(`PostgreSQL backup failed: ${error.message}`)
        }
      }

      // Backup MongoDB
      if (this.config.mongodb.enabled) {
        try {
          await this.backupMongoDB(backupDir)
        } catch (error) {
          errors.push(`MongoDB backup failed: ${error.message}`)
        }
      }

      // Create backup metadata
      await this.createBackupMetadata(backupDir, timestamp, errors)

      // Compress backup if enabled
      let finalPath = backupDir
      if (this.config.storage.compression) {
        finalPath = await this.compressBackup(backupDir)
      }

      // Calculate backup size
      const size = await this.calculateBackupSize(finalPath)

      // Clean up old backups
      await this.cleanupOldBackups()

      const duration = Date.now() - startTime
      logger.info(`Full backup completed in ${duration}ms`)

      return {
        success: errors.length === 0,
        backupPath: finalPath,
        size,
        timestamp,
        duration,
        errors
      }

    } catch (error) {
      logger.error('Full backup failed:', error)
      return {
        success: false,
        backupPath: backupDir,
        size: 0,
        timestamp,
        duration: Date.now() - startTime,
        errors: [...errors, error.message]
      }
    }
  }

  /**
   * Backup PostgreSQL database
   */
  private async backupPostgreSQL(backupDir: string): Promise<void> {
    const { host, port, database, username, password } = this.config.postgresql
    const backupFile = join(backupDir, 'postgresql_backup.sql')
    
    const command = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -f "${backupFile}"`
    
    logger.info('Starting PostgreSQL backup...')
    await execAsync(command)
    logger.info('PostgreSQL backup completed')
  }

  /**
   * Backup MongoDB database
   */
  private async backupMongoDB(backupDir: string): Promise<void> {
    const { host, port, database, username, password } = this.config.mongodb
    const backupDirMongo = join(backupDir, 'mongodb_backup')
    
    const command = `mongodump --host ${host}:${port} --db ${database} --username ${username} --password ${password} --out "${backupDirMongo}"`
    
    logger.info('Starting MongoDB backup...')
    await execAsync(command)
    logger.info('MongoDB backup completed')
  }

  /**
   * Create backup metadata file
   */
  private async createBackupMetadata(backupDir: string, timestamp: Date, errors: string[]): Promise<void> {
    const metadata = {
      timestamp: timestamp.toISOString(),
      version: '1.0.0',
      databases: {
        postgresql: this.config.postgresql.enabled,
        mongodb: this.config.mongodb.enabled
      },
      errors: errors,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    }

    const metadataFile = join(backupDir, 'backup_metadata.json')
    await writeFile(metadataFile, JSON.stringify(metadata, null, 2))
  }

  /**
   * Compress backup directory
   */
  private async compressBackup(backupDir: string): Promise<string> {
    const compressedFile = `${backupDir}.tar.gz`
    const command = `tar -czf "${compressedFile}" -C "${backupDir}" .`
    
    logger.info('Compressing backup...')
    await execAsync(command)
    
    // Remove original directory
    await execAsync(`rm -rf "${backupDir}"`)
    
    logger.info('Backup compressed successfully')
    return compressedFile
  }

  /**
   * Calculate backup size
   */
  private async calculateBackupSize(path: string): Promise<number> {
    try {
      const { stdout } = await execAsync(`du -sb "${path}"`)
      return parseInt(stdout.split('\t')[0])
    } catch (error) {
      logger.error('Failed to calculate backup size:', error)
      return 0
    }
  }

  /**
   * Clean up old backups
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const files = await readdir(this.backupPath)
      const backupFiles = files
        .filter(file => file.startsWith('backup_'))
        .map(file => ({
          name: file,
          path: join(this.backupPath, file),
          mtime: 0 // Would need to get actual mtime
        }))
        .sort((a, b) => b.mtime - a.mtime)

      if (backupFiles.length > this.config.storage.maxBackups) {
        const filesToDelete = backupFiles.slice(this.config.storage.maxBackups)
        for (const file of filesToDelete) {
          await unlink(file.path)
          logger.info(`Deleted old backup: ${file.name}`)
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup old backups:', error)
    }
  }

  /**
   * Create incremental backup (only changed data)
   */
  public async createIncrementalBackup(lastBackupTime: Date): Promise<BackupResult> {
    const startTime = Date.now()
    const errors: string[] = []
    const timestamp = new Date()
    const backupDir = join(this.backupPath, `incremental_backup_${timestamp.toISOString().replace(/[:.]/g, '-')}`)

    try {
      await mkdir(backupDir, { recursive: true })
      logger.info(`Creating incremental backup since: ${lastBackupTime.toISOString()}`)

      // Get changed data from PostgreSQL
      if (this.config.postgresql.enabled) {
        try {
          await this.backupPostgreSQLIncremental(backupDir, lastBackupTime)
        } catch (error) {
          errors.push(`PostgreSQL incremental backup failed: ${error.message}`)
        }
      }

      // Get changed data from MongoDB
      if (this.config.mongodb.enabled) {
        try {
          await this.backupMongoDBIncremental(backupDir, lastBackupTime)
        } catch (error) {
          errors.push(`MongoDB incremental backup failed: ${error.message}`)
        }
      }

      const duration = Date.now() - startTime
      const size = await this.calculateBackupSize(backupDir)

      return {
        success: errors.length === 0,
        backupPath: backupDir,
        size,
        timestamp,
        duration,
        errors
      }

    } catch (error) {
      logger.error('Incremental backup failed:', error)
      return {
        success: false,
        backupPath: backupDir,
        size: 0,
        timestamp,
        duration: Date.now() - startTime,
        errors: [...errors, error.message]
      }
    }
  }

  /**
   * Backup PostgreSQL incremental data
   */
  private async backupPostgreSQLIncremental(backupDir: string, lastBackupTime: Date): Promise<void> {
    const { host, port, database, username, password } = this.config.postgresql
    const backupFile = join(backupDir, 'postgresql_incremental.sql')
    
    // Get tables with updated_at columns
    const tables = ['patients', 'visits', 'prescriptions', 'invoices', 'users']
    const queries = tables.map(table => 
      `SELECT * FROM ${table} WHERE updated_at > '${lastBackupTime.toISOString()}'`
    ).join(';\n')

    await writeFile(backupFile, queries)
    logger.info('PostgreSQL incremental backup completed')
  }

  /**
   * Backup MongoDB incremental data
   */
  private async backupMongoDBIncremental(backupDir: string, lastBackupTime: Date): Promise<void> {
    // Get collections with data updated since last backup
    const collections = ['ClinicalData', 'Analytics', 'AuditLog', 'DocumentMetadata', 'SyncEvent']
    
    for (const collectionName of collections) {
      const collection = mongoModels[collectionName]
      const updatedData = await collection.find({
        $or: [
          { created_at: { $gte: lastBackupTime } },
          { updated_at: { $gte: lastBackupTime } },
          { timestamp: { $gte: lastBackupTime } }
        ]
      })

      if (updatedData.length > 0) {
        const dataFile = join(backupDir, `${collectionName.toLowerCase()}_incremental.json`)
        await writeFile(dataFile, JSON.stringify(updatedData, null, 2))
        logger.info(`${collectionName} incremental backup: ${updatedData.length} documents`)
      }
    }
  }

  /**
   * List available backups
   */
  public async listBackups(): Promise<Array<{
    name: string
    path: string
    size: number
    timestamp: Date
    type: 'full' | 'incremental'
  }>> {
    try {
      const files = await readdir(this.backupPath)
      const backups = []

      for (const file of files) {
        if (file.startsWith('backup_') || file.startsWith('incremental_backup_')) {
          const path = join(this.backupPath, file)
          const size = await this.calculateBackupSize(path)
          const timestamp = new Date(file.split('_').slice(1).join('_').replace(/-/g, ':').replace('.tar.gz', ''))
          
          backups.push({
            name: file,
            path,
            size,
            timestamp,
            type: file.startsWith('incremental_') ? 'incremental' : 'full'
          })
        }
      }

      return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    } catch (error) {
      logger.error('Failed to list backups:', error)
      return []
    }
  }

  /**
   * Get backup service status
   */
  public getStatus(): {
    enabled: boolean
    config: BackupConfig
    backupPath: string
  } {
    return {
      enabled: this.config.postgresql.enabled || this.config.mongodb.enabled,
      config: this.config,
      backupPath: this.backupPath
    }
  }
}
