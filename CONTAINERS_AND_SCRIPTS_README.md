# Seth Clinic CMS - Containers and Scripts Documentation

## 🐳 Docker Container Architecture

### **Development Environment**
- **PostgreSQL 15**: Primary relational database
- **Redis 7**: Caching and job queue
- **MongoDB 7**: Document database for analytics
- **Backend**: Node.js API with TypeScript
- **Worker**: Background job processor
- **Frontend**: Next.js 15 with React 18

### **Production Environment**
- **Optimized Images**: Multi-stage builds for smaller size
- **Resource Limits**: Memory and CPU constraints
- **Health Checks**: Comprehensive monitoring
- **Restart Policies**: Automatic recovery
- **Security**: Non-root users, minimal attack surface

---

## 🚀 Quick Start Commands

### **Development Setup**
```bash
# Complete sorting system setup
npm run sorting:setup

# Start development environment
npm run docker:dev

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

### **Production Deployment**
```bash
# Deploy to production
npm run deploy:sorting

# View production logs
npm run docker:logs:prod

# Stop production services
npm run docker:down:prod
```

---

## 📋 Available Scripts

### **Sorting System Scripts**
```bash
# Setup complete sorting system
npm run sorting:setup

# Test sorting functionality
npm run sorting:test

# Check system health
npm run sorting:health

# Monitor performance
npm run sorting:performance

# Create backup
npm run sorting:backup

# System maintenance
npm run sorting:maintenance

# Deploy to production
npm run deploy:sorting
```

### **Backup and Restore Scripts**
```bash
# Create full system backup
npm run backup:full

# Restore from backup
npm run backup:restore <backup_file>

# List available backups
npm run backup:list

# Show backup information
npm run backup:info <backup_file>

# Clean old backups
npm run backup:clean
```

### **Monitoring Scripts**
```bash
# Monitor sorting system
npm run monitor:sorting

# Health check
npm run sorting:health

# Performance monitoring
npm run sorting:performance
```

---

## 🐳 Docker Compose Files

### **docker-compose.yml**
- **Purpose**: Development environment
- **Features**: Hot reload, debugging, development tools
- **Databases**: PostgreSQL, Redis, MongoDB
- **Services**: Backend, Worker, Frontend

### **docker-compose.prod.yml**
- **Purpose**: Production environment
- **Features**: Optimized builds, resource limits, security
- **Databases**: Production-optimized configurations
- **Services**: Production-ready containers

### **docker-compose.override.yml**
- **Purpose**: Development overrides
- **Features**: Sorting system optimizations, debugging
- **Performance**: Enhanced for sorting operations
- **Monitoring**: Additional health checks

---

## 🔧 Container Configuration

### **Backend Container**
```yaml
environment:
  NODE_ENV: development/production
  DATABASE_URL: postgresql://postgres:password@postgres:5432/seth_clinic
  MONGODB_URL: mongodb://admin:password@mongodb:27017/seth_clinic_mongo
  REDIS_URL: redis://:password@redis:6379
  JWT_SECRET: your-jwt-secret
  SORTING_DEBUG: true  # Development only
  SORTING_CACHE_TTL: 300
  SORTING_MAX_RESULTS: 1000
```

### **Frontend Container**
```yaml
environment:
  NEXT_PUBLIC_API_URL: http://localhost:5000/api
  NEXT_PUBLIC_ENVIRONMENT: development/production
  NEXT_PUBLIC_SORTING_DEBUG: true  # Development only
  NEXT_PUBLIC_SORTING_CACHE_TTL: 300
```

### **Database Containers**
```yaml
# PostgreSQL
environment:
  POSTGRES_DB: seth_clinic
  POSTGRES_USER: postgres
  POSTGRES_PASSWORD: password
  # Performance optimizations
  POSTGRES_SHARED_BUFFERS: 256MB
  POSTGRES_EFFECTIVE_CACHE_SIZE: 1GB

# MongoDB
environment:
  MONGO_INITDB_ROOT_USERNAME: admin
  MONGO_INITDB_ROOT_PASSWORD: password
  MONGO_INITDB_DATABASE: seth_clinic_mongo

# Redis
command: redis-server --requirepass password --maxmemory 256mb
```

---

## 📊 Performance Optimizations

### **Database Optimizations**
- **PostgreSQL**: Optimized for sorting queries
- **MongoDB**: Aggregation pipeline optimizations
- **Redis**: LRU eviction policy, memory limits

### **Application Optimizations**
- **Node.js**: Increased memory limits
- **Next.js**: Code splitting, image optimization
- **Sorting**: Client-side caching, server-side indexing

### **Container Optimizations**
- **Multi-stage builds**: Smaller production images
- **Resource limits**: Memory and CPU constraints
- **Health checks**: Proactive monitoring
- **Restart policies**: Automatic recovery

---

## 🔍 Monitoring and Health Checks

### **Health Check Endpoints**
- **Backend**: `http://localhost:5000/health`
- **Frontend**: `http://localhost:3000/api/health`
- **Databases**: Built-in health checks

### **Monitoring Scripts**
- **Health Check**: `./scripts/health-check.sh`
- **Performance Monitor**: `./scripts/performance-monitor.sh`
- **Sorting System Monitor**: `./scripts/monitor-sorting-system.sh`

