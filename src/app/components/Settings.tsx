import { useState, useEffect } from "react";
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
import { updatePreferences, fetchSystemConfigs, createSystemConfig, updateSystemConfig, deleteSystemConfig } from "../lib/api/services";
import type { UserPreferences, SystemConfigItem } from "../types";
import { User, Trash2, Plus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Textarea } from "./ui/textarea";

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

  const canManageConfig =
    currentUser.role === "admin" || currentUser.role === "it_staff";

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className={`grid w-full ${canManageConfig ? "grid-cols-4" : "grid-cols-3"}`}>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          {canManageConfig && (
            <TabsTrigger value="system">System Config</TabsTrigger>
          )}
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

        {canManageConfig && (
          <TabsContent value="system" className="space-y-4">
            <SystemConfigPanel />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function SystemConfigPanel() {
  const [configs, setConfigs] = useState<SystemConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setConfigs(await fetchSystemConfigs());
    } catch {
      toast.error("Failed to load system configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!newKey.trim() || !newValue.trim()) return;
    setSaving(true);
    try {
      await createSystemConfig({
        config_key: newKey.trim(),
        config_value: newValue.trim(),
        description: newDescription.trim() || undefined,
      });
      setNewKey("");
      setNewValue("");
      setNewDescription("");
      await load();
      toast.success("Configuration created");
    } catch {
      toast.error("Failed to create configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (item: SystemConfigItem, value: string) => {
    try {
      await updateSystemConfig(item.id, { config_value: value });
      await load();
      toast.success("Configuration updated");
    } catch {
      toast.error("Failed to update configuration");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSystemConfig(id);
      await load();
      toast.success("Configuration deleted");
    } catch {
      toast.error("Failed to delete configuration");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Configuration</CardTitle>
        <CardDescription>
          Manage application-wide settings stored in the backend
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Key</Label>
            <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="sla.critical_hours" />
          </div>
          <div>
            <Label>Value</Label>
            <Input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="4" />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <Button onClick={handleCreate} disabled={saving || !newKey.trim() || !newValue.trim()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Configuration
        </Button>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : configs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No configuration entries yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Description</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.key}</TableCell>
                  <TableCell>
                    <Textarea
                      defaultValue={item.value}
                      rows={1}
                      className="min-h-[36px]"
                      onBlur={(e) => {
                        if (e.target.value !== item.value) {
                          handleUpdate(item, e.target.value);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
