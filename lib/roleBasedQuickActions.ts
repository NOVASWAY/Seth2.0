// Role-based quick actions configuration
export interface QuickAction {
  id: string
  title: string
  description: string
  icon: string
  href: string
  color: 'orange' | 'purple' | 'green' | 'red' | 'yellow'
  badge?: string
  roles?: string[] // If not specified, available to all authenticated users
}

export const getQuickActionsForRole = (userRole: string): QuickAction[] => {
  const allActions: QuickAction[] = [
    {
      id: "1",
      title: "Register Patient",
      description: "Add a new patient to the system",
      icon: "👤",
      href: "/patients/register",
      color: "green",
      roles: ["ADMIN", "RECEPTIONIST"]
    },
    {
      id: "2",
      title: "Schedule Appointment",
      description: "Book a new appointment",
      icon: "📅",
      href: "/appointments",
      color: "blue",
      roles: ["ADMIN", "RECEPTIONIST", "NURSE", "CLINICAL_OFFICER"]
    },
    {
      id: "3",
      title: "Process Payment",
      description: "Handle patient payments",
      icon: "💰",
      href: "/payments",
      color: "green",
      roles: ["ADMIN", "CLAIMS_MANAGER", "RECEPTIONIST"]
    },
    {
      id: "4",
      title: "View Reports",
      description: "Access system reports",
      icon: "📊",
      href: "/reports",
      color: "purple",
      roles: ["ADMIN", "CLINICAL_OFFICER", "CLAIMS_MANAGER"]
    },
    {
      id: "5",
      title: "Manage Staff",
      description: "Add or edit staff members",
      icon: "👥",
      href: "/staff",
      color: "orange",
      roles: ["ADMIN"]
    },
    {
      id: "6",
      title: "Inventory Check",
      description: "Check stock levels",
      icon: "📦",
      href: "/inventory",
      color: "yellow",
      roles: ["ADMIN", "INVENTORY_MANAGER", "PHARMACIST", "NURSE"]
    },
    {
      id: "7",
      title: "Prescribe Medication",
      description: "Create new prescriptions",
      icon: "💊",
      href: "/prescriptions",
      color: "purple",
      roles: ["ADMIN", "CLINICAL_OFFICER", "PHARMACIST"]
    },
    {
      id: "8",
      title: "Lab Tests",
      description: "Order or view lab tests",
      icon: "🧪",
      href: "/diagnostics",
      color: "blue",
      roles: ["ADMIN", "CLINICAL_OFFICER", "LAB_TECHNICIAN"]
    },
    {
      id: "9",
      title: "SHA Documents",
      description: "Manage SHA documentation",
      icon: "🏥",
      href: "/sha",
      color: "red",
      roles: ["ADMIN", "CLINICAL_OFFICER", "CLAIMS_MANAGER", "DOCTOR"]
    },
    {
      id: "10",
      title: "Insurance Claims",
      description: "Process insurance claims",
      icon: "📋",
      href: "/claims",
      color: "green",
      roles: ["ADMIN", "CLAIMS_MANAGER"]
    }
  ]

  // Filter actions based on user role
  return allActions.filter(action => {
    // If no roles specified, available to all authenticated users
    if (!action.roles) {
      return true
    }
    // Check if user role is in the allowed roles
    return action.roles.includes(userRole)
  })
}
