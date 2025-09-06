# Role-Based Access Control Implementation

## Overview
The frontend has been updated to match the backend role-based access requirements. Users now see only the features they have permission to access.

## Implementation Details

### 1. Role-Based Menu Configuration
- **File**: `lib/roleBasedMenuConfig.ts`
- **Function**: `getMenuItemsForRole(userRole)`
- **Purpose**: Filters menu items based on user role

### 2. Role-Based Quick Actions
- **File**: `lib/roleBasedQuickActions.ts`
- **Function**: `getQuickActionsForRole(userRole)`
- **Purpose**: Filters dashboard quick actions based on user role

### 3. Role Guard Component
- **File**: `components/auth/RoleGuard.tsx`
- **Purpose**: Protects individual pages from unauthorized access
- **Features**: 
  - Shows loading state while checking permissions
  - Redirects unauthorized users to dashboard
  - Displays user-friendly error messages

### 4. Updated Sidebar Component
- **File**: `components/dashboard/Sidebar.tsx`
- **Changes**: 
  - Now uses role-based menu filtering
  - Shows role display names instead of raw role values
  - No longer requires menuItems prop

## Role Access Matrix

| Feature | Admin | Receptionist | Nurse | Clinical Officer | Pharmacist | Inventory Manager | Claims Manager |
|---------|-------|--------------|-------|------------------|------------|-------------------|----------------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Patients | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Appointments | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Staff | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Payments | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Reports | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Inventory | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Prescriptions | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Diagnostics | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| SHA | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Claims | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Financial | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Quick Actions by Role

### Admin
- Register Patient
- Schedule Appointment
- Process Payment
- View Reports
- Manage Staff
- Inventory Check
- Prescribe Medication
- Lab Tests
- SHA Documents
- Insurance Claims

### Receptionist
- Register Patient
- Schedule Appointment
- Process Payment

### Nurse
- Schedule Appointment
- Inventory Check

### Clinical Officer
- Schedule Appointment
- View Reports
- Prescribe Medication
- Lab Tests
- SHA Documents

### Pharmacist
- Inventory Check
- Prescribe Medication

### Inventory Manager
- Inventory Check

### Claims Manager
- Process Payment
- View Reports
- SHA Documents
- Insurance Claims

## User Experience Improvements

### Before
- All users saw all menu items
- Users got 403 errors when accessing restricted features
- Confusing user experience

### After
- Users see only relevant menu items
- Clean, role-specific interface
- Better user experience
- Consistent with backend permissions

## Testing

### Test Admin Access
1. Login: `admin` / `admin123`
2. Should see all menu items and quick actions
3. Can access all pages including Staff and Settings

### Test Receptionist Access
1. Login: `receptionist` / `receptionist123`
2. Should see: Dashboard, Patients, Appointments, Payments
3. Should NOT see: Staff, Settings, Inventory, etc.

### Test Clinical Officer Access
1. Login: `clinical_officer` / `clinical123`
2. Should see: Dashboard, Patients, Appointments, Reports, Prescriptions, Diagnostics, SHA
3. Should NOT see: Staff, Settings, Claims, Financial

## Files Modified

### New Files
- `lib/roleBasedMenuConfig.ts` - Role-based menu configuration
- `lib/roleBasedQuickActions.ts` - Role-based quick actions
- `components/auth/RoleGuard.tsx` - Page-level access control
- `ROLE_BASED_ACCESS.md` - This documentation

### Modified Files
- `components/dashboard/Sidebar.tsx` - Updated to use role-based menus
- `app/dashboard/page.tsx` - Updated to use role-based quick actions
- `app/staff/page.tsx` - Added Admin-only access control
- `app/settings/page.tsx` - Added Admin-only access control
- `app/payments/page.tsx` - Updated Sidebar usage
- `app/patients/page.tsx` - Updated Sidebar usage
- `app/appointments/page.tsx` - Updated Sidebar usage

## Security Benefits

1. **Frontend-Backend Alignment**: Frontend now matches backend permissions
2. **Better UX**: Users only see what they can access
3. **Reduced Confusion**: No more 403 errors for visible menu items
4. **Consistent Experience**: Role-based interface throughout the system
5. **Maintainable**: Centralized role configuration

## Future Enhancements

1. **Dynamic Role Updates**: Update UI when user role changes
2. **Feature Flags**: More granular permission control
3. **Audit Logging**: Track role-based access attempts
4. **Role Hierarchy**: Support for role inheritance
5. **Custom Permissions**: Per-user permission overrides
