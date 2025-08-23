# Production Deployment Checklist - Prescription System

## 🚀 Pre-Deployment Checklist

### Environment Configuration
- [ ] Copy `env.template` to `.env.production`
- [ ] Set all required environment variables:
  - [ ] `POSTGRES_PASSWORD` (secure password)
  - [ ] `REDIS_PASSWORD` (secure password)
  - [ ] `JWT_SECRET` (64+ character random string)
  - [ ] `JWT_REFRESH_SECRET` (64+ character random string)
  - [ ] `MPESA_CONSUMER_KEY` and `MPESA_CONSUMER_SECRET`
  - [ ] `SHA_API_KEY`
  - [ ] `LOG_LEVEL` (set to "info" for production)
  - [ ] `ENABLE_AUDIT_LOGGING` (set to "true")
  - [ ] `AUTO_SAVE_INTERVAL` (set to "30000" or desired interval)
- [ ] Verify `FRONTEND_URL` matches your production domain
- [ ] Verify `NEXT_PUBLIC_API_URL` matches your production API endpoint

### SSL Certificates
- [ ] Place valid SSL certificates in `nginx/ssl/`:
  - [ ] `cert.pem` (your domain certificate)
  - [ ] `key.pem` (your private key)
- [ ] Verify certificate expiration date (should be valid for at least 30 days)
- [ ] Test certificate validity: `openssl x509 -in nginx/ssl/cert.pem -text -noout`

### Database Preparation
- [ ] Ensure `database/schema.sql` includes prescription tables
- [ ] Ensure `database/schema.sql` includes diagnostics tables (lab_tests, lab_requests, lab_request_items)
- [ ] Verify database backup strategy is in place
- [ ] Check available disk space (minimum 10GB recommended)
- [ ] Verify PostgreSQL version compatibility (15+)

### Infrastructure
- [ ] Verify Docker and Docker Compose are installed on production server
- [ ] Check available system resources:
  - [ ] CPU: minimum 2 cores
  - [ ] RAM: minimum 4GB
  - [ ] Disk: minimum 20GB free space
- [ ] Verify network ports are accessible:
  - [ ] Port 80 (HTTP)
  - [ ] Port 443 (HTTPS)
  - [ ] Port 5432 (PostgreSQL - if external access needed)
  - [ ] Port 6379 (Redis - if external access needed)

## 🔧 Deployment Steps

### 1. Initial Setup
```bash
# Clone repository (if not already done)
git clone <your-repo-url>
cd seth-clinic-cms

# Copy environment template
cp env.template .env.production

# Edit environment variables
nano .env.production

# Make scripts executable
chmod +x scripts/*.sh
```

### 2. Database Migration
```bash
# Start only database services first
docker-compose -f docker-compose.prod.yml up -d postgres redis

# Wait for database to be ready
sleep 30

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npm run db:migrate
```

### 3. Full Deployment
```bash
# Run production deployment script
./scripts/deploy.sh

# Or manually:
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Health Verification
```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Check service logs
docker-compose -f docker-compose.prod.yml logs -f

# Test endpoints
curl -f https://yourdomain.com/api/health
curl -f https://yourdomain.com/api/health
```

## ✅ Post-Deployment Verification

### Service Health Checks
- [ ] All containers are running and healthy
- [ ] Database connection is successful
- [ ] Redis connection is successful
- [ ] Backend API responds to health checks
- [ ] Frontend loads without errors
- [ ] Nginx reverse proxy is working

### Prescription System Features
- [ ] Access prescription page: `https://yourdomain.com/prescriptions`
- [ ] Patient search functionality works
- [ ] New patient registration works
- [ ] Medicine dropdown shows available stock
- [ ] Prescription creation works
- [ ] Auto-save functionality works
- [ ] Draft recovery works after page reload

### Diagnostics System Features
- [ ] Access diagnostics page: `https://yourdomain.com/diagnostics`
- [ ] Patient search functionality works
- [ ] New patient registration works
- [ ] Test dropdown shows available tests
- [ ] Lab request creation works
- [ ] Auto-save functionality works
- [ ] Draft recovery works after page reload
- [ ] Urgency levels (Routine/Urgent/STAT) work correctly

