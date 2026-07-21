import { useState, useMemo, useEffect } from "react";
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
import { Avatar, AvatarFallback } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";
import { Progress } from "./ui/progress";
import { useApp } from "../lib/store";
import { toast } from "sonner";
import { fetchFeatureRequests, fetchFeatureDetail, createFeatureRequest, getCachedUsers, fetchFeatureActivityLogs, fetchFeatureStatusHistory, updateFeatureRequest, deleteFeatureRequest } from "../lib/api/services";
import type { ActivityLogEntry, StatusHistoryEntry, FeatureRequest, FeatureRequestStatus, TargetApplication, TicketPriority } from "../types";
import { labelStatus, labelPriority, labelTeam } from "../lib/ui-labels";
import { CommentThread } from "./CommentThread";
import { FeatureMilestoneDialog } from "./FeatureMilestoneDialog";
import { ResourceEditActions } from "./ResourceEditActions";
import { AttachmentPanel } from "./AttachmentPanel";
import { ApprovalActions } from "./ApprovalActions";
import { AssignmentActions } from "./AssignmentActions";
import { ClaimActions } from "./ClaimActions";
import { StatusChangeActions } from "./StatusChangeActions";
import { TableSkeleton, NoTicketsFound } from "./LoadingStates";
import {
  Search,
  Plus,
  Eye,
  Clock,
  CheckCircle,
  TrendingUp,
  MoreHorizontal,
  Lightbulb,
  Bug,
  Target,
  Users,
  Timer,
  Send,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { format } from "date-fns";
import { consumeFocusResource } from "../lib/resource-focus";
import { ActivityTimelinePanel } from "./ActivityTimelinePanel";
import { getApplicationColor, getApplicationLabel, TARGET_APPLICATION_OPTIONS, canShowFeatureDueDate } from "../lib/constants";

const FEATURE_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "submission", label: labelStatus("submission") },
  { value: "pending_approval", label: labelStatus("pending_approval") },
  { value: "approved", label: labelStatus("approved") },
  { value: "assigned", label: labelStatus("assigned") },
  { value: "development", label: labelStatus("development") },
  { value: "testing", label: labelStatus("testing") },
  { value: "validation", label: labelStatus("validation") },
  { value: "completed", label: labelStatus("completed") },
  { value: "post_implementation_review", label: labelStatus("post_implementation_review") },
  { value: "rejected", label: labelStatus("rejected") },
  { value: "cancelled", label: labelStatus("cancelled") },
];

const FEATURE_LIFECYCLE: { status: FeatureRequestStatus; label: string }[] = [
  { status: "pending_approval", label: "Diajukan" },
  { status: "approved", label: labelStatus("approved") },
  { status: "assigned", label: labelStatus("assigned") },
  { status: "development", label: labelStatus("development") },
  { status: "testing", label: labelStatus("testing") },
  { status: "validation", label: labelStatus("validation") },
  { status: "completed", label: labelStatus("completed") },
  { status: "post_implementation_review", label: labelStatus("post_implementation_review") },
];

const FEATURE_STATUS_ORDER: Record<FeatureRequestStatus, number> = {
  submission: 0,
  pending_approval: 1,
  approved: 2,
  assigned: 3,
  development: 4,
  testing: 5,
  validation: 6,
  completed: 7,
  post_implementation_review: 8,
  rejected: -1,
  cancelled: -1,
};

function formatPhaseDuration(from: Date, to: Date): string {
  const ms = to.getTime() - from.getTime();
  if (ms <= 0) return "";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days >= 1) return `${days}d ${hours % 24}h`;
  if (hours >= 1) return `${hours}h`;
  const minutes = Math.floor(ms / (1000 * 60));
  return `${minutes}m`;
}

