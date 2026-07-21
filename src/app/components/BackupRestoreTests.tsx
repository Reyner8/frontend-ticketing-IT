import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Plus, DatabaseBackup, Trash2 } from "lucide-react";
import { useApp } from "../lib/store";
import {
  fetchBackupRestoreTests,
  createBackupRestoreTest,
  updateBackupRestoreTest,
  deleteBackupRestoreTest,
  fetchUsers,
} from "../lib/api/services";
import { AttachmentPanel } from "./AttachmentPanel";
import type { BackupRestoreTest, RestoreTestResult, RestoreType, User } from "../types";

const RESULT_LABEL: Record<RestoreTestResult, string> = {
  success: "Sukses",
  failed: "Gagal",
  success_with_notes: "Sukses + catatan",
};

const TYPE_LABEL: Record<RestoreType, string> = {
  database: "Database",
  application: "Aplikasi",
  both: "Keduanya",
};

function toDateInput(d?: Date) {
  return d ? format(d, "yyyy-MM-dd") : "";
}
function toDateTimeInput(d?: Date) {
  return d ? format(d, "yyyy-MM-dd'T'HH:mm") : "";
}

const emptyForm = {
  test_date: format(new Date(), "yyyy-MM-dd"),
  performed_by: "",
  application_system: "",
  restore_type: "database" as RestoreType,
  backup_datetime: "",
  backup_source: "",
  test_environment: "",
  result: "success" as RestoreTestResult,
  notes: "",
  follow_up: "",
};

