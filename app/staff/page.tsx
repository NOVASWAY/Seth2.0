"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Save,
  X,
  Loader2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface StaffMember {
  id: string
  username: string
  email?: string
  role: string
  is_active: boolean
  created_at: string
  updated_at: string
  first_name?: string
  last_name?: string
}

const ROLES = [
  { value: "ADMIN", label: "Administrator" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "NURSE", label: "Nurse" },
  { value: "CLINICAL_OFFICER", label: "Clinical Officer" },
  { value: "PHARMACIST", label: "Pharmacist" },
  { value: "INVENTORY_MANAGER", label: "Inventory Manager" },
  { value: "CLAIMS_MANAGER", label: "Claims Manager" }
]

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRole, setSelectedRole] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    role: "",
    password: ""
  })
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  // Fetch staff data
  const fetchStaff = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setStaff(result.data.users || [])
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch staff data",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching staff:", error)
      toast({
        title: "Error",
        description: "Failed to fetch staff data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  // Handle add staff
  const handleAddStaff = async () => {
    if (!formData.username || !formData.role || !formData.password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      const token = localStorage.getItem("token")
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          password: formData.password
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Staff member added successfully",
        })
        setIsAddDialogOpen(false)
        setFormData({
          username: "",
          email: "",
          first_name: "",
          last_name: "",
          role: "",
          password: ""
        })
        fetchStaff()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to add staff member",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding staff:", error)
      toast({
        title: "Error",
        description: "Failed to add staff member",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle edit staff
  const handleEditStaff = async () => {
    if (!editingStaff) return

    try {
      setSubmitting(true)
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/admin/users/${editingStaff.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          is_active: true
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Staff member updated successfully",
        })
        setIsEditDialogOpen(false)
        setEditingStaff(null)
        setFormData({
          username: "",
          email: "",
          first_name: "",
          last_name: "",
          role: "",
          password: ""
        })
        fetchStaff()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to update staff member",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating staff:", error)
      toast({
        title: "Error",
        description: "Failed to update staff member",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle delete staff
  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm("Are you sure you want to delete this staff member?")) return

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/admin/users/${staffId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting staff:", error)
      toast({
        title: "Error",
        description: "Failed to delete staff member",
        variant: "destructive",
      })
    }
  }

  // Open edit dialog
  const openEditDialog = (staff: StaffMember) => {
    setEditingStaff(staff)
    setFormData({
      username: staff.username,
      email: staff.email || "",
      first_name: staff.first_name || "",
      last_name: staff.last_name || "",
      role: staff.role,
      password: ""
    })
    setIsEditDialogOpen(true)
  }

  // Filter staff
  const filteredStaff = staff.filter((member) => {
    const matchesSearch = member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRole === "all" || member.role === selectedRole
    return matchesSearch && matchesRole
  })

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

  const getRoleLabel = (role: string) => {
    const roleObj = ROLES.find(r => r.value === role)
    return roleObj ? roleObj.label : role
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6 space-y-8">
        {/* Enhanced Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <Users className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-indigo-600 dark:from-slate-100 dark:to-indigo-400 bg-clip-text text-transparent">
                  Staff Management
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">Manage your clinic staff, roles, and permissions</p>
              </div>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <UserPlus className="h-5 w-5 mr-2" />
                  Add New Staff Member
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                  <UserPlus className="h-6 w-6 text-white" />
                </div>
                <DialogTitle className="text-2xl font-bold">Add New Staff Member</DialogTitle>
                <DialogDescription className="text-base">
                  Create a new staff account with appropriate role and permissions for your clinic.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name" className="text-sm font-semibold">First Name</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="h-11 border-2 focus:border-indigo-500"
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name" className="text-sm font-semibold">Last Name</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="h-11 border-2 focus:border-indigo-500"
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-semibold">Username *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="h-11 border-2 focus:border-indigo-500"
                    placeholder="Enter unique username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-11 border-2 focus:border-indigo-500"
                    placeholder="Enter email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-semibold">Role *</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger className="h-11 border-2 focus:border-indigo-500">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="h-11 border-2 focus:border-indigo-500"
                    placeholder="Enter password (min 8 characters)"
                    required
                  />
                </div>
              </div>
              <DialogFooter className="gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="px-6">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleAddStaff} disabled={submitting} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 px-8">
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Add Staff Member
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Enhanced Filters */}
        <Card className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-700 dark:to-slate-600 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5 text-indigo-600" />
              Search & Filter Staff
            </CardTitle>
            <CardDescription>
              Find and filter staff members by name, email, or role
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <Input
                    placeholder="Search by name, username, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 text-lg border-2 border-slate-200 dark:border-slate-600 focus:border-indigo-500 dark:focus:border-indigo-400 rounded-lg"
                  />
                </div>
              </div>
              <div className="w-full sm:w-56">
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="h-12 text-lg border-2 border-slate-200 dark:border-slate-600 focus:border-indigo-500 dark:focus:border-indigo-400 rounded-lg">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Staff List */}
        <Card className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-700 dark:to-slate-600 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Users className="h-6 w-6 text-indigo-600" />
              Staff Members ({filteredStaff.length})
            </CardTitle>
            <CardDescription className="text-base">
              Manage your clinic staff members and their roles
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">Loading staff members...</p>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                <p className="text-slate-600 dark:text-slate-400">No staff members found</p>
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                  {searchTerm || selectedRole !== "all" ? "Try adjusting your search criteria" : "Add your first staff member to get started"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredStaff.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-6 bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:border-indigo-300 dark:hover:border-indigo-500">
                    <div className="flex items-center gap-6">
                      <Avatar className="h-16 w-16 border-4 border-white dark:border-slate-600 shadow-lg">
                        <AvatarFallback className="text-lg font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                          {member.first_name?.[0]}{member.last_name?.[0] || member.username[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                          {member.first_name && member.last_name 
                            ? `${member.first_name} ${member.last_name}` 
                            : member.username}
                        </h3>
                        <p className="text-base text-slate-600 dark:text-slate-400 mb-2">@{member.username}</p>
                        {member.email && (
                          <p className="text-sm text-slate-500 dark:text-slate-500 flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {member.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-2">
                        <Badge className={`${getRoleBadgeColor(member.role)} text-sm px-3 py-1 font-semibold`}>
                          {getRoleLabel(member.role)}
                        </Badge>
                        <Badge variant={member.is_active ? "default" : "secondary"} className="text-sm px-3 py-1">
                          {member.is_active ? "✅ Active" : "❌ Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(member)}
                          className="border-indigo-300 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-600 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteStaff(member.id)}
                          className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Staff Member</DialogTitle>
              <DialogDescription>
                Update staff member information and role.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_first_name">First Name</Label>
                  <Input
                    id="edit_first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_last_name">Last Name</Label>
                  <Input
                    id="edit_last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_email">Email</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditStaff} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}