import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { useApp } from "../lib/store";
import {
  fetchTickets,
  fetchTicketDetail,
  fetchTicketStatusHistory,
  fetchTicketActivityLogs,
  getCachedUsers,
  updateTicket,
  deleteTicket,
} from "../lib/api/services";
import { AttachmentPanel } from "./AttachmentPanel";
import { ApprovalActions } from "./ApprovalActions";
import { AssignmentActions } from "./AssignmentActions";
import { ClaimActions } from "./ClaimActions";
import { StatusChangeActions } from "./StatusChangeActions";
import { ConversionActions } from "./ConversionActions";
import { CommentThread } from "./CommentThread";
import { MergeTicketPanel } from "./MergeTicketPanel";
import { ResourceEditActions } from "./ResourceEditActions";
import { TableSkeleton } from "./LoadingStates";
import { Search, Eye, Ticket as TicketIcon, MessageSquare } from "lucide-react";
import { consumeFocusResource } from "../lib/resource-focus";
import type { Ticket, TicketStatus, TicketPriority, StatusHistoryEntry, ActivityLogEntry } from "../types";
import { labelStatus, labelPriority, labelTeam } from "../lib/ui-labels";

const TICKET_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "draft", label: labelStatus("draft") },
  { value: "pending_approval", label: labelStatus("pending_approval") },
  { value: "assigned", label: labelStatus("assigned") },
  { value: "in_progress", label: labelStatus("in_progress") },
  { value: "waiting_for_user", label: labelStatus("waiting_for_user") },
  { value: "resolved", label: labelStatus("resolved") },
  { value: "closed", label: labelStatus("closed") },
  { value: "converted", label: labelStatus("converted") },
];

function statusColor(status: TicketStatus) {
  switch (status) {
    case "pending_approval":
      return "text-yellow-700 bg-yellow-100";
    case "assigned":
    case "in_progress":
      return "text-blue-700 bg-blue-100";
    case "resolved":
    case "closed":
      return "text-green-700 bg-green-100";
    case "converted":
      return "text-purple-700 bg-purple-100";
    default:
      return "text-gray-700 bg-gray-100";
  }
}

function priorityColor(priority: TicketPriority) {
  switch (priority) {
    case "critical":
      return "text-red-700 bg-red-100";
    case "high":
      return "text-orange-700 bg-orange-100";
    case "medium":
      return "text-yellow-700 bg-yellow-100";
    default:
      return "text-green-700 bg-green-100";
  }
}

