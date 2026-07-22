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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
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
  InspectionChecklistItems,
  InspectionChecklistKey,
  InspectionConclusion,
  InspectionEscalation,
  InspectionType,
  ServerRoomInspection,
  User,
} from "../types";

const TYPE_LABEL: Record<InspectionType, string> = {
  weekly: "Weekly",
  incidental: "Incidental",
};

const CONCLUSION_LABEL: Record<InspectionConclusion, string> = {
  safe: "Safe",
  findings: "Findings",
};

const ESCALATION_LABEL: Record<InspectionEscalation, string> = {
  ipsrs: "IPSRS",
  director: "Director",
};

const CHECKLIST_META: { key: InspectionChecklistKey; label: string }[] = [
  { key: "ups", label: "UPS" },
  { key: "cable", label: "Cable" },
  { key: "rack", label: "Rack" },
  { key: "ac", label: "AC" },
  { key: "pc_server", label: "PC Server" },
  { key: "mikrotik", label: "Server Mikrotik" },
  { key: "switch", label: "Switch" },
];

function emptyChecklist(): InspectionChecklistItems {
  return Object.fromEntries(
    CHECKLIST_META.map(({ key }) => [key, { ok: true, notes: "" }]),
  ) as InspectionChecklistItems;
}

const emptyForm = {
  inspection_date: format(new Date(), "yyyy-MM-dd"),
  inspector_id: "",
  inspection_type: "weekly" as InspectionType,
  checklist: emptyChecklist(),
  conclusion: "safe" as InspectionConclusion,
  follow_up: "",
  escalation: "none" as "none" | InspectionEscalation,
  notes: "",
};

