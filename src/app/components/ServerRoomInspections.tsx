import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Plus, ClipboardCheck, Trash2 } from "lucide-react";
import { useApp } from "../lib/store";
import {
  fetchServerRoomInspections,
  createServerRoomInspection,
  updateServerRoomInspection,
  deleteServerRoomInspection,
  fetchUsers,
} from "../lib/api/services";
import type {
  InspectionConclusion,
  InspectionEscalation,
  InspectionType,
  ServerRoomInspection,
  User,
} from "../types";

const TYPE_LABEL: Record<InspectionType, string> = {
  weekly: "Mingguan",
  incidental: "Insidental",
};

const CONCLUSION_LABEL: Record<InspectionConclusion, string> = {
  safe: "Aman",
  findings: "Ada temuan",
};

const ESCALATION_LABEL: Record<InspectionEscalation, string> = {
  ipsrs: "IPSRS",
  director: "Direktur",
};

const CHECKLIST_META: { key: "ups" | "alarm" | "cable_rack"; label: string }[] = [
  { key: "ups", label: "UPS" },
  { key: "alarm", label: "Alarm" },
  { key: "cable_rack", label: "Kabel / Rak" },
];

const emptyForm = {
  inspection_date: format(new Date(), "yyyy-MM-dd"),
  inspector_id: "",
  inspection_type: "weekly" as InspectionType,
  ups_ok: true,
  ups_notes: "",
  alarm_ok: true,
  alarm_notes: "",
  cable_rack_ok: true,
  cable_rack_notes: "",
  conclusion: "safe" as InspectionConclusion,
  follow_up: "",
  escalation: "none" as "none" | InspectionEscalation,
  notes: "",
};

