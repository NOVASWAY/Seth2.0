# Production Update & Feature Addition Guide

## 🔄 **Safe Production Updates for Live Systems**

When your clinic is actively using the Seth Medical Clinic CMS, you need to make changes **without disrupting patient care**. This guide covers everything you need to know about safely updating a live system.

## 🎯 **Update Strategy Overview**

### **Zero-Downtime Deployment**
- 🔄 **Rolling Updates**: Update components one at a time
- 💾 **Database Migrations**: Safe schema changes without data loss
- 🧪 **Testing Environment**: Always test before production
- ⏰ **Scheduled Maintenance**: Plan updates during low-usage times
- 🔙 **Rollback Plan**: Always have a way to revert changes

### **Change Categories**

#### **1. Low-Risk Changes** *(Can be done anytime)*
- 🎨 **UI Improvements**: Color changes, text updates, layout tweaks
- 📊 **Reports**: New report types or dashboard widgets
- ⚙️ **Configuration**: Environment variable updates
- 📝 **Clinical Data**: Adding new medications, diagnoses, lab tests

#### **2. Medium-Risk Changes** *(Require testing)*
- 🔧 **New Features**: Additional functionality without database changes
- 🏥 **Workflow Changes**: Modified user flows or processes
- 📱 **API Changes**: New endpoints (backwards compatible)
- 🔐 **Permission Updates**: New user roles or access controls

#### **3. High-Risk Changes** *(Require maintenance window)*
- 🗄️ **Database Schema**: New tables, columns, or relationships
- 🔄 **Breaking API Changes**: Changes that affect existing functionality
- 🏗️ **Architecture Changes**: Major system redesigns
- 🔒 **Security Updates**: Critical security patches

## 🛠️ **Update Procedures**

### **1. Development & Testing Process**

#### **Step 1: Development Environment**
```bash
# Create feature branch
git checkout -b feature/new-clinic-feature

# Make your changes
# ... development work ...

# Test locally
npm run system:full-setup
npm run health:check
./scripts/system-integrity-check.sh --test-live
```

#### **Step 2: Staging Environment**
```bash
# Deploy to staging environment
git push origin feature/new-clinic-feature

# Run staging tests
npm run test
npm run test:e2e
npm run deploy:check
```

#### **Step 3: Database Migration Testing**
```bash
# Test database migrations
cd backend
npm run migrate:test    # Test migration
npm run migrate:rollback:test  # Test rollback
```

### **2. Production Update Methods**

#### **Method A: Blue-Green Deployment** *(Recommended for major updates)*
```bash
# Prepare new environment (Green)
docker compose -f docker-compose.blue-green.yml up -d green

# Test green environment
./scripts/health-check-green.sh

# Switch traffic to green
./scripts/switch-to-green.sh

# Verify everything works
./scripts/verify-production.sh

# Retire blue environment
docker compose -f docker-compose.blue-green.yml down blue
```

#### **Method B: Rolling Update** *(For minor changes)*
```bash
# Update backend first
docker compose up -d --no-deps backend

# Wait for health check
./scripts/wait-for-health.sh backend

# Update frontend
docker compose up -d --no-deps frontend

# Verify system
npm run health:check
```

#### **Method C: Maintenance Window** *(For major changes)*
```bash
# 1. Notify users (30 minutes before)
./scripts/notify-maintenance.sh

# 2. Enable maintenance mode
./scripts/enable-maintenance-mode.sh

# 3. Backup everything
./scripts/backup-production.sh

# 4. Apply updates
git pull origin main
npm run deploy:prod

# 5. Run tests
./scripts/production-smoke-test.sh

# 6. Disable maintenance mode
./scripts/disable-maintenance-mode.sh

# 7. Notify users update complete
./scripts/notify-update-complete.sh
```

## 📊 **Database Updates in Production**

### **Safe Migration Principles**

#### **1. Backwards Compatible Changes**
```sql
-- ✅ SAFE: Adding new columns (with defaults)
ALTER TABLE patients ADD COLUMN emergency_contact VARCHAR(100) DEFAULT '';

-- ✅ SAFE: Adding new tables
CREATE TABLE patient_allergies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    allergy_name VARCHAR(200) NOT NULL,
    severity VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ✅ SAFE: Adding indexes
CREATE INDEX idx_patients_emergency_contact ON patients(emergency_contact);
```

