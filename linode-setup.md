# 🖥️ Linode Server Setup Guide

## Server Requirements

### **Recommended Linode Instance:**
- **Type**: Linode 4GB (Nanode) or higher
- **OS**: Ubuntu 22.04 LTS
- **CPU**: 2 vCPUs
- **RAM**: 4GB
- **Storage**: 80GB SSD
- **Network**: 4TB Transfer

### **Minimum Requirements:**
- **RAM**: 2GB (for development)
- **Storage**: 40GB SSD
- **CPU**: 1 vCPU

## Initial Server Setup

### **1. Create Linode Instance**
1. Log into [Linode Cloud Manager](https://cloud.linode.com/)
2. Click "Create" → "Linode"
3. Choose Ubuntu 22.04 LTS
4. Select your preferred region
5. Choose Linode 4GB plan
6. Set root password (strong password)
7. Click "Create Linode"

### **2. Initial Server Configuration**

```bash
# Connect to your server
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git nginx certbot python3-certbot-nginx ufw fail2ban

# Create application user
adduser sethclinic
usermod -aG sudo sethclinic
usermod -aG docker sethclinic

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Configure firewall
ufw allow ssh
ufw allow 80
ufw allow 443
ufw --force enable

# Configure fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

### **3. Server Security Hardening**

```bash
# Disable root login
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart ssh

# Configure automatic security updates
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# Set up log rotation
cat > /etc/logrotate.d/sethclinic << EOF
/var/log/sethclinic/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 sethclinic sethclinic
}
EOF
```

## Application Directory Setup

```bash
# Create application directory
mkdir -p /opt/sethclinic
cd /opt/sethclinic

# Clone your repository
git clone https://github.com/NOVASWAY/Seth2.0.git .

# Set permissions
chown -R sethclinic:sethclinic /opt/sethclinic
chmod -R 755 /opt/sethclinic
```

## Environment Configuration

```bash
# Create production environment file
cp .env.production .env.local

# Edit with your actual values
nano .env.local
```

## Docker Configuration

```bash
# Create production docker-compose override
cat > docker-compose.override.yml << 'EOF'
version: '3.8'
services:
  backend:
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
  
  frontend:
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
  
  worker:
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
EOF
```

## Nginx Configuration

```bash
# Create Nginx configuration
cat > /etc/nginx/sites-available/sethclinic << 'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL configuration will be added by Certbot
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:5000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable the site
ln -s /etc/nginx/sites-available/sethclinic /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
systemctl enable nginx
```

## SSL Certificate Setup

```bash
# Get SSL certificate from Let's Encrypt
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test automatic renewal
certbot renew --dry-run
```

## System Service Setup

```bash
# Create systemd service for the application
cat > /etc/systemd/system/sethclinic.service << 'EOF'
[Unit]
Description=Seth Clinic CMS
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/sethclinic
ExecStart=/usr/local/bin/docker-compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.override.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.override.yml down
TimeoutStartSec=0
User=sethclinic
Group=sethclinic

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
systemctl daemon-reload
systemctl enable sethclinic
```

## Monitoring Setup

```bash
# Install monitoring tools
apt install -y htop iotop nethogs

# Create monitoring script
cat > /opt/sethclinic/monitor.sh << 'EOF'
#!/bin/bash
echo "=== Seth Clinic CMS System Status ==="
echo "Date: $(date)"
echo ""

echo "=== Docker Containers ==="
docker-compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.override.yml ps

echo ""
echo "=== System Resources ==="
echo "Memory Usage:"
free -h

echo ""
echo "Disk Usage:"
df -h

echo ""
echo "=== Application Health ==="
curl -s http://localhost:5000/health | jq . || echo "Backend not responding"

echo ""
echo "=== Nginx Status ==="
systemctl status nginx --no-pager -l
EOF

chmod +x /opt/sethclinic/monitor.sh
```

## Backup Setup

```bash
# Create backup script
cat > /opt/sethclinic/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/sethclinic/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres pg_dump -U seth_clinic_user seth_clinic_prod > $BACKUP_DIR/postgres_$DATE.sql

# Backup MongoDB
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec -T mongodb mongodump --archive > $BACKUP_DIR/mongodb_$DATE.archive

# Backup application data
tar -czf $BACKUP_DIR/app_data_$DATE.tar.gz uploads/ exports/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.archive" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/sethclinic/backup.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/sethclinic/backup.sh") | crontab -
```

## Next Steps

1. **Update your domain**: Replace `yourdomain.com` with your actual domain
2. **Configure environment variables**: Edit `.env.local` with your production values
3. **Deploy the application**: Run `./deploy-production.sh`
4. **Set up Cloudflare tunnel**: Follow the Cloudflare setup guide
5. **Test everything**: Verify all services are working correctly
