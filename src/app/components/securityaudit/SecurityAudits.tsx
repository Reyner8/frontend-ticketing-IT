import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Plus, ShieldCheck } from "lucide-react";
import { useApp } from "../../lib/store";
import {
  createSecurityAudit,
  deleteSecurityAudit,
  fetchSecurityAudits,
  fetchUsers,
  updateSecurityAudit,
} from "../../lib/api/services";
import type { SecurityAudit, User } from "../../types";
import { PaginationControls } from "../PaginationControls";
import { usePaginatedList, useDebouncedValue } from "../../lib/api/hooks";
import type { PaginatedListParams, PaginatedListResult } from "../../lib/api/hooks";
import {
  AUDIT_STATUS_BADGE,
  AUDIT_STATUS_OPTIONS,
  AUDIT_TYPE_OPTIONS,
  auditStatusLabel,
  auditTypeLabel,
  firstAuditError,
} from "./audit-options";
import { SecurityAuditDetailDialog } from "./SecurityAuditDetailDialog";

const emptyForm = {
  title: "",
  type: "hak_akses",
  audit_date: format(new Date(), "yyyy-MM-dd"),
  period: "",
  performed_by: "",
  external_auditor: "",
  scope: "",
  summary: "",
  status: "planned",
};

export function SecurityAudits() {
  const { state } = useApp();
  const canManage =
    state.currentUser?.role === "admin" || state.currentUser?.role === "it_staff";
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<SecurityAudit | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SecurityAudit | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Paginasi + filter (search/jenis/status) dikerjakan backend.
  const debouncedSearch = useDebouncedValue(search, 300);

  const fetcher = useCallback(
    async ({
      page,
      perPage,
    }: PaginatedListParams): Promise<PaginatedListResult<SecurityAudit>> => {
      const params: Record<string, string | number> = { page, per_page: perPage };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (typeFilter !== "all") params.type = typeFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      const { records, meta } = await fetchSecurityAudits(params);
      return { data: records, meta };
    },
    [debouncedSearch, typeFilter, statusFilter]
  );

  const {
    items: records,
    meta,
    loading,
    error,
    setPage,
    setPerPage,
    refetch,
  } = usePaginatedList(fetcher, [debouncedSearch, typeFilter, statusFilter]);

  useEffect(() => {
    if (!canManage) return;
    fetchUsers()
      .then((list) =>
        setUsers(
          list.filter(
            (u) =>
              u.isActive &&
              (u.role === "it_staff" || u.role === "admin" || u.role === "team_lead")
          )
        )
      )
      .catch(() => setUsers([]));
  }, [canManage]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      audit_date: format(new Date(), "yyyy-MM-dd"),
      performed_by: state.currentUser?.id ?? "",
    });
    setFormOpen(true);
  };

  const openEdit = (row: SecurityAudit) => {
    setEditing(row);
    setForm({
      title: row.title,
      type: row.type,
      audit_date: format(row.auditDate, "yyyy-MM-dd"),
      period: row.period ?? "",
      performed_by: row.performedBy?.id ?? "",
      external_auditor: row.externalAuditor ?? "",
      scope: row.scope ?? "",
      summary: row.summary ?? "",
      status: row.status,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.audit_date) {
      toast.error("Judul dan tanggal audit wajib diisi");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      type: form.type,
      audit_date: form.audit_date,
      period: form.period || null,
      external_auditor: form.external_auditor || null,
      scope: form.scope || null,
      summary: form.summary || null,
      status: form.status,
    };
    if (form.performed_by) payload.performed_by = Number(form.performed_by);
    else payload.performed_by = null;

    try {
      if (editing) {
        const updated = await updateSecurityAudit(editing.id, payload);
        toast.success("Catatan audit diperbarui");
        setSelected(updated);
      } else {
        await createSecurityAudit(payload);
        toast.success("Catatan audit disimpan");
      }
      setFormOpen(false);
      refetch();
    } catch (err) {
      toast.error(firstAuditError(err, "Gagal menyimpan catatan audit"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: SecurityAudit) => {
    if (!confirm(`Hapus catatan audit ${row.id}? Temuan di dalamnya ikut terhapus.`)) return;
    try {
      await deleteSecurityAudit(row.id);
      toast.success("Catatan audit dihapus");
      if (selected?.id === row.id) setSelected(null);
      refetch();
    } catch (err) {
      toast.error(firstAuditError(err, "Gagal menghapus catatan audit"));
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-8 w-8" />
            Audit Keamanan
          </h2>
          <p className="text-muted-foreground">
            Catatan audit keamanan SIMRS: hak akses, log aktivitas, data, jaringan, insiden,
            kepatuhan (AUD-YYYY-NNN)
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Catat Audit
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <Input
            placeholder="Cari ID / judul / sistem / auditor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua jenis</SelectItem>
              {AUDIT_TYPE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              {AUDIT_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={refetch}>
            Terapkan
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{meta?.total ?? 0} catatan audit</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Memuat…</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : records.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada data.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Judul</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Auditor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Temuan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(row)}
                  >
                    <TableCell className="font-mono text-sm">{row.id}</TableCell>
                    <TableCell>{format(row.auditDate, "dd MMM yyyy")}</TableCell>
                    <TableCell className="max-w-xs truncate">{row.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{auditTypeLabel(row.type)}</Badge>
                    </TableCell>
                    <TableCell>{row.performedBy?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={AUDIT_STATUS_BADGE[row.status]}>
                        {auditStatusLabel(row.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.findingsCount === undefined ? (
                        "—"
                      ) : (
                        <Badge
                          variant={
                            (row.openFindingsCount ?? 0) > 0 ? "destructive" : "secondary"
                          }
                        >
                          {row.openFindingsCount ?? 0}/{row.findingsCount} terbuka
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <PaginationControls
            meta={meta}
            disabled={loading}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
        </CardContent>
      </Card>

      <SecurityAuditDetailDialog
        audit={selected}
        canManage={canManage}
        onClose={() => setSelected(null)}
        onEdit={(row) => {
          setSelected(null);
          openEdit(row);
        }}
        onDelete={handleDelete}
        onChanged={refetch}
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit Audit ${editing.id}` : "Catat Audit Keamanan"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Judul *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="mis. Audit Hak Akses SIMRS Triwulan IV 2026"
              />
            </div>
            <div>
              <Label>Jenis audit *</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIT_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex flex-col py-1">
                        <span>{t.label}</span>
                        <span className="text-xs text-muted-foreground font-normal whitespace-normal">
                          {t.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tanggal audit *</Label>
                <Input
                  type="date"
                  value={form.audit_date}
                  onChange={(e) => setForm({ ...form, audit_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Periode</Label>
                <Input
                  value={form.period}
                  onChange={(e) => setForm({ ...form, period: e.target.value })}
                  placeholder="mis. Triwulan IV 2026"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Auditor internal</Label>
                <Select
                  value={form.performed_by || state.currentUser?.id || "none"}
                  onValueChange={(v) => setForm({ ...form, performed_by: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={state.currentUser?.id ?? "none"}>
                      {state.currentUser?.name ?? "Tanpa auditor"}
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
                <Label>Auditor eksternal</Label>
                <Input
                  value={form.external_auditor}
                  onChange={(e) => setForm({ ...form, external_auditor: e.target.value })}
                  placeholder="mis. nama vendor/konsultan"
                />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIT_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sistem yang diaudit</Label>
              <Textarea
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value })}
                rows={2}
                placeholder="mis. SIMRS, RME, Active Directory"
              />
            </div>
            <div>
              <Label>Ringkasan hasil</Label>
              <Textarea
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                rows={3}
                placeholder="Ringkasan hasil audit…"
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
