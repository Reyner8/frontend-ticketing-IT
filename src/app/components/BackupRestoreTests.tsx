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
import { ApplicationSelect } from "./ApplicationSelect";
import type {
  BackupRestoreTest,
  BackupSource,
  RestoreTestResult,
  RestoreType,
  TestEnvironment,
  User,
} from "../types";

const RESULT_LABEL: Record<RestoreTestResult, string> = {
  success: "Success",
  failed: "Failed",
  success_with_notes: "Success + notes",
};

const TYPE_LABEL: Record<RestoreType, string> = {
  database: "Database",
  application: "Application",
  both: "Both",
};

const BACKUP_SOURCE_OPTIONS: { value: BackupSource; label: string }[] = [
  { value: "nas", label: "NAS" },
  { value: "hdd", label: "HDD" },
  { value: "pc", label: "PC" },
  { value: "server", label: "Server" },
];

const TEST_ENVIRONMENT_OPTIONS: { value: TestEnvironment; label: string }[] = [
  { value: "local_development", label: "Local Development" },
  { value: "server_staging", label: "Server Staging" },
];

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
  backup_source: "none" as "none" | BackupSource,
  test_environment: "local_development" as TestEnvironment,
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
      toast.error("Failed to load restore tests");
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
        r.applicationLabel.toLowerCase().includes(q) ||
        (r.testEnvironmentLabel || r.testEnvironment).toLowerCase().includes(q) ||
        (r.backupSourceLabel || r.backupSource || "").toLowerCase().includes(q)
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
      backup_source: row.backupSource ?? "none",
      test_environment: row.testEnvironment || "local_development",
      result: row.result,
      notes: row.notes ?? "",
      follow_up: row.followUp ?? "",
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.test_date || !form.application_system || !form.test_environment) {
      toast.error("Please fill in the required fields");
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
      backup_source: form.backup_source === "none" ? null : form.backup_source,
      backup_datetime: form.backup_datetime
        ? form.backup_datetime.replace("T", " ") + ":00"
        : null,
    };
    if (form.performed_by) payload.performed_by = Number(form.performed_by);

    try {
      if (editing) {
        const updated = await updateBackupRestoreTest(editing.id, payload);
        toast.success("Restore test updated");
        setSelected(updated);
      } else {
        await createBackupRestoreTest(payload);
        toast.success("Restore test recorded");
      }
      setFormOpen(false);
      load();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: BackupRestoreTest) => {
    if (!confirm(`Delete ${row.id}?`)) return;
    try {
      await deleteBackupRestoreTest(row.id);
      toast.success("Deleted");
      if (selected?.id === row.id) setSelected(null);
      load();
    } catch {
      toast.error("Failed to delete");
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
            Record Restore Test
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <Input
            placeholder="Search ID / application / environment…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            className="max-w-xs"
          />
          <Select value={resultFilter} onValueChange={setResultFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All results</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="success_with_notes">Success + notes</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="database">Database</SelectItem>
              <SelectItem value="application">Application</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load}>
            Apply
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{filtered.length} records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Application/System</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Performed By</TableHead>
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
                    <TableCell>{row.applicationLabel || row.applicationSystem}</TableCell>
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
                    <p className="text-muted-foreground">Test date</p>
                    <p>{format(selected.testDate, "dd MMM yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Performed By</p>
                    <p>{selected.performedBy?.name ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Application/System</p>
                    <p>{selected.applicationLabel || selected.applicationSystem}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p>{TYPE_LABEL[selected.restoreType]}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Backup used</p>
                    <p>
                      {selected.backupDatetime
                        ? format(selected.backupDatetime, "dd MMM yyyy HH:mm")
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Backup source</p>
                    <p>{selected.backupSourceLabel || selected.backupSource || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Test environment</p>
                    <p>{selected.testEnvironmentLabel || selected.testEnvironment}</p>
                  </div>
                </div>
                {selected.notes && (
                  <div>
                    <p className="text-muted-foreground">Notes</p>
                    <p className="whitespace-pre-wrap">{selected.notes}</p>
                  </div>
                )}
                {selected.followUp && (
                  <div>
                    <p className="text-muted-foreground">Follow-up</p>
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
                    Delete
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
            <DialogTitle>{editing ? "Edit Restore Test" : "Record Restore Test"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Test date *</Label>
              <Input
                type="date"
                value={form.test_date}
                onChange={(e) => setForm({ ...form, test_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Performed By</Label>
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
                    {state.currentUser?.name ?? "Me"}
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
              <Label>Application / System *</Label>
              <ApplicationSelect
                value={form.application_system}
                includeCode={editing?.applicationSystem}
                onValueChange={(v) => setForm({ ...form, application_system: v })}
              />
            </div>
            <div>
              <Label>Restore type *</Label>
              <Select
                value={form.restore_type}
                onValueChange={(v) => setForm({ ...form, restore_type: v as RestoreType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="application">Application</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Backup time used</Label>
              <Input
                type="datetime-local"
                value={form.backup_datetime}
                onChange={(e) => setForm({ ...form, backup_datetime: e.target.value })}
              />
            </div>
            <div>
              <Label>Backup source / location</Label>
              <Select
                value={form.backup_source}
                onValueChange={(v) =>
                  setForm({ ...form, backup_source: v as "none" | BackupSource })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {BACKUP_SOURCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Test environment *</Label>
              <Select
                value={form.test_environment}
                onValueChange={(v) =>
                  setForm({ ...form, test_environment: v as TestEnvironment })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEST_ENVIRONMENT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Result *</Label>
              <Select
                value={form.result}
                onValueChange={(v) => setForm({ ...form, result: v as RestoreTestResult })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="success_with_notes">Success + notes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Follow-up</Label>
              <Textarea
                value={form.follow_up}
                onChange={(e) => setForm({ ...form, follow_up: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
