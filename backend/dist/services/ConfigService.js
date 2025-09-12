"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigService = void 0;
const logger_1 = require("../utils/logger");
class ConfigService {
    constructor() {
        this.config = this.loadConfiguration();
    }
    static getInstance() {
        if (!ConfigService.instance) {
            ConfigService.instance = new ConfigService();
        }
        return ConfigService.instance;
    }
    /**
     * Load configuration from environment variables
     */
    loadConfiguration() {
        return {
            database: {
                postgresql: {
                    host: process.env.POSTGRES_HOST || 'localhost',
                    port: parseInt(process.env.POSTGRES_PORT || '5432'),
                    database: process.env.POSTGRES_DB || 'seth_clinic',
                    username: process.env.POSTGRES_USER || 'postgres',
                    password: process.env.POSTGRES_PASSWORD || 'postgres123',
                    ssl: process.env.POSTGRES_SSL === 'true',
                    maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20')
                },
                mongodb: {
                    host: process.env.MONGODB_HOST || 'localhost',
                    port: parseInt(process.env.MONGODB_PORT || '27017'),
                    database: process.env.MONGODB_DATABASE || 'seth_clinic_mongo',
                    username: process.env.MONGODB_USERNAME || 'admin',
                    password: process.env.MONGODB_PASSWORD || 'admin123',
                    ssl: process.env.MONGODB_SSL === 'true',
                    maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10')
                }
            },
            services: {
                dataSync: {
                    enabled: process.env.DATA_SYNC_ENABLED !== 'false',
                    intervalMs: parseInt(process.env.DATA_SYNC_INTERVAL_MS || '5000'),
                    maxQueueSize: parseInt(process.env.DATA_SYNC_MAX_QUEUE_SIZE || '1000')
                },
                backup: {
                    enabled: process.env.BACKUP_ENABLED !== 'false',
                    path: process.env.BACKUP_PATH || './backups',
                    maxBackups: parseInt(process.env.MAX_BACKUPS || '10'),
                    compression: process.env.BACKUP_COMPRESSION === 'true',
                    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *' // Daily at 2 AM
                },
                performanceMonitoring: {
                    enabled: process.env.PERFORMANCE_MONITORING_ENABLED !== 'false',
                    intervalMs: parseInt(process.env.PERFORMANCE_MONITORING_INTERVAL_MS || '30000'),
                    maxMetricsHistory: parseInt(process.env.PERFORMANCE_MONITORING_MAX_HISTORY || '1000')
                },
                api: {
                    port: parseInt(process.env.PORT || '5000'),
                    cors: {
                        origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
                        credentials: process.env.CORS_CREDENTIALS === 'true'
                    },
                    rateLimit: {
                        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
                        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
                    }
                }
            },
            security: {
                jwt: {
                    secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'your-secret-key'),
                    expiresIn: process.env.JWT_EXPIRES_IN || (process.env.NODE_ENV === 'production' ? '15m' : '24h'),
                    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
                },
                bcrypt: {
                    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || (process.env.NODE_ENV === 'production' ? '14' : '12'))
                },
                cors: {
                    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : (process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000']),
                    credentials: process.env.CORS_CREDENTIALS === 'true'
                },
                helmet: {
                    enabled: process.env.HELMET_ENABLED !== 'false',
                    contentSecurityPolicy: process.env.CSP_ENABLED === 'true' || process.env.NODE_ENV === 'production'
                }
            }
        };
    }
    /**
     * Get database configuration
     */
    getDatabaseConfig() {
        return this.config.database;
    }
    /**
     * Get services configuration
     */
    getServicesConfig() {
        return this.config.services;
    }
    /**
     * Get security configuration
     */
    getSecurityConfig() {
        return this.config.security;
    }
    /**
     * Get full configuration
     */
    getFullConfig() {
        return this.config;
    }
    /**
     * Validate configuration
     */
    validateConfig() {
        const errors = [];
        // Validate required environment variables
        const requiredVars = [
            'POSTGRES_PASSWORD',
            'MONGODB_PASSWORD',
            'JWT_SECRET'
        ];
        for (const varName of requiredVars) {
            if (!process.env[varName]) {
                errors.push(`Missing required environment variable: ${varName}`);
            }
        }
        // Validate database configuration
        const dbConfig = this.config.database;
        if (dbConfig.postgresql.port < 1 || dbConfig.postgresql.port > 65535) {
            errors.push('Invalid PostgreSQL port number');
        }
        if (dbConfig.mongodb.port < 1 || dbConfig.mongodb.port > 65535) {
            errors.push('Invalid MongoDB port number');
        }
        // Validate service configuration
        const servicesConfig = this.config.services;
        if (servicesConfig.dataSync.intervalMs < 1000) {
            errors.push('Data sync interval must be at least 1000ms');
        }
        if (servicesConfig.performanceMonitoring.intervalMs < 5000) {
            errors.push('Performance monitoring interval must be at least 5000ms');
        }
        // Validate security configuration
        const securityConfig = this.config.security;
        if (securityConfig.jwt.secret === 'your-secret-key' || securityConfig.jwt.secret === '') {
            errors.push('JWT secret must be set to a secure value in production');
        }
        if (process.env.NODE_ENV === 'production') {
            // Production-specific validations
            if (!process.env.MPESA_CONSUMER_KEY || process.env.MPESA_CONSUMER_KEY === 'your_actual_consumer_key_here') {
                errors.push('M-Pesa consumer key must be configured for production');
            }
            if (!process.env.MPESA_CONSUMER_SECRET || process.env.MPESA_CONSUMER_SECRET === 'your_actual_consumer_secret_here') {
                errors.push('M-Pesa consumer secret must be configured for production');
            }
            if (!process.env.ADMIN_EMAIL || process.env.ADMIN_EMAIL === 'admin@yourdomain.com') {
                errors.push('Admin email must be configured for production');
            }
            if (securityConfig.cors.origin.length === 0) {
                errors.push('CORS origins must be configured for production');
            }
        }
        if (securityConfig.bcrypt.saltRounds < 10) {
            errors.push('BCrypt salt rounds must be at least 10');
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
    /**
     * Get configuration summary for logging
     */
    getConfigSummary() {
        return {
            environment: process.env.NODE_ENV || 'development',
            databases: {
                postgresql: !!this.config.database.postgresql.password,
                mongodb: !!this.config.database.mongodb.password
            },
            services: {
                dataSync: this.config.services.dataSync.enabled,
                backup: this.config.services.backup.enabled,
                performanceMonitoring: this.config.services.performanceMonitoring.enabled
            },
            security: {
                jwt: !!this.config.security.jwt.secret,
                cors: this.config.security.cors.origin.length > 0,
                helmet: this.config.security.helmet.enabled
            }
        };
    }
    /**
     * Log configuration on startup
     */
    logConfiguration() {
        const summary = this.getConfigSummary();
        const validation = this.validateConfig();
        logger_1.logger.info('Configuration loaded:', summary);
        if (!validation.valid) {
            logger_1.logger.warn('Configuration validation failed:', validation.errors);
        }
        else {
            logger_1.logger.info('Configuration validation passed');
        }
    }
    /**
     * Get environment-specific configuration
     */
    getEnvironmentConfig() {
        const env = process.env.NODE_ENV || 'development';
        const baseConfig = {
            development: {
                logLevel: 'debug',
                enableCors: true,
                enableHelmet: false,
                enableRateLimit: false
            },
            production: {
                logLevel: 'info',
                enableCors: true,
                enableHelmet: true,
                enableRateLimit: true
            },
            test: {
                logLevel: 'error',
                enableCors: false,
                enableHelmet: false,
                enableRateLimit: false
            }
        };
        return baseConfig[env] || baseConfig.development;
    }
}
exports.ConfigService = ConfigService;