### **Logs and Debugging**
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# View database logs
docker-compose logs -f postgres
docker-compose logs -f mongodb
docker-compose logs -f redis
```

---

## 💾 Backup and Restore

### **Backup Types**
- **Full System Backup**: All databases, uploads, exports, config
- **Database Backup**: PostgreSQL, MongoDB, Redis dumps
- **File Backup**: Uploads, exports, configuration files
- **Compressed Backup**: Tar.gz archives for storage

### **Backup Commands**
```bash
# Create full backup
npm run backup:full

# List backups
npm run backup:list

# Show backup info
npm run backup:info <backup_file>

# Restore from backup
npm run backup:restore <backup_file>

# Clean old backups
npm run backup:clean
```

### **Backup Retention**
- **Default**: 30 days
- **Configurable**: Set `BACKUP_RETENTION_DAYS` environment variable
- **Automatic**: Cleanup runs with each backup

---

## 🚨 Troubleshooting

### **Common Issues**

#### **Container Won't Start**
```bash
# Check logs
docker-compose logs <service_name>

# Check container status
docker-compose ps

# Restart service
docker-compose restart <service_name>
```

#### **Database Connection Issues**
```bash
# Check database health
docker-compose exec postgres pg_isready -U postgres
docker-compose exec redis redis-cli ping
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Check network connectivity
docker-compose exec backend ping postgres
```

#### **Sorting System Issues**
```bash
# Test sorting endpoints
npm run sorting:test

# Check performance
npm run sorting:performance

# Monitor system
npm run monitor:sorting
```

#### **Memory Issues**
```bash
# Check memory usage
docker stats

# Restart services
docker-compose restart

# Clean up unused resources
docker system prune -f
```

### **Debug Mode**
```bash
# Enable debug mode
export SORTING_DEBUG=true
export NEXT_PUBLIC_SORTING_DEBUG=true

# Restart services
docker-compose restart backend frontend
```

---

## 🔐 Security Considerations

### **Production Security**
- **Non-root users**: All containers run as non-root
- **Secret management**: Environment variables for secrets
- **Network isolation**: Internal Docker network
- **Resource limits**: Prevent resource exhaustion
- **Health checks**: Monitor container health

### **Environment Variables**
- **Development**: Use `.env` file
- **Production**: Use `.env.production` file
- **Secrets**: Never commit secrets to version control
- **Rotation**: Regularly rotate JWT secrets and passwords

---

## 📈 Scaling and Performance

### **Horizontal Scaling**
- **Load Balancer**: Add nginx or traefik
- **Multiple Backend Instances**: Scale backend service
- **Database Clustering**: PostgreSQL and MongoDB clusters
- **Redis Cluster**: Distributed caching

### **Vertical Scaling**
- **Resource Limits**: Increase memory and CPU limits
- **Database Tuning**: Optimize database configurations
- **Application Tuning**: Adjust Node.js and Next.js settings

---

## 🛠️ Development Workflow

### **Local Development**
1. **Clone Repository**: `git clone <repository>`
2. **Install Dependencies**: `npm install`
3. **Setup Environment**: Copy `.env.example` to `.env`
4. **Start Services**: `npm run docker:dev`
5. **Run Tests**: `npm run sorting:test`

### **Production Deployment**
1. **Prepare Environment**: Create `.env.production`
2. **Build Images**: `npm run docker:build:prod`
3. **Deploy Services**: `npm run deploy:sorting`
4. **Run Health Checks**: `npm run sorting:health`
5. **Monitor System**: `npm run monitor:sorting`

---

## 📞 Support and Maintenance

### **Regular Maintenance**
- **Daily**: Health checks, log monitoring
- **Weekly**: Performance monitoring, backup verification
- **Monthly**: Security updates, dependency updates
- **Quarterly**: Full system review, capacity planning

### **Emergency Procedures**
1. **Check Health**: `npm run sorting:health`
2. **View Logs**: `docker-compose logs -f`
3. **Restart Services**: `docker-compose restart`
4. **Restore Backup**: `npm run backup:restore <backup_file>`
5. **Contact Support**: Development team

---

## 📚 Additional Resources

- **Docker Documentation**: https://docs.docker.com/
- **Docker Compose**: https://docs.docker.com/compose/
- **Next.js Documentation**: https://nextjs.org/docs
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **MongoDB Documentation**: https://docs.mongodb.com/
- **Redis Documentation**: https://redis.io/documentation

---

## ✅ Quick Reference

### **Essential Commands**
```bash
# Start everything
npm run docker:dev

# Stop everything
npm run docker:down

# View logs
npm run docker:logs

# Health check
npm run sorting:health

# Create backup
npm run backup:full

# Test sorting
npm run sorting:test
```

### **File Locations**
- **Docker Compose**: `docker-compose.yml`, `docker-compose.prod.yml`
- **Scripts**: `scripts/` directory
- **Backups**: `backups/` directory
- **Logs**: `logs/` directory
- **Environment**: `.env`, `.env.production`

---

**🎉 The Seth Clinic CMS sorting system is now fully containerized and ready for production deployment!**
