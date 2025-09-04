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
import { menuItems } from '../../lib/menuConfig'

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useSimpleAuth()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const { theme, colors } = useTheme()
  
  // Real data state
  const [stats, setStats] = useState([])
  const [activities, setActivities] = useState([])
  const [patients, setPatients] = useState([])
  const [quickActions, setQuickActions] = useState([])
  const [dataLoading, setDataLoading] = useState(true)

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setDataLoading(true)
      // TODO: Replace with real API calls
      // For now, using empty arrays to show clean state
      setStats([])
      setActivities([])
      setPatients([])
      setQuickActions([])
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
      <Sidebar menuItems={menuItems} user={user} isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
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
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                    Welcome to Seth Clinic Management System
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mb-8">
                    Your system is ready! Start by adding patients, staff, and configuring your clinic settings.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">👥 Add Patients</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Register new patients to start managing their care</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">👨‍⚕️ Manage Staff</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Add staff members and assign roles</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">⚙️ Configure Settings</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Set up your clinic preferences and settings</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
