'use client'

import { useSimpleAuth } from '../../lib/simpleAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTheme } from '../../lib/ThemeContext'
import Sidebar from '../../components/dashboard/Sidebar'
import StatsCard from '../../components/dashboard/StatsCard'
import RecentActivity from '../../components/dashboard/RecentActivity'
import QuickActions from '../../components/dashboard/QuickActions'
import PatientQueue from '../../components/dashboard/PatientQueue'
import ThemeToggle from '../../components/ui/ThemeToggle'
import { mockStats, mockActivities, mockPatients, mockQuickActions, mockMenuItems } from '../../lib/mockData'

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useSimpleAuth()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const { theme, colors } = useTheme()

  useEffect(() => {
    console.log('🔍 Dashboard: Auth state check', { user, isAuthenticated, isLoading })
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
      <Sidebar menuItems={mockMenuItems} user={user} isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {mockStats.map((stat, index) => (
                <StatsCard 
                  key={index} 
                  {...stat} 
                  color={index === 0 ? 'orange' : index === 1 ? 'purple' : index === 2 ? 'orange' : 'purple'}
                />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <PatientQueue patients={mockPatients} title="Current Patient Queue" maxPatients={8} />
              </div>
              <div className="space-y-6">
                <QuickActions actions={mockQuickActions} title="Quick Actions" />
                <RecentActivity activities={mockActivities} title="Recent Activity" maxItems={6} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
