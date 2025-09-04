// Mock data for dashboard components

export const mockStats = [
  {
    title: "Total Patients",
    value: "1,247",
    change: "+12%",
    changeType: "increase" as const,
    icon: "👥",
    color: "blue" as const
  },
  {
    title: "Today's Appointments",
    value: "34",
    change: "+5%",
    changeType: "increase" as const,
    icon: "📅",
    color: "green" as const
  },
  {
    title: "Revenue (This Month)",
    value: "KES 45,230",
    change: "+8%",
    changeType: "increase" as const,
    icon: "💰",
    color: "purple" as const
  },
  {
    title: "Staff Available",
    value: "12",
    change: "-2",
    changeType: "decrease" as const,
    icon: "👨‍⚕️",
    color: "yellow" as const
  }
]

export const mockActivities = [
  {
    id: "1",
    type: "patient" as const,
    message: "New patient registered: John Doe",
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    user: "Dr. Smith",
    status: "success" as const
  },
  {
    id: "2",
    type: "appointment" as const,
    message: "Appointment scheduled for tomorrow at 2:00 PM",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    user: "Nurse Johnson",
    status: "info" as const
  },
  {
    id: "3",
    type: "payment" as const,
    message: "Payment received: KES 150 for consultation",
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    user: "Receptionist",
    status: "success" as const
  },
  {
    id: "4",
    type: "system" as const,
    message: "System backup completed successfully",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: "success" as const
  },
  {
    id: "5",
    type: "user" as const,
    message: "New staff member added: Dr. Williams",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    user: "Admin",
    status: "info" as const
  }
]

export const mockPatients = [
  {
    id: "1",
    name: "Sarah Johnson",
    age: 28,
    gender: "female" as const,
    priority: "high" as const,
    status: "waiting" as const,
    waitTime: 45,
    department: "Emergency",
    doctor: "Dr. Smith"
  },
  {
    id: "2",
    name: "Michael Chen",
    age: 45,
    gender: "male" as const,
    priority: "medium" as const,
    status: "waiting" as const,
    waitTime: 30,
    department: "General Medicine",
    doctor: "Dr. Johnson"
  },
  {
    id: "3",
    name: "Emily Davis",
    age: 32,
    gender: "female" as const,
    priority: "low" as const,
    status: "in-progress" as const,
    waitTime: 15,
    department: "Pediatrics",
    doctor: "Dr. Williams"
  },
  {
    id: "4",
    name: "Robert Wilson",
    age: 58,
    gender: "male" as const,
    priority: "high" as const,
    status: "waiting" as const,
    waitTime: 60,
    department: "Cardiology",
    doctor: "Dr. Brown"
  },
  {
    id: "5",
    name: "Lisa Anderson",
    age: 41,
    gender: "female" as const,
    priority: "medium" as const,
    status: "completed" as const,
    waitTime: 0,
    department: "Dermatology",
    doctor: "Dr. Garcia"
  }
]

export const mockQuickActions = [
  {
    id: '1',
    title: 'Register Patient',
    description: 'Add new patient to system',
    icon: '👤',
    href: '/patients/new',
    color: 'orange' as const,
    badge: 'New'
  },
  {
    id: '2',
    title: 'Schedule Appointment',
    description: 'Book patient appointment',
    icon: '📅',
    href: '/appointments/new',
    color: 'purple' as const,
    badge: 'Hot'
  },
  {
    id: '3',
    title: 'Process Payment',
    description: 'Handle patient payments',
    icon: '💰',
    href: '/payments/new',
    color: 'green' as const
  },
  {
    id: '4',
    title: 'View Reports',
    description: 'Generate clinic reports',
    icon: '📊',
    href: '/reports',
    color: 'orange' as const
  },
  {
    id: '5',
    title: 'Manage Staff',
    description: 'Staff scheduling & management',
    icon: '👥',
    href: '/staff',
    color: 'purple' as const
  },
  {
    id: '6',
    title: 'Inventory Check',
    description: 'Check medical supplies',
    icon: '📦',
    href: '/inventory',
    color: 'yellow' as const,
    badge: 'Low'
  }
]

export const mockMenuItems = [
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
    badge: "1.2k"
  },
  {
    id: "appointments",
    title: "Appointments",
    href: "/appointments",
    icon: "📅",
    badge: "34"
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
