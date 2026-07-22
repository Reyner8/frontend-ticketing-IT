import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Progress } from "./ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { useApp } from "../lib/store";
import { fetchErrorReports, fetchErrorReportDetail, createErrorReport, createTicket, fetchErrorStatusHistory, fetchErrorActivityLogs, getCachedUsers, updateErrorReport, deleteErrorReport } from "../lib/api/services";
import { CommentThread } from "./CommentThread";
import { ResourceEditActions } from "./ResourceEditActions";
import { AttachmentPanel } from "./AttachmentPanel";
import { ApprovalActions } from "./ApprovalActions";
import { AssignmentActions } from "./AssignmentActions";
import { ClaimActions } from "./ClaimActions";
import { StatusChangeActions } from "./StatusChangeActions";
import { ActivityTimelinePanel } from "./ActivityTimelinePanel";
import { consumeFocusResource } from "../lib/resource-focus";
import { toast } from "sonner";
import { ErrorReport, ErrorReportStatus, TicketPriority, TicketCategory, TeamType, Comment, ActivityLogEntry, StatusHistoryEntry } from "../types";
import { labelStatus, labelPriority, labelTeam } from "../lib/ui-labels";
import { TableSkeleton, NoTicketsFound } from "./LoadingStates";

const ERROR_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "pending_approval", label: labelStatus("pending_approval") },
  { value: "assigned", label: labelStatus("assigned") },
  { value: "in_progress", label: labelStatus("in_progress") },
  { value: "completed", label: labelStatus("completed") },
  { value: "overdue", label: labelStatus("overdue") },
];

const ERROR_LIFECYCLE: { status: ErrorReportStatus; label: string }[] = [
  { status: "pending_approval", label: "Reported" },
  { status: "assigned", label: labelStatus("assigned") },
  { status: "in_progress", label: labelStatus("in_progress") },
  { status: "completed", label: labelStatus("completed") },
];

const ERROR_STATUS_ORDER: Record<ErrorReportStatus, number> = {
  pending_approval: 0,
  assigned: 1,
  in_progress: 2,
  overdue: 2,
  completed: 3,
};

function formatPhaseDuration(from: Date, to: Date): string {
  const ms = to.getTime() - from.getTime();
  if (ms <= 0) return "";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days >= 1) return `${days}d ${hours % 24}h`;
  if (hours >= 1) return `${hours}h`;
  return `${Math.floor(ms / (1000 * 60))}m`;
}

function buildErrorLifecycleSteps(
  history: StatusHistoryEntry[],
  currentStatus: ErrorReportStatus,
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
  if (!statusAt.has("pending_approval")) {
    statusAt.set("pending_approval", createdAt);
  }

  const lifecycleStatus = currentStatus === "overdue" ? "in_progress" : currentStatus;
  const currentIdx = ERROR_STATUS_ORDER[lifecycleStatus];

  return ERROR_LIFECYCLE.map((step, index) => {
    const effectiveAt = statusAt.get(step.status);
    const nextStep = ERROR_LIFECYCLE[index + 1];
    const nextAt = nextStep ? statusAt.get(nextStep.status) : undefined;
    const stepState =
      lifecycleStatus === step.status
        ? "current"
        : currentIdx > ERROR_STATUS_ORDER[step.status]
          ? "completed"
          : "pending";
    const durationEnd = nextAt ?? (stepState === "current" ? new Date() : undefined);
    const duration =
      effectiveAt && durationEnd ? formatPhaseDuration(effectiveAt, durationEnd) : undefined;

    return { ...step, effectiveAt, stepState, duration };
  });
}
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  MessageSquare, 
  Paperclip, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  User, 
  Calendar as CalendarIcon,
  FileText,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Reply,
  History,
  Activity,
  Timer,
  Target,
  Upload,
  Send,
  Trash2,
  UserPlus,
  Settings,
  BarChart3
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { format } from "date-fns";

