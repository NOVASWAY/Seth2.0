'use client'

import { useAuthStore } from '../../lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '../../components/dashboard/Sidebar'
import { useToast } from '../../components/ui/use-toast'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { 
  Users, 
  Search, 
  Filter, 
  Unlock, 
  Lock, 
  UserCheck, 
  UserX, 
  Eye, 
  EyeOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'

interface StaffMember {
  id: string
  username: string
  email?: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'RECEPTIONIST' | 'NURSE' | 'CLINICAL_OFFICER' | 'PHARMACIST' | 'LAB_TECHNICIAN'
  isActive: boolean
  isLocked: boolean
  failedLoginAttempts: number
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
  lastFailedLoginAt?: string
}

interface StaffStats {
  total: number
  active: number
  locked: number
  inactive: number
  recentLogins: number
}

export default function StaffManagementPage() {
  const { user, isAuthenticated, isLoading, accessToken } = useAuthStore()
  const router = useRouter()
  const { toast } = useToast()
  
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [stats, setStats] = useState<StaffStats>({
    total: 0,
    active: 0,
    locked: 0,
    inactive: 0,
    recentLogins: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<StaffMember | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [userPassword, setUserPassword] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)

  // Check if user is admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'ADMIN')) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, user, isLoading, router])

  // Fetch staff data
  const fetchStaff = async () => {
    if (!accessToken) return

    try {
      setLoading(true)
      const response = await fetch('http://localhost:5000/api/admin/staff', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setStaff(result.data.staff || [])
          setStats(result.data.stats || stats)
        } else {
          throw new Error(result.message || 'Failed to fetch staff data')
        }
      } else if (response.status === 401) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive"
        })
        router.push('/login')
      } else {
        throw new Error('Failed to fetch staff data')
      }
    } catch (error) {
      console.error('Error fetching staff:', error)
      toast({
        title: "Error",
        description: "Failed to fetch staff data. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      fetchStaff()
    }
  }, [isAuthenticated, user, accessToken])

  // Filter staff based on search and filters
  const filteredStaff = (staff || []).filter(member => {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase()
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
                         member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesRole = roleFilter === 'all' || member.role === roleFilter
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && member.isActive && !member.isLocked) ||
                         (statusFilter === 'locked' && member.isLocked) ||
                         (statusFilter === 'inactive' && !member.isActive)
    
    return matchesSearch && matchesRole && matchesStatus
  })

  // Handle user actions
  const handleUnlockUser = async (userId: string) => {
    if (!accessToken) return

    try {
      setActionLoading(userId)
      const response = await fetch(`http://localhost:5000/api/admin/staff/${userId}/unlock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          toast({
            title: "Success",
            description: "User account unlocked successfully",
            variant: "default"
          })
          fetchStaff() // Refresh data
        } else {
          throw new Error(result.message || 'Failed to unlock user')
        }
      } else {
        throw new Error('Failed to unlock user')
      }
    } catch (error) {
      console.error('Error unlocking user:', error)
      toast({
        title: "Error",
        description: "Failed to unlock user account",
        variant: "destructive"
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    if (!accessToken) return

    try {
      setActionLoading(userId)
      const response = await fetch(`http://localhost:5000/api/admin/staff/${userId}/toggle-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !currentStatus })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          toast({
            title: "Success",
            description: `User account ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
            variant: "default"
          })
          fetchStaff() // Refresh data
        } else {
          throw new Error(result.message || 'Failed to update user status')
        }
      } else {
        throw new Error('Failed to update user status')
      }
    } catch (error) {
      console.error('Error updating user status:', error)
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive"
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleResetPassword = async (userId: string) => {
    if (!accessToken) return

    try {
      setActionLoading(userId)
      const response = await fetch(`http://localhost:5000/api/admin/staff/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          toast({
            title: "Success",
            description: "Password reset successfully. New password sent to user.",
            variant: "default"
          })
          fetchStaff() // Refresh data
        } else {
          throw new Error(result.message || 'Failed to reset password')
        }
      } else {
        throw new Error('Failed to reset password')
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      toast({
        title: "Error",
        description: "Failed to reset password",
        variant: "destructive"
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleGeneratePassword = async (member: StaffMember) => {
    if (!accessToken) {
      toast({
        title: "Authentication Error",
        description: "Please log in to generate passwords",
        variant: "destructive"
      })
      return
    }

    try {
      setActionLoading(member.id)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/admin/staff/${member.id}/password`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setUserPassword(result.data.password)
          setSelectedUser(member)
          setShowPasswordDialog(true)
          setShowPassword(false)
          toast({
            title: "New Password Generated",
            description: `A new password has been generated for ${member.username}`,
            variant: "default"
          })
        } else {
          throw new Error(result.message || 'Failed to generate password')
        }
      } else if (response.status === 401) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive"
        })
        // Clear tokens and redirect
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
      } else if (response.status === 404) {
        toast({
          title: "User Not Found",
          description: "The selected user could not be found.",
          variant: "destructive"
        })
      } else if (response.status === 500) {
        toast({
          title: "Server Error",
          description: "An error occurred on the server. Please try again later.",
          variant: "destructive"
        })
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to generate password (${response.status})`)
      }
    } catch (error) {
      console.error('Error generating password:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate user password",
        variant: "destructive"
      })
    } finally {
      setActionLoading(null)
    }
  }

  const getRoleColor = (role: string) => {
    const colors = {
      ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      RECEPTIONIST: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      NURSE: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      CLINICAL_OFFICER: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      PHARMACIST: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      LAB_TECHNICIAN: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400'
    }
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
  }

  const getStatusBadge = (member: StaffMember) => {
    if (!member.isActive) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">Inactive</Badge>
    }
    if (member.isLocked) {
      return <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Locked</Badge>
    }
    return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Active</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading staff management...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        currentPath="/staff"
      />
      
      <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                  <Users className="h-8 w-8 text-orange-500" />
                  Staff Management
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                  Manage staff accounts, unlock users, and control access
                </p>
              </div>
              <Button 
                onClick={fetchStaff}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Staff</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
                  </div>
                  <Users className="h-8 w-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Active</p>
                    <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Locked</p>
                    <p className="text-2xl font-bold text-red-600">{stats.locked}</p>
                  </div>
                  <Lock className="h-8 w-8 text-red-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Inactive</p>
                    <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
                  </div>
                  <UserX className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Recent Logins</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.recentLogins}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder="Search by name, username, or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                    <SelectItem value="NURSE">Nurse</SelectItem>
                    <SelectItem value="CLINICAL_OFFICER">Clinical Officer</SelectItem>
                    <SelectItem value="PHARMACIST">Pharmacist</SelectItem>
                    <SelectItem value="LAB_TECHNICIAN">Lab Technician</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="locked">Locked</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Staff List */}
          <Card>
            <CardHeader>
              <CardTitle>Staff Members ({filteredStaff.length})</CardTitle>
              <CardDescription>
                Manage staff accounts and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : filteredStaff.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400">No staff members found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredStaff.map((member) => (
                    <div key={member.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {member.firstName[0]}{member.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-medium text-slate-900 dark:text-slate-100">
                              {member.firstName} {member.lastName}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              @{member.username}
                              {member.email && ` • ${member.email}`}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getRoleColor(member.role)}>
                                {member.role.replace('_', ' ')}
                              </Badge>
                              {getStatusBadge(member)}
                              {member.failedLoginAttempts > 0 && (
                                <Badge variant="outline" className="text-orange-600 border-orange-200">
                                  {member.failedLoginAttempts} failed attempts
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {member.isLocked && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnlockUser(member.id)}
                              disabled={actionLoading === member.id}
                              className="text-green-600 border-green-200 hover:bg-green-50"
                            >
                              {actionLoading === member.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                              ) : (
                                <Unlock className="h-4 w-4" />
                              )}
                              Unlock
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleUserStatus(member.id, member.isActive)}
                            disabled={actionLoading === member.id}
                            className={member.isActive ? "text-red-600 border-red-200 hover:bg-red-50" : "text-green-600 border-green-200 hover:bg-green-50"}
                          >
                            {actionLoading === member.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            ) : member.isActive ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                            {member.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGeneratePassword(member)}
                            disabled={actionLoading === member.id}
                            className="text-purple-600 border-purple-200 hover:bg-purple-50"
                          >
                            {actionLoading === member.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                            Generate Password
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResetPassword(member.id)}
                            disabled={actionLoading === member.id}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            {actionLoading === member.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                            Reset Password
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center justify-between">
                          <span>Created: {formatDate(member.createdAt)}</span>
                          {member.lastLoginAt && (
                            <span>Last login: {formatDate(member.lastLoginAt)}</span>
                          )}
                          {member.lastFailedLoginAt && (
                            <span className="text-red-500">Last failed: {formatDate(member.lastFailedLoginAt)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Password View Dialog */}
          <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-purple-600" />
                  Generated Password
                </DialogTitle>
                <DialogDescription>
                  New password generated for {selectedUser?.firstName} {selectedUser?.lastName} (@{selectedUser?.username})
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={userPassword}
                      readOnly
                      className="pr-10 font-mono"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      <p className="font-medium">Security Notice</p>
                      <p>This password is sensitive information. Please ensure you're in a secure environment before viewing.</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(userPassword)
                      toast({
                        title: "Copied",
                        description: "Password copied to clipboard",
                        variant: "default"
                      })
                    }}
                  >
                    Copy Password
                  </Button>
                  <Button onClick={() => setShowPasswordDialog(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}