export function Tickets() {
  const { state } = useApp();
  const currentUser = state.currentUser;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
  const [publicOnlyFilter, setPublicOnlyFilter] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const { tickets: data } = await fetchTickets({ per_page: 100 });
      setTickets(data);
    } catch {
      setTickets([]);
      toast.error("Gagal memuat tiket");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const filtered = useMemo(() => {
    let list = [...tickets];

    if (currentUser?.role === "it_staff") {
      list = list.filter((t) => t.assignedToId === currentUser.id || !t.assignedToId);
    } else if (currentUser?.role === "team_lead") {
      list = list.filter((t) => t.assignedTeam === currentUser.team || !t.assignedTeam);
    } else if (currentUser?.role === "reporter") {
      list = list.filter((t) => t.reporterId === currentUser.id);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          (t.submitterName?.toLowerCase().includes(q) ?? false) ||
          (t.submitterUnit?.toLowerCase().includes(q) ?? false)
      );
    }
    if (statusFilter !== "all") list = list.filter((t) => t.status === statusFilter);
    if (priorityFilter !== "all") list = list.filter((t) => t.priority === priorityFilter);
    if (publicOnlyFilter) list = list.filter((t) => t.isPublicSubmission);

    return list.sort(
      (a, b) => b.dateReported.getTime() - a.dateReported.getTime()
    );
  }, [tickets, searchTerm, statusFilter, priorityFilter, publicOnlyFilter, currentUser]);

  const openDetail = async (ticket: Ticket) => {
    try {
      const detail = await fetchTicketDetail(ticket.id);
      setSelected(detail);
      setDetailOpen(true);
    } catch {
      setSelected(ticket);
      setDetailOpen(true);
    }
  };

  useEffect(() => {
    if (loading) return;
    const focus = consumeFocusResource();
    if (focus?.type !== "ticket") return;

    const match = tickets.find((t) => t.id === focus.id);
    if (match) {
      void openDetail(match);
      return;
    }

    void fetchTicketDetail(focus.id)
      .then((detail) => {
        setSelected(detail);
        setDetailOpen(true);
      })
      .catch(() => {});
  }, [loading, tickets]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl tracking-tight flex items-center gap-2">
            <TicketIcon className="h-8 w-8" />
            Tickets
          </h2>
          <p className="text-muted-foreground">
            Antrian laporan masuk — termasuk form publik (PUB-*). IT meninjau, lalu convert ke Error Report / Feature Request
          </p>
        </div>
        <Badge variant="outline">{filtered.length} ditampilkan</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Cari ID, judul..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TicketStatus | "all")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              {TICKET_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as TicketPriority | "all")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Prioritas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua prioritas</SelectItem>
              <SelectItem value="critical">{labelPriority("critical")}</SelectItem>
              <SelectItem value="high">{labelPriority("high")}</SelectItem>
              <SelectItem value="medium">{labelPriority("medium")}</SelectItem>
              <SelectItem value="low">{labelPriority("low")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant={publicOnlyFilter ? "default" : "outline"}
            onClick={() => setPublicOnlyFilter((v) => !v)}
          >
            Laporan Publik
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar tiket</CardTitle>
          <CardDescription>Klik baris untuk membuka detail, komentar, lampiran, dan tindakan</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton />
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Tiket tidak ditemukan</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Judul</TableHead>
                  <TableHead>Pelapor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioritas</TableHead>
                  <TableHead>Dilaporkan</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((ticket) => (
                  <TableRow key={ticket.id} className="cursor-pointer" onClick={() => openDetail(ticket)}>
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-2">
                        {ticket.id}
                        {ticket.isPublicSubmission && (
                          <Badge variant="outline" className="text-xs">
                            Publik
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{ticket.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ticket.isPublicSubmission
                        ? `${ticket.submitterName ?? "—"}${ticket.submitterUnit ? ` · ${ticket.submitterUnit}` : ""}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor(ticket.status)}>
                        {labelStatus(ticket.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityColor(ticket.priority)}>{labelPriority(ticket.priority)}</Badge>
                    </TableCell>
                    <TableCell>{format(ticket.dateReported, "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openDetail(ticket); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selected && (
        <TicketDetailDialog
          ticket={selected}
          open={detailOpen}
          onOpenChange={(open) => {
            setDetailOpen(open);
            if (!open) {
              setSelected(null);
              loadTickets();
            }
          }}
        />
      )}
    </div>
  );
}

function TicketDetailDialog({
  ticket,
  open,
  onOpenChange,
}: {
  ticket: Ticket;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = useState(ticket);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const users = getCachedUsers();

  useEffect(() => {
    setDetail(ticket);
    Promise.all([
      fetchTicketDetail(ticket.id).catch(() => ticket),
      fetchTicketStatusHistory(ticket.id).catch(() => []),
      fetchTicketActivityLogs(ticket.id).catch(() => []),
    ]).then(([d, sh, al]) => {
      setDetail(d);
      setStatusHistory(sh);
      setActivityLog(al);
    });
  }, [ticket.id]);

  const getUserName = (userId: string) => {
    if (userId === detail.reporterId && detail.reporterName) return detail.reporterName;
    if (userId === detail.assignedToId && detail.assignedToName) return detail.assignedToName;
    return users.find((u) => u.id === userId)?.name ?? "Tidak dikenal";
  };

  const refreshDetail = () => {
    fetchTicketDetail(detail.id)
      .then(setDetail)
      .catch(() => {});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-mono">{detail.id}</span>
            <Badge className={statusColor(detail.status)}>
              {labelStatus(detail.status)}
            </Badge>
            <Badge className={priorityColor(detail.priority)}>{labelPriority(detail.priority)}</Badge>
            {detail.isPublicSubmission && (
              <Badge variant="outline">Laporan Publik</Badge>
            )}
          </DialogTitle>
          <DialogDescription>{detail.title}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col md:flex-row md:items-stretch justify-between gap-4 border-b pb-4 bg-slate-50/50 dark:bg-slate-900/20 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
          <div className="flex-1 flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Alur Kerja
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {detail.status !== "converted" && (
                <>
                  <ClaimActions
                    target="tickets"
                    resourceId={detail.id}
                    assignedToId={detail.assignedToId}
                    onCompleted={refreshDetail}
                  />
                  <AssignmentActions
                    target="tickets"
                    resourceId={detail.id}
                    currentAssigneeId={detail.assignedToId}
                    currentTeam={detail.assignedTeam}
                    onCompleted={() => onOpenChange(false)}
                  />
                  <StatusChangeActions
                    target="tickets"
                    resourceId={detail.id}
                    currentStatus={detail.status}
                    assignedToId={detail.assignedToId}
                    options={TICKET_STATUS_OPTIONS.filter((o) => o.value !== "converted")}
                    onCompleted={refreshDetail}
                  />
                  <ApprovalActions
                    target="tickets"
                    resourceId={detail.id}
                    status={detail.status}
                    approvalStatus={detail.approvalStatus}
                    onCompleted={() => onOpenChange(false)}
                  />
                </>
              )}
              <ConversionActions
                ticketId={detail.id}
                ticketStatus={detail.status}
                ticketPriority={detail.priority}
                onCompleted={() => onOpenChange(false)}
              />
            </div>
            {detail.status === "converted" && (
              <p className="text-xs text-muted-foreground">
                Ticket sudah dialihkan — ubah status di Error Report atau Feature Request terkait.
              </p>
            )}
          </div>

          {/* Separator line: vertical on desktop, horizontal on mobile */}
          <div className="hidden md:block w-px bg-slate-200 dark:bg-slate-800 self-stretch my-1" />
          <div className="block md:hidden w-full h-px bg-slate-200 dark:bg-slate-800" />

          <div className="flex flex-col gap-2 md:pl-2 min-w-[120px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Kelola
            </span>
            <ResourceEditActions
              title={detail.title}
              description={detail.description}
              onUpdate={async (payload) => {
                const updated = await updateTicket(detail.id, payload);
                setDetail(updated);
              }}
              onDelete={async () => {
                await deleteTicket(detail.id);
                onOpenChange(false);
              }}
            />
          </div>
        </div>

        <Tabs defaultValue="details" className="w-full min-h-0">
          <div className="overflow-x-auto pb-1">
            <TabsList className="inline-flex h-auto w-max min-w-full flex-wrap gap-1 p-1">
              <TabsTrigger value="details" className="flex-none px-3">Detail</TabsTrigger>
              <TabsTrigger value="comments" className="flex-none px-3">Komentar</TabsTrigger>
              <TabsTrigger value="files" className="flex-none px-3">Berkas</TabsTrigger>
              <TabsTrigger value="merge" className="flex-none px-3">Gabung</TabsTrigger>
              <TabsTrigger value="activity" className="flex-none px-3">Activity</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="details" className="mt-4">
            <ScrollArea className="h-[380px] pr-4">
              <div className="space-y-4 text-sm">
                {detail.isPublicSubmission && (
                  <div className="rounded-lg border bg-slate-50 p-3 grid grid-cols-2 gap-3">
                    <div>
                      <Label>Pelapor (form publik)</Label>
                      <p className="mt-1 font-medium">{detail.submitterName ?? "—"}</p>
                    </div>
                    <div>
                      <Label>Unit</Label>
                      <p className="mt-1 font-medium">{detail.submitterUnit ?? "—"}</p>
                    </div>
                  </div>
                )}

                <div>
                  <Label>Deskripsi</Label>
                  <p className="mt-1 whitespace-pre-wrap">{detail.description || "—"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Kategori</Label>
                    <p className="mt-1 capitalize">{detail.category.replace(/_/g, " ")}</p>
                  </div>
                  <div>
                    <Label>Pelapor</Label>
                    <p className="mt-1">{getUserName(detail.reporterId)}</p>
                  </div>
                  <div>
                    <Label>Penanggung jawab</Label>
                    <p className="mt-1">
                      {detail.assignedToId ? getUserName(detail.assignedToId) : "Belum ditugaskan"}
                    </p>
                  </div>
                  <div>
                    <Label>Tim</Label>
                    <p className="mt-1">{detail.assignedTeam ? labelTeam(detail.assignedTeam) : "—"}</p>
                  </div>
                  <div>
                    <Label>Dilaporkan</Label>
                    <p className="mt-1">{format(detail.dateReported, "PPpp")}</p>
                  </div>
                  <div>
                    <Label>Tenggat waktu</Label>
                    <p className="mt-1">
                      {detail.dueDate ? format(detail.dueDate, "PPpp") : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            <CommentThread parent="tickets" resourceId={detail.id} />
          </TabsContent>

          <TabsContent value="files" className="mt-4">
            <AttachmentPanel parent="tickets" parentId={detail.id} canUpload canDelete />
          </TabsContent>

          <TabsContent value="merge" className="mt-4">
            <MergeTicketPanel ticketId={detail.id} />
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <ScrollArea className="h-[380px] pr-4 space-y-4">
              {statusHistory.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Riwayat status
                  </h4>
                  <ul className="space-y-2 text-sm">
                    {statusHistory.map((s) => (
                      <li key={s.id} className="border-l-2 pl-3">
                        {labelStatus(s.previousStatus)} → {labelStatus(s.newStatus)}
                        <span className="text-muted-foreground ml-2">
                          {format(s.changedAt, "PPp")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <h4 className="font-medium mb-2">Log aktivitas</h4>
              {activityLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada aktivitas tercatat</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {activityLog.map((a) => (
                    <li key={a.id} className="border-l-2 pl-3">
                      <span className="font-medium capitalize">{String(a.action).replace(/_/g, " ")}</span>
                      — {a.description}
                      <span className="text-muted-foreground block">
                        {format(a.performedAt, "PPp")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