export function ErrorReports() {
  const { state } = useApp();
  const [reports, setReports] = useState<ErrorReport[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ErrorReportStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<"hardware" | "network" | "software" | "all">("all");
  const [teamFilter, setTeamFilter] = useState<TeamType | "all">("all");
  const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewReportDialog, setShowNewReportDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'dateReported' | 'priority' | 'status' | 'sla' | 'dueDate'>('dateReported');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateRange, setDateRange] = useState<{start?: Date; end?: Date}>({});

  const pageSize = 10;
  const currentUser = state.currentUser;
  const mockUsers = getCachedUsers();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const { reports: data } = await fetchErrorReports({ per_page: 100 });
        setReports(data);
      } catch {
        setReports([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleSelectReport = async (report: ErrorReport) => {
    try {
      const [detail, statusHistory, activityLog] = await Promise.all([
        fetchErrorReportDetail(report.id),
        fetchErrorStatusHistory(report.id).catch(() => []),
        fetchErrorActivityLogs(report.id).catch(() => []),
      ]);
      setSelectedReport({ ...detail, statusHistory, activityLog });
    } catch {
      setSelectedReport(report);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    const focus = consumeFocusResource();
    if (focus?.type !== "error") return;

    const match = reports.find((r) => r.id === focus.id);
    if (match) {
      void handleSelectReport(match);
      return;
    }

    void fetchErrorReportDetail(focus.id)
      .then((detail) => handleSelectReport(detail))
      .catch(() => {});
  }, [isLoading, reports]);

  const refreshReports = async () => {
    try {
      const { reports: data } = await fetchErrorReports({ per_page: 100 });
      setReports(data);
    } catch {
      /* noop */
    }
  };

  // Filter and search logic for Error Reports
  const filteredReports = useMemo(() => {
    let filtered = [...reports];

    // Apply role-based filtering
    if (currentUser?.role === 'it_staff') {
      filtered = filtered.filter(report => report.assignedToId === currentUser.id);
    } else if (currentUser?.role === 'team_lead') {
      filtered = filtered.filter(report => report.assignedTeam === currentUser.team);
    } else if (currentUser?.role === 'reporter') {
      filtered = filtered.filter(report => report.reporterId === currentUser.id);
    }

    // Apply filters
    if (searchTerm) {
      filtered = filtered.filter(report =>
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter(report => report.priority === priorityFilter);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(report => report.category === categoryFilter);
    }

    if (teamFilter !== "all") {
      filtered = filtered.filter(report => report.assignedTeam === teamFilter);
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(report => report.dateReported >= dateRange.start!);
    }
    if (dateRange.end) {
      filtered = filtered.filter(report => report.dateReported <= dateRange.end!);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof ErrorReport];
      let bValue: any = b[sortBy as keyof ErrorReport];

      if (sortBy === 'sla') {
        aValue = a.slaBreached ? 1 : 0;
        bValue = b.slaBreached ? 1 : 0;
      } else if (sortBy === 'priority') {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        aValue = priorityOrder[a.priority];
        bValue = priorityOrder[b.priority];
      } else if (sortBy === 'status') {
        const statusOrder: Record<ErrorReportStatus, number> = {
          'pending_approval': 1, 'assigned': 2, 'in_progress': 3, 'completed': 4, 'overdue': 5
        };
        aValue = statusOrder[a.status];
        bValue = statusOrder[b.status];
      } else if (sortBy === 'dateReported') {
        aValue = a.dateReported.getTime();
        bValue = b.dateReported.getTime();
      } else if (sortBy === 'dueDate') {
        aValue = a.dueDate ? a.dueDate.getTime() : 0;
        bValue = b.dueDate ? b.dueDate.getTime() : 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [reports, searchTerm, statusFilter, priorityFilter, categoryFilter, teamFilter, dateRange, currentUser, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / pageSize);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Summary statistics
  const summaryStats = useMemo(() => {
    const total = filteredReports.length;
    const pending = filteredReports.filter(
      (r) => r.status === "pending_approval" && r.approvalStatus !== "rejected"
    ).length;
    const inProgress = filteredReports.filter(r => r.status === 'in_progress').length;
    const completed = filteredReports.filter(r => r.status === 'completed').length;
    const overdue = filteredReports.filter(r => r.status === 'overdue').length;
    const slaBreached = filteredReports.filter(r => r.slaBreached).length;
    
    return { total, pending, inProgress, completed, overdue, slaBreached };
  }, [filteredReports]);

  // Helper functions
  const getStatusColor = (status: ErrorReportStatus, approvalStatus?: ErrorReport["approvalStatus"]) => {
    if (approvalStatus === "rejected") return "text-red-600 bg-red-100";
    switch (status) {
      case 'pending_approval': return 'text-yellow-600 bg-yellow-100';
      case 'assigned': return 'text-indigo-600 bg-indigo-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusLabel = (report: ErrorReport) => {
    if (report.approvalStatus === "rejected") return labelStatus("rejected");
    return labelStatus(report.status);
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

  const getCategoryColor = (category: "hardware" | "network" | "software") => {
    switch (category) {
      case 'hardware': return 'text-purple-600 bg-purple-100';
      case 'network': return 'text-blue-600 bg-blue-100';
      case 'software': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const calculateSLAStatus = (report: ErrorReport) => {
    if (report.slaBreached) {
      return { status: 'Breached', color: 'text-red-600 bg-red-100' };
    }

    return { status: 'On track', color: 'text-green-600 bg-green-100' };
  };

  const getUserName = (userId: string, fallbackName?: string) => {
    if (fallbackName) return fallbackName;
    const user = mockUsers.find(u => u.id === userId);
    return user?.name || 'Unknown user';
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl tracking-tight">Error Reports</h2>
          <p className="text-muted-foreground">
            Catat, lacak, dan selesaikan masalah dari unit internal
          </p>
        </div>
        {currentUser?.role === 'it_staff' && (
          <Button onClick={() => setShowNewReportDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New error report
          </Button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total reports</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summaryStats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In progress</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summaryStats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryStats.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summaryStats.overdue}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA breached</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summaryStats.slaBreached}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter & search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search reports, ID, description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending_approval">{labelStatus("pending_approval")}</SelectItem>
                  <SelectItem value="in_progress">{labelStatus("in_progress")}</SelectItem>
                  <SelectItem value="completed">{labelStatus("completed")}</SelectItem>
                  <SelectItem value="overdue">{labelStatus("overdue")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={categoryFilter} onValueChange={(value: any) => setCategoryFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="network">Network</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
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
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="critical">{labelPriority("critical")}</SelectItem>
                  <SelectItem value="high">{labelPriority("high")}</SelectItem>
                  <SelectItem value="medium">{labelPriority("medium")}</SelectItem>
                  <SelectItem value="low">{labelPriority("low")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="team">Responsible team</Label>
              <Select value={teamFilter} onValueChange={(value: any) => setTeamFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All teams</SelectItem>
                  <SelectItem value="programmer">{labelTeam("programmer")}</SelectItem>
                  <SelectItem value="network">{labelTeam("network")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {paginatedReports.length} of {filteredReports.length} error reports
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dateReported">Date reported</SelectItem>
              <SelectItem value="dueDate">Due date</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="sla">SLA Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error Reports Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={5} columns={10} />
          ) : filteredReports.length === 0 ? (
            <NoTicketsFound onCreateTicket={() => setShowNewReportDialog(true)} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('dateReported')}
                  >
                    Report ID
                    {sortBy === 'dateReported' && (
                      <span className="ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
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
                    onClick={() => handleSort('status')}
                  >
                    Status
                    {sortBy === 'status' && (
                      <span className="ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('dueDate')}
                  >
                    Due Date
                    {sortBy === 'dueDate' && (
                      <span className="ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('sla')}
                  >
                    SLA Status
                    {sortBy === 'sla' && (
                      <span className="ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReports.map((report) => {
                  const slaStatus = calculateSLAStatus(report);
                  return (
                    <TableRow key={report.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">{report.id}</TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="truncate font-medium">{report.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(report.dateReported)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryColor(report.category)}>
                          {report.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(report.priority)}>
                          {labelPriority(report.priority)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(report.status, report.approvalStatus)}>
                          {getStatusLabel(report)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {report.assignedToId ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {getUserName(report.assignedToId, report.assignedToName).split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{getUserName(report.assignedToId, report.assignedToName)}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {report.dueDate ? (
                          <div className="text-sm">
                            {formatDate(report.dueDate)}
                            {report.status !== 'completed' && new Date() > report.dueDate && (
                              <div className="text-xs text-red-600">Overdue</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No due date</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={slaStatus.color}>
                          {slaStatus.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleSelectReport(report)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View details
                            </DropdownMenuItem>
                            {(currentUser?.role === 'admin' || 
                              currentUser?.role === 'team_lead' || 
                              report.assignedToId === currentUser?.id) && (
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {currentUser?.role === 'admin' && (
                              <DropdownMenuItem>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
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
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Error Report Detail Dialog */}
      {selectedReport && (
        <ErrorReportDetailDialog
          report={selectedReport}
          open={!!selectedReport}
          onOpenChange={(open) => !open && setSelectedReport(null)}
          onUpdated={refreshReports}
        />
      )}

      {/* Laporan error baru Dialog */}
      <NewErrorReportDialog
        open={showNewReportDialog}
        onOpenChange={setShowNewReportDialog}
        onCreated={refreshReports}
      />
    </div>
  );
}

// Laporan error baru Dialog Component
function NewErrorReportDialog({
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
    category: 'software' as 'hardware' | 'network' | 'software',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createErrorReport({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
      });
      toast.success('Error report created');
      onCreated?.();
      onOpenChange(false);
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        category: 'software',
      });
    } catch {
      toast.error('Failed to create error report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create new error report</DialogTitle>
          <DialogDescription>
            Laporkan error atau masalah sistem baru untuk dukungan IT
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Short description of the issue"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the issue, reproduction steps, error messages, and impact..."
              rows={4}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value: any) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="network">Network</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="priority">Priority *</Label>
              <Select value={formData.priority} onValueChange={(value: TicketPriority) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low — minor issue</SelectItem>
                  <SelectItem value="medium">Medium — standard issue</SelectItem>
                  <SelectItem value="high">High — urgent issue</SelectItem>
                  <SelectItem value="critical">Critical — system down</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-muted/30">
            <h4 className="font-medium mb-2">SLA Information</h4>
            <p className="text-sm text-muted-foreground">
              Based on the selected priority:
            </p>
            <ul className="text-sm text-muted-foreground mt-1 space-y-1">
              <li>• <span className="font-medium">Critical:</span> 4 hour response time</li>
              <li>• <span className="font-medium">High:</span> 24 hour response time</li>
              <li>• <span className="font-medium">Medium:</span> 72 hour response time</li>
              <li>• <span className="font-medium">Low:</span> 168 hour response time</li>
            </ul>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create error report'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Error Report Detail Dialog Component
function ErrorReportDetailDialog({
  report,
  open,
  onOpenChange,
  onUpdated,
}: {
  report: ErrorReport;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}) {
  const [liveReport, setLiveReport] = useState(report);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>(report.statusHistory);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(report.activityLog);
  const [activityLoading, setActivityLoading] = useState(false);
  const users = getCachedUsers();

  useEffect(() => {
    setLiveReport(report);
    setStatusHistory(report.statusHistory);
    setActivityLog(report.activityLog);
  }, [report.id]);

  const refreshDetail = async () => {
    setActivityLoading(true);
    try {
      const [detail, history, activity] = await Promise.all([
        fetchErrorReportDetail(liveReport.id),
        fetchErrorStatusHistory(liveReport.id).catch(() => []),
        fetchErrorActivityLogs(liveReport.id).catch(() => []),
      ]);
      setLiveReport(detail);
      setStatusHistory(history);
      setActivityLog(activity);
      onUpdated?.();
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    if (open) void refreshDetail();
  }, [open, report.id]);
  
  const slaStatus = liveReport.slaBreached 
    ? { status: 'Breached', color: 'text-red-600 bg-red-100' }
    : { status: 'On time', color: 'text-green-600 bg-green-100' };

  const getUserName = (userId: string, fallbackName?: string) => {
    if (fallbackName) return fallbackName;
    const user = users.find(u => u.id === userId);
    return user?.name || 'Unknown user';
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const getStatusColor = (status: ErrorReportStatus, approvalStatus?: ErrorReport["approvalStatus"]) => {
    if (approvalStatus === "rejected") return 'text-red-600 bg-red-100';
    switch (status) {
      case 'pending_approval': return 'text-yellow-600 bg-yellow-100';
      case 'assigned': return 'text-indigo-600 bg-indigo-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusLabel = (item: ErrorReport) => {
    if (item.approvalStatus === "rejected") return labelStatus("rejected");
    return labelStatus(item.status);
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

  const getCategoryColor = (category: "hardware" | "network" | "software") => {
    switch (category) {
      case 'hardware': return 'text-purple-600 bg-purple-100';
      case 'network': return 'text-blue-600 bg-blue-100';
      case 'software': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const lifecycleSteps = buildErrorLifecycleSteps(
    statusHistory,
    liveReport.status,
    liveReport.createdAt
  );
  const sortedHistory = [...statusHistory].sort(
    (a, b) => a.effectiveAt.getTime() - b.effectiveAt.getTime()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-8">
            <AlertTriangle className="h-5 w-5" />
            <span>{liveReport.id}</span>
            <Badge className={liveReport.slaBreached ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100'}>
              {slaStatus.status}
            </Badge>
            <Badge className={getCategoryColor(liveReport.category)}>
              {liveReport.category}
            </Badge>
          </DialogTitle>
          <DialogDescription>{liveReport.title}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col md:flex-row md:items-stretch justify-between gap-4 border-b pb-4 bg-slate-50/50 dark:bg-slate-900/20 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
          <div className="flex-1 flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Workflow
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <ClaimActions
                target="errors"
                resourceId={liveReport.id}
                assignedToId={liveReport.assignedToId}
                onCompleted={refreshDetail}
              />
              <AssignmentActions
                target="errors"
                resourceId={liveReport.id}
                currentAssigneeId={liveReport.assignedToId}
                currentTeam={liveReport.assignedTeam}
                onCompleted={() => onOpenChange(false)}
              />
              <StatusChangeActions
                target="errors"
                resourceId={liveReport.id}
                currentStatus={liveReport.status}
                assignedToId={liveReport.assignedToId}
                options={ERROR_STATUS_OPTIONS}
                onCompleted={refreshDetail}
              />
              <ApprovalActions
                target="errors"
                resourceId={liveReport.id}
                status={liveReport.status}
                approvalStatus={liveReport.approvalStatus}
                onCompleted={() => onOpenChange(false)}
              />
            </div>
          </div>

          {/* Separator line: vertical on desktop, horizontal on mobile */}
          <div className="hidden md:block w-px bg-slate-200 dark:bg-slate-800 self-stretch my-1" />
          <div className="block md:hidden w-full h-px bg-slate-200 dark:bg-slate-800" />

          <div className="flex flex-col gap-2 md:pl-2 min-w-[120px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Manage
            </span>
            <ResourceEditActions
              title={liveReport.title}
              description={liveReport.description}
              showDueDate
              dueDate={liveReport.dueDate}
              onUpdate={async (payload) => {
                const updated = await updateErrorReport(liveReport.id, payload);
                setLiveReport(updated);
                onUpdated?.();
              }}
              onDelete={async () => {
                await deleteErrorReport(liveReport.id);
                onOpenChange(false);
              }}
            />
          </div>
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="inline-flex h-auto w-max min-w-full flex-wrap gap-1 p-1">
            <TabsTrigger value="details">Detail</TabsTrigger>
            <TabsTrigger value="progress">Progress timeline</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Report information</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Report ID:</span>
                        <span className="font-mono">{liveReport.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Category:</span>
                        <Badge className={getCategoryColor(liveReport.category)}>
                          {liveReport.category}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Priority:</span>
                        <Badge className={getPriorityColor(liveReport.priority)}>
                          {labelPriority(liveReport.priority)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge className={getStatusColor(liveReport.status, liveReport.approvalStatus)}>
                          {getStatusLabel(liveReport)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Responsible team:</span>
                        <span>{liveReport.assignedTeam ? labelTeam(liveReport.assignedTeam) : 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Completion Target</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SLA Status:</span>
                        <Badge className={slaStatus.color}>
                          {slaStatus.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Due date:</span>
                        <span className={
                          liveReport.dueDate &&
                          new Date() > liveReport.dueDate &&
                          liveReport.status !== 'completed'
                            ? 'text-red-600'
                            : ''
                        }>
                          {liveReport.dueDate ? formatDateTime(liveReport.dueDate) : 'Not set'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-medium mb-3">Description</h4>
                  <div className="p-4 bg-muted rounded-lg text-sm">
                    {liveReport.description}
                  </div>
                </div>

                {/* Key Dates */}
                <div>
                  <h4 className="font-medium mb-3">Key dates</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date reported:</span>
                        <span>{formatDateTime(liveReport.dateReported)}</span>
                      </div>
                      {liveReport.startDate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Start date:</span>
                          <span>{formatDateTime(liveReport.startDate)}</span>
                        </div>
                      )}
                      {liveReport.dueDate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Due date:</span>
                          <span className={new Date() > liveReport.dueDate && liveReport.status !== 'completed' ? 'text-red-600' : ''}>
                            {formatDateTime(liveReport.dueDate)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {liveReport.completionDate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Completion date:</span>
                          <span>{formatDateTime(liveReport.completionDate)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created:</span>
                        <span>{formatDateTime(liveReport.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last updated:</span>
                        <span>{formatDateTime(liveReport.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* People */}
                <div>
                  <h4 className="font-medium mb-3">People involved</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Reporter:</span>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getUserName(liveReport.reporterId, liveReport.reporterName).split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span>{getUserName(liveReport.reporterId, liveReport.reporterName)}</span>
                      </div>
                    </div>
                    {liveReport.assignedToId && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Assigned to:</span>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getUserName(liveReport.assignedToId, liveReport.assignedToName).split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span>{getUserName(liveReport.assignedToId, liveReport.assignedToName)}</span>
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
                  <h4 className="font-medium mb-3">Error Handling Lifecycle</h4>
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
                                {format(step.effectiveAt, 'PPp')}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {step.stepState === 'completed' ? 'Completed' :
                             step.stepState === 'current' ? 'In progress' :
                             'Waiting'}
                            {step.duration && ` · ${step.duration}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {liveReport.status === 'overdue' && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    Target penyelesaian terlewati. Tahap penanganan tetap dihitung sebagai In Progress.
                  </div>
                )}

                {sortedHistory.length > 0 ? (
                  <div>
                    <h4 className="font-medium mb-3">Status transitions</h4>
                    <div className="space-y-3">
                      {sortedHistory.map((entry, index) => {
                        const next = sortedHistory[index + 1];
                        const duration = next
                          ? formatPhaseDuration(entry.effectiveAt, next.effectiveAt)
                          : liveReport.status === entry.newStatus ||
                              (liveReport.status === 'overdue' && entry.newStatus === 'in_progress')
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
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No status history recorded yet
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            <CommentThread parent="errors" resourceId={liveReport.id} />
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            {activityLoading ? (
              <p className="text-sm text-muted-foreground">Loading activity...</p>
            ) : (
              <ActivityTimelinePanel activityLog={activityLog} />
            )}
          </TabsContent>

          <TabsContent value="files" className="mt-4">
            <ScrollArea className="h-[400px]">
              <AttachmentPanel
                parent="errors"
                parentId={liveReport.id}
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

// New Ticket Dialog Component (not currently mounted, kept for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function NewTicketDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TicketPriority,
    category: 'system_error' as TicketCategory
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
      toast.success('Ticket created');
      onOpenChange(false);
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        category: 'system_error'
      });
    } catch {
      toast.error('Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create new error report</DialogTitle>
          <DialogDescription>
            Laporkan error atau masalah sistem baru untuk dukungan IT
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Short description of the issue"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the issue, reproduction steps, error messages, and impact..."
              rows={4}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value: TicketPriority) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low — minor issue</SelectItem>
                  <SelectItem value="medium">Medium — standard issue</SelectItem>
                  <SelectItem value="high">High — urgent issue</SelectItem>
                  <SelectItem value="critical">Critical — system down</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value: TicketCategory) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system_error">System error</SelectItem>
                  <SelectItem value="software_bug">Software bug</SelectItem>
                  <SelectItem value="network_issue">Network issue</SelectItem>
                  <SelectItem value="hardware_problem">Hardware issue</SelectItem>
                  <SelectItem value="performance_issue">Performance issue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create report'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}