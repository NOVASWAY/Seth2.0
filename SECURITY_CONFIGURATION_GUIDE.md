# 🔐 Security Configuration Guide

## Overview

This guide provides comprehensive instructions for securing the Seth Clinic CMS system for production deployment. All default secrets and passwords must be replaced with strong, unique values.

## ⚠️ Critical Security Requirements

### **1. JWT Authentication Secrets**

**Current Status**: Using default values that MUST be changed
**Risk Level**: 🔴 CRITICAL

```bash
# Generate new JWT secrets (64 bytes each)
JWT_SECRET=e08dbb013f5b0462d9d77197bc39589be604fb3d7b89acf641aec5fbc5afa4ad9f5d21d52cef17d2ce8ac67f7031afe76bdf2ba7e29e906dde5d97f0b897a6ef
JWT_REFRESH_SECRET=7f03df120a129048df340b105de1abbb928ce3367cd53f1b7d09aeb73d60de7da1cc8c1f0ed2961c0a20c95b39e8b7a889f137135b5cf79b2d1a76dfdc25bde7
```

**Production Settings**:
- Access Token Expiry: `15m` (15 minutes)
- Refresh Token Expiry: `7d` (7 days)
- Salt Rounds: `14` (increased from 12)

### **2. Database Passwords**

**Current Status**: Using simple default passwords
**Risk Level**: 🔴 CRITICAL

```bash
# PostgreSQL
POSTGRES_PASSWORD=7979eb0188952ca8623f31180625f73e2890d903dc256cc2318f33bfff76f27b

# MongoDB
MONGODB_PASSWORD=460854f59f5a53760a3f6db1ea24c462f6ae06ce047833cc4227cc24e814da6a

# Redis
REDIS_PASSWORD=eb04564c1c094115352cca4a03632a0fb84c251e5fbeb12d440a5ade4f17da28
```

### **3. M-Pesa Payment Integration**

**Current Status**: Placeholder values that MUST be replaced
**Risk Level**: 🔴 CRITICAL

```bash
# Replace with actual M-Pesa credentials from Safaricom
MPESA_CONSUMER_KEY=your_actual_consumer_key_here
MPESA_CONSUMER_SECRET=your_actual_consumer_secret_here
MPESA_SHORTCODE=your_actual_shortcode_here
MPESA_PASSKEY=your_actual_passkey_here
MPESA_BASE_URL=https://api.safaricom.co.ke  # Production URL
MPESA_CALLBACK_URL=https://yourdomain.com/api/financial/mpesa/callback
```

**How to Get M-Pesa Credentials**:
1. Register at [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
2. Create a new app
3. Get your Consumer Key and Consumer Secret
4. Configure your shortcode and passkey
5. Set up webhook URLs for callbacks

### **4. Email Service Configuration**

**Current Status**: Not configured
**Risk Level**: 🟡 MEDIUM

```bash
# SendGrid (Recommended)
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# Alternative: AWS SES
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=us-east-1
```

### **5. SMS Service Configuration**

**Current Status**: Not configured
**Risk Level**: 🟡 MEDIUM

```bash
# Twilio (Recommended)
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Alternative: Africa's Talking
AFRICASTALKING_USERNAME=your_username_here
AFRICASTALKING_API_KEY=your_api_key_here
```

## 🛡️ Security Best Practices

### **1. Environment Variables**

**DO**:
- Use environment variables for all secrets
- Never commit `.env` files to version control
- Use different secrets for each environment
- Rotate secrets regularly

**DON'T**:
- Hardcode secrets in source code
- Use the same secrets across environments
- Share secrets via insecure channels

### **2. Database Security**

**PostgreSQL**:
- Enable SSL connections in production
- Use strong passwords (32+ characters)
- Limit database user permissions
- Enable connection pooling

**MongoDB**:
- Enable authentication
- Use strong passwords
- Enable SSL/TLS
- Configure proper user roles

**Redis**:
- Enable password authentication
- Use strong passwords
- Bind to localhost only
- Disable dangerous commands

### **3. Network Security**

**CORS Configuration**:
```bash
# Production - Restrict to your domains only
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
CORS_CREDENTIALS=true
```

**Rate Limiting**:
```bash
# Production settings
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # 100 requests per window
```

### **4. Security Headers**

**Helmet Configuration**:
```bash
HELMET_ENABLED=true
CSP_ENABLED=true  # Content Security Policy
```

## 📋 Production Deployment Checklist

### **Pre-Deployment**

- [ ] Generate new JWT secrets (64 bytes each)
- [ ] Generate new database passwords (32+ characters)
- [ ] Configure M-Pesa API credentials
- [ ] Set up email service (SendGrid/AWS SES)
- [ ] Set up SMS service (Twilio/Africa's Talking)
- [ ] Configure CORS origins for your domains
- [ ] Set up SSL certificates
- [ ] Configure firewall rules
- [ ] Set up monitoring and logging

### **Post-Deployment**

- [ ] Test all API endpoints
- [ ] Verify M-Pesa payment flow
- [ ] Test email notifications
- [ ] Test SMS notifications
- [ ] Verify database connections
- [ ] Check security headers
- [ ] Monitor system logs
- [ ] Set up backup verification

## 🔧 Configuration Files

### **1. Production Environment File**

Create `.env.production` with all secure values:
```bash
# Copy from .env.production template
cp .env.production .env.local
# Edit .env.local with your actual values
```

### **2. Docker Compose Override**

Create `docker-compose.override.yml` for production:
```yaml
version: '3.8'
services:
  backend:
    environment:
      NODE_ENV: production
      # Add your production environment variables here
```

### **3. Kubernetes Secrets (if using K8s)**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: seth-clinic-secrets
type: Opaque
data:
  jwt-secret: <base64-encoded-secret>
  postgres-password: <base64-encoded-password>
  mongodb-password: <base64-encoded-password>
  redis-password: <base64-encoded-password>
  mpesa-consumer-key: <base64-encoded-key>
  mpesa-consumer-secret: <base64-encoded-secret>
```

## 🚨 Security Monitoring

### **1. Log Monitoring**

Monitor for:
- Failed authentication attempts
- Unusual API usage patterns
- Database connection errors
- Payment processing errors

### **2. Performance Monitoring**

Track:
- Response times
- Memory usage
- Database query performance
- Error rates

### **3. Backup Verification**

- Test backup restoration regularly
- Verify backup integrity
- Store backups securely
- Test disaster recovery procedures

## 📞 Support and Maintenance

### **Regular Tasks**

- **Weekly**: Review security logs
- **Monthly**: Rotate secrets
- **Quarterly**: Security audit
- **Annually**: Penetration testing

### **Emergency Procedures**

1. **Security Breach**: Immediately rotate all secrets
2. **Database Compromise**: Restore from clean backup
3. **API Key Leak**: Revoke and regenerate keys
4. **System Compromise**: Isolate and investigate

## 🔗 Additional Resources

- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/security/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)

---

**⚠️ IMPORTANT**: This guide contains sensitive information. Keep it secure and limit access to authorized personnel only.
