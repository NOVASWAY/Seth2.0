'use client'

import { useAuthStore } from '../../lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTheme } from '../../lib/ThemeContext'
import Sidebar from '../../components/dashboard/Sidebar'
import StatsCard from '../../components/dashboard/StatsCard'
import RecentActivity from '../../components/dashboard/RecentActivity'
import QuickActions from '../../components/dashboard/QuickActions'
import PatientQueue from '../../components/dashboard/PatientQueue'
import ThemeToggle from '../../components/ui/ThemeToggle'
import { getQuickActionsForRole } from '../../lib/roleBasedQuickActions'

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const { theme, colors } = useTheme()
  
  // Real data state
  const [stats, setStats] = useState({
    total_patients: 0,
    today_visits: 0,
    active_users: 0,
    today_revenue: 0,
    low_stock_items: 0,
    pending_claims: 0
  })
  const [activities, setActivities] = useState([])
  const [patients, setPatients] = useState([])
  const [syncStats, setSyncStats] = useState({
    connectedUsers: 0,
    activeUsers: 0,
    recentSyncEvents: 0,
    pendingNotifications: 0
  })
  const [dataLoading, setDataLoading] = useState(true)

  // Get role-based quick actions
  const quickActions = getQuickActionsForRole(user?.role || '')

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setDataLoading(true)
      const { accessToken } = useAuthStore.getState()
      
      if (!accessToken) {
        console.log('No access token available for dashboard data')
        return
      }

      // Fetch admin dashboard data
      const adminResponse = await fetch('http://localhost:5000/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (adminResponse.ok) {
        const adminData = await adminResponse.json()
        if (adminData.success) {
          setStats(adminData.data)
          setActivities(adminData.data.recent_audit_logs || [])
        }
      }

      // Fetch sync statistics
      const syncResponse = await fetch('http://localhost:5000/api/sync/stats', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (syncResponse.ok) {
        const syncData = await syncResponse.json()
        if (syncData.success) {
          setSyncStats(syncData.data)
        }
      }

      // Fetch recent patients
      const patientsResponse = await fetch('http://localhost:5000/api/patients?limit=5', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (patientsResponse.ok) {
        const patientsData = await patientsResponse.json()
        if (patientsData.success) {
          // Backend returns { data: { patients: [...], pagination: {...} } }
          const raw = patientsData.data?.patients || patientsData.data || []
          const list = Array.isArray(raw) ? raw : []
          setPatients(list)
        }
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setDataLoading(false)
    }
  }

  useEffect(() => {
    console.log('🔍 Dashboard: Auth state check', { user, isAuthenticated, isLoading })
    const timer = setTimeout(() => {
      console.log('🔍 Dashboard: After delay', { user, isAuthenticated, isLoading })
      setIsChecking(false)
      if (!isAuthenticated) {
        console.log('🔒 User not authenticated, redirecting to login')
        router.push('/login')
      } else {
        // Fetch data when authenticated
        fetchDashboardData()
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [isAuthenticated, user, isLoading, router])

  const handleLogout = async () => {
    console.log('🔐 Dashboard: Logout called')
    const { logout } = useAuthStore.getState()
    await logout()
    router.push('/login')
  }

  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex transition-colors duration-300">
      <Sidebar user={user} isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <div className="flex-1 flex flex-col">
        <nav className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 transition-colors duration-300">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Dashboard</h1>
              </div>
              <div className="flex items-center space-x-4" data-testid="user-menu">
                <span className="text-sm text-slate-700 dark:text-slate-300">Welcome back, {user?.username}!</span>
                <ThemeToggle />
                <button 
                  onClick={handleLogout} 
                  data-testid="logout-button" 
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>
        <main className="flex-1 p-6">
          <div className="space-y-6">
            {dataLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-slate-600 dark:text-slate-400">Loading dashboard data...</p>
              </div>
            ) : (
              <>
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatsCard
                    title="Total Patients"
                    value={stats.total_patients}
                    icon="👥"
                    color="blue"
                  />
                  <StatsCard
                    title="Today's Visits"
                    value={stats.today_visits}
                    icon="🏥"
                    color="green"
                  />
                  <StatsCard
                    title="Active Users"
                    value={syncStats.activeUsers}
                    icon="👨‍⚕️"
                    color="purple"
                  />
                  <StatsCard
                    title="Today's Revenue"
                    value={`KES ${stats.today_revenue.toLocaleString()}`}
                    icon="💰"
                    color="yellow"
                  />
                  <StatsCard
                    title="Low Stock Items"
                    value={stats.low_stock_items}
                    icon="📦"
                    color="red"
                  />
                  <StatsCard
                    title="Pending Claims"
                    value={stats.pending_claims}
                    icon="📋"
                    color="orange"
                  />
                  <StatsCard
                    title="Connected Users"
                    value={syncStats.connectedUsers}
                    icon="🔗"
                    color="green"
                  />
                  <StatsCard
                    title="Unread Notifications"
                    value={syncStats.pendingNotifications}
                    icon="🔔"
                    color="purple"
                  />
                </div>

                {/* Quick Actions */}
                <QuickActions actions={quickActions} />

                {/* Recent Activity and Patient Queue */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <RecentActivity activities={activities || []} />
                  <PatientQueue patients={(patients || []).map((p: any) => ({
                    id: p.id || p.patient_id || crypto?.randomUUID?.() || String(Math.random()),
                    name: [p.firstName || p.first_name, p.lastName || p.last_name].filter(Boolean).join(' ') || p.name || 'Unknown',
                    age: p.age ?? (p.dateOfBirth || p.date_of_birth ? Math.max(0, new Date().getFullYear() - new Date(p.dateOfBirth || p.date_of_birth).getFullYear()) : 0),
                    gender: ((p.gender || 'other').toString().toLowerCase() as 'male' | 'female' | 'other'),
                    priority: 'medium',
                    status: 'waiting',
                    waitTime: 10,
                    department: 'General'
                  }))} />
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