#### **2. Multi-Step Changes** *(For breaking changes)*
```sql
-- Step 1: Add new column
ALTER TABLE patients ADD COLUMN new_phone_format VARCHAR(20);

-- Step 2: Migrate data (in application code)
UPDATE patients SET new_phone_format = format_phone(phone) WHERE new_phone_format IS NULL;

-- Step 3: Update application to use new column

-- Step 4: Drop old column (in next update)
-- ALTER TABLE patients DROP COLUMN phone;
```

### **Migration Scripts**

#### **Create Migration**
```bash
# Generate migration file
cd backend
npm run migration:create add_patient_allergies

# Edit migration file
# database/migrations/2024_01_15_add_patient_allergies.sql
```

#### **Apply Migration**
```bash
# Test migration
npm run migration:test

# Apply to production
npm run migration:apply

# Verify migration
npm run migration:status
```

#### **Rollback if Needed**
```bash
# Rollback last migration
npm run migration:rollback

# Rollback to specific version
npm run migration:rollback --to=2024_01_14_initial
```

## 🔧 **Feature Addition Workflow**

### **Example: Adding New Lab Test Type**

#### **1. Planning Phase**
- 📋 **Requirements**: What new lab test types do you need?
- 👥 **Stakeholders**: Get input from lab technicians
- 🗄️ **Data Model**: Plan database changes
- 🎯 **User Impact**: How will this affect workflows?

#### **2. Development Phase**
```bash
# 1. Create feature branch
git checkout -b feature/add-molecular-tests

# 2. Update database schema
# Add to database/schema.sql:
# - New test categories
# - New fields for molecular tests
# - Reference ranges for molecular tests

# 3. Update backend services
# - Extend ClinicalAutocompleteService
# - Add molecular test specific logic
# - Update validation rules

# 4. Update frontend components
# - Extend clinical-autocomplete component
# - Add molecular test specific UI
# - Update lab dashboard

# 5. Add clinical data
# - Update seedClinicalData.ts
# - Add molecular test catalog
```

#### **3. Testing Phase**
```bash
# Local testing
npm run test:unit
npm run test:integration
npm run test:e2e

# Staging deployment
git push origin feature/add-molecular-tests
# Deploy to staging server
# Test with sample data
```

#### **4. Production Deployment**
```bash
# 1. Merge to main
git checkout main
git merge feature/add-molecular-tests

# 2. Deploy during low usage (e.g., 2 AM)
./scripts/deploy-with-maintenance.sh

# 3. Verify deployment
./scripts/verify-production.sh

# 4. Seed new clinical data
npm run seed:clinical:molecular-tests
```

## 🚨 **Emergency Updates & Hotfixes**

### **Critical Bug Fix Process**
```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-prescription-bug

# 2. Fix the issue
# Make minimal changes to fix the bug

# 3. Test thoroughly
npm run test:critical-path

# 4. Fast-track deployment
./scripts/emergency-deploy.sh

# 5. Monitor closely
./scripts/monitor-hotfix.sh
```

### **Security Update Process**
```bash
# 1. Apply security patches immediately
npm audit fix

# 2. Update vulnerable dependencies
npm update

# 3. Deploy with rolling update
docker compose up -d --no-deps backend
docker compose up -d --no-deps frontend

# 4. Verify security
./scripts/security-check.sh
```

## 📱 **User Communication During Updates**

### **Update Notification System**
```bash
# 1. Planned maintenance notification
./scripts/notify-users.sh "System maintenance scheduled for tonight 2-4 AM"

# 2. Maintenance mode message
# Show "System under maintenance" banner

# 3. Update completion notification
./scripts/notify-users.sh "New features available! Lab molecular tests now supported."
```

### **Training for New Features**
- 📚 **Documentation**: Update user manuals
- 🎥 **Video Guides**: Create short training videos
- 👥 **Staff Training**: Schedule training sessions
- 💬 **Support**: Provide extra support during transition

## 🔍 **Monitoring & Verification**

### **Post-Update Checks**
```bash
# Health checks
./scripts/health-check-comprehensive.sh

# Performance monitoring
./scripts/monitor-performance.sh

# User activity monitoring
./scripts/monitor-user-activity.sh

# Error rate monitoring
./scripts/monitor-errors.sh
```

