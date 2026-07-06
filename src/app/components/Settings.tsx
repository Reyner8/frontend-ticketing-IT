import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { useApp } from "../lib/store";
import { updatePreferences } from "../lib/api/services";
import type { UserPreferences } from "../types";
import { User } from "lucide-react";

export function Settings() {
  const { state, dispatch } = useApp();
  const currentUser = state.currentUser;
  
  const [profileData, setProfileData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || ''
  });
  const [saving, setSaving] = useState(false);

  const handleToggleDarkMode = async () => {
    dispatch({ type: 'TOGGLE_DARK_MODE' });
    if (!currentUser) return;
    const newDarkMode = !currentUser.preferences.darkMode;
    try {
      await updatePreferences({ darkMode: newDarkMode });
    } catch {
      toast.error('Failed to save dark mode preference');
    }
  };

  const handleUpdatePreferences = async (key: string, value: unknown) => {
    if (!currentUser) return;
    dispatch({ 
      type: 'UPDATE_USER_PREFERENCES', 
      payload: { [key]: value } 
    });
    setSaving(true);
    try {
      const updated = await updatePreferences({ [key]: value } as Partial<UserPreferences>);
      dispatch({ type: 'SET_USER', payload: updated });
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Your profile is managed by the system administrator
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    disabled
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Role</Label>
                  <div className="mt-2">
                    <Badge variant="outline" className="capitalize">
                      {currentUser.role.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                {currentUser.team && (
                  <div>
                    <Label>Team</Label>
                    <div className="mt-2">
                      <Badge variant="outline" className="capitalize">
                        {currentUser.team}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the appearance of the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable dark mode for better viewing in low light
                  </p>
                </div>
                <Switch
                  checked={currentUser.preferences.darkMode}
                  onCheckedChange={handleToggleDarkMode}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how you receive notifications {saving && '(saving...)'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  checked={currentUser.preferences.emailNotifications}
                  onCheckedChange={(checked) => handleUpdatePreferences('emailNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>SLA Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when SLA deadlines are approaching
                  </p>
                </div>
                <Switch
                  checked={currentUser.preferences.slaAlerts}
                  onCheckedChange={(checked) => handleUpdatePreferences('slaAlerts', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Downtime Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about system downtime events
                  </p>
                </div>
                <Switch
                  checked={currentUser.preferences.downtimeAlerts}
                  onCheckedChange={(checked) => handleUpdatePreferences('downtimeAlerts', checked)}
                />
              </div>

              <div>
                <Label htmlFor="digestFrequency">Digest Frequency</Label>
                <Select 
                  value={currentUser.preferences.digestFrequency}
                  onValueChange={(value) => handleUpdatePreferences('digestFrequency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
