"use client"

import { useState, useEffect } from "react"
import { useAuthStore } from "../../lib/auth"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Badge } from "../../components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog"
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  LogOut,
  Loader2
} from "lucide-react"
import { toast } from "../../hooks/use-toast"
import { ProtectedRoute } from "../../components/auth/ProtectedRoute"
import { UserRole } from "../../types"

interface StaffMember {
  id: string
  username: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
}

const ROLES = [
  { value: "ADMIN", label: "Administrator" },
  { value: "CLINICAL_OFFICER", label: "Clinical Officer" },
  { value: "NURSE", label: "Nurse" },
  { value: "PHARMACIST", label: "Pharmacist" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "INVENTORY_MANAGER", label: "Inventory Manager" },
  { value: "CLAIMS_MANAGER", label: "Claims Manager" }
]

export default function StaffPage() {
  const { user, accessToken, logout } = useAuthStore()
  const router = useRouter()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    role: "",
    password: ""
  })

  useEffect(() => {
    fetchStaff()
  }, [])

  // Fetch staff data
  const fetchStaff = async () => {
    try {
      setLoading(true)
      const token = accessToken
      
      if (!token) {
        console.error('❌ No access token available')
        toast({
          title: "Error",
          description: "No authentication token available",
          variant: "destructive"
        })
        return
      }
      
      const response = await fetch("http://localhost:5000/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const result = await response.json()
        setStaff(result.data.users || [])
      } else {
        console.error('❌ Failed to fetch staff:', response.status)
        toast({
          title: "Error",
          description: "Failed to fetch staff data",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('❌ Error fetching staff:', error)
      toast({
        title: "Error",
        description: "An error occurred while fetching staff data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Add new staff member
  const handleAddStaff = async () => {
    try {
      const token = accessToken
      
      if (!token) {
        toast({
          title: "Error",
          description: "No authentication token available",
          variant: "destructive"
        })
        return
      }

      const response = await fetch("http://localhost:5000/api/users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Staff member added successfully",
        })
        setIsAddDialogOpen(false)
        setFormData({ username: "", email: "", role: "", password: "" })
        fetchStaff()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to add staff member",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('❌ Error adding staff:', error)
      toast({
        title: "Error",
        description: "An error occurred while adding staff member",
        variant: "destructive"
      })
    }
  }

  // Edit staff member
  const handleEditStaff = async () => {
    if (!editingStaff) return

    try {
      const token = accessToken
      
      if (!token) {
        toast({
          title: "Error",
          description: "No authentication token available",
          variant: "destructive"
        })
        return
      }

      const response = await fetch(`http://localhost:5000/api/users/${editingStaff.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          role: formData.role
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Staff member updated successfully",
        })
        setIsEditDialogOpen(false)
        setEditingStaff(null)
        setFormData({ username: "", email: "", role: "", password: "" })
        fetchStaff()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to update staff member",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('❌ Error updating staff:', error)
      toast({
        title: "Error",
        description: "An error occurred while updating staff member",
        variant: "destructive"
      })
    }
  }

  // Delete staff member
  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm("Are you sure you want to delete this staff member?")) return

    try {
      const token = accessToken
      
      if (!token) {
        toast({
          title: "Error",
          description: "No authentication token available",
          variant: "destructive"
        })
        return
      }

      const response = await fetch(`http://localhost:5000/api/users/${staffId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Staff member deleted successfully",
        })
        fetchStaff()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to delete staff member",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('❌ Error deleting staff:', error)
      toast({
        title: "Error",
        description: "An error occurred while deleting staff member",
        variant: "destructive"
      })
    }
  }

  // Open edit dialog
  const openEditDialog = (member: StaffMember) => {
    setEditingStaff(member)
    setFormData({
      username: member.username,
      email: member.email,
      role: member.role,
      password: ""
    })
    setIsEditDialogOpen(true)
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout()
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  // Filter staff based on search and role
  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = !roleFilter || member.role === roleFilter
    return matchesSearch && matchesRole
  })

  // Get role label
  const getRoleLabel = (role: string) => {
    const roleObj = ROLES.find(r => r.value === role)
    return roleObj ? roleObj.label : role
  }

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN": return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      case "CLINICAL_OFFICER": return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
      case "NURSE": return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      case "PHARMACIST": return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
      case "RECEPTIONIST": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
      case "INVENTORY_MANAGER": return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
      case "CLAIMS_MANAGER": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400"
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
  }

  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto p-6 space-y-8">
          {/* Enhanced Header */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-indigo-600 dark:from-slate-100 dark:to-indigo-400 bg-clip-text text-transparent">
                    Staff Management
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 mt-2">
                    Manage your clinic staff members and their roles
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-800"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <UserPlus className="h-5 w-5 mr-2" />
                      Add Staff Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">Add New Staff Member</DialogTitle>
                      <DialogDescription className="text-slate-600 dark:text-slate-400">
                        Fill in the details below to add a new staff member to your clinic.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="username" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Username *</Label>
                          <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className="bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-900 dark:text-slate-100"
                            placeholder="Enter username"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-900 dark:text-slate-100"
                            placeholder="Enter email"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="role" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Role *</Label>
                          <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                            <SelectTrigger className="bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-900 dark:text-slate-100">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600">
                              {ROLES.map((role) => (
                                <SelectItem key={role.value} value={role.value} className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password *</Label>
                          <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-900 dark:text-slate-100"
                            placeholder="Enter password"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleAddStaff}
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold px-6 py-2 rounded-lg"
                      >
                        Add Staff Member
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {/* Staff List */}
          <Card className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">Staff Members</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Manage and view all staff members in your clinic
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  <span className="ml-2 text-slate-600 dark:text-slate-400">Loading staff members...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredStaff.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                            {member.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{member.username}</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{member.email}</p>
                          <Badge className={`mt-1 ${getRoleBadgeColor(member.role)}`}>
                            {getRoleLabel(member.role)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => openEditDialog(member)}
                          variant="outline"
                          size="sm"
                          className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 dark:hover:border-blue-800"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteStaff(member.id)}
                          variant="outline"
                          size="sm"
                          className="hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">Edit Staff Member</DialogTitle>
                <DialogDescription className="text-slate-600 dark:text-slate-400">
                  Update the details for this staff member.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-username" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Username *</Label>
                    <Input
                      id="edit-username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-900 dark:text-slate-100"
                      placeholder="Enter username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-900 dark:text-slate-100"
                      placeholder="Enter email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Role *</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger className="bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-900 dark:text-slate-100">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600">
                      {ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value} className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600">
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleEditStaff}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold px-6 py-2 rounded-lg"
                >
                  Update Staff Member
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </ProtectedRoute>
  )
}