// Role-based menu configuration that matches backend permissions
export interface MenuItem {
  id: string
  title: string
  href: string
  icon: string
  badge?: string
  roles?: string[] // If not specified, available to all authenticated users
}

export const getMenuItemsForRole = (userRole: string): MenuItem[] => {
  const allMenuItems: MenuItem[] = [
    {
      id: "dashboard",
      title: "Dashboard",
      href: "/dashboard",
      icon: "🏠"
    },
    {
      id: "patients",
      title: "Patients",
      href: "/patients",
      icon: "👥",
      roles: ["ADMIN", "RECEPTIONIST", "NURSE", "CLINICAL_OFFICER"]
    },
    {
      id: "patient-assignments",
      title: "Patient Assignments",
      href: "/patient-assignments",
      icon: "👥",
      roles: ["ADMIN", "CLINICAL_OFFICER", "NURSE", "PHARMACIST"]
    },
    {
      id: "appointments",
      title: "Appointments",
      href: "/appointments",
      icon: "📅",
      roles: ["ADMIN", "RECEPTIONIST", "NURSE", "CLINICAL_OFFICER"]
    },
    {
      id: "staff",
      title: "Staff",
      href: "/staff",
      icon: "👨‍⚕️",
      roles: ["ADMIN"]
    },
    {
      id: "payments",
      title: "Payments",
      href: "/payments",
      icon: "💰",
      roles: ["ADMIN", "PHARMACIST"]
    },
    {
      id: "reports",
      title: "Reports",
      href: "/reports",
      icon: "📊",
      roles: ["ADMIN", "CLINICAL_OFFICER", "CLAIMS_MANAGER"]
    },
    {
      id: "inventory",
      title: "Inventory",
      href: "/inventory",
      icon: "🏥",
      roles: ["ADMIN", "INVENTORY_MANAGER", "PHARMACIST", "NURSE"]
    },
    {
      id: "visits",
      title: "Visits & Encounters",
      href: "/visits",
      icon: "🏥",
      roles: ["ADMIN", "NURSE", "CLINICAL_OFFICER", "RECEPTIONIST"]
    },
    {
      id: "record-visit",
      title: "Record Visit",
      href: "/visits/record",
      icon: "📝",
      roles: ["ADMIN", "RECEPTIONIST", "CLINICAL_OFFICER", "NURSE"]
    },
    {
      id: "prescriptions",
      title: "Prescriptions",
      href: "/prescriptions",
      icon: "💊",
      roles: ["ADMIN", "CLINICAL_OFFICER", "PHARMACIST", "NURSE"]
    },
    {
      id: "lab-tests",
      title: "Lab Tests",
      href: "/lab-tests",
      icon: "🧪",
      roles: ["ADMIN", "CLINICAL_OFFICER", "LAB_TECHNICIAN", "NURSE"]
    },
    {
      id: "lab-requests",
      title: "Lab Requests",
      href: "/lab-requests",
      icon: "🔬",
      roles: ["ADMIN", "CLINICAL_OFFICER", "LAB_TECHNICIAN"]
    },
    {
      id: "sha",
      title: "SHA Claims",
      href: "/sha",
      icon: "🏥",
      roles: ["ADMIN", "CLAIMS_MANAGER", "RECEPTIONIST"]
    },
    {
      id: "financial",
      title: "Financial Management",
      href: "/financial",
      icon: "💳",
      roles: ["ADMIN", "PHARMACIST"]
    },
    {
      id: "sync",
      title: "System Sync",
      href: "/sync",
      icon: "🔄",
      roles: ["ADMIN", "CLINICAL_OFFICER"]
    },
    {
      id: "settings",
      title: "Settings",
      href: "/settings",
      icon: "⚙️",
      roles: ["ADMIN"]
    }
  ]

  // Filter menu items based on user role
  return allMenuItems.filter(item => {
    // If no roles specified, available to all authenticated users
    if (!item.roles) {
      return true
    }
    // Check if user role is in the allowed roles
    return item.roles.includes(userRole)
  })
}

// Role display names for better UX
export const getRoleDisplayName = (role: string): string => {
  const roleNames: Record<string, string> = {
    ADMIN: "Administrator",
    RECEPTIONIST: "Receptionist",
    NURSE: "Nurse",
    CLINICAL_OFFICER: "Clinical Officer",
    PHARMACIST: "Pharmacist",
    INVENTORY_MANAGER: "Inventory Manager",
    CLAIMS_MANAGER: "Claims Manager",
    LAB_TECHNICIAN: "Lab Technician",
  }
  return roleNames[role] || role
}

// Role descriptions for better understanding
export const getRoleDescription = (role: string): string => {
  const descriptions: Record<string, string> = {
    ADMIN: "Full system access and management capabilities",
    RECEPTIONIST: "Patient registration and appointment scheduling",
    NURSE: "Patient care and basic medical procedures",
    CLINICAL_OFFICER: "Clinical diagnosis and treatment management",
    PHARMACIST: "Medication management and prescription fulfillment",
    INVENTORY_MANAGER: "Stock and supply management",
    CLAIMS_MANAGER: "Insurance claims and financial processing",
    LAB_TECHNICIAN: "Laboratory testing and diagnostics",
  }
  return descriptions[role] || "System user"
}
