# 🚀 Production Updates - Quick Reference Guide

## 📋 **Common Update Scenarios**

### **🎨 UI Changes & Minor Updates** *(Zero Downtime)*
```bash
# For small UI changes, bug fixes, or content updates
npm run update:rolling

# Or manually:
./scripts/production-update.sh rolling
```

### **🔧 Feature Deployment** *(Automated Pipeline)*
```bash
# Deploy a new feature branch
npm run deploy:feature feature/new-lab-tests

# With interactive approval
npm run deploy:feature feature/sha-updates -- --interactive

# With maintenance window
npm run deploy:feature feature/major-changes maintenance
```

### **🗄️ Database Changes** *(Safe Migration)*
```bash
# Create new migration
npm run migrate:db create add_patient_allergies

# Apply migration (with testing)
npm run migrate:db apply backend/database/migrations/20240115_add_patient_allergies.sql

# Apply with maintenance mode
npm run migrate:db apply migration_file.sql -- --maintenance
```

### **🚨 Emergency Updates** *(Hotfix)*
```bash
# For critical bugs or security issues
npm run update:maintenance

# Or with verification only
npm run update:production -- --verify-only
```

## ⚡ **Quick Commands**

| Task | Command | Description |
|------|---------|-------------|
| **Health Check** | `npm run health:check` | Verify system is running |
| **System Status** | `npm run system:integrity` | Complete system verification |
| **Database Backup** | `npm run backup:db` | Create database backup |
| **Rolling Update** | `npm run update:rolling` | Zero-downtime update |
| **Maintenance Update** | `npm run update:maintenance` | Update with downtime |
| **Deploy Feature** | `npm run deploy:feature <branch>` | Deploy feature branch |
| **Create Migration** | `npm run migrate:db create <name>` | Create DB migration |
| **Apply Migration** | `npm run migrate:db apply <file>` | Apply DB changes |

## 🛡️ **Safety Checklist**

### **Before Every Update**
- [ ] ✅ **System Backup**: `npm run backup:db`
- [ ] 🧪 **Health Check**: `npm run health:check`
- [ ] 👥 **Team Notification**: Inform clinic staff
- [ ] ⏰ **Timing**: Schedule during low usage
- [ ] 📝 **Rollback Plan**: Know how to revert

### **During Update**
- [ ] 📊 **Monitor Logs**: Watch for errors
- [ ] ⏱️ **Track Time**: Minimize downtime
- [ ] 🔍 **Verify Steps**: Each step completes successfully

### **After Update**
- [ ] ✅ **Health Check**: `npm run health:check`
- [ ] 🎯 **Feature Test**: Test new functionality
- [ ] 👥 **User Feedback**: Check with clinic staff
- [ ] 📝 **Document**: Record what was changed

## 🔧 **Update Types**

### **1. Rolling Update** *(Recommended)*
```bash
# Best for: UI changes, API additions, bug fixes
npm run update:rolling

# ✅ Zero downtime
# ✅ Safe for most changes
# ✅ Automatic rollback on failure
```

### **2. Maintenance Window**
```bash
# Best for: Database changes, breaking changes, major features
npm run update:maintenance

# ⚠️ Brief downtime (2-5 minutes)
# ✅ Safest for complex changes
# ✅ Complete system restart
```

### **3. Feature Deployment**
```bash
# Best for: New features, tested branches
npm run deploy:feature feature/branch-name

# ✅ Full testing pipeline
# ✅ Staging environment test
# ✅ Interactive approval option
```

## 📱 **Real-World Examples**

### **Example 1: Adding New Medicine to Database**
```bash
# 1. Add medicine data to clinical seed
# Edit: backend/src/scripts/seedClinicalData.ts

# 2. Apply the new data
npm run seed:clinical

# 3. Rolling update (zero downtime)
npm run update:rolling

# ✅ Users can immediately search for new medicine
```

### **Example 2: New Lab Test Type**
```bash
# 1. Create database migration
npm run migrate:db create add_molecular_tests

# 2. Edit migration file (add columns, indexes)
# 3. Test migration
npm run migrate:db test backend/database/migrations/20240115_add_molecular_tests.sql

# 4. Apply with maintenance mode (safe for DB changes)
npm run migrate:db apply backend/database/migrations/20240115_add_molecular_tests.sql -- --maintenance

# 5. Update clinical data
npm run seed:clinical

# ✅ Lab technicians can now use molecular tests
```

### **Example 3: SHA Requirements Update**
```bash
# 1. Create feature branch
git checkout -b feature/sha-new-requirements

# 2. Make changes to SHA services and forms
# 3. Test locally
npm run test

# 4. Deploy feature (with approval step)
npm run deploy:feature feature/sha-new-requirements -- --interactive

# 5. Test in staging, then approve for production
# ✅ Claims staff can use new SHA requirements
```

### **Example 4: Emergency Bug Fix**
```bash
# 1. Create hotfix branch
git checkout -b hotfix/prescription-bug

# 2. Fix the critical issue
# 3. Emergency deployment
npm run update:maintenance

# ✅ Bug fixed with minimal downtime
```

## 🔙 **Rollback Procedures**

### **If Update Fails**
```bash
# Automatic rollback (if scripts detect failure)
./scripts/production-update.sh --rollback

# Manual rollback to specific backup
npm run migrate:db rollback ./backups/migrations/20240115_120000
```

### **If Database Issue**
```bash
# Restore from backup
npm run migrate:db rollback

# Or specific backup
npm run migrate:db rollback ./backups/migrations/backup_folder
```

## 📞 **Emergency Contacts**

When updates go wrong, contact in this order:

1. **🔧 System Administrator**: [Your contact]
2. **👨‍💼 Clinic Manager**: [Manager contact]  
3. **🏥 IT Support**: [Support contact]
4. **📞 Emergency Hotline**: [Emergency number]

## 💡 **Best Practices**

### **Timing Updates**
- 🌙 **Best Time**: 2:00 AM - 4:00 AM (low usage)
- 📅 **Avoid**: During clinic hours, Mondays, Fridays
- ⏰ **Duration**: Plan for 15-30 minutes maximum

### **Communication**
```bash
# Before update (30 minutes prior)
echo "System maintenance starting in 30 minutes - save your work!"

# During maintenance
echo "System under maintenance - will be back shortly"

# After update
echo "System updated successfully! New features available."
```

### **Testing**
- 🧪 **Always Test**: Use staging environment first
- 👥 **User Testing**: Let key staff test new features
- 📊 **Monitor**: Watch system performance after updates
- 📝 **Document**: Keep record of all changes

## 🎯 **Success Metrics**

Track these after every update:

- ⚡ **System Response Time**: Should remain < 2 seconds
- 🚨 **Error Rate**: Should be < 1%
- 👥 **User Satisfaction**: No major complaints
- 📊 **Feature Usage**: New features being adopted
- 🔍 **Search Performance**: Clinical autocomplete speed

---

## 🏥 **Remember**

> **Patient care comes first!** 
> 
> If any update causes issues that affect patient care:
> 1. **Rollback immediately**
> 2. **Fix the issue offline** 
> 3. **Test thoroughly**
> 4. **Deploy when safe**

**The clinic must always be operational!** 🚨
