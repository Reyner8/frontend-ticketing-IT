import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Toaster } from "sonner";
import { SidebarProvider, SidebarInset } from "./ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { Dashboard } from "./Dashboard";
import { ErrorReports } from "./ErrorReports";
import { FeatureRequests } from "./FeatureRequests";
import { DowntimeMonev } from "./DowntimeMonev";
import { TeamPerformance } from "./TeamPerformance";
import { Settings } from "./Settings";
import { PublicFormLanding } from "./PublicFormLanding";
import { UserManagement } from "./UserManagement";
import { CalendarView } from "./CalendarView";
import { Tickets } from "./Tickets";
import { ConversionHistoryView } from "./ConversionHistoryView";
import { MentionsView } from "./MentionsView";
import { BackupRestoreTests } from "./BackupRestoreTests";
import { ServerRoomVisitors } from "./ServerRoomVisitors";
import { ServerRoomInspections } from "./ServerRoomInspections";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { TicketPriority, DowntimeComponent, DowntimeLocation, DowntimeType } from "../types";
import { LocationMultiSelect } from "./downtime/LocationMultiSelect";
import {
  createTicket,
  createDowntimeRecord,
  fetchTickets,
  fetchErrorReports,
  fetchFeatureRequests,
  fetchDowntimeRecords,
  fetchDowntimeComponents,
  fetchDowntimeLocations,
  fetchUsers,
  downloadServerExport,
  fetchTickets as fetchTicketsForAssign,
  assignUser,
} from "../lib/api/services";
import {
  exportTicketsCsv,
  exportErrorsCsv,
  exportFeaturesCsv,
  exportDowntimesCsv,
  exportUsersCsv,
} from "../lib/export-utils";
import { Download } from "lucide-react";
import { labelPriority } from "../lib/ui-labels";

export default function DashboardLayout() {
  const [activeView, setActiveView] = useState("/");
  const [quickActionDialog, setQuickActionDialog] = useState<string | null>(null);

  const renderContent = () => {
    switch (activeView) {
      case "/":
        return <Dashboard />;
      case "/tickets":
        return <Tickets />;
      case "/conversion-history":
        return <ConversionHistoryView />;
      case "/mentions":
        return <MentionsView onNavigate={setActiveView} />;
      case "/error-reports":
        return <ErrorReports />;
      case "/feature-requests":
        return <FeatureRequests />;
      case "/downtime":
        return <DowntimeMonev />;
      case "/team-performance":
        return <TeamPerformance />;
      case "/public-form":
        return <PublicFormLanding />;
      case "/calendar":
        return <CalendarView />;
      case "/backup-restore-tests":
        return <BackupRestoreTests />;
      case "/server-room-visitors":
        return <ServerRoomVisitors />;
      case "/server-room-inspections":
        return <ServerRoomInspections />;
      case "/settings":
        return <Settings />;
      case "/users":
        return <UserManagement />;
      default:
        return <Dashboard />;
    }
  };

  const handleQuickAction = (actionId: string) => {
    setQuickActionDialog(actionId);
  };

  const closeQuickAction = () => {
    setQuickActionDialog(null);
  };

  const renderQuickActionDialog = () => {
    switch (quickActionDialog) {
      case 'new-ticket':
        return (
          <Dialog open={!!quickActionDialog} onOpenChange={() => closeQuickAction()}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Buat tiket baru</DialogTitle>
                <DialogDescription>
                  Buat tiket baru atau laporkan masalah dengan cepat
                </DialogDescription>
              </DialogHeader>
              <QuickNewTicketForm onClose={closeQuickAction} />
            </DialogContent>
          </Dialog>
        );
      
      case 'log-downtime':
        return (
          <Dialog open={!!quickActionDialog} onOpenChange={() => closeQuickAction()}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Catat peristiwa downtime</DialogTitle>
                <DialogDescription>
                  Catat downtime terencana atau tidak terencana
                </DialogDescription>
              </DialogHeader>
              <QuickDowntimeForm onClose={closeQuickAction} />
            </DialogContent>
          </Dialog>
        );
      
      case 'assign-ticket':
        return (
          <Dialog open={!!quickActionDialog} onOpenChange={() => closeQuickAction()}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Tugas cepat</DialogTitle>
                <DialogDescription>
                  Tugaskan tiket ke anggota tim
                </DialogDescription>
              </DialogHeader>
              <QuickAssignForm onClose={closeQuickAction} />
            </DialogContent>
          </Dialog>
        );
      
      case 'export-reports':
        return (
          <Dialog open={!!quickActionDialog} onOpenChange={() => closeQuickAction()}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Ekspor laporan</DialogTitle>
                <DialogDescription>
                  Ekspor laporan dan analitik sistem
                </DialogDescription>
              </DialogHeader>
              <QuickExportForm onClose={closeQuickAction} />
            </DialogContent>
          </Dialog>
        );
      
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar activeView={activeView} onNavigate={setActiveView} />
        <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden !mt-0">
          <AppHeader onNavigate={setActiveView} onOpenQuickAction={handleQuickAction} />
          <div className="flex-1 overflow-auto">
            {renderContent()}
          </div>
        </SidebarInset>
      </div>
      
      {/* Quick Action Dialogs */}
      {renderQuickActionDialog()}
      
      {/* Toast Notifications */}
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 4000,
        }}
      />
    </SidebarProvider>
  );
}

