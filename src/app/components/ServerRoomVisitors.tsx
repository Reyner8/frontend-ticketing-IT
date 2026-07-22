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
  inside: "Inside",
  completed: "Completed",
};

function toDateTimeInput(d?: Date) {
  return d ? format(d, "yyyy-MM-dd'T'HH:mm") : "";
}

const emptyForm = {
  entry_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  visitor_name: "",
  unit_or_vendor: "",
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
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutTarget, setCheckoutTarget] = useState<ServerRoomVisitor | null>(null);
  const [exitAt, setExitAt] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {};
      if (search) params.search = search;
      if (statusFilter !== "all") params.status = statusFilter;
      const { records: data } = await fetchServerRoomVisitors(params);
      setRecords(data);
    } catch {
      toast.error("Failed to load visitor log");
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
      purpose: row.purpose,
      escorted_by: row.escortedBy?.id ?? "",
      notes: row.notes ?? "",
    });
    setFormOpen(true);
  };

  const toApiDateTime = (v: string) => (v ? v.replace("T", " ") + ":00" : null);

  const handleSave = async () => {
    if (!form.entry_at || !form.visitor_name || !form.unit_or_vendor || !form.purpose) {
      toast.error("Please fill in the required fields");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      entry_at: toApiDateTime(form.entry_at),
      visitor_name: form.visitor_name,
      unit_or_vendor: form.unit_or_vendor,
      purpose: form.purpose,
      notes: form.notes || null,
    };
    if (form.escorted_by) payload.escorted_by = Number(form.escorted_by);

    try {
      if (editing) {
        const updated = await updateServerRoomVisitor(editing.id, payload);
        toast.success("Visitor log updated");
        setSelected(updated);
      } else {
        await createServerRoomVisitor(payload);
        toast.success("Visitor recorded");
      }
      setFormOpen(false);
      load();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const openCheckout = (row: ServerRoomVisitor) => {
    setCheckoutTarget(row);
    setExitAt(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setCheckoutOpen(true);
  };

  const handleCheckout = async () => {
    if (!checkoutTarget || !exitAt) {
      toast.error("Exit time is required");
      return;
    }
    const exitDate = new Date(exitAt);
    if (exitDate < checkoutTarget.entryAt) {
      toast.error("Exit time must be after entry time");
      return;
    }
    setCheckingOut(true);
    try {
      const updated = await checkoutServerRoomVisitor(
        checkoutTarget.id,
        toApiDateTime(exitAt)!
      );
      toast.success("Checkout successful");
      setSelected(updated);
      setCheckoutOpen(false);
      setCheckoutTarget(null);
      load();
    } catch {
      toast.error("Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  };

  const handleDelete = async (row: ServerRoomVisitor) => {
    if (!confirm(`Delete ${row.id}?`)) return;
    try {
      await deleteServerRoomVisitor(row.id);
      toast.success("Deleted");
      if (selected?.id === row.id) setSelected(null);
      load();
    } catch {
      toast.error("Failed to delete");
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
            Record Visitor
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <Input
            placeholder="Search name / unit / purpose…"
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
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="inside">Inside</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load}>
            Apply
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{filtered.length} visits</CardTitle>
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
                  <TableHead>Entry</TableHead>
                  <TableHead>Exit</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Unit/Vendor</TableHead>
                  <TableHead>Escorted By</TableHead>
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
                    <TableCell>
                      {row.exitAt ? format(row.exitAt, "dd MMM yyyy HH:mm") : "—"}
                    </TableCell>
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
                  <p className="text-muted-foreground">Entry</p>
                  <p>{format(selected.entryAt, "dd MMM yyyy HH:mm")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Exit</p>
                  <p>
                    {selected.exitAt
                      ? format(selected.exitAt, "dd MMM yyyy HH:mm")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p>{selected.visitorName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Unit / Vendor</p>
                  <p>{selected.unitOrVendor}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Escorted By</p>
                  <p>{selected.escortedBy?.name ?? "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Purpose</p>
                  <p>{selected.purpose}</p>
                </div>
                {selected.notes && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Notes</p>
                    <p className="whitespace-pre-wrap">{selected.notes}</p>
                  </div>
                )}
              </div>
              {canManage && (
                <DialogFooter className="gap-2 flex-wrap">
                  {selected.status === "inside" && (
                    <Button onClick={() => openCheckout(selected)}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Checkout
                    </Button>
                  )}
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
            <DialogTitle>{editing ? "Edit Visitor" : "Record Visitor"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Entry time *</Label>
              <Input
                type="datetime-local"
                value={form.entry_at}
                onChange={(e) => setForm({ ...form, entry_at: e.target.value })}
              />
            </div>
            <div>
              <Label>Visitor name *</Label>
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
              <Label>Purpose *</Label>
              <Input
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              />
            </div>
            <div>
              <Label>Escorted by (IT)</Label>
              <Select
                value={form.escorted_by || state.currentUser?.id || "self"}
                onValueChange={(v) => setForm({ ...form, escorted_by: v })}
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
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
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

      <Dialog
        open={checkoutOpen}
        onOpenChange={(open) => {
          setCheckoutOpen(open);
          if (!open) setCheckoutTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Checkout Visitor</DialogTitle>
          </DialogHeader>
          {checkoutTarget && (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">
                {checkoutTarget.visitorName} ({checkoutTarget.id}) — entered{" "}
                {format(checkoutTarget.entryAt, "dd MMM yyyy HH:mm")}
              </p>
              <div>
                <Label>Exit time *</Label>
                <Input
                  type="datetime-local"
                  value={exitAt}
                  onChange={(e) => setExitAt(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCheckout} disabled={checkingOut}>
              {checkingOut ? "Processing…" : "Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
