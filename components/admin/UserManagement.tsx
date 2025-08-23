"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { UserPlus, Key } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface User {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  role: string
  is_active: boolean
  is_locked: boolean
  failed_login_attempts: number
  last_login?: string
  created_at: string
}

export function UserManagement() {
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [tempPassword, setTempPassword] = useState("")

  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    role: "receptionist",
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setUsers(result.data)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(newUser),
      })

      if (response.ok) {
        const result = await response.json()
        setTempPassword(result.data.temp_password)
        setShowPasswordDialog(true)
        setShowCreateDialog(false)
        setNewUser({
          username: "",
          email: "",
          first_name: "",
          last_name: "",
          role: "receptionist",
        })
        fetchUsers()
        toast({
          title: "User Created",
          description: `User ${result.data.user.username} created successfully`,
        })
      } else {
        const error = await response.json()
        throw new Error(error.message)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateUser = async (userId: string, updates: Partial<User>) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        fetchUsers()
        toast({
          title: "User Updated",
          description: "User updated successfully",
        })
      } else {
        throw new Error("Failed to update user")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      })
    }
  }

  const resetPassword = async (userId: string, username: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setTempPassword(result.data.temp_password)
        setSelectedUser(users.find((u) => u.id === userId) || null)
        setShowPasswordDialog(true)
        toast({
          title: "Password Reset",
          description: `Password reset for ${username}`,
        })
      } else {
        throw new Error("Failed to reset password")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset password",
        variant: "destructive",
      })
    }
  }

  const getRoleBadge = (role: string) => {
    const roleColors = {
      admin: "destructive",
      clinical_officer: "default",
      nurse: "secondary",
      pharmacist: "default",
      receptionist: "outline",
      inventory_manager: "secondary",
      claims_manager: "default",
    }

    return (
      <Badge variant={roleColors[role as keyof typeof roleColors] as any}>{role.replace("_", " ").toUpperCase()}</Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground">Manage system users and permissions</p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={createUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="clinical_officer">Clinical Officer</SelectItem>
                    <SelectItem value="nurse">Nurse</SelectItem>
                    <SelectItem value="pharmacist">Pharmacist</SelectItem>
                    <SelectItem value="receptionist">Receptionist</SelectItem>
                    <SelectItem value="inventory_manager">Inventory Manager</SelectItem>
                    <SelectItem value="claims_manager">Claims Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Creating..." : "Create User"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="font-medium">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">@{user.username}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getRoleBadge(user.role)}
                    {!user.is_active && <Badge variant="secondary">Inactive</Badge>}
                    {user.is_locked && <Badge variant="destructive">Locked</Badge>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${user.id}`} className="text-sm">
                      Active
                    </Label>
                    <Switch
                      id={`active-${user.id}`}
                      checked={user.is_active}
                      onCheckedChange={(checked) => updateUser(user.id, { is_active: checked })}
                    />
                  </div>

                  <Button variant="outline" size="sm" onClick={() => resetPassword(user.id, user.username)}>
                    <Key className="h-4 w-4 mr-2" />
                    Reset Password
                  </Button>
                </div>
              </div>

              <div className="mt-4 text-sm text-muted-foreground">
                <div>Created: {new Date(user.created_at).toLocaleDateString()}</div>
                {user.last_login && <div>Last Login: {new Date(user.last_login).toLocaleString()}</div>}
                {user.failed_login_attempts > 0 && (
                  <div className="text-destructive">Failed Login Attempts: {user.failed_login_attempts}</div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              {selectedUser ? `Password reset for ${selectedUser.username}` : `New user created: ${newUser.username}`}
            </p>
            <div className="p-4 bg-muted rounded-lg">
              <Label>Temporary Password:</Label>
              <div className="text-lg font-mono font-bold">{tempPassword}</div>
            </div>
            <p className="text-sm text-muted-foreground">
              Please provide this temporary password to the user. They will be required to change it on first login.
            </p>
            <Button onClick={() => setShowPasswordDialog(false)} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
