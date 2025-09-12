'use client'

import { useAuthStore } from '../../lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState, Suspense, useMemo } from 'react'
import { useTheme } from '../../lib/ThemeContext'
import { OptimizedProtectedRoute } from '../../components/auth/OptimizedProtectedRoute'
import { LazyWrapper, createLazyComponent } from '../../components/ui/LazyWrapper'
import { DashboardSkeleton } from '../../components/ui/Skeleton'
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

// Dashboard content component (separated for better performance)
function DashboardContent() {
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
  const [patients, setPatients] = useState([])
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

  // Optimized data fetching with caching
  const fetchDashboardData = async () => {
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
        setPatients(patientsResponse.value.data.data || [])
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
  }

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {dataLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <LazyWrapper key={i} fallback="card">
                    <div />
                  </LazyWrapper>
                ))
              ) : (
                <>
                  <LazyWrapper fallback="card">
                    <StatsCard
                      title="Total Patients"
                      value={stats.total_patients}
                      change="+12%"
                      changeType="positive"
                      icon="Users"
                    />
                  </LazyWrapper>
                  <LazyWrapper fallback="card">
                    <StatsCard
                      title="Today's Visits"
                      value={stats.today_visits}
                      change="+8%"
                      changeType="positive"
                      icon="Calendar"
                    />
                  </LazyWrapper>
                  <LazyWrapper fallback="card">
                    <StatsCard
                      title="Active Users"
                      value={stats.active_users}
                      change="+5%"
                      changeType="positive"
                      icon="UserCheck"
                    />
                  </LazyWrapper>
                  <LazyWrapper fallback="card">
                    <StatsCard
                      title="Today's Revenue"
                      value={`KES ${stats.today_revenue.toLocaleString()}`}
                      change="+15%"
                      changeType="positive"
                      icon="DollarSign"
                    />
                  </LazyWrapper>
                </>
              )}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <LazyWrapper fallback="skeleton">
                <QuickActions actions={quickActions} />
              </LazyWrapper>

              {/* Recent Activity */}
              <LazyWrapper fallback="skeleton">
                <RecentActivity activities={activities} />
              </LazyWrapper>

              {/* Patient Queue */}
              <LazyWrapper fallback="skeleton">
                <PatientQueue patients={patients} />
              </LazyWrapper>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (
    <OptimizedProtectedRoute>
      <DashboardContent />
    </OptimizedProtectedRoute>
  )
}