### API Endpoints
- [ ] `GET /api/health` - Backend health check
- [ ] `GET /api/inventory/available-stock` - Stock availability
- [ ] `POST /api/prescriptions` - Create prescription
- [ ] `GET /api/prescriptions/:id` - Get prescription
- [ ] `GET /api/patients/search` - Patient search
- [ ] `GET /api/lab-tests/available` - Available lab tests
- [ ] `POST /api/lab-requests` - Create lab request
- [ ] `GET /api/lab-requests` - Get lab requests

### Security Verification
- [ ] HTTPS is enforced
- [ ] JWT authentication works
- [ ] Role-based access control works
- [ ] Rate limiting is active
- [ ] CORS is properly configured
- [ ] Security headers are present

## 🔍 Monitoring & Maintenance

### Log Monitoring
```bash
# View real-time logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### Performance Monitoring
- [ ] Database query performance
- [ ] API response times
- [ ] Frontend load times
- [ ] Memory usage
- [ ] CPU usage
- [ ] Disk I/O

### Backup Verification
- [ ] Database backups are running
- [ ] Backup restoration has been tested
- [ ] Log retention policy is in place
- [ ] Disaster recovery plan is documented

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres

# Test connection
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres
```

#### Prescription System Not Working
```bash
# Check backend logs
docker-compose -f docker-compose.prod.yml logs backend

# Verify prescription routes are loaded
curl -f https://yourdomain.com/api/health
```

#### Diagnostics System Not Working
```bash
# Check backend logs
docker-compose -f docker-compose.prod.yml logs backend

# Verify diagnostics routes are loaded
curl -f https://yourdomain.com/api/lab-tests/available
```

#### Frontend Not Loading
```bash
# Check frontend logs
docker-compose -f docker-compose.prod.yml logs frontend

# Check nginx configuration
docker-compose -f docker-compose.prod.yml logs nginx
```

### Emergency Rollback
```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Revert to previous version (if using git)
git checkout <previous-tag>

# Restart with previous version
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Performance Benchmarks

### Expected Response Times
- [ ] Backend health check: < 100ms
- [ ] Patient search: < 500ms
- [ ] Stock availability: < 300ms
- [ ] Prescription creation: < 1000ms
- [ ] Test availability: < 300ms
- [ ] Lab request creation: < 1000ms
- [ ] Frontend page load: < 2000ms

### Resource Usage
- [ ] Database: < 2GB RAM, < 50% CPU
- [ ] Backend: < 1GB RAM, < 30% CPU
- [ ] Frontend: < 500MB RAM, < 20% CPU
- [ ] Redis: < 500MB RAM, < 20% CPU

## 🔐 Security Checklist

### Authentication & Authorization
- [ ] JWT tokens are properly validated
- [ ] Refresh token rotation is working
- [ ] Role-based permissions are enforced
- [ ] Session timeout is configured
- [ ] Failed login attempts are limited

### Data Protection
- [ ] All sensitive data is encrypted
- [ ] Database connections use SSL
- [ ] API endpoints require authentication
- [ ] Audit logging is enabled
- [ ] Data backup is encrypted

### Network Security
- [ ] HTTPS is enforced
- [ ] CORS is properly configured
- [ ] Rate limiting is active
- [ ] Security headers are present
- [ ] Firewall rules are configured

## 📚 Documentation

### Required Documentation
- [ ] API documentation is updated
- [ ] User manual includes prescription system
- [ ] User manual includes diagnostics system
- [ ] Deployment guide is current
- [ ] Troubleshooting guide is available
- [ ] Change log is maintained

### Training Materials
- [ ] Clinical staff training completed
- [ ] Admin user training completed
- [ ] Support team training completed
- [ ] User acceptance testing completed

## 🎯 Success Criteria

### Functional Requirements
- [ ] All prescription system features work correctly
- [ ] All diagnostics system features work correctly
- [ ] Auto-save functionality protects against data loss
- [ ] Medicine stock integration works in real-time
- [ ] Test catalog integration works in real-time
- [ ] Patient management is efficient
- [ ] System performance meets requirements

### Non-Functional Requirements
- [ ] System availability > 99.5%
- [ ] Response time < 2 seconds for all operations
- [ ] Data integrity is maintained
- [ ] Security requirements are met
- [ ] Compliance requirements are satisfied

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Author**: Development Team

**Next Review**: After first production deployment
