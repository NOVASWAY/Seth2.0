/**
 * Seth Medical Clinic CMS - Centralized System Configuration
 * 
 * This file provides a single source of truth for all system configurations,
 * making it easy to manage different environments while maintaining security.
 */

const path = require('path');
const fs = require('fs');

class SystemConfig {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.configPath = path.join(__dirname, '..');
    this.loadConfiguration();
  }

  /**
   * Load configuration based on environment
   */
  loadConfiguration() {
    const envFile = this.environment === 'production' 
      ? '.env.production' 
      : '.env';
    
    const envPath = path.join(this.configPath, envFile);
    
    if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath });
    }
    
    this.validateConfiguration();
  }

  /**
   * Validate that all required configuration is present
   */
  validateConfiguration() {
    const required = this.getRequiredVariables();
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  /**
   * Get all required environment variables
   */
  getRequiredVariables() {
    return [
      'POSTGRES_PASSWORD',
      'REDIS_PASSWORD', 
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'MPESA_CONSUMER_KEY',
      'MPESA_CONSUMER_SECRET',
      'SHA_API_KEY'
    ];
  }

  /**
   * Database configuration
   */
  get database() {
    return {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT) || 5432,
      database: process.env.POSTGRES_DB || 'seth_clinic',
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD,
      url: `postgresql://${this.database.username}:${this.database.password}@${this.database.host}:${this.database.port}/${this.database.database}`,
      ssl: this.environment === 'production' ? { rejectUnauthorized: false } : false
    };
  }

  /**
   * Redis configuration
   */
  get redis() {
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      url: `redis://:${this.redis.password}@${this.redis.host}:${this.redis.port}`
    };
  }

  /**
   * Authentication configuration
   */
  get auth() {
    return {
      jwtSecret: process.env.JWT_SECRET,
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
      maxLoginAttempts: 5,
      lockoutDuration: 30 * 60 * 1000, // 30 minutes
      passwordMinLength: 8,
      requireMFA: this.environment === 'production'
    };
  }

  /**
   * Application configuration
   */
  get app() {
    return {
      name: 'Seth Medical Clinic CMS',
      version: process.env.APP_VERSION || '1.0.0',
      environment: this.environment,
      port: parseInt(process.env.BACKEND_PORT) || 5000,
      frontendPort: parseInt(process.env.FRONTEND_PORT) || 3000,
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      logLevel: process.env.LOG_LEVEL || 'info',
      enableAuditLogging: process.env.ENABLE_AUDIT_LOGGING === 'true',
      autoSaveInterval: parseInt(process.env.AUTO_SAVE_INTERVAL) || 30000
    };
  }

  /**
   * Currency configuration
   */
  get currency() {
    return {
      code: process.env.DEFAULT_CURRENCY || 'KES',
      symbol: process.env.CURRENCY_SYMBOL || 'KES',
      locale: process.env.CURRENCY_LOCALE || 'en-KE',
      decimalPlaces: 2
    };
  }

  /**
   * M-Pesa configuration
   */
  get mpesa() {
    return {
      environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
      consumerKey: process.env.MPESA_CONSUMER_KEY,
      consumerSecret: process.env.MPESA_CONSUMER_SECRET,
      shortcode: process.env.MPESA_SHORTCODE,
      passkey: process.env.MPESA_PASSKEY,
      callbackUrl: process.env.MPESA_CALLBACK_URL,
      timeout: 30000
    };
  }

  /**
   * SHA Insurance configuration
   */
  get sha() {
    return {
      apiUrl: process.env.SHA_API_URL,
      apiKey: process.env.SHA_API_KEY,
      clientId: process.env.SHA_CLIENT_ID,
      clientSecret: process.env.SHA_CLIENT_SECRET,
      providerCode: process.env.SHA_PROVIDER_CODE || 'CLINIC001',
      providerName: process.env.SHA_PROVIDER_NAME || 'Seth Medical Clinic',
      facilityLevel: process.env.SHA_FACILITY_LEVEL || 'Level2',
      timeout: parseInt(process.env.SHA_TIMEOUT) || 30000,
      requireInvoiceBeforeSubmission: process.env.SHA_REQUIRE_INVOICE_BEFORE_SUBMISSION === 'true',
      autoSubmitClaims: process.env.SHA_AUTO_SUBMIT_CLAIMS === 'true',
      paymentCheckIntervalHours: parseInt(process.env.SHA_PAYMENT_CHECK_INTERVAL_HOURS) || 24,
      exportRetentionDays: parseInt(process.env.SHA_EXPORT_RETENTION_DAYS) || 90,
      documentMaxSizeMB: parseInt(process.env.SHA_DOCUMENT_MAX_SIZE_MB) || 10,
      batchSizeLimit: parseInt(process.env.SHA_BATCH_SIZE_LIMIT) || 100
    };
  }

  /**
   * Security configuration
   */
  get security() {
    return {
      rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
      rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      authRateLimitMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 5,
      sessionSecret: process.env.SESSION_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
      enableCSRF: this.environment === 'production',
      enableXSSProtection: true,
      enableHSTS: this.environment === 'production'
    };
  }

  /**
   * Monitoring configuration
   */
  get monitoring() {
    return {
      enableMetrics: process.env.ENABLE_METRICS === 'true',
      metricsPort: parseInt(process.env.METRICS_PORT) || 9090,
      logFormat: process.env.LOG_FORMAT || 'json',
      logFilePath: process.env.LOG_FILE_PATH || './logs/app.log',
      healthCheckInterval: 30000, // 30 seconds
      alertThresholds: {
        cpu: 80,
        memory: 85,
        disk: 90,
        responseTime: 5000
      }
    };
  }

  /**
   * Get configuration for specific service
   */
  getServiceConfig(serviceName) {
    const configs = {
      database: this.database,
      redis: this.redis,
      auth: this.auth,
      app: this.app,
      currency: this.currency,
      mpesa: this.mpesa,
      sha: this.sha,
      security: this.security,
      monitoring: this.monitoring
    };

    return configs[serviceName] || {};
  }

  /**
   * Export configuration for frontend
   */
  getPublicConfig() {
    return {
      app: {
        name: this.app.name,
        version: this.app.version,
        environment: this.app.environment
      },
      currency: this.currency,
      apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    };
  }

  /**
   * Validate system health
   */
  async validateSystemHealth() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {}
    };

    try {
      // Check database connection
      health.services.database = await this.checkDatabaseHealth();
      
      // Check Redis connection
      health.services.redis = await this.checkRedisHealth();
      
      // Check external services
      health.services.mpesa = await this.checkMpesaHealth();
      health.services.sha = await this.checkShaHealth();
      
      // Overall status
      const allHealthy = Object.values(health.services).every(service => service.status === 'healthy');
      health.status = allHealthy ? 'healthy' : 'degraded';
      
    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }

  async checkDatabaseHealth() {
    // Implementation would check actual database connection
    return { status: 'healthy', responseTime: 50 };
  }

  async checkRedisHealth() {
    // Implementation would check actual Redis connection
    return { status: 'healthy', responseTime: 10 };
  }

  async checkMpesaHealth() {
    // Implementation would check M-Pesa API availability
    return { status: 'healthy', responseTime: 200 };
  }

  async checkShaHealth() {
    // Implementation would check SHA API availability
    return { status: 'healthy', responseTime: 300 };
  }
}

// Export singleton instance
module.exports = new SystemConfig();
