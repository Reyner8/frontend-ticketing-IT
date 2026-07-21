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
      toast.error('Gagal menyimpan preferensi mode gelap');
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
      toast.error('Gagal menyimpan preferensi');
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
          Kelola pengaturan akun dan preferensi Anda
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className={`grid w-full ${canManageConfig ? "grid-cols-4" : "grid-cols-3"}`}>
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="preferences">Preferensi</TabsTrigger>
          <TabsTrigger value="notifications">Notifikasi</TabsTrigger>
          {canManageConfig && (
            <TabsTrigger value="system">Konfigurasi Sistem</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Profil</CardTitle>
              <CardDescription>
                Profil Anda dikelola oleh administrator sistem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nama Lengkap</Label>
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
                  <Label>Peran</Label>
                  <div className="mt-2">
                    <Badge variant="outline" className="capitalize">
                      {currentUser.role.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                {currentUser.team && (
                  <div>
                    <Label>Tim</Label>
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
              <CardTitle>Tampilan</CardTitle>
              <CardDescription>
                Sesuaikan tampilan aplikasi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mode Gelap</Label>
                  <p className="text-sm text-muted-foreground">
                    Aktifkan mode gelap untuk kenyamanan di kondisi cahaya redup
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
              <CardTitle>Preferensi Notifikasi</CardTitle>
              <CardDescription>
                Atur cara Anda menerima notifikasi {saving && '(menyimpan...)'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notifikasi Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Terima notifikasi melalui email
                  </p>
                </div>
                <Switch
                  checked={currentUser.preferences.emailNotifications}
                  onCheckedChange={(checked) => handleUpdatePreferences('emailNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Peringatan SLA</Label>
                  <p className="text-sm text-muted-foreground">
                    Dapatkan pemberitahuan saat batas waktu SLA mendekat
                  </p>
                </div>
                <Switch
                  checked={currentUser.preferences.slaAlerts}
                  onCheckedChange={(checked) => handleUpdatePreferences('slaAlerts', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Peringatan Downtime</Label>
                  <p className="text-sm text-muted-foreground">
                    Dapatkan pemberitahuan tentang kejadian downtime sistem
                  </p>
                </div>
                <Switch
                  checked={currentUser.preferences.downtimeAlerts}
                  onCheckedChange={(checked) => handleUpdatePreferences('downtimeAlerts', checked)}
                />
              </div>

              <div>
                <Label htmlFor="digestFrequency">Frekuensi Ringkasan</Label>
                <Select 
                  value={currentUser.preferences.digestFrequency}
                  onValueChange={(value) => handleUpdatePreferences('digestFrequency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Langsung</SelectItem>
                    <SelectItem value="hourly">Per Jam</SelectItem>
                    <SelectItem value="daily">Harian</SelectItem>
                    <SelectItem value="weekly">Mingguan</SelectItem>
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
      toast.error("Gagal memuat konfigurasi sistem");
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
      toast.success("Konfigurasi berhasil dibuat");
    } catch {
      toast.error("Gagal membuat konfigurasi");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (item: SystemConfigItem, value: string) => {
    try {
      await updateSystemConfig(item.id, { config_value: value });
      await load();
      toast.success("Konfigurasi diperbarui");
    } catch {
      toast.error("Gagal memperbarui konfigurasi");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSystemConfig(id);
      await load();
      toast.success("Konfigurasi dihapus");
    } catch {
      toast.error("Gagal menghapus konfigurasi");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Konfigurasi Sistem</CardTitle>
        <CardDescription>
          Kelola pengaturan aplikasi yang disimpan di backend
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Kunci</Label>
            <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="sla.critical_hours" />
          </div>
          <div>
            <Label>Nilai</Label>
            <Input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="4" />
          </div>
          <div>
            <Label>Deskripsi</Label>
            <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Opsional" />
          </div>
        </div>
        <Button onClick={handleCreate} disabled={saving || !newKey.trim() || !newValue.trim()}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Konfigurasi
        </Button>

        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        ) : configs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada entri konfigurasi</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kunci</TableHead>
                <TableHead>Nilai</TableHead>
                <TableHead>Deskripsi</TableHead>
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