// Quick action forms
function QuickNewTicketForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TicketPriority,
    category: 'system_error' as const
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createTicket({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
      });
      toast.success('Tiket berhasil dibuat');
      onClose();
    } catch {
      toast.error('Gagal membuat tiket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Judul</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Deskripsi singkat masalah"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="description">Deskripsi</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Deskripsi lengkap..."
          rows={3}
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="priority">Prioritas</Label>
          <Select value={formData.priority} onValueChange={(value: TicketPriority) => setFormData({ ...formData, priority: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Prioritas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{labelPriority("low")}</SelectItem>
              <SelectItem value="medium">{labelPriority("medium")}</SelectItem>
              <SelectItem value="high">{labelPriority("high")}</SelectItem>
              <SelectItem value="critical">{labelPriority("critical")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="category">Kategori</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as any })}>
            <SelectTrigger>
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system_error">Error sistem</SelectItem>
              <SelectItem value="software_bug">Bug perangkat lunak</SelectItem>
              <SelectItem value="feature_request">Feature Requests</SelectItem>
              <SelectItem value="network_issue">Masalah jaringan</SelectItem>
              <SelectItem value="hardware_problem">Masalah hardware</SelectItem>
              <SelectItem value="performance_issue">Masalah performa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Membuat...' : 'Buat tiket'}
        </Button>
      </div>
    </form>
  );
}

function QuickDowntimeForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    type: 'unplanned' as DowntimeType,
    reason: '',
    impact: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    startTime: new Date().toISOString().slice(0, 16)
  });
  const [locations, setLocations] = useState<DowntimeLocation[]>([]);
  const [components, setComponents] = useState<DowntimeComponent[]>([]);
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [sourceComponentId, setSourceComponentId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchDowntimeLocations({ per_page: 100, is_active: true }),
      fetchDowntimeComponents({ per_page: 100, is_active: true }),
    ])
      .then(([locationResult, componentResult]) => {
        setLocations(locationResult.locations);
        setComponents(componentResult.components);
      })
      .catch(() => toast.error("Gagal memuat data master downtime"));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locationIds.length === 0 || !sourceComponentId) {
      toast.error("Pilih minimal satu lokasi dan satu komponen yang down langsung");
      return;
    }
    setSubmitting(true);
    try {
      await createDowntimeRecord({
        title: formData.title,
        type: formData.type,
        reason: formData.reason,
        impact: formData.impact,
        start_time: new Date(formData.startTime).toISOString().slice(0, 19).replace('T', ' '),
        location_ids: locationIds.map(Number),
        source_component_ids: [Number(sourceComponentId)],
      });
      toast.success('Downtime berhasil dicatat');
      onClose();
    } catch {
      toast.error('Gagal mencatat downtime');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Judul peristiwa</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Judul singkat peristiwa downtime"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Tipe</Label>
          <Select value={formData.type} onValueChange={(value: DowntimeType) => setFormData({ ...formData, type: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planned">Pemeliharaan terencana</SelectItem>
              <SelectItem value="unplanned">Gangguan tidak terencana</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="impact">Dampak</Label>
          <Select value={formData.impact} onValueChange={(value: any) => setFormData({ ...formData, impact: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Dampak" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{labelPriority("low")}</SelectItem>
              <SelectItem value="medium">{labelPriority("medium")}</SelectItem>
              <SelectItem value="high">{labelPriority("high")}</SelectItem>
              <SelectItem value="critical">{labelPriority("critical")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <LocationMultiSelect
        locations={locations}
        selectedIds={locationIds}
        onChange={setLocationIds}
        helperText="Pilih setiap unit yang terdampak, atau pilih semua."
      />

      <div>
        <Label>Komponen yang down langsung *</Label>
        <Select value={sourceComponentId} onValueChange={setSourceComponentId}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih komponen" />
          </SelectTrigger>
          <SelectContent>
            {components.map((component) => (
              <SelectItem key={component.id} value={component.id}>
                {component.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="reason">Alasan</Label>
        <Input
          id="reason"
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          placeholder="Alasan downtime"
          required
        />
      </div>

      <div>
        <Label htmlFor="startTime">Waktu mulai</Label>
        <Input
          id="startTime"
          type="datetime-local"
          value={formData.startTime}
          onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
          required
        />
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Mencatat...' : 'Catat downtime'}
        </Button>
      </div>
    </form>
  );
}

function QuickAssignForm({ onClose }: { onClose: () => void }) {
  const [tickets, setTickets] = useState<{ id: string; title: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [ticketId, setTicketId] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchTicketsForAssign({ per_page: 50, status: "pending_approval" }).catch(() => ({ tickets: [] })),
      fetchUsers({ per_page: 100 }).catch(() => []),
    ]).then(([ticketResult, userList]) => {
      setTickets(ticketResult.tickets.map((t) => ({ id: t.id, title: t.title })));
      setUsers(
        userList
          .filter((u) => u.role === "it_staff" && u.isActive)
          .map((u) => ({ id: u.id, name: u.name }))
      );
    }).finally(() => setLoading(false));
  }, []);

  const handleAssign = async () => {
    if (!ticketId || !userId) return;
    setSubmitting(true);
    try {
      await assignUser("tickets", ticketId, userId);
      toast.success("Tiket berhasil ditugaskan");
      onClose();
    } catch {
      toast.error("Gagal menugaskan tiket");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Memuat...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tiket</Label>
        <Select value={ticketId} onValueChange={setTicketId}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih tiket" />
          </SelectTrigger>
          <SelectContent>
            {tickets.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.id} — {t.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Tugaskan ke</Label>
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih staf IT" />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={handleAssign} disabled={submitting || !ticketId || !userId}>
          {submitting ? "Menugaskan..." : "Tugaskan"}
        </Button>
      </div>
    </div>
  );
}

function QuickExportForm({ onClose }: { onClose: () => void }) {
  const [dataset, setDataset] = useState<
    "tickets" | "errors" | "features" | "downtimes" | "users"
  >("tickets");
  const [format, setFormat] = useState<"csv" | "excel" | "pdf">("csv");
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { blob, filename } = await downloadServerExport(dataset, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Ekspor berhasil diunduh dari server");
      onClose();
    } catch {
      try {
        if (dataset === "tickets") {
          const { tickets } = await fetchTickets({ per_page: 500 });
          exportTicketsCsv(tickets);
        } else if (dataset === "errors") {
          const { reports } = await fetchErrorReports({ per_page: 500 });
          exportErrorsCsv(reports);
        } else if (dataset === "features") {
          const { features } = await fetchFeatureRequests({ per_page: 500 });
          exportFeaturesCsv(features);
        } else if (dataset === "downtimes") {
          const { records } = await fetchDowntimeRecords({ per_page: 500 });
          exportDowntimesCsv(records);
        } else {
          const users = await fetchUsers({ per_page: 500 });
          exportUsersCsv(users);
        }
        toast.success("Ekspor berhasil diunduh (cadangan klien)");
        onClose();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Gagal mengekspor data"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Unduh dari server (CSV, Excel, atau HTML/PDF yang dapat dicetak).
      </p>
      <div className="space-y-2">
        <Label>Kumpulan data</Label>
        <Select
          value={dataset}
          onValueChange={(v) => setDataset(v as typeof dataset)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pilih kumpulan data" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tickets">Tickets</SelectItem>
            <SelectItem value="errors">Error Reports</SelectItem>
            <SelectItem value="features">Feature Requests</SelectItem>
            <SelectItem value="downtimes">Catatan downtime</SelectItem>
            <SelectItem value="users">Pengguna</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Format</Label>
        <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
          <SelectTrigger><SelectValue placeholder="Pilih format" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="csv">CSV</SelectItem>
            <SelectItem value="excel">Excel</SelectItem>
            <SelectItem value="pdf">PDF (HTML)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button onClick={handleExport} disabled={loading}>
          <Download className="mr-2 h-4 w-4" />
          {loading ? "Menyiapkan..." : "Unduh"}
        </Button>
      </div>
    </div>
  );
}