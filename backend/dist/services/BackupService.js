"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupService = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const logger_1 = require("../utils/logger");
const mongodb_1 = require("../models/mongodb");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class BackupService {
    constructor() {
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
        };
        this.backupPath = this.config.storage.path;
    }
    static getInstance() {
        if (!BackupService.instance) {
            BackupService.instance = new BackupService();
        }
        return BackupService.instance;
    }
    /**
     * Create full backup of both databases
     */
    async createFullBackup() {
        const startTime = Date.now();
        const errors = [];
        const timestamp = new Date();
        const backupDir = (0, path_1.join)(this.backupPath, `backup_${timestamp.toISOString().replace(/[:.]/g, '-')}`);
        try {
            // Create backup directory
            await (0, promises_1.mkdir)(backupDir, { recursive: true });
            logger_1.logger.info(`Creating full backup in: ${backupDir}`);
            // Backup PostgreSQL
            if (this.config.postgresql.enabled) {
                try {
                    await this.backupPostgreSQL(backupDir);
                }
                catch (error) {
                    errors.push(`PostgreSQL backup failed: ${error.message}`);
                }
            }
            // Backup MongoDB
            if (this.config.mongodb.enabled) {
                try {
                    await this.backupMongoDB(backupDir);
                }
                catch (error) {
                    errors.push(`MongoDB backup failed: ${error.message}`);
                }
            }
            // Create backup metadata
            await this.createBackupMetadata(backupDir, timestamp, errors);
            // Compress backup if enabled
            let finalPath = backupDir;
            if (this.config.storage.compression) {
                finalPath = await this.compressBackup(backupDir);
            }
            // Calculate backup size
            const size = await this.calculateBackupSize(finalPath);
            // Clean up old backups
            await this.cleanupOldBackups();
            const duration = Date.now() - startTime;
            logger_1.logger.info(`Full backup completed in ${duration}ms`);
            return {
                success: errors.length === 0,
                backupPath: finalPath,
                size,
                timestamp,
                duration,
                errors
            };
        }
        catch (error) {
            logger_1.logger.error('Full backup failed:', error);
            return {
                success: false,
                backupPath: backupDir,
                size: 0,
                timestamp,
                duration: Date.now() - startTime,
                errors: [...errors, error.message]
            };
        }
    }
    /**
     * Backup PostgreSQL database
     */
    async backupPostgreSQL(backupDir) {
        const { host, port, database, username, password } = this.config.postgresql;
        const backupFile = (0, path_1.join)(backupDir, 'postgresql_backup.sql');
        const command = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -f "${backupFile}"`;
        logger_1.logger.info('Starting PostgreSQL backup...');
        await execAsync(command);
        logger_1.logger.info('PostgreSQL backup completed');
    }
    /**
     * Backup MongoDB database
     */
    async backupMongoDB(backupDir) {
        const { host, port, database, username, password } = this.config.mongodb;
        const backupDirMongo = (0, path_1.join)(backupDir, 'mongodb_backup');
        const command = `mongodump --host ${host}:${port} --db ${database} --username ${username} --password ${password} --out "${backupDirMongo}"`;
        logger_1.logger.info('Starting MongoDB backup...');
        await execAsync(command);
        logger_1.logger.info('MongoDB backup completed');
    }
    /**
     * Create backup metadata file
     */
    async createBackupMetadata(backupDir, timestamp, errors) {
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
        };
        const metadataFile = (0, path_1.join)(backupDir, 'backup_metadata.json');
        await (0, promises_1.writeFile)(metadataFile, JSON.stringify(metadata, null, 2));
    }
    /**
     * Compress backup directory
     */
    async compressBackup(backupDir) {
        const compressedFile = `${backupDir}.tar.gz`;
        const command = `tar -czf "${compressedFile}" -C "${backupDir}" .`;
        logger_1.logger.info('Compressing backup...');
        await execAsync(command);
        // Remove original directory
        await execAsync(`rm -rf "${backupDir}"`);
        logger_1.logger.info('Backup compressed successfully');
        return compressedFile;
    }
    /**
     * Calculate backup size
     */
    async calculateBackupSize(path) {
        try {
            const { stdout } = await execAsync(`du -sb "${path}"`);
            return parseInt(stdout.split('\t')[0]);
        }
        catch (error) {
            logger_1.logger.error('Failed to calculate backup size:', error);
            return 0;
        }
    }
    /**
     * Clean up old backups
     */
    async cleanupOldBackups() {
        try {
            const files = await (0, promises_1.readdir)(this.backupPath);
            const backupFiles = files
                .filter(file => file.startsWith('backup_'))
                .map(file => ({
                name: file,
                path: (0, path_1.join)(this.backupPath, file),
                mtime: 0 // Would need to get actual mtime
            }))
                .sort((a, b) => b.mtime - a.mtime);
            if (backupFiles.length > this.config.storage.maxBackups) {
                const filesToDelete = backupFiles.slice(this.config.storage.maxBackups);
                for (const file of filesToDelete) {
                    await (0, promises_1.unlink)(file.path);
                    logger_1.logger.info(`Deleted old backup: ${file.name}`);
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to cleanup old backups:', error);
        }
    }
    /**
     * Create incremental backup (only changed data)
     */
    async createIncrementalBackup(lastBackupTime) {
        const startTime = Date.now();
        const errors = [];
        const timestamp = new Date();
        const backupDir = (0, path_1.join)(this.backupPath, `incremental_backup_${timestamp.toISOString().replace(/[:.]/g, '-')}`);
        try {
            await (0, promises_1.mkdir)(backupDir, { recursive: true });
            logger_1.logger.info(`Creating incremental backup since: ${lastBackupTime.toISOString()}`);
            // Get changed data from PostgreSQL
            if (this.config.postgresql.enabled) {
                try {
                    await this.backupPostgreSQLIncremental(backupDir, lastBackupTime);
                }
                catch (error) {
                    errors.push(`PostgreSQL incremental backup failed: ${error.message}`);
                }
            }
            // Get changed data from MongoDB
            if (this.config.mongodb.enabled) {
                try {
                    await this.backupMongoDBIncremental(backupDir, lastBackupTime);
                }
                catch (error) {
                    errors.push(`MongoDB incremental backup failed: ${error.message}`);
                }
            }
            const duration = Date.now() - startTime;
            const size = await this.calculateBackupSize(backupDir);
            return {
                success: errors.length === 0,
                backupPath: backupDir,
                size,
                timestamp,
                duration,
                errors
            };
        }
        catch (error) {
            logger_1.logger.error('Incremental backup failed:', error);
            return {
                success: false,
                backupPath: backupDir,
                size: 0,
                timestamp,
                duration: Date.now() - startTime,
                errors: [...errors, error.message]
            };
        }
    }
    /**
     * Backup PostgreSQL incremental data
     */
    async backupPostgreSQLIncremental(backupDir, lastBackupTime) {
        const { host, port, database, username, password } = this.config.postgresql;
        const backupFile = (0, path_1.join)(backupDir, 'postgresql_incremental.sql');
        // Get tables with updated_at columns
        const tables = ['patients', 'visits', 'prescriptions', 'invoices', 'users'];
        const queries = tables.map(table => `SELECT * FROM ${table} WHERE updated_at > '${lastBackupTime.toISOString()}'`).join(';\n');
        await (0, promises_1.writeFile)(backupFile, queries);
        logger_1.logger.info('PostgreSQL incremental backup completed');
    }
    /**
     * Backup MongoDB incremental data
     */
    async backupMongoDBIncremental(backupDir, lastBackupTime) {
        // Get collections with data updated since last backup
        const collections = ['ClinicalData', 'Analytics', 'AuditLog', 'DocumentMetadata', 'SyncEvent'];
        for (const collectionName of collections) {
            const collection = mongodb_1.mongoModels[collectionName];
            const updatedData = await collection.find({
                $or: [
                    { created_at: { $gte: lastBackupTime } },
                    { updated_at: { $gte: lastBackupTime } },
                    { timestamp: { $gte: lastBackupTime } }
                ]
            });
            if (updatedData.length > 0) {
                const dataFile = (0, path_1.join)(backupDir, `${collectionName.toLowerCase()}_incremental.json`);
                await (0, promises_1.writeFile)(dataFile, JSON.stringify(updatedData, null, 2));
                logger_1.logger.info(`${collectionName} incremental backup: ${updatedData.length} documents`);
            }
        }
    }
    /**
     * List available backups
     */
    async listBackups() {
        try {
            const files = await (0, promises_1.readdir)(this.backupPath);
            const backups = [];
            for (const file of files) {
                if (file.startsWith('backup_') || file.startsWith('incremental_backup_')) {
                    const path = (0, path_1.join)(this.backupPath, file);
                    const size = await this.calculateBackupSize(path);
                    const timestamp = new Date(file.split('_').slice(1).join('_').replace(/-/g, ':').replace('.tar.gz', ''));
                    backups.push({
                        name: file,
                        path,
                        size,
                        timestamp,
                        type: file.startsWith('incremental_') ? 'incremental' : 'full'
                    });
                }
            }
            return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        }
        catch (error) {
            logger_1.logger.error('Failed to list backups:', error);
            return [];
        }
    }
    /**
     * Get backup service status
     */
    getStatus() {
        return {
            enabled: this.config.postgresql.enabled || this.config.mongodb.enabled,
            config: this.config,
            backupPath: this.backupPath
        };
    }
}
exports.BackupService = BackupService;
