'use client'

import { useSimpleAuth } from '../../lib/simpleAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '../../components/dashboard/Sidebar'
import StatsCard from '../../components/dashboard/StatsCard'
import RecentActivity from '../../components/dashboard/RecentActivity'
import QuickActions from '../../components/dashboard/QuickActions'
import PatientQueue from '../../components/dashboard/PatientQueue'
import { mockStats, mockActivities, mockPatients, mockQuickActions, mockMenuItems } from '../../lib/mockData'

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useSimpleAuth()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  useEffect(() => {
    console.log('🔍 Dashboard: Auth state check', { user, isAuthenticated, isLoading })
    
    // Add a small delay to allow Zustand state to be properly loaded
    const timer = setTimeout(() => {
      console.log('🔍 Dashboard: After delay', { user, isAuthenticated, isLoading })
      setIsChecking(false)
      
      if (!isAuthenticated) {
        console.log('🔒 User not authenticated, redirecting to login')
        router.push('/login')
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [isAuthenticated, user, isLoading, router])

  const handleLogout = () => {
    console.log('🔐 Dashboard: Logout called')
    const { logout } = useSimpleAuth.getState()
    logout()
    router.push('/login')
  }

  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar
        menuItems={mockMenuItems}
        user={user}
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  Welcome back, {user?.username}!
                </span>
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

        {/* Dashboard Content */}
        <main className="flex-1 p-6">
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {mockStats.map((stat, index) => (
                <StatsCard
                  key={index}
                  title={stat.title}
                  value={stat.value}
                  change={stat.change}
                  changeType={stat.changeType}
                  icon={stat.icon}
                  color={stat.color}
                />
              ))}
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Patient Queue */}
              <div className="lg:col-span-2">
                <PatientQueue
                  patients={mockPatients}
                  title="Current Patient Queue"
                  maxPatients={8}
                />
              </div>

              {/* Right Column - Quick Actions & Recent Activity */}
              <div className="space-y-6">
                <QuickActions
                  actions={mockQuickActions}
                  title="Quick Actions"
                />
                
                <RecentActivity
                  activities={mockActivities}
                  title="Recent Activity"
                  maxItems={6}
                />
              </div>
            </div>

            {/* Additional Dashboard Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today's Schedule */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Today's Schedule</h3>
                </div>
                <div className="p-6">
                  <div className="text-center text-gray-500">
                    <p>📅 Schedule component coming soon...</p>
                    <p className="text-sm mt-2">This will show today's appointments and staff schedules</p>
                  </div>
                </div>
              </div>

              {/* System Status */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">System Status</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Database</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✅ Online
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">API Services</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✅ Online
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">File Storage</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✅ Online
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
