# 🚀 Seth Medical Clinic CMS - Production Deployment Guide

## 📋 Overview

This guide provides comprehensive instructions for deploying the Seth Medical Clinic CMS with dual database support (PostgreSQL + MongoDB) in production environments.

## 🏗️ Architecture

### System Components
- **Frontend**: Next.js React application
- **Backend**: Node.js/Express.js API server
- **Databases**: PostgreSQL (relational) + MongoDB (document)
- **Cache**: Redis
- **Queue**: Bull (Redis-based)
- **Containerization**: Docker & Docker Compose

### Database Strategy
- **PostgreSQL**: Structured data (users, patients, visits, invoices, prescriptions)
- **MongoDB**: Unstructured data (clinical data, analytics, audit logs, sync events)
- **Real-time Sync**: Automatic synchronization between databases

## 🐳 Docker Deployment

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- 8GB+ RAM recommended
- 50GB+ disk space

### 1. Clone Repository
```bash
git clone <repository-url>
cd seth-clinic-cms
```

### 2. Environment Configuration
Create `.env` file in root directory:
```env
# Database Configuration
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=seth_clinic
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
DATABASE_URL=postgresql://postgres:your_secure_password@postgres:5432/seth_clinic

MONGODB_HOST=mongodb
MONGODB_PORT=27017
MONGODB_DATABASE=seth_clinic_mongo
MONGODB_USERNAME=admin
MONGODB_PASSWORD=your_secure_password
MONGODB_URL=mongodb://admin:your_secure_password@mongodb:27017/seth_clinic_mongo?authSource=admin

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# API Configuration
PORT=5000
NODE_ENV=production

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
CORS_CREDENTIALS=true

# Security Configuration
HELMET_ENABLED=true
CSP_ENABLED=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Service Configuration
DATA_SYNC_ENABLED=true
DATA_SYNC_INTERVAL_MS=5000
BACKUP_ENABLED=true
BACKUP_PATH=/app/backups
MAX_BACKUPS=10
BACKUP_COMPRESSION=true
PERFORMANCE_MONITORING_ENABLED=true
PERFORMANCE_MONITORING_INTERVAL_MS=30000
```

### 3. Deploy with Docker Compose
```bash
# Build and start all services
docker-compose up -d --build

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Initialize Databases
```bash
# Run database migrations
docker-compose exec backend npm run migrate

# Seed initial data
docker-compose exec backend npm run seed

# Test database connections
docker-compose exec backend npm run test:databases
```

## 🔧 Production Configuration

### 1. Database Optimization

#### PostgreSQL Configuration
```sql
-- Optimize PostgreSQL settings
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
SELECT pg_reload_conf();
```

#### MongoDB Configuration
```javascript
// MongoDB optimization settings
db.adminCommand({
  setParameter: 1,
  wiredTigerConcurrentReadTransactions: 128,
  wiredTigerConcurrentWriteTransactions: 128
})
```

### 2. Security Hardening

#### Environment Variables
- Use strong, unique passwords
- Rotate JWT secrets regularly
- Enable SSL/TLS for database connections
- Use environment-specific configurations

#### Network Security
- Use Docker networks for service isolation
- Configure firewall rules
- Enable HTTPS with SSL certificates
- Implement rate limiting

#### Database Security
- Use strong authentication
- Enable connection encryption
- Regular security updates
- Backup encryption

### 3. Monitoring & Logging

#### Health Checks
```bash
# Basic health check
curl http://localhost:5000/health

# Detailed health check
curl http://localhost:5000/api/health/detailed

# Kubernetes readiness probe
curl http://localhost:5000/api/health/ready

# Kubernetes liveness probe
curl http://localhost:5000/api/health/live
```

#### Performance Monitoring
```bash
# Start performance monitoring
curl -X POST http://localhost:5000/api/performance/start

# Get performance metrics
curl http://localhost:5000/api/performance/current

# Get performance summary
curl http://localhost:5000/api/performance/summary
```

#### Backup Management
```bash
# Create full backup
curl -X POST http://localhost:5000/api/backup/full

# Create incremental backup
curl -X POST http://localhost:5000/api/backup/incremental \
  -H "Content-Type: application/json" \
  -d '{"lastBackupTime": "2025-01-01T00:00:00Z"}'

# List available backups
curl http://localhost:5000/api/backup/list
```

## 📊 Production Monitoring

### 1. System Metrics
- **Memory Usage**: Monitor RAM consumption
- **CPU Usage**: Track processor utilization
- **Disk Space**: Monitor storage usage
- **Network I/O**: Track network traffic

### 2. Database Metrics
- **Connection Pool**: Monitor active connections
- **Query Performance**: Track slow queries
- **Index Usage**: Monitor index efficiency
- **Replication Lag**: Track sync delays

### 3. Application Metrics
- **Response Times**: Monitor API performance
- **Error Rates**: Track error frequencies
- **Throughput**: Monitor request rates
- **Queue Lengths**: Track sync queue sizes

## 🔄 Backup & Recovery

### 1. Automated Backups
```bash
# Schedule daily backups (crontab)
0 2 * * * docker-compose exec backend npm run backup:full
0 3 * * * docker-compose exec backend npm run backup:incremental
```

### 2. Backup Verification
```bash
# Test backup integrity
docker-compose exec backend npm run backup:verify

# Restore from backup
docker-compose exec backend npm run backup:restore --backup=backup_2025-01-01
```

### 3. Disaster Recovery
1. **Database Recovery**: Restore from latest backup
2. **Service Recovery**: Restart failed services
3. **Data Sync**: Re-sync databases if needed
4. **Validation**: Verify system integrity

## 🚀 Scaling & Performance

### 1. Horizontal Scaling
```yaml
# docker-compose.override.yml
version: '3.8'
services:
  backend:
    deploy:
      replicas: 3
    environment:
      - NODE_ENV=production
```

### 2. Load Balancing
```nginx
# nginx.conf
upstream backend {
    server backend1:5000;
    server backend2:5000;
    server backend3:5000;
}

server {
    listen 80;
    location / {
        proxy_pass http://backend;
    }
}
```

### 3. Database Scaling
- **PostgreSQL**: Read replicas, connection pooling
- **MongoDB**: Sharding, replica sets
- **Redis**: Cluster mode, persistence

## 🔍 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connectivity
docker-compose exec backend npm run test:databases

# Check database logs
docker-compose logs postgres
docker-compose logs mongodb
```

#### Service Health Issues
```bash
# Check service status
docker-compose ps

# Restart failed services
docker-compose restart backend

# Check service logs
docker-compose logs backend
```

#### Performance Issues
```bash
# Check performance metrics
curl http://localhost:5000/api/performance/current

# Check database performance
curl http://localhost:5000/api/analytics/system
```

### Log Analysis
```bash
# View application logs
docker-compose logs -f backend

# View database logs
docker-compose logs -f postgres
docker-compose logs -f mongodb

# View all logs
docker-compose logs -f
```

## 📈 Performance Optimization

### 1. Database Optimization
- **Indexing**: Create appropriate indexes
- **Query Optimization**: Optimize slow queries
- **Connection Pooling**: Configure pool sizes
- **Caching**: Implement Redis caching

### 2. Application Optimization
- **Code Splitting**: Optimize bundle sizes
- **Caching**: Implement response caching
- **Compression**: Enable gzip compression
- **CDN**: Use content delivery networks

### 3. Infrastructure Optimization
- **SSD Storage**: Use solid-state drives
- **Memory**: Increase RAM allocation
- **CPU**: Use high-performance processors
- **Network**: Optimize network configuration

## 🔐 Security Checklist

### Pre-Deployment
- [ ] Strong passwords configured
- [ ] JWT secrets rotated
- [ ] SSL certificates installed
- [ ] Firewall rules configured
- [ ] Security headers enabled

### Post-Deployment
- [ ] Health checks passing
- [ ] Monitoring active
- [ ] Backups working
- [ ] Logs being collected
- [ ] Updates scheduled

## 📞 Support & Maintenance

### Regular Maintenance
- **Daily**: Check health status, review logs
- **Weekly**: Review performance metrics, test backups
- **Monthly**: Security updates, capacity planning
- **Quarterly**: Disaster recovery testing

### Emergency Procedures
1. **Service Outage**: Check logs, restart services
2. **Database Issues**: Check connectivity, restore if needed
3. **Performance Issues**: Check metrics, scale if needed
4. **Security Issues**: Isolate, investigate, patch

## 🎯 Success Metrics

### Performance Targets
- **Response Time**: < 200ms for API calls
- **Uptime**: > 99.9% availability
- **Error Rate**: < 0.1% error rate
- **Throughput**: > 1000 requests/minute

### Monitoring Alerts
- **High Memory Usage**: > 80%
- **High CPU Usage**: > 80%
- **Slow Queries**: > 1000ms
- **Error Rate**: > 1%
- **Disk Space**: > 90%

---

## 🚀 Quick Start Commands

```bash
# Deploy to production
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Test system
curl http://localhost:5000/health

# Run tests
docker-compose exec backend npm run test:production

# Create backup
curl -X POST http://localhost:5000/api/backup/full

# Monitor performance
curl http://localhost:5000/api/performance/current
```

**The system is now production-ready with enterprise-grade capabilities!** 🎉
