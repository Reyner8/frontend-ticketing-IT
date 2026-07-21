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
import { Plus, DoorOpen, LogOut, Trash2 } from "lucide-react";
import { useApp } from "../lib/store";
import {
  fetchServerRoomVisitors,
  createServerRoomVisitor,
  updateServerRoomVisitor,
  checkoutServerRoomVisitor,
  deleteServerRoomVisitor,
  fetchUsers,
} from "../lib/api/services";
import type { ServerRoomVisitor, User, VisitorStatus } from "../types";

const STATUS_LABEL: Record<VisitorStatus, string> = {
  inside: "Di dalam",
  completed: "Selesai",
};

function toDateTimeInput(d?: Date) {
  return d ? format(d, "yyyy-MM-dd'T'HH:mm") : "";
}

const emptyForm = {
  entry_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  visitor_name: "",
  unit_or_vendor: "",
  identity_document: "",
  purpose: "",
  escorted_by: "",
  notes: "",
};

export function ServerRoomVisitors() {
  const { state } = useApp();
  const canManage =
    state.currentUser?.role === "admin" || state.currentUser?.role === "it_staff";
  const [records, setRecords] = useState<ServerRoomVisitor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<ServerRoomVisitor | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServerRoomVisitor | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {};
      if (search) params.search = search;
      if (statusFilter !== "all") params.status = statusFilter;
      const { records: data } = await fetchServerRoomVisitors(params);
      setRecords(data);
    } catch {
      toast.error("Gagal memuat log pengunjung");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

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
        r.visitorName.toLowerCase().includes(q) ||
        r.unitOrVendor.toLowerCase().includes(q) ||
        r.purpose.toLowerCase().includes(q)
    );
  }, [records, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      entry_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      escorted_by: state.currentUser?.id ?? "",
    });
    setFormOpen(true);
  };

  const openEdit = (row: ServerRoomVisitor) => {
    setEditing(row);
    setForm({
      entry_at: toDateTimeInput(row.entryAt),
      visitor_name: row.visitorName,
      unit_or_vendor: row.unitOrVendor,
      identity_document: row.identityDocument,
      purpose: row.purpose,
      escorted_by: row.escortedBy?.id ?? "",
      notes: row.notes ?? "",
    });
    setFormOpen(true);
  };

  const toApiDateTime = (v: string) => (v ? v.replace("T", " ") + ":00" : null);

  const handleSave = async () => {
    if (
      !form.entry_at ||
      !form.visitor_name ||
      !form.unit_or_vendor ||
      !form.identity_document ||
      !form.purpose
    ) {
      toast.error("Lengkapi field wajib");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      entry_at: toApiDateTime(form.entry_at),
      visitor_name: form.visitor_name,
      unit_or_vendor: form.unit_or_vendor,
      identity_document: form.identity_document,
      purpose: form.purpose,
      notes: form.notes || null,
    };
    if (form.escorted_by) payload.escorted_by = Number(form.escorted_by);

    try {
      if (editing) {
        const updated = await updateServerRoomVisitor(editing.id, payload);
        toast.success("Log pengunjung diperbarui");
        setSelected(updated);
      } else {
        await createServerRoomVisitor(payload);
        toast.success("Pengunjung dicatat");
      }
      setFormOpen(false);
      load();
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleCheckout = async (row: ServerRoomVisitor) => {
    try {
      const updated = await checkoutServerRoomVisitor(row.id);
      toast.success("Checkout berhasil");
      setSelected(updated);
      load();
    } catch {
      toast.error("Checkout gagal");
    }
  };

  const handleDelete = async (row: ServerRoomVisitor) => {
    if (!confirm(`Hapus ${row.id}?`)) return;
    try {
      await deleteServerRoomVisitor(row.id);
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
            <DoorOpen className="h-8 w-8" />
            Server Room Visitors
          </h2>
          <p className="text-muted-foreground">
            Log pengunjung ruang server (VIS-YYYY-NNN)
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Catat Pengunjung
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <Input
            placeholder="Cari nama / unit / tujuan…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            className="max-w-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              <SelectItem value="inside">Di dalam</SelectItem>
              <SelectItem value="completed">Selesai</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load}>
            Terapkan
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{filtered.length} kunjungan</CardTitle>
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
                  <TableHead>Masuk</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Unit/Vendor</TableHead>
                  <TableHead>Didampingi</TableHead>
                  <TableHead>Status</TableHead>
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
                    <TableCell>{format(row.entryAt, "dd MMM yyyy HH:mm")}</TableCell>
                    <TableCell>{row.visitorName}</TableCell>
                    <TableCell>{row.unitOrVendor}</TableCell>
                    <TableCell>{row.escortedBy?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === "inside" ? "secondary" : "default"}>
                        {STATUS_LABEL[row.status]}
                      </Badge>
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
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono">{selected.id}</span>
                  <Badge variant={selected.status === "inside" ? "secondary" : "default"}>
                    {STATUS_LABEL[selected.status]}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Masuk</p>
                  <p>{format(selected.entryAt, "dd MMM yyyy HH:mm")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Keluar</p>
                  <p>
                    {selected.exitAt
                      ? format(selected.exitAt, "dd MMM yyyy HH:mm")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Nama</p>
                  <p>{selected.visitorName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Unit / Vendor</p>
                  <p>{selected.unitOrVendor}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Identitas</p>
                  <p>{selected.identityDocument}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Didampingi</p>
                  <p>{selected.escortedBy?.name ?? "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Tujuan</p>
                  <p>{selected.purpose}</p>
                </div>
                {selected.notes && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Catatan</p>
                    <p className="whitespace-pre-wrap">{selected.notes}</p>
                  </div>
                )}
              </div>
              {canManage && (
                <DialogFooter className="gap-2 flex-wrap">
                  {selected.status === "inside" && (
                    <Button onClick={() => handleCheckout(selected)}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Checkout
                    </Button>
                  )}
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
            <DialogTitle>{editing ? "Edit Pengunjung" : "Catat Pengunjung"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Waktu masuk *</Label>
              <Input
                type="datetime-local"
                value={form.entry_at}
                onChange={(e) => setForm({ ...form, entry_at: e.target.value })}
              />
            </div>
            <div>
              <Label>Nama pengunjung *</Label>
              <Input
                value={form.visitor_name}
                onChange={(e) => setForm({ ...form, visitor_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Unit / Vendor *</Label>
              <Input
                value={form.unit_or_vendor}
                onChange={(e) => setForm({ ...form, unit_or_vendor: e.target.value })}
              />
            </div>
            <div>
              <Label>Identitas *</Label>
              <Input
                value={form.identity_document}
                onChange={(e) => setForm({ ...form, identity_document: e.target.value })}
                placeholder="KTP / ID Vendor / …"
              />
            </div>
            <div>
              <Label>Tujuan *</Label>
              <Input
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              />
            </div>
            <div>
              <Label>Didampingi oleh (IT)</Label>
              <Select
                value={form.escorted_by || state.currentUser?.id || "self"}
                onValueChange={(v) => setForm({ ...form, escorted_by: v })}
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
