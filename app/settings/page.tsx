"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Database, 
  Globe, 
  Palette,
  Save,
  RefreshCw
} from "lucide-react"
import { useToast } from "../../hooks/use-toast"
import { ProtectedRoute } from "../../components/auth/ProtectedRoute"
import { UserRole } from "../../types"

export default function SettingsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // Settings state
  const [clinicSettings, setClinicSettings] = useState({
    name: "Seth Medical Clinic",
    address: "Nairobi, Kenya",
    phone: "+254 700 000 000",
    email: "info@sethclinic.com",
    currency: "KES",
    timezone: "Africa/Nairobi"
  })

  const [userSettings, setUserSettings] = useState({
    notifications: true,
    emailAlerts: true,
    smsAlerts: false,
    darkMode: true,
    language: "en"
  })

  const [systemSettings, setSystemSettings] = useState({
    autoBackup: true,
    backupFrequency: "daily",
    sessionTimeout: "30",
    maxLoginAttempts: "5"
  })

  const handleSave = async (section: string) => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: "Settings Saved",
        description: `${section} settings have been updated successfully.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500 rounded-lg">
            <Settings className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Settings
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Manage your clinic configuration and preferences</p>
          </div>
        </div>

        <Tabs defaultValue="clinic" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <TabsTrigger value="clinic" className="flex items-center gap-2 text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 hover:text-slate-900 dark:hover:text-slate-100">
              <Globe className="h-4 w-4" />
              Clinic
            </TabsTrigger>
            <TabsTrigger value="user" className="flex items-center gap-2 text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 hover:text-slate-900 dark:hover:text-slate-100">
              <User className="h-4 w-4" />
              User
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2 text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 hover:text-slate-900 dark:hover:text-slate-100">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2 text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 hover:text-slate-900 dark:hover:text-slate-100">
              <Shield className="h-4 w-4" />
              System
            </TabsTrigger>
          </TabsList>

          {/* Clinic Settings */}
          <TabsContent value="clinic" className="space-y-4">
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <Globe className="h-5 w-5" />
                  Clinic Information
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Manage your clinic's basic information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clinicName" className="text-slate-700 dark:text-slate-300">Clinic Name</Label>
                    <Input
                      id="clinicName"
                      value={clinicSettings.name}
                      onChange={(e) => setClinicSettings(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinicPhone" className="text-slate-700 dark:text-slate-300">Phone Number</Label>
                    <Input
                      id="clinicPhone"
                      value={clinicSettings.phone}
                      onChange={(e) => setClinicSettings(prev => ({ ...prev, phone: e.target.value }))}
                      className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinicEmail" className="text-slate-700 dark:text-slate-300">Email Address</Label>
                    <Input
                      id="clinicEmail"
                      type="email"
                      value={clinicSettings.email}
                      onChange={(e) => setClinicSettings(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinicAddress" className="text-slate-700 dark:text-slate-300">Address</Label>
                    <Input
                      id="clinicAddress"
                      value={clinicSettings.address}
                      onChange={(e) => setClinicSettings(prev => ({ ...prev, address: e.target.value }))}
                      className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency" className="text-slate-700 dark:text-slate-300">Currency</Label>
                    <Select value={clinicSettings.currency} onValueChange={(value) => setClinicSettings(prev => ({ ...prev, currency: value }))}>
                      <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                        <SelectValue className="text-slate-900 dark:text-slate-100" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectItem value="KES" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">Kenyan Shilling (KES)</SelectItem>
                        <SelectItem value="USD" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">US Dollar (USD)</SelectItem>
                        <SelectItem value="EUR" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">Euro (EUR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone" className="text-slate-700 dark:text-slate-300">Timezone</Label>
                    <Select value={clinicSettings.timezone} onValueChange={(value) => setClinicSettings(prev => ({ ...prev, timezone: value }))}>
                      <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                        <SelectValue className="text-slate-900 dark:text-slate-100" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectItem value="Africa/Nairobi" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">Africa/Nairobi</SelectItem>
                        <SelectItem value="Africa/Dar_es_Salaam" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">Africa/Dar_es_Salaam</SelectItem>
                        <SelectItem value="Africa/Kampala" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">Africa/Kampala</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
              </div>
              <Separator />
              <Button onClick={() => handleSave("Clinic")} disabled={isLoading} className="flex items-center gap-2">
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Clinic Settings
              </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Settings */}
          <TabsContent value="user" className="space-y-4">
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <User className="h-5 w-5" />
                  User Preferences
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Customize your personal settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-slate-700 dark:text-slate-300">Dark Mode</Label>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Switch between light and dark themes
                      </p>
                    </div>
                    <Switch
                      checked={userSettings.darkMode}
                      onCheckedChange={(checked) => setUserSettings(prev => ({ ...prev, darkMode: checked }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language" className="text-slate-700 dark:text-slate-300">Language</Label>
                    <Select value={userSettings.language} onValueChange={(value) => setUserSettings(prev => ({ ...prev, language: value }))}>
                      <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                        <SelectValue className="text-slate-900 dark:text-slate-100" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectItem value="en" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">English</SelectItem>
                        <SelectItem value="sw" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">Kiswahili</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator />
                <Button onClick={() => handleSave("User")} disabled={isLoading} className="flex items-center gap-2">
                  {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save User Settings
                </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Configure how you receive notifications and alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-slate-700 dark:text-slate-300">Push Notifications</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Receive notifications in the application
                    </p>
                  </div>
                  <Switch
                    checked={userSettings.notifications}
                    onCheckedChange={(checked) => setUserSettings(prev => ({ ...prev, notifications: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-slate-700 dark:text-slate-300">Email Alerts</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Receive important updates via email
                    </p>
                  </div>
                  <Switch
                    checked={userSettings.emailAlerts}
                    onCheckedChange={(checked) => setUserSettings(prev => ({ ...prev, emailAlerts: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-slate-700 dark:text-slate-300">SMS Alerts</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Receive urgent notifications via SMS
                    </p>
                  </div>
                  <Switch
                    checked={userSettings.smsAlerts}
                    onCheckedChange={(checked) => setUserSettings(prev => ({ ...prev, smsAlerts: checked }))}
                  />
                </div>
              </div>
              <Separator />
              <Button onClick={() => handleSave("Notifications")} disabled={isLoading} className="flex items-center gap-2">
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-4">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Shield className="h-5 w-5" />
                System Configuration
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Manage system security and maintenance settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-slate-700 dark:text-slate-300">Automatic Backups</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Automatically backup system data
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.autoBackup}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, autoBackup: checked }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backupFrequency" className="text-slate-700 dark:text-slate-300">Backup Frequency</Label>
                  <Select value={systemSettings.backupFrequency} onValueChange={(value) => setSystemSettings(prev => ({ ...prev, backupFrequency: value }))}>
                    <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                      <SelectValue className="text-slate-900 dark:text-slate-100" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectItem value="daily" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">Daily</SelectItem>
                      <SelectItem value="weekly" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">Weekly</SelectItem>
                      <SelectItem value="monthly" className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout" className="text-slate-700 dark:text-slate-300">Session Timeout (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={systemSettings.sessionTimeout}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, sessionTimeout: e.target.value }))}
                    className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxLoginAttempts" className="text-slate-700 dark:text-slate-300">Max Login Attempts</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    value={systemSettings.maxLoginAttempts}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, maxLoginAttempts: e.target.value }))}
                    className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  Database: Connected
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Security: Active
                </Badge>
              </div>
              <Button onClick={() => handleSave("System")} disabled={isLoading} className="flex items-center gap-2">
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save System Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
    </ProtectedRoute>
  )
}