export function ServerRoomInspections() {
  const { state } = useApp();
  const canManage =
    state.currentUser?.role === "admin" || state.currentUser?.role === "it_staff";
  const [records, setRecords] = useState<ServerRoomInspection[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [conclusionFilter, setConclusionFilter] = useState<string>("all");
  const [selected, setSelected] = useState<ServerRoomInspection | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServerRoomInspection | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {};
      if (search) params.search = search;
      if (typeFilter !== "all") params.inspection_type = typeFilter;
      if (conclusionFilter !== "all") params.conclusion = conclusionFilter;
      const { records: data } = await fetchServerRoomInspections(params);
      setRecords(data);
    } catch {
      toast.error("Gagal memuat inspeksi");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [typeFilter, conclusionFilter]);

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

  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        (r.notes ?? "").toLowerCase().includes(q) ||
        (r.followUp ?? "").toLowerCase().includes(q)
    );
  }, [records, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      inspector_id: state.currentUser?.id ?? "",
      inspection_date: format(new Date(), "yyyy-MM-dd"),
    });
    setFormOpen(true);
  };

  const openEdit = (row: ServerRoomInspection) => {
    setEditing(row);
    setForm({
      inspection_date: format(row.inspectionDate, "yyyy-MM-dd"),
      inspector_id: row.inspector?.id ?? "",
      inspection_type: row.inspectionType,
      ups_ok: row.checklistItems.ups.ok,
      ups_notes: row.checklistItems.ups.notes ?? "",
      alarm_ok: row.checklistItems.alarm.ok,
      alarm_notes: row.checklistItems.alarm.notes ?? "",
      cable_rack_ok: row.checklistItems.cable_rack.ok,
      cable_rack_notes: row.checklistItems.cable_rack.notes ?? "",
      conclusion: row.conclusion,
      follow_up: row.followUp ?? "",
      escalation: row.escalation ?? "none",
      notes: row.notes ?? "",
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.inspection_date) {
      toast.error("Tanggal inspeksi wajib");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      inspection_date: form.inspection_date,
      inspection_type: form.inspection_type,
      checklist_items: {
        ups: { ok: form.ups_ok, notes: form.ups_notes || null },
        alarm: { ok: form.alarm_ok, notes: form.alarm_notes || null },
        cable_rack: { ok: form.cable_rack_ok, notes: form.cable_rack_notes || null },
      },
      conclusion: form.conclusion,
      follow_up: form.follow_up || null,
      escalation: form.escalation === "none" ? null : form.escalation,
      notes: form.notes || null,
    };
    if (form.inspector_id) payload.inspector_id = Number(form.inspector_id);

    try {
      if (editing) {
        const updated = await updateServerRoomInspection(editing.id, payload);
        toast.success("Inspeksi diperbarui");
        setSelected(updated);
      } else {
        await createServerRoomInspection(payload);
        toast.success("Inspeksi dicatat");
      }
      setFormOpen(false);
      load();
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: ServerRoomInspection) => {
    if (!confirm(`Hapus ${row.id}?`)) return;
    try {
      await deleteServerRoomInspection(row.id);
      toast.success("Dihapus");
      if (selected?.id === row.id) setSelected(null);
      load();
    } catch {
      toast.error("Gagal menghapus");
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-8 w-8" />
            Server Room Inspections
          </h2>
          <p className="text-muted-foreground">
            Checklist inspeksi berkala ruang server (INSP-YYYY-NNN)
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Catat Inspeksi
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <Input
            placeholder="Cari ID / catatan…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            className="max-w-xs"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua jenis</SelectItem>
              <SelectItem value="weekly">Mingguan</SelectItem>
              <SelectItem value="incidental">Insidental</SelectItem>
            </SelectContent>
          </Select>
          <Select value={conclusionFilter} onValueChange={setConclusionFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua kesimpulan</SelectItem>
              <SelectItem value="safe">Aman</SelectItem>
              <SelectItem value="findings">Ada temuan</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load}>
            Terapkan
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{filtered.length} inspeksi</CardTitle>
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
                  <TableHead>Jenis</TableHead>
                  <TableHead>Petugas</TableHead>
                  <TableHead>Kesimpulan</TableHead>
                  <TableHead>Eskalasi</TableHead>
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
                    <TableCell>{format(row.inspectionDate, "dd MMM yyyy")}</TableCell>
                    <TableCell>{TYPE_LABEL[row.inspectionType]}</TableCell>
                    <TableCell>{row.inspector?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={row.conclusion === "findings" ? "destructive" : "default"}
                      >
                        {CONCLUSION_LABEL[row.conclusion]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.escalation ? ESCALATION_LABEL[row.escalation] : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono">{selected.id}</span>
                  <Badge variant={selected.conclusion === "findings" ? "destructive" : "default"}>
                    {CONCLUSION_LABEL[selected.conclusion]}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted-foreground">Tanggal</p>
                    <p>{format(selected.inspectionDate, "dd MMM yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Jenis</p>
                    <p>{TYPE_LABEL[selected.inspectionType]}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Petugas</p>
                    <p>{selected.inspector?.name ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Eskalasi</p>
                    <p>
                      {selected.escalation
                        ? ESCALATION_LABEL[selected.escalation]
                        : "—"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground mb-2">Checklist</p>
                  <div className="space-y-2">
                    {CHECKLIST_META.map(({ key, label }) => {
                      const item = selected.checklistItems[key];
                      return (
                        <div
                          key={key}
                          className="flex items-start justify-between border rounded p-2"
                        >
                          <div>
                            <p className="font-medium">{label}</p>
                            {item.notes && (
                              <p className="text-muted-foreground text-xs">{item.notes}</p>
                            )}
                          </div>
                          <Badge variant={item.ok ? "default" : "destructive"}>
                            {item.ok ? "OK" : "Temuan"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {selected.followUp && (
                  <div>
                    <p className="text-muted-foreground">Tindak lanjut</p>
                    <p className="whitespace-pre-wrap">{selected.followUp}</p>
                  </div>
                )}
                {selected.notes && (
                  <div>
                    <p className="text-muted-foreground">Catatan</p>
                    <p className="whitespace-pre-wrap">{selected.notes}</p>
                  </div>
                )}
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
            <DialogTitle>{editing ? "Edit Inspeksi" : "Catat Inspeksi"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Tanggal *</Label>
              <Input
                type="date"
                value={form.inspection_date}
                onChange={(e) => setForm({ ...form, inspection_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Petugas</Label>
              <Select
                value={form.inspector_id || state.currentUser?.id || "self"}
                onValueChange={(v) => setForm({ ...form, inspector_id: v })}
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
              <Label>Jenis *</Label>
              <Select
                value={form.inspection_type}
                onValueChange={(v) =>
                  setForm({ ...form, inspection_type: v as InspectionType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Mingguan</SelectItem>
                  <SelectItem value="incidental">Insidental</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 border rounded p-3">
              <p className="text-sm font-medium">Checklist</p>
              {CHECKLIST_META.map(({ key, label }) => {
                const okKey = `${key}_ok` as "ups_ok" | "alarm_ok" | "cable_rack_ok";
                const notesKey = `${key}_notes` as
                  | "ups_notes"
                  | "alarm_notes"
                  | "cable_rack_notes";
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>{label} OK</Label>
                      <Switch
                        checked={form[okKey]}
                        onCheckedChange={(checked) =>
                          setForm({ ...form, [okKey]: checked })
                        }
                      />
                    </div>
                    <Input
                      placeholder={`Catatan ${label} (opsional)`}
                      value={form[notesKey]}
                      onChange={(e) => setForm({ ...form, [notesKey]: e.target.value })}
                    />
                  </div>
                );
              })}
            </div>

            <div>
              <Label>Kesimpulan *</Label>
              <Select
                value={form.conclusion}
                onValueChange={(v) =>
                  setForm({ ...form, conclusion: v as InspectionConclusion })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="safe">Aman</SelectItem>
                  <SelectItem value="findings">Ada temuan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tindak lanjut</Label>
              <Textarea
                value={form.follow_up}
                onChange={(e) => setForm({ ...form, follow_up: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label>Eskalasi (opsional)</Label>
              <Select
                value={form.escalation}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    escalation: v as "none" | InspectionEscalation,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak ada</SelectItem>
                  <SelectItem value="ipsrs">IPSRS</SelectItem>
                  <SelectItem value="director">Direktur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Catatan</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