function buildLifecycleSteps(
  history: StatusHistoryEntry[],
  currentStatus: FeatureRequestStatus,
  createdAt: Date
) {
  const sorted = [...history].sort(
    (a, b) => a.effectiveAt.getTime() - b.effectiveAt.getTime()
  );
  const statusAt = new Map<string, Date>();
  for (const entry of sorted) {
    if (entry.newStatus && !statusAt.has(entry.newStatus)) {
      statusAt.set(entry.newStatus, entry.effectiveAt);
    }
  }
  if (!statusAt.has("pending_approval") && !statusAt.has("submission")) {
    statusAt.set("pending_approval", createdAt);
  }

  const currentIdx = FEATURE_STATUS_ORDER[currentStatus] ?? -1;
  const isTerminal = currentStatus === "rejected" || currentStatus === "cancelled";

  return FEATURE_LIFECYCLE.map((step, idx) => {
    const effectiveAt = statusAt.get(step.status);
    const nextStep = FEATURE_LIFECYCLE[idx + 1];
    const nextAt = nextStep ? statusAt.get(nextStep.status) : undefined;

    let stepState: "pending" | "completed" | "current";
    if (isTerminal) {
      stepState = effectiveAt ? "completed" : "pending";
    } else if (currentStatus === step.status) {
      stepState = "current";
    } else if (currentIdx > FEATURE_STATUS_ORDER[step.status]) {
      stepState = "completed";
    } else {
      stepState = "pending";
    }

    const durationEnd = nextAt ?? (stepState === "current" ? new Date() : undefined);
    const duration =
      effectiveAt && durationEnd ? formatPhaseDuration(effectiveAt, durationEnd) : undefined;

    return { ...step, effectiveAt, stepState, duration };
  });
}

