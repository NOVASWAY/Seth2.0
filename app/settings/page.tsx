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
import { useToast } from "@/hooks/use-toast"

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex items-center gap-3 animate-in slide-in-from-top-4 duration-500">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg">
            <Settings className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
              Settings
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Manage your clinic configuration and preferences</p>
          </div>
        </div>

        <Tabs defaultValue="clinic" className="space-y-6 animate-in slide-in-from-bottom-4 duration-700 delay-200">
          <TabsList className="grid w-full grid-cols-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
            <TabsTrigger value="clinic" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300">
              <Globe className="h-4 w-4" />
              Clinic
            </TabsTrigger>
            <TabsTrigger value="user" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300">
              <User className="h-4 w-4" />
              User
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300">
              <Shield className="h-4 w-4" />
              System
            </TabsTrigger>
          </TabsList>

          {/* Clinic Settings */}
          <TabsContent value="clinic" className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-500">
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                    <Globe className="h-5 w-5 text-white" />
                  </div>
                  Clinic Information
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Manage your clinic's basic information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3 group">
                    <Label htmlFor="clinicName" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Clinic Name</Label>
                    <Input
                      id="clinicName"
                      value={clinicSettings.name}
                      onChange={(e) => setClinicSettings(prev => ({ ...prev, name: e.target.value }))}
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-slate-300 dark:hover:border-slate-600"
                    />
                  </div>
                  <div className="space-y-3 group">
                    <Label htmlFor="clinicPhone" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Phone Number</Label>
                    <Input
                      id="clinicPhone"
                      value={clinicSettings.phone}
                      onChange={(e) => setClinicSettings(prev => ({ ...prev, phone: e.target.value }))}
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-slate-300 dark:hover:border-slate-600"
                    />
                  </div>
                  <div className="space-y-3 group">
                    <Label htmlFor="clinicEmail" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address</Label>
                    <Input
                      id="clinicEmail"
                      type="email"
                      value={clinicSettings.email}
                      onChange={(e) => setClinicSettings(prev => ({ ...prev, email: e.target.value }))}
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-slate-300 dark:hover:border-slate-600"
                    />
                  </div>
                  <div className="space-y-3 group">
                    <Label htmlFor="clinicAddress" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Address</Label>
                    <Input
                      id="clinicAddress"
                      value={clinicSettings.address}
                      onChange={(e) => setClinicSettings(prev => ({ ...prev, address: e.target.value }))}
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-slate-300 dark:hover:border-slate-600"
                    />
                  </div>
                  <div className="space-y-3 group">
                    <Label htmlFor="currency" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Currency</Label>
                    <Select value={clinicSettings.currency} onValueChange={(value) => setClinicSettings(prev => ({ ...prev, currency: value }))}>
                      <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-slate-300 dark:hover:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectItem value="KES" className="hover:bg-blue-50 dark:hover:bg-blue-900/20">Kenyan Shilling (KES)</SelectItem>
                        <SelectItem value="USD" className="hover:bg-blue-50 dark:hover:bg-blue-900/20">US Dollar (USD)</SelectItem>
                        <SelectItem value="EUR" className="hover:bg-blue-50 dark:hover:bg-blue-900/20">Euro (EUR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3 group">
                    <Label htmlFor="timezone" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Timezone</Label>
                    <Select value={clinicSettings.timezone} onValueChange={(value) => setClinicSettings(prev => ({ ...prev, timezone: value }))}>
                      <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-slate-300 dark:hover:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectItem value="Africa/Nairobi" className="hover:bg-blue-50 dark:hover:bg-blue-900/20">Africa/Nairobi</SelectItem>
                        <SelectItem value="Africa/Dar_es_Salaam" className="hover:bg-blue-50 dark:hover:bg-blue-900/20">Africa/Dar_es_Salaam</SelectItem>
                        <SelectItem value="Africa/Kampala" className="hover:bg-blue-50 dark:hover:bg-blue-900/20">Africa/Kampala</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
              </div>
                <Separator className="my-6" />
                <div className="flex justify-end">
                  <Button 
                    onClick={() => handleSave("Clinic")} 
                    disabled={isLoading} 
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Clinic Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Settings */}
          <TabsContent value="user" className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-500">
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  User Preferences
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Customize your personal settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                    <div className="space-y-1">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Dark Mode</Label>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Switch between light and dark themes
                      </p>
                    </div>
                    <Switch
                      checked={userSettings.darkMode}
                      onCheckedChange={(checked) => setUserSettings(prev => ({ ...prev, darkMode: checked }))}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500 data-[state=checked]:to-blue-600"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="language" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Language</Label>
                    <Select value={userSettings.language} onValueChange={(value) => setUserSettings(prev => ({ ...prev, language: value }))}>
                      <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 hover:border-slate-300 dark:hover:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectItem value="en" className="hover:bg-green-50 dark:hover:bg-green-900/20">English</SelectItem>
                        <SelectItem value="sw" className="hover:bg-green-50 dark:hover:bg-green-900/20">Kiswahili</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator className="my-6" />
                <div className="flex justify-end">
                  <Button 
                    onClick={() => handleSave("User")} 
                    disabled={isLoading} 
                    className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-8 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save User Settings
                  </Button>
                </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure how you receive notifications and alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
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
                    <Label>Email Alerts</Label>
                    <p className="text-sm text-muted-foreground">
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
                    <Label>SMS Alerts</Label>
                    <p className="text-sm text-muted-foreground">
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                System Configuration
              </CardTitle>
              <CardDescription>
                Manage system security and maintenance settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Automatic Backups</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically backup system data
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.autoBackup}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, autoBackup: checked }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backupFrequency">Backup Frequency</Label>
                  <Select value={systemSettings.backupFrequency} onValueChange={(value) => setSystemSettings(prev => ({ ...prev, backupFrequency: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={systemSettings.sessionTimeout}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, sessionTimeout: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    value={systemSettings.maxLoginAttempts}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, maxLoginAttempts: e.target.value }))}
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
  )
}