### **Key Metrics to Watch**
- 📊 **Response Times**: API and page load times
- 🚨 **Error Rates**: Application and database errors
- 👥 **User Activity**: Login rates and feature usage
- 💾 **Resource Usage**: CPU, memory, disk space
- 🔒 **Security Events**: Failed logins, suspicious activity

## 🎯 **Common Update Scenarios**

### **Scenario 1: Adding New User Role**
```bash
# 1. Update UserRole enum in types
# 2. Update database permissions
# 3. Update authorization middleware
# 4. Update frontend role checks
# 5. Test all workflows
# 6. Deploy with rolling update
```

### **Scenario 2: New SHA Requirements**
```bash
# 1. Update SHA service configuration
# 2. Add new required fields
# 3. Update form validations
# 4. Test SHA submission
# 5. Deploy with maintenance window
```

### **Scenario 3: Mobile App Optimization**
```bash
# 1. Optimize API responses
# 2. Improve mobile UI components
# 3. Test on various devices
# 4. Deploy frontend updates
# 5. Monitor mobile performance
```

### **Scenario 4: New Integration (e.g., MPESA)**
```bash
# 1. Add integration service
# 2. Update payment workflows
# 3. Add configuration options
# 4. Test in sandbox environment
# 5. Deploy with feature flags
```

## 🔧 **Development Tools for Live Updates**

### **Feature Flags**
```typescript
// Enable features gradually
const useNewLabTestUI = process.env.ENABLE_NEW_LAB_UI === 'true'

if (useNewLabTestUI) {
  return <NewLabTestComponent />
} else {
  return <LegacyLabTestComponent />
}
```

### **A/B Testing**
```typescript
// Test new features with subset of users
const userId = getCurrentUserId()
const useNewFeature = hashUserId(userId) % 2 === 0

return useNewFeature ? <NewFeature /> : <OldFeature />
```

### **Configuration Hot Reload**
```bash
# Update configuration without restart
./scripts/reload-config.sh

# Update clinical data without downtime
./scripts/update-clinical-data.sh
```

## 📋 **Update Checklist Template**

### **Pre-Update Checklist**
- [ ] 🧪 **Testing Complete**: All tests pass
- [ ] 📊 **Database Backup**: Recent backup available
- [ ] 📝 **Rollback Plan**: Documented rollback procedure
- [ ] 👥 **Team Notified**: All stakeholders informed
- [ ] ⏰ **Timing Confirmed**: Update scheduled for low-usage time
- [ ] 🔧 **Tools Ready**: All deployment scripts tested

### **During Update Checklist**
- [ ] 🚨 **Maintenance Mode**: Enabled if required
- [ ] 💾 **Backup Created**: Fresh backup before changes
- [ ] 🔄 **Changes Applied**: All updates deployed
- [ ] 🧪 **Smoke Tests**: Basic functionality verified
- [ ] 📊 **Monitoring Active**: Watching for issues

### **Post-Update Checklist**
- [ ] ✅ **Health Checks**: All systems operational
- [ ] 👥 **User Testing**: Key workflows verified
- [ ] 📈 **Performance**: Response times normal
- [ ] 🔒 **Security**: No new vulnerabilities
- [ ] 📝 **Documentation**: Updated for new features
- [ ] 👨‍💼 **Training**: Staff trained on changes

## 🎉 **Best Practices Summary**

### **Golden Rules**
1. 🧪 **Test Everything**: Never deploy untested changes
2. 💾 **Backup First**: Always backup before changes
3. ⏰ **Time It Right**: Update during low usage
4. 📊 **Monitor Closely**: Watch for issues after updates
5. 🔙 **Plan Rollback**: Always have an escape plan
6. 👥 **Communicate**: Keep users informed
7. 📝 **Document**: Record all changes

### **Emergency Contacts**
- 🚨 **System Admin**: [Your contact info]
- 🔧 **Technical Support**: [Support contact]
- 👨‍💼 **Clinic Manager**: [Manager contact]
- 🏥 **IT Vendor**: [Vendor support]

---

**Remember**: The goal is to continuously improve the system while maintaining 100% uptime for patient care. Safety first, features second! 🏥