export function FeatureRequests() {
  const { state } = useApp();
  const [features, setFeatures] = useState<FeatureRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<FeatureRequestStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
  const [typeFilter, setTypeFilter] = useState<"feature_request" | "bug_fix" | "all">("all");
  const [applicationFilter, setApplicationFilter] = useState<TargetApplication | "all">("all");
  const [selectedTicket, setSelectedTicket] = useState<FeatureRequest | null>(null);
  const [milestoneFeatureId, setMilestoneFeatureId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'createdAt' | 'priority' | 'status' | 'dueDate' | 'progress'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [progressFilter, setProgressFilter] = useState<'all' | 'not_started' | 'in_progress' | 'completed'>('all');

  const pageSize = 10;
  const currentUser = state.currentUser;
  const mockUsers = getCachedUsers();

  const loadFeatures = async () => {
    setIsLoading(true);
    try {
      const { features: data } = await fetchFeatureRequests({ per_page: 100 });
      setFeatures(data);
    } catch {
      setFeatures([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeatures();
  }, []);

  const handleSelectFeature = async (feature: FeatureRequest) => {
    try {
      const detail = await fetchFeatureDetail(feature.id);
      setSelectedTicket(detail);
    } catch {
      setSelectedTicket(feature);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    const focus = consumeFocusResource();
    if (focus?.type !== "feature") return;

    const match = features.find((f) => f.id === focus.id);
    if (match) {
      void handleSelectFeature(match);
      return;
    }

    void fetchFeatureDetail(focus.id)
      .then((detail) => handleSelectFeature(detail))
      .catch(() => {});
  }, [isLoading, features]);

  const filteredTickets = useMemo(() => {
    let filtered = [...features];

    // Apply role-based filtering
    if (currentUser?.role === 'it_staff') {
      filtered = filtered.filter(ticket => ticket.assignedToId === currentUser.id);
    } else if (currentUser?.role === 'team_lead') {
      filtered = filtered.filter(ticket => ticket.assignedTeam === currentUser.team);
    } else if (currentUser?.role === 'reporter') {
      filtered = filtered.filter(ticket => ticket.reporterId === currentUser.id);
    }

    // Apply filters
    if (searchTerm) {
      filtered = filtered.filter(ticket =>
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(ticket => ticket.requestType === typeFilter);
    }

    if (applicationFilter !== "all") {
      filtered = filtered.filter(ticket => ticket.targetApplication === applicationFilter);
    }

    if (progressFilter !== "all") {
      filtered = filtered.filter(ticket => {
        const progress = calculateProgress(ticket);
        switch (progressFilter) {
          case 'not_started': return progress === 0;
          case 'in_progress': return progress > 0 && progress < 100;
          case 'completed': return progress === 100;
          default: return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      if (sortBy === 'progress') {
        aValue = calculateProgress(a);
        bValue = calculateProgress(b);
      } else if (sortBy === 'priority') {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        aValue = priorityOrder[a.priority];
        bValue = priorityOrder[b.priority];
      } else if (sortBy === 'status') {
        const statusOrder: Record<FeatureRequestStatus, number> = { 
          submission: 1, pending_approval: 2, approved: 3, assigned: 4,
          development: 5, testing: 6, validation: 7, completed: 8,
          post_implementation_review: 9, rejected: 10, cancelled: 11
        };
        aValue = statusOrder[a.status];
        bValue = statusOrder[b.status];
      } else if (sortBy === 'dueDate') {
        aValue = a.dueDate ? a.dueDate.getTime() : 0;
        bValue = b.dueDate ? b.dueDate.getTime() : 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [features, searchTerm, statusFilter, priorityFilter, typeFilter, applicationFilter, progressFilter, currentUser, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredTickets.length / pageSize);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Progress diambil langsung dari nilai backend (rata-rata milestone; 100% saat status selesai).
  const calculateProgress = (ticket: FeatureRequest) => {
    return Math.max(0, Math.min(100, Math.round(ticket.progress ?? 0)));
  };

  const getProgressColor = (progress: number) => {
    if (progress === 100) return 'text-green-600 bg-green-100';
    if (progress >= 75) return 'text-blue-600 bg-blue-100';
    if (progress >= 50) return 'text-yellow-600 bg-yellow-100';
    if (progress >= 25) return 'text-orange-600 bg-orange-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getTypeIcon = (requestType: string) => {
    return requestType === 'feature_request' ? Lightbulb : Bug;
  };

  const getTypeColor = (requestType: string) => {
    return requestType === 'feature_request' 
      ? 'text-blue-600 bg-blue-100' 
      : 'text-red-600 bg-red-100';
  };

  const getDaysUntilDue = (dueDate?: Date) => {
    if (!dueDate) return null;
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (status: FeatureRequestStatus) => {
    switch (status) {
      case 'submission': return 'text-gray-600 bg-gray-100';
      case 'pending_approval': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-teal-600 bg-teal-100';
      case 'assigned': return 'text-blue-600 bg-blue-100';
      case 'development': return 'text-purple-600 bg-purple-100';
      case 'testing': return 'text-indigo-600 bg-indigo-100';
      case 'validation': return 'text-orange-600 bg-orange-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'post_implementation_review': return 'text-emerald-600 bg-emerald-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'cancelled': return 'text-gray-600 bg-gray-200';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getUserName = (userId: string, fallbackName?: string) => {
    if (fallbackName) return fallbackName;
    const user = mockUsers.find(u => u.id === userId);
    return user?.name || 'Pengguna tidak dikenal';
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Summary statistics
  const summaryStats = useMemo(() => {
    const total = filteredTickets.length;
    const featureRequests = filteredTickets.filter(t => t.requestType === 'feature_request').length;
    const bugFixes = filteredTickets.filter(t => t.requestType === 'bug_fix').length;
    const inProgress = filteredTickets.filter(t => ['development', 'testing', 'validation', 'assigned'].includes(t.status)).length;
    const completed = filteredTickets.filter(t => ['completed', 'post_implementation_review'].includes(t.status)).length;
    const overdue = filteredTickets.filter(t => {
      if (!canShowFeatureDueDate(t.status) || !t.dueDate) return false;
      return new Date() > t.dueDate && !['completed', 'post_implementation_review', 'cancelled', 'rejected'].includes(t.status);
    }).length;

    return { total, featureRequests, bugFixes, inProgress, completed, overdue };
  }, [filteredTickets]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl tracking-tight">Feature Requests & Bug Fixes</h2>
          <p className="text-muted-foreground">
            Lacak permintaan pengembangan dan perbaikan perangkat lunak
          </p>
        </div>
        {currentUser?.role === 'it_staff' && (
          <Button onClick={() => setShowNewRequestDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Permintaan baru
          </Button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total permintaan</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feature Requests</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summaryStats.featureRequests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Perbaikan bug</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summaryStats.bugFixes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sedang dikerjakan</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{summaryStats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selesai</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryStats.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terlambat</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summaryStats.overdue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter & pencarian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="search">Cari</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Cari permintaan, deskripsi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="type">Tipe</Label>
              <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua tipe</SelectItem>
                  <SelectItem value="feature_request">Permintaan fitur</SelectItem>
                  <SelectItem value="bug_fix">Perbaikan bug</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="application">Aplikasi</Label>
              <Select value={applicationFilter} onValueChange={(value: any) => setApplicationFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Aplikasi</SelectItem>
                  {TARGET_APPLICATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  <SelectItem value="submission">{labelStatus("submission")}</SelectItem>
                  <SelectItem value="pending_approval">{labelStatus("pending_approval")}</SelectItem>
                  <SelectItem value="approved">{labelStatus("approved")}</SelectItem>
                  <SelectItem value="assigned">{labelStatus("assigned")}</SelectItem>
                  <SelectItem value="development">{labelStatus("development")}</SelectItem>
                  <SelectItem value="testing">{labelStatus("testing")}</SelectItem>
                  <SelectItem value="validation">{labelStatus("validation")}</SelectItem>
                  <SelectItem value="completed">{labelStatus("completed")}</SelectItem>
                  <SelectItem value="post_implementation_review">{labelStatus("post_implementation_review")}</SelectItem>
                  <SelectItem value="rejected">{labelStatus("rejected")}</SelectItem>
                  <SelectItem value="cancelled">{labelStatus("cancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={priorityFilter} onValueChange={(value: any) => setPriorityFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua prioritas</SelectItem>
                  <SelectItem value="critical">{labelPriority("critical")}</SelectItem>
                  <SelectItem value="high">{labelPriority("high")}</SelectItem>
                  <SelectItem value="medium">{labelPriority("medium")}</SelectItem>
                  <SelectItem value="low">{labelPriority("low")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="progress">Progress</Label>
              <Select value={progressFilter} onValueChange={(value: any) => setProgressFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua progress</SelectItem>
                  <SelectItem value="not_started">Belum dimulai</SelectItem>
                  <SelectItem value="in_progress">Sedang berjalan</SelectItem>
                  <SelectItem value="completed">{labelStatus("completed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Menampilkan {paginatedTickets.length} dari {filteredTickets.length} permintaan
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Urutkan:</span>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Tanggal dibuat</SelectItem>
              <SelectItem value="dueDate">Tenggat waktu</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="progress">Progress</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={5} columns={9} />
          ) : filteredTickets.length === 0 ? (
            <NoTicketsFound onCreateTicket={() => setShowNewRequestDialog(true)} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipe</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('createdAt')}
                  >
                    ID permintaan
                    {sortBy === 'createdAt' && (
                      <span className="ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('status')}
                  >
                    Status
                    {sortBy === 'status' && (
                      <span className="ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('priority')}
                  >
                    Priority
                    {sortBy === 'priority' && (
                      <span className="ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('progress')}
                  >
                    Progress
                    {sortBy === 'progress' && (
                      <span className="ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('dueDate')}
                  >
                    Due Date
                    {sortBy === 'dueDate' && (
                      <span className="ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTickets.map((ticket) => {
                  const progress = calculateProgress(ticket);
                  const daysUntilDue = getDaysUntilDue(ticket.dueDate);
                  const TypeIcon = getTypeIcon(ticket.requestType);
                  
                  return (
                    <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <TypeIcon className="h-4 w-4" />
                          <Badge className={getTypeColor(ticket.requestType)}>
                            {ticket.requestType === 'feature_request' ? 'Fitur' : 'Perbaikan bug'}
                          </Badge>
                          {ticket.targetApplication && (
                            <Badge className={getApplicationColor(ticket.targetApplication)}>
                              {getApplicationLabel(ticket.targetApplication)}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{ticket.id}</TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="truncate font-medium">{ticket.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Dibuat {formatDate(ticket.createdAt)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(ticket.status)}>
                          {labelStatus(ticket.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {labelPriority(ticket.priority)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{progress}%</span>
                            <Badge className={getProgressColor(progress)}>
                              {progress === 100 ? 'Selesai' : progress === 0 ? 'Belum dimulai' : 'Sedang berjalan'}
                            </Badge>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        {ticket.assignedToId ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {getUserName(ticket.assignedToId, ticket.assignedToName).split(' ').map((n: string) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{getUserName(ticket.assignedToId, ticket.assignedToName)}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Belum ditugaskan</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {canShowFeatureDueDate(ticket.status) ? (
                          ticket.dueDate ? (
                            <div className="space-y-1">
                              <div className="text-sm">{formatDate(ticket.dueDate)}</div>
                              {daysUntilDue !== null && (
                                <div className={`text-xs ${
                                  daysUntilDue < 0 ? 'text-red-600' : 
                                  daysUntilDue <= 7 ? 'text-yellow-600' : 
                                  'text-muted-foreground'
                                }`}>
                                  {daysUntilDue < 0 
                                    ? `${Math.abs(daysUntilDue)} hari terlambat`
                                    : daysUntilDue === 0 
                                    ? 'Jatuh tempo hari ini'
                                    : `${daysUntilDue} hari tersisa`
                                  }
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Belum diatur</span>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">Setelah Development</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleSelectFeature(ticket)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Lihat detail
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setMilestoneFeatureId(ticket.id)}>
                              <Target className="mr-2 h-4 w-4" />
                              Lihat milestone
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}

      {/* Feature Request Detail Dialog */}
      {selectedTicket && (
        <FeatureRequestDetailDialog
          ticket={selectedTicket}
          open={!!selectedTicket}
          onOpenChange={(open) => !open && setSelectedTicket(null)}
          onUpdated={loadFeatures}
        />
      )}

      <FeatureMilestoneDialog
        featureId={milestoneFeatureId}
        open={!!milestoneFeatureId}
        onOpenChange={(open) => !open && setMilestoneFeatureId(null)}
        onUpdated={loadFeatures}
      />

      {/* New Feature Request Dialog */}
      <NewFeatureRequestDialog
        open={showNewRequestDialog}
        onOpenChange={setShowNewRequestDialog}
        onCreated={loadFeatures}
      />
    </div>
  );
}

// Feature Request Detail Dialog Component
function FeatureRequestDetailDialog({
  ticket,
  open,
  onOpenChange,
  onUpdated,
}: {
  ticket: FeatureRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}) {
  const [liveTicket, setLiveTicket] = useState(ticket);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const loadActivity = (featureId: string = ticket.id) => {
    setActivityLoading(true);
    Promise.all([
      fetchFeatureStatusHistory(featureId).catch(() => [] as StatusHistoryEntry[]),
      fetchFeatureActivityLogs(featureId).catch(() => [] as ActivityLogEntry[]),
    ])
      .then(([history, logs]) => {
        setStatusHistory(history);
        setActivityLog(logs);
      })
      .finally(() => setActivityLoading(false));
  };

  useEffect(() => {
    setLiveTicket(ticket);
    fetchFeatureDetail(ticket.id)
      .then(setLiveTicket)
      .catch(() => setLiveTicket(ticket));
    loadActivity();
  }, [ticket.id]);

  const refreshDetail = () => {
    fetchFeatureDetail(liveTicket.id)
      .then(setLiveTicket)
      .catch(() => {});
    loadActivity(liveTicket.id);
  };

  const progress = Math.max(0, Math.min(100, Math.round(liveTicket.progress ?? 0)));

  const users = getCachedUsers();
  const getUserName = (userId: string, fallbackName?: string) => {
    if (fallbackName) return fallbackName;
    const user = users.find(u => u.id === userId);
    return user?.name || 'Pengguna tidak dikenal';
  };

  const getStatusColor = (status: FeatureRequestStatus) => {
    switch (status) {
      case 'submission': return 'text-gray-600 bg-gray-100';
      case 'pending_approval': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-teal-600 bg-teal-100';
      case 'assigned': return 'text-blue-600 bg-blue-100';
      case 'development': return 'text-purple-600 bg-purple-100';
      case 'testing': return 'text-indigo-600 bg-indigo-100';
      case 'validation': return 'text-orange-600 bg-orange-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'post_implementation_review': return 'text-emerald-600 bg-emerald-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'cancelled': return 'text-gray-600 bg-gray-200';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (date: Date) => {
    return format(date, 'MMM dd, yyyy');
  };

  const lifecycleSteps = buildLifecycleSteps(
    statusHistory,
    liveTicket.status,
    liveTicket.createdAt
  );

  const sortedHistory = [...statusHistory].sort(
    (a, b) => a.effectiveAt.getTime() - b.effectiveAt.getTime()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-8">
            {ticket.requestType === 'feature_request' ? <Lightbulb className="h-5 w-5" /> : <Bug className="h-5 w-5" />}
            <span>{ticket.id}</span>
            <Badge className={ticket.requestType === 'feature_request' ? 'text-blue-600 bg-blue-100' : 'text-red-600 bg-red-100'}>
              {ticket.requestType === 'feature_request' ? 'Permintaan fitur' : 'Perbaikan bug'}
            </Badge>
            {ticket.targetApplication && (
              <Badge className={getApplicationColor(ticket.targetApplication)}>
                {getApplicationLabel(ticket.targetApplication)}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>{ticket.title}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col md:flex-row md:items-stretch justify-between gap-4 border-b pb-4 bg-slate-50/50 dark:bg-slate-900/20 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
          <div className="flex-1 flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Alur Kerja
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <ClaimActions
                target="features"
                resourceId={liveTicket.id}
                assignedToId={liveTicket.assignedToId}
                onCompleted={refreshDetail}
              />
              <AssignmentActions
                target="features"
                resourceId={liveTicket.id}
                currentAssigneeId={liveTicket.assignedToId}
                currentTeam={liveTicket.assignedTeam}
                onCompleted={() => onOpenChange(false)}
              />
              <StatusChangeActions
                target="features"
                resourceId={liveTicket.id}
                currentStatus={liveTicket.status}
                assignedToId={liveTicket.assignedToId}
                options={FEATURE_STATUS_OPTIONS}
                onCompleted={refreshDetail}
              />
              <ApprovalActions
                target="features"
                resourceId={liveTicket.id}
                status={liveTicket.status}
                approvalStatus={liveTicket.approvalStatus}
                onCompleted={() => onOpenChange(false)}
              />
            </div>
          </div>

          {/* Separator line: vertical on desktop, horizontal on mobile */}
          <div className="hidden md:block w-px bg-slate-200 dark:bg-slate-800 self-stretch my-1" />
          <div className="block md:hidden w-full h-px bg-slate-200 dark:bg-slate-800" />

          <div className="flex flex-col gap-2 md:pl-2 min-w-[120px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Kelola
            </span>
            <ResourceEditActions
              title={liveTicket.title}
              description={liveTicket.description}
              showTargetApplication
              targetApplication={liveTicket.targetApplication}
              showDueDate={canShowFeatureDueDate(liveTicket.status)}
              dueDate={liveTicket.dueDate}
              onUpdate={async (payload) => {
                const updated = await updateFeatureRequest(liveTicket.id, payload);
                setLiveTicket(updated);
                onUpdated?.();
              }}
              onDelete={async () => {
                await deleteFeatureRequest(liveTicket.id);
                onOpenChange(false);
              }}
            />
          </div>
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="inline-flex h-auto w-max min-w-full flex-wrap gap-1 p-1">
            <TabsTrigger value="details">Detail</TabsTrigger>
            <TabsTrigger value="progress">Linimasa progress</TabsTrigger>
            <TabsTrigger value="comments">Komentar</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="files">Berkas</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {/* Progress Overview */}
                <div>
                  <h4 className="font-medium mb-1">Ringkasan progress</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Dihitung dari rata-rata progress milestone (100% saat status Completed).
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Progress keseluruhan</span>
                      <span className="text-sm font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Mulai {formatDate(liveTicket.createdAt)}</span>
                      {canShowFeatureDueDate(liveTicket.status) && liveTicket.dueDate && (
                        <span>Jatuh tempo {formatDate(liveTicket.dueDate)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Basic Info */}
                <div>
                  <h4 className="font-medium mb-2">Informasi permintaan</h4>
                  <div className="space-y-2 text-sm max-w-md">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge className={getStatusColor(ticket.status)}>
                          {labelStatus(ticket.status)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Priority:</span>
                        <Badge className={`${ticket.priority === 'critical' ? 'text-red-600 bg-red-100' : 'text-yellow-600 bg-yellow-100'}`}>
                          {labelPriority(ticket.priority)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipe:</span>
                        <span className="capitalize">{ticket.requestType.replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Aplikasi:</span>
                        {ticket.targetApplication ? (
                          <Badge className={getApplicationColor(ticket.targetApplication)}>
                            {getApplicationLabel(ticket.targetApplication)}
                          </Badge>
                        ) : (
                          <span>-</span>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tim penanggung jawab:</span>
                        <span className="capitalize">{ticket.assignedTeam || 'Belum ditugaskan'}</span>
                      </div>
                      {canShowFeatureDueDate(liveTicket.status) && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Due Date:</span>
                          <span>
                            {liveTicket.dueDate ? formatDate(liveTicket.dueDate) : 'Belum diatur'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                {/* Description */}
                <div>
                  <h4 className="font-medium mb-2">Deskripsi</h4>
                  <div className="p-4 bg-muted rounded-lg text-sm">
                    {ticket.description}
                  </div>
                </div>

                {/* People Involved */}
                <div>
                  <h4 className="font-medium mb-2">Orang terlibat</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Diminta oleh:</span>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getUserName(ticket.reporterId, ticket.reporterName).split(' ').map((n: string) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span>{getUserName(ticket.reporterId, ticket.reporterName)}</span>
                      </div>
                    </div>
                    {ticket.assignedToId && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Pengembang:</span>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getUserName(ticket.assignedToId, ticket.assignedToName).split(' ').map((n: string) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span>{getUserName(ticket.assignedToId, ticket.assignedToName)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="progress" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Lifecycle</h4>
                  <div className="space-y-4">
                    {lifecycleSteps.map((step) => (
                      <div key={step.status} className="flex items-start gap-3">
                        <div className={`w-4 h-4 rounded-full mt-1 ${
                          step.stepState === 'completed' ? 'bg-green-500' :
                          step.stepState === 'current' ? 'bg-blue-500' :
                          'bg-gray-300'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`font-medium ${
                              step.stepState === 'completed' ? 'text-green-700' :
                              step.stepState === 'current' ? 'text-blue-700' :
                              'text-gray-500'
                            }`}>
                              {step.label}
                            </span>
                            {step.effectiveAt && (
                              <span className="text-xs text-muted-foreground">
                                {formatDate(step.effectiveAt)}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {step.stepState === 'completed' ? 'Selesai' :
                             step.stepState === 'current' ? 'Sedang dikerjakan' :
                             'Pending'}
                            {step.duration && ` · ${step.duration}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {sortedHistory.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Status Transitions</h4>
                    <div className="space-y-3">
                      {sortedHistory.map((entry, index) => {
                        const next = sortedHistory[index + 1];
                        const duration = next
                          ? formatPhaseDuration(entry.effectiveAt, next.effectiveAt)
                          : liveTicket.status === entry.newStatus
                            ? formatPhaseDuration(entry.effectiveAt, new Date())
                            : undefined;
                        return (
                          <div key={entry.id} className="border rounded-md p-3 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium capitalize">
                                {labelStatus(entry.previousStatus)} → {labelStatus(entry.newStatus)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(entry.effectiveAt, 'PPp')}
                              </span>
                            </div>
                            {entry.reason && (
                              <p className="text-muted-foreground mt-1">{entry.reason}</p>
                            )}
                            {duration && (
                              <p className="text-xs text-muted-foreground mt-1">Duration: {duration}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {sortedHistory.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    Belum ada riwayat status tercatat
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            <CommentThread parent="features" resourceId={ticket.id} />
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <FeatureActivityTab
              statusHistory={statusHistory}
              activityLog={activityLog}
              loading={activityLoading}
            />
          </TabsContent>

          <TabsContent value="files" className="mt-4">
            <ScrollArea className="h-[400px]">
              <AttachmentPanel
                parent="features"
                parentId={ticket.id}
                canUpload
                canDelete
              />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// New Feature Request Dialog Component
function NewFeatureRequestDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TicketPriority,
    type: 'feature_request' as 'feature_request' | 'bug_fix',
    targetApplication: 'simrs' as TargetApplication,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createFeatureRequest({
        title: formData.title,
        description: formData.description,
        request_type: formData.type,
        target_application: formData.targetApplication,
        priority: formData.priority,
      });
      toast.success('Permintaan fitur dibuat');
      onCreated?.();
      onOpenChange(false);
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        type: 'feature_request',
        targetApplication: 'simrs',
      });
    } catch {
      toast.error('Gagal membuat permintaan fitur');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buat permintaan baru</DialogTitle>
          <DialogDescription>
            Ajukan feature request atau perbaikan bug baru untuk tim pengembangan
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="type">Tipe permintaan</Label>
            <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feature_request">Permintaan fitur</SelectItem>
                <SelectItem value="bug_fix">Perbaikan bug</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="targetApplication">Aplikasi Tujuan</Label>
            <Select value={formData.targetApplication} onValueChange={(value: TargetApplication) => setFormData({ ...formData, targetApplication: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TARGET_APPLICATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Deskripsi singkat fitur atau bug"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Deskripsi detail termasuk kebutuhan bisnis, user story, atau langkah reproduksi bug..."
              rows={5}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select value={formData.priority} onValueChange={(value: TicketPriority) => setFormData({ ...formData, priority: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Rendah — nice to have</SelectItem>
                <SelectItem value="medium">Sedang — permintaan standar</SelectItem>
                <SelectItem value="high">Tinggi — fitur penting</SelectItem>
                <SelectItem value="critical">Kritis — perbaikan bug mendesak</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Membuat...' : 'Buat permintaan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FeatureActivityTab({
  statusHistory,
  activityLog,
  loading,
}: {
  statusHistory: StatusHistoryEntry[];
  activityLog: ActivityLogEntry[];
  loading: boolean;
}) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Memuat aktivitas...</p>;
  }

  return (
    <ActivityTimelinePanel
      statusHistory={statusHistory}
      activityLog={activityLog}
    />
  );
}