export function ServerRoomInspections() {
  const { state } = useApp();
  const canManage =
    state.currentUser?.role === "admin" ||
    state.currentUser?.role === "it_staff";
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
      toast.error("Failed to load inspections");
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
              (u.role === "it_staff" ||
                u.role === "admin" ||
                u.role === "team_lead"),
          ),
        ),
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
        (r.followUp ?? "").toLowerCase().includes(q),
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
      checklist: Object.fromEntries(
        CHECKLIST_META.map(({ key }) => [
          key,
          {
            ok: row.checklistItems[key]?.ok ?? true,
            notes: row.checklistItems[key]?.notes ?? "",
          },
        ]),
      ) as InspectionChecklistItems,
      conclusion: row.conclusion,
      follow_up: row.followUp ?? "",
      escalation: row.escalation ?? "none",
      notes: row.notes ?? "",
    });
    setFormOpen(true);
  };

  const setChecklistItem = (
    key: InspectionChecklistKey,
    patch: Partial<{ ok: boolean; notes: string }>,
  ) => {
    setForm((prev) => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [key]: { ...prev.checklist[key], ...patch },
      },
    }));
  };

  const handleSave = async () => {
    if (!form.inspection_date) {
      toast.error("Inspection date is required");
      return;
    }
    setSaving(true);
    const checklist_items = Object.fromEntries(
      CHECKLIST_META.map(({ key }) => [
        key,
        {
          ok: form.checklist[key].ok,
          notes: form.checklist[key].notes || null,
        },
      ]),
    );
    const payload: Record<string, unknown> = {
      inspection_date: form.inspection_date,
      inspection_type: form.inspection_type,
      checklist_items,
      conclusion: form.conclusion,
      follow_up: form.follow_up || null,
      escalation: form.escalation === "none" ? null : form.escalation,
      notes: form.notes || null,
    };
    if (form.inspector_id) payload.inspector_id = Number(form.inspector_id);

    try {
      if (editing) {
        const updated = await updateServerRoomInspection(editing.id, payload);
        toast.success("Inspection updated");
        setSelected(updated);
      } else {
        await createServerRoomInspection(payload);
        toast.success("Inspection recorded");
      }
      setFormOpen(false);
      load();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: ServerRoomInspection) => {
    if (!confirm(`Delete ${row.id}?`)) return;
    try {
      await deleteServerRoomInspection(row.id);
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
            <ClipboardCheck className="h-8 w-8" />
            Server Room Inspections
          </h2>
          <p className="text-muted-foreground">
            Cek kondisi peralatan ruang server per alat (INSP-YYYY-NNN)
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Record Inspection
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <Input
            placeholder="Search ID / notes…"
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
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="incidental">Incidental</SelectItem>
            </SelectContent>
          </Select>
          <Select value={conclusionFilter} onValueChange={setConclusionFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All conclusions</SelectItem>
              <SelectItem value="safe">Safe</SelectItem>
              <SelectItem value="findings">Findings</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load}>
            Apply
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{filtered.length} inspections</CardTitle>
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
                  <TableHead>Type</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Conclusion</TableHead>
                  <TableHead>Escalation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(row)}
                  >
                    <TableCell className="font-mono text-sm">
                      {row.id}
                    </TableCell>
                    <TableCell>
                      {format(row.inspectionDate, "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>{TYPE_LABEL[row.inspectionType]}</TableCell>
                    <TableCell>{row.inspector?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.conclusion === "findings"
                            ? "destructive"
                            : "default"
                        }
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
                  <Badge
                    variant={
                      selected.conclusion === "findings"
                        ? "destructive"
                        : "default"
                    }
                  >
                    {CONCLUSION_LABEL[selected.conclusion]}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p>{format(selected.inspectionDate, "dd MMM yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p>{TYPE_LABEL[selected.inspectionType]}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Inspector</p>
                    <p>{selected.inspector?.name ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Escalation</p>
                    <p>
                      {selected.escalation
                        ? ESCALATION_LABEL[selected.escalation]
                        : "—"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground mb-2">
                    Equipment checklist
                  </p>
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
                            {item?.notes && (
                              <p className="text-muted-foreground text-xs">
                                {item.notes}
                              </p>
                            )}
                          </div>
                          <Badge variant={item?.ok ? "default" : "destructive"}>
                            {item?.ok ? "OK" : "Finding"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {selected.followUp && (
                  <div>
                    <p className="text-muted-foreground">Follow-up</p>
                    <p className="whitespace-pre-wrap">{selected.followUp}</p>
                  </div>
                )}
                {selected.notes && (
                  <div>
                    <p className="text-muted-foreground">Notes</p>
                    <p className="whitespace-pre-wrap">{selected.notes}</p>
                  </div>
                )}
              </div>
              {canManage && (
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => openEdit(selected)}>
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(selected)}
                  >
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
            <DialogTitle>
              {editing ? "Edit Inspection" : "Record Inspection"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={form.inspection_date}
                onChange={(e) =>
                  setForm({ ...form, inspection_date: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Inspector</Label>
              <Select
                value={form.inspector_id || state.currentUser?.id || "self"}
                onValueChange={(v) => setForm({ ...form, inspector_id: v })}
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
              <Label>Type *</Label>
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
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="incidental">Incidental</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 border rounded p-3">
              <p className="text-sm font-medium">Equipment checklist</p>
              <p className="text-xs text-muted-foreground">
                Tandai OK jika alat berfungsi normal; isi catatan jika ada
                temuan.
              </p>
              {CHECKLIST_META.map(({ key, label }) => {
                const item = form.checklist[key];
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>{label}</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {item.ok ? "OK" : "Finding"}
                        </span>
                        <Switch
                          checked={item.ok}
                          onCheckedChange={(checked) =>
                            setChecklistItem(key, { ok: checked })
                          }
                        />
                      </div>
                    </div>
                    <Input
                      placeholder={`${label} notes (optional)`}
                      value={item.notes ?? ""}
                      onChange={(e) =>
                        setChecklistItem(key, { notes: e.target.value })
                      }
                    />
                  </div>
                );
              })}
            </div>

            <div>
              <Label>Conclusion *</Label>
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
                  <SelectItem value="safe">Safe</SelectItem>
                  <SelectItem value="findings">Findings</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Follow-up</Label>
              <Textarea
                value={form.follow_up}
                onChange={(e) =>
                  setForm({ ...form, follow_up: e.target.value })
                }
                rows={2}
              />
            </div>
            <div>
              <Label>Escalation (optional)</Label>
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
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="ipsrs">IPSRS</SelectItem>
                  <SelectItem value="director">Director</SelectItem>
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
    </div>
  );
}
