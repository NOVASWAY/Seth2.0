"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { 
  Search, 
  Unlock, 
  Key, 
  User, 
  Mail, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from "lucide-react"

interface User {
  id: string
  username: string
  email?: string
  role: string
  isActive: boolean
  isLocked: boolean
  failedLoginAttempts: number
  lastLoginAt?: string
  createdAt: string
}

interface UserRecoveryFormProps {
  onUserUpdated?: () => void
}

export function UserRecoveryForm({ onUserUpdated }: UserRecoveryFormProps) {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, statusFilter])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setUsers(result.data || [])
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch users",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = users

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Filter by status
    if (statusFilter === "locked") {
      filtered = filtered.filter((user) => user.isLocked)
    } else if (statusFilter === "active") {
      filtered = filtered.filter((user) => user.isActive && !user.isLocked)
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter((user) => !user.isActive)
    }

    setFilteredUsers(filtered)
  }

  const handleUnlockAccount = async (userId: string) => {
    setActionLoading(`unlock-${userId}`)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/admin/users/${userId}/unlock`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Account unlocked successfully",
        })
        fetchUsers()
        onUserUpdated?.()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to unlock account",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error unlocking account:", error)
      toast({
        title: "Error",
        description: "Failed to unlock account",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleResetPassword = async (userId: string) => {
    setActionLoading(`reset-${userId}`)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Success",
          description: `Password reset successfully. Temporary password: ${result.data.temp_password}`,
        })
        fetchUsers()
        onUserUpdated?.()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to reset password",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error resetting password:", error)
      toast({
        title: "Error",
        description: "Failed to reset password",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (user: User) => {
    if (!user.isActive) {
      return <Badge variant="secondary">Inactive</Badge>
    }
    if (user.isLocked) {
      return <Badge variant="destructive">Locked</Badge>
    }
    return <Badge variant="default">Active</Badge>
  }

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      ADMIN: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      NURSE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      PHARMACIST: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      CASHIER: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      CLINICAL_OFFICER: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
      CLAIMS_MANAGER: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    }
    
    return (
      <Badge className={roleColors[role] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"}>
        {role.replace("_", " ")}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading users...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">User Account Recovery</h2>
        <p className="text-muted-foreground">Manage locked accounts and reset passwords for legitimate users</p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter Users
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Users</Label>
              <Input
                id="search"
                placeholder="Search by username or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Filter by Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="locked">Locked Accounts</SelectItem>
                  <SelectItem value="active">Active Accounts</SelectItem>
                  <SelectItem value="inactive">Inactive Accounts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-red-500">
                  {users.filter(u => u.isLocked).length}
                </div>
                <div className="text-sm text-muted-foreground">Locked Accounts</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-500">
                  {users.filter(u => u.isActive && !u.isLocked).length}
                </div>
                <div className="text-sm text-muted-foreground">Active Accounts</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-blue-500">{users.length}</div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-600 dark:bg-gray-800/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div>
                      <div className="font-medium dark:text-white">{user.username}</div>
                      {user.email && (
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                      )}
                    </div>
                    {getStatusBadge(user)}
                    {getRoleBadge(user.role)}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {user.failedLoginAttempts > 0 && (
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {user.failedLoginAttempts} failed attempts
                      </div>
                    )}
                    {user.lastLoginAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last login: {new Date(user.lastLoginAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {user.isLocked && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUnlockAccount(user.id)}
                      disabled={actionLoading === `unlock-${user.id}`}
                      className="dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
                    >
                      {actionLoading === `unlock-${user.id}` ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Unlock className="h-4 w-4" />
                      )}
                      Unlock
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResetPassword(user.id)}
                    disabled={actionLoading === `reset-${user.id}`}
                    className="dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
                  >
                    {actionLoading === `reset-${user.id}` ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Key className="h-4 w-4" />
                    )}
                    Reset Password
                  </Button>
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No users found matching your criteria
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Help Information */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Account Recovery Process:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• <strong>Unlock:</strong> Removes the lock status and resets failed login attempts</li>
            <li>• <strong>Reset Password:</strong> Generates a temporary password and unlocks the account</li>
            <li>• Users should change their password immediately after receiving the temporary password</li>
            <li>• All actions are logged in the audit trail for security purposes</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}
