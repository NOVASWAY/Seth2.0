'use client'

import { useAuthStore } from '../../lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState, Suspense, useMemo, useCallback, memo } from 'react'
import { useTheme } from '../../lib/ThemeContext'
import { OptimizedProtectedRoute } from '../../components/auth/OptimizedProtectedRoute'
import { LazyWrapper, createLazyComponent } from '../../components/ui/LazyWrapper'
import { DashboardSkeleton } from '../../components/ui/skeleton'
import { getQuickActionsForRole } from '../../lib/roleBasedQuickActions'
import axios from 'axios'

// Lazy load heavy components
const Sidebar = createLazyComponent(() => import('../../components/dashboard/Sidebar'), 'skeleton')
const StatsCard = createLazyComponent(() => import('../../components/dashboard/StatsCard'), 'card')
const RecentActivity = createLazyComponent(() => import('../../components/dashboard/RecentActivity'), 'skeleton')
const QuickActions = createLazyComponent(() => import('../../components/dashboard/QuickActions'), 'skeleton')
const PatientQueue = createLazyComponent(() => import('../../components/dashboard/PatientQueue'), 'skeleton')
const ThemeToggle = createLazyComponent(() => import('../../components/ui/ThemeToggle'), 'spinner')

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

// Memoized Stats Cards Component
const StatsCards = memo(({ stats, loading }: { stats: any; loading: boolean }) => {
  if (loading) {
    return (
      <>
        {Array.from({ length: 4 }).map((_, i) => (
          <LazyWrapper key={i} fallback="card">
            <div />
          </LazyWrapper>
        ))}
      </>
    )
  }

  const statsData = [
    {
      title: 'Total Patients',
      value: (stats.total_patients || 0).toLocaleString(),
      change: '+12%',
      changeType: 'increase' as const,
      color: 'purple' as const,
      icon: 'Users',
      description: 'from last month'
    },
    {
      title: 'Today\'s Visits',
      value: (stats.today_visits || 0).toLocaleString(),
      change: '+8%',
      changeType: 'increase' as const,
      color: 'orange' as const,
      icon: 'Calendar',
      description: 'from last month'
    },
    {
      title: 'Active Users',
      value: (stats.active_users || 0).toLocaleString(),
      change: '+5%',
      changeType: 'increase' as const,
      color: 'green' as const,
      icon: 'UserCheck',
      description: 'from last month'
    },
    {
      title: 'Today\'s Revenue',
      value: `KSh ${(stats.today_revenue || 0).toLocaleString()}`,
      change: '+15%',
      changeType: 'increase' as const,
      color: 'heartbeat' as const,
      icon: 'Banknote',
      description: 'from last month'
    }
  ]

  return (
    <>
      {statsData.map((stat, index) => (
        <LazyWrapper key={index} fallback="card">
          <StatsCard {...stat} />
        </LazyWrapper>
      ))}
    </>
  )
})

StatsCards.displayName = 'StatsCards'

// Simplified Dashboard Content Component
const DashboardContent = memo(() => {
  const { user } = useAuthStore()
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
  const [patients, setPatients] = useState<any[]>([])
  const [syncStats, setSyncStats] = useState({
    connectedUsers: 0,
    activeUsers: 0,
    recentSyncEvents: 0,
    pendingNotifications: 0
  })
  const [dataLoading, setDataLoading] = useState(true)

  // Get role-based quick actions (memoized)
  const quickActions = useMemo(() => 
    getQuickActionsForRole(user?.role || ''), 
    [user?.role]
  )

  // Simplified data fetching
  const fetchDashboardData = useCallback(async () => {
    try {
      setDataLoading(true)
      const { accessToken } = useAuthStore.getState()
      
      if (!accessToken) return

      console.log('📊 Fetching dashboard data...')
      
      // Fetch all data in parallel for better performance
      const [statsResponse, activitiesResponse, patientsResponse, syncResponse] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/admin/dashboard`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        }),
        axios.get(`${API_BASE_URL}/admin/audit-logs?limit=10`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        }),
        axios.get(`${API_BASE_URL}/patients?limit=5&sort=created_at&order=desc`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        }),
        axios.get(`${API_BASE_URL}/sync/stats`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      ])

      // Process responses efficiently
      if (statsResponse.status === 'fulfilled' && statsResponse.value.data.success) {
        setStats(statsResponse.value.data.data || stats)
      }
      if (activitiesResponse.status === 'fulfilled' && activitiesResponse.value.data.success) {
        setActivities(activitiesResponse.value.data.data || [])
      }
      if (patientsResponse.status === 'fulfilled' && patientsResponse.value.data.success) {
        const patientsData = patientsResponse.value.data.data
        if (Array.isArray(patientsData)) {
          setPatients(patientsData)
        } else if (patientsData && Array.isArray(patientsData.patients)) {
          setPatients(patientsData.patients)
        } else {
          setPatients([])
        }
      }
      if (syncResponse.status === 'fulfilled' && syncResponse.value.data.success) {
        setSyncStats(syncResponse.value.data.data || syncStats)
      }

      console.log('✅ Dashboard data fetched successfully')
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error)
    } finally {
      setDataLoading(false)
    }
  }, [])

  // Fetch data on mount
  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="flex">
        {/* Sidebar */}
        <LazyWrapper fallback="skeleton">
          <Sidebar 
            isCollapsed={isSidebarCollapsed} 
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </LazyWrapper>

        {/* Main Content */}
        <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  Welcome back, {user?.username}!
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Here's what's happening at your clinic today.
                </p>
              </div>
              <LazyWrapper fallback="spinner">
                <ThemeToggle />
              </LazyWrapper>
            </div>

            {/* Stats Cards */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
                Clinic Overview
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCards stats={stats} loading={dataLoading} />
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Quick Actions */}
              <div className="lg:col-span-1">
                <LazyWrapper fallback="skeleton">
                  <QuickActions 
                    actions={quickActions}
                  />
                </LazyWrapper>
              </div>

              {/* Recent Activity */}
              <div className="lg:col-span-2">
                <LazyWrapper fallback="skeleton">
                  <RecentActivity 
                    activities={activities}
                  />
                </LazyWrapper>
              </div>
            </div>

            {/* Patient Queue */}
            <div className="mb-8">
              <LazyWrapper fallback="skeleton">
                <PatientQueue 
                  patients={patients}
                />
              </LazyWrapper>
            </div>

            {/* Sync Status */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
                System Status
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {syncStats.connectedUsers}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Connected Users
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {syncStats.activeUsers}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Active Users
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {syncStats.recentSyncEvents}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Recent Syncs
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {syncStats.pendingNotifications}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Pending Notifications
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

DashboardContent.displayName = 'DashboardContent'

// Main Dashboard Component
export default function Dashboard() {
  return (
    <OptimizedProtectedRoute>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </OptimizedProtectedRoute>
  )
}
