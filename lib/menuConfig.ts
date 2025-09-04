// Menu configuration for the clinic management system
export interface MenuItem {
  id: string
  title: string
  href: string
  icon: string
  badge?: string
}

export const menuItems: MenuItem[] = [
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
    icon: "👥"
  },
  {
    id: "appointments",
    title: "Appointments",
    href: "/appointments",
    icon: "📅"
  },
  {
    id: "staff",
    title: "Staff",
    href: "/staff",
    icon: "👨‍⚕️"
  },
  {
    id: "payments",
    title: "Payments",
    href: "/payments",
    icon: "💰"
  },
  {
    id: "reports",
    title: "Reports",
    href: "/reports",
    icon: "📊"
  },
  {
    id: "inventory",
    title: "Inventory",
    href: "/inventory",
    icon: "🏥"
  },
  {
    id: "settings",
    title: "Settings",
    href: "/settings",
    icon: "⚙️"
  }
]