export function BackupRestoreTests() {
  const { state } = useApp();
  const canManage =
    state.currentUser?.role === "admin" || state.currentUser?.role === "it_staff";
  const [records, setRecords] = useState<BackupRestoreTest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selected, setSelected] = useState<BackupRestoreTest | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BackupRestoreTest | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {};
      if (search) params.search = search;
      if (resultFilter !== "all") params.result = resultFilter;
      if (typeFilter !== "all") params.restore_type = typeFilter;
      const { records: data } = await fetchBackupRestoreTests(params);
      setRecords(data);
    } catch {
      toast.error("Gagal memuat uji restore");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [resultFilter, typeFilter]);

  useEffect(() => {
    if (!canManage) return;
    fetchUsers()
      .then((list) => setUsers(list.filter((u) => u.isActive && (u.role === "it_staff" || u.role === "admin" || u.role === "team_lead"))))
      .catch(() => setUsers([]));
  }, [canManage]);

  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.applicationSystem.toLowerCase().includes(q) ||
        r.testEnvironment.toLowerCase().includes(q)
    );
  }, [records, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      performed_by: state.currentUser?.id ?? "",
    });
    setFormOpen(true);
  };

  const openEdit = (row: BackupRestoreTest) => {
    setEditing(row);
    setForm({
      test_date: toDateInput(row.testDate),
      performed_by: row.performedBy?.id ?? "",
      application_system: row.applicationSystem,
      restore_type: row.restoreType,
      backup_datetime: toDateTimeInput(row.backupDatetime),
      backup_source: row.backupSource ?? "",
      test_environment: row.testEnvironment,
      result: row.result,
      notes: row.notes ?? "",
      follow_up: row.followUp ?? "",
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.test_date || !form.application_system || !form.test_environment) {
      toast.error("Lengkapi field wajib");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      test_date: form.test_date,
      application_system: form.application_system,
      restore_type: form.restore_type,
      test_environment: form.test_environment,
      result: form.result,
      notes: form.notes || null,
      follow_up: form.follow_up || null,
      backup_source: form.backup_source || null,
      backup_datetime: form.backup_datetime
        ? form.backup_datetime.replace("T", " ") + ":00"
        : null,
    };
    if (form.performed_by) payload.performed_by = Number(form.performed_by);

    try {
      if (editing) {
        const updated = await updateBackupRestoreTest(editing.id, payload);
        toast.success("Uji restore diperbarui");
        setSelected(updated);
      } else {
        await createBackupRestoreTest(payload);
        toast.success("Uji restore dicatat");
      }
      setFormOpen(false);
      load();
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: BackupRestoreTest) => {
    if (!confirm(`Hapus ${row.id}?`)) return;
    try {
      await deleteBackupRestoreTest(row.id);
      toast.success("Dihapus");
      if (selected?.id === row.id) setSelected(null);
      load();
    } catch {
      toast.error("Gagal menghapus");
    }
  };

  const resultBadge = (result: RestoreTestResult) => {
    const variant =
      result === "failed" ? "destructive" : result === "success" ? "default" : "secondary";
    return <Badge variant={variant}>{RESULT_LABEL[result]}</Badge>;
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl tracking-tight flex items-center gap-2">
            <DatabaseBackup className="h-8 w-8" />
            Backup Restore Tests
          </h2>
          <p className="text-muted-foreground">
            Pencatatan uji restore setelah backup (RST-YYYY-NNN)
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Catat Uji Restore
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <Input
            placeholder="Cari ID / aplikasi / lingkungan…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            className="max-w-xs"
          />
          <Select value={resultFilter} onValueChange={setResultFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Hasil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua hasil</SelectItem>
              <SelectItem value="success">Sukses</SelectItem>
              <SelectItem value="failed">Gagal</SelectItem>
              <SelectItem value="success_with_notes">Sukses + catatan</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Jenis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua jenis</SelectItem>
              <SelectItem value="database">Database</SelectItem>
              <SelectItem value="application">Aplikasi</SelectItem>
              <SelectItem value="both">Keduanya</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load}>
            Terapkan
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{filtered.length} catatan</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Memuat…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada data.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Aplikasi/Sistem</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Hasil</TableHead>
                  <TableHead>Pelaksana</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(row)}
                  >
                    <TableCell className="font-mono text-sm">{row.id}</TableCell>
                    <TableCell>{format(row.testDate, "dd MMM yyyy")}</TableCell>
                    <TableCell>{row.applicationSystem}</TableCell>
                    <TableCell>{TYPE_LABEL[row.restoreType]}</TableCell>
                    <TableCell>{resultBadge(row.result)}</TableCell>
                    <TableCell>{row.performedBy?.name ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono">{selected.id}</span>
                  {resultBadge(selected.result)}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted-foreground">Tanggal uji</p>
                    <p>{format(selected.testDate, "dd MMM yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pelaksana</p>
                    <p>{selected.performedBy?.name ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Aplikasi/Sistem</p>
                    <p>{selected.applicationSystem}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Jenis</p>
                    <p>{TYPE_LABEL[selected.restoreType]}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Backup dipakai</p>
                    <p>
                      {selected.backupDatetime
                        ? format(selected.backupDatetime, "dd MMM yyyy HH:mm")
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sumber backup</p>
                    <p>{selected.backupSource || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Lingkungan uji</p>
                    <p>{selected.testEnvironment}</p>
                  </div>
                </div>
                {selected.notes && (
                  <div>
                    <p className="text-muted-foreground">Catatan</p>
                    <p className="whitespace-pre-wrap">{selected.notes}</p>
                  </div>
                )}
                {selected.followUp && (
                  <div>
                    <p className="text-muted-foreground">Tindak lanjut</p>
                    <p className="whitespace-pre-wrap">{selected.followUp}</p>
                  </div>
                )}
                <AttachmentPanel
                  parent="backup-restore-tests"
                  parentId={selected.id}
                  canUpload={canManage}
                  canDelete={canManage}
                />
              </div>
              {canManage && (
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => openEdit(selected)}>
                    Edit
                  </Button>
                  <Button variant="destructive" onClick={() => handleDelete(selected)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Hapus
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Uji Restore" : "Catat Uji Restore"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Tanggal uji *</Label>
              <Input
                type="date"
                value={form.test_date}
                onChange={(e) => setForm({ ...form, test_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Pelaksana</Label>
              <Select
                value={form.performed_by || "self"}
                onValueChange={(v) =>
                  setForm({ ...form, performed_by: v === "self" ? state.currentUser?.id ?? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={state.currentUser?.id ?? "self"}>
                    {state.currentUser?.name ?? "Saya"}
                  </SelectItem>
                  {users
                    .filter((u) => u.id !== state.currentUser?.id)
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Aplikasi / Sistem *</Label>
              <Input
                value={form.application_system}
                onChange={(e) => setForm({ ...form, application_system: e.target.value })}
                placeholder="SIMRS / Antrean / …"
              />
            </div>
            <div>
              <Label>Jenis restore *</Label>
              <Select
                value={form.restore_type}
                onValueChange={(v) => setForm({ ...form, restore_type: v as RestoreType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="application">Aplikasi</SelectItem>
                  <SelectItem value="both">Keduanya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Waktu backup yang dipakai</Label>
              <Input
                type="datetime-local"
                value={form.backup_datetime}
                onChange={(e) => setForm({ ...form, backup_datetime: e.target.value })}
              />
            </div>
            <div>
              <Label>Sumber / lokasi backup</Label>
              <Input
                value={form.backup_source}
                onChange={(e) => setForm({ ...form, backup_source: e.target.value })}
                placeholder="NAS / tape / cloud path (opsional)"
              />
            </div>
            <div>
              <Label>Lingkungan uji *</Label>
              <Input
                value={form.test_environment}
                onChange={(e) => setForm({ ...form, test_environment: e.target.value })}
                placeholder="Staging / DR / Lab"
              />
            </div>
            <div>
              <Label>Hasil *</Label>
              <Select
                value={form.result}
                onValueChange={(v) => setForm({ ...form, result: v as RestoreTestResult })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="success">Sukses</SelectItem>
                  <SelectItem value="failed">Gagal</SelectItem>
                  <SelectItem value="success_with_notes">Sukses + catatan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Catatan</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Tindak lanjut</Label>
              <Textarea
                value={form.follow_up}
                onChange={(e) => setForm({ ...form, follow_up: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
