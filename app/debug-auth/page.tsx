"use client"

import { useAuthStore } from "../../lib/auth"
import { useEffect, useState } from "react"

export default function DebugAuthPage() {
  const { user, accessToken, refreshToken, isAuthenticated, initialize } = useAuthStore()
  const [localStorageTokens, setLocalStorageTokens] = useState<{
    accessToken: string | null
    refreshToken: string | null
  }>({ accessToken: null, refreshToken: null })

  useEffect(() => {
    initialize()
    
    // Check localStorage
    const storedAccessToken = localStorage.getItem('accessToken')
    const storedRefreshToken = localStorage.getItem('refreshToken')
    setLocalStorageTokens({
      accessToken: storedAccessToken,
      refreshToken: storedRefreshToken
    })
  }, [initialize])

  const handleLogin = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'admin123'
        })
      })
      
      const data = await response.json()
      console.log('Login response:', data)
      
      if (data.success) {
        // Store tokens manually
        localStorage.setItem('accessToken', data.data.accessToken)
        localStorage.setItem('refreshToken', data.data.refreshToken)
        
        // Update state
        setLocalStorageTokens({
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken
        })
        
        // Initialize auth store
        initialize()
      }
    } catch (error) {
      console.error('Login error:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setLocalStorageTokens({ accessToken: null, refreshToken: null })
    initialize()
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Debug</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Auth Store State</h2>
            <div className="space-y-2">
              <p><strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
              <p><strong>User:</strong> {user ? `${user.username} (${user.role})` : 'None'}</p>
              <p><strong>Access Token:</strong> {accessToken ? 'Present' : 'Missing'}</p>
              <p><strong>Refresh Token:</strong> {refreshToken ? 'Present' : 'Missing'}</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">LocalStorage</h2>
            <div className="space-y-2">
              <p><strong>Access Token:</strong> {localStorageTokens.accessToken ? 'Present' : 'Missing'}</p>
              <p><strong>Refresh Token:</strong> {localStorageTokens.refreshToken ? 'Present' : 'Missing'}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex gap-4">
          <button
            onClick={handleLogin}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Login as Admin
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
