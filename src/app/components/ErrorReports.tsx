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
import { StatusChangeActions } from "./StatusChangeActions";
import { TagManager } from "./TagManager";

const ERROR_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "pending_approval", label: "Pending Approval" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
];
import { toast } from "sonner";
import { ErrorReport, ErrorReportStatus, TicketPriority, TicketCategory, TeamType, Comment, ActivityLogEntry, StatusHistoryEntry } from "../types";
import { TableSkeleton, NoTicketsFound } from "./LoadingStates";
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
        report.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
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
        const statusOrder = { 
          'pending_approval': 1, 'in_progress': 2, 'completed': 3, 'overdue': 4
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
    const pending = filteredReports.filter(r => r.status === 'pending_approval').length;
    const inProgress = filteredReports.filter(r => r.status === 'in_progress').length;
    const completed = filteredReports.filter(r => r.status === 'completed').length;
    const overdue = filteredReports.filter(r => r.status === 'overdue').length;
    const slaBreached = filteredReports.filter(r => r.slaBreached).length;
    
    return { total, pending, inProgress, completed, overdue, slaBreached };
  }, [filteredReports]);

  // Helper functions
  const getStatusColor = (status: ErrorReportStatus) => {
    switch (status) {
      case 'pending_approval': return 'text-yellow-600 bg-yellow-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'overdue': return 'text-red-600 bg-red-100';
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
    
    if (report.slaTimeRemaining <= 2) {
      return { status: 'At Risk', color: 'text-yellow-600 bg-yellow-100' };
    }
    
    return { status: 'On Time', color: 'text-green-600 bg-green-100' };
  };

  const formatSLATime = (hours: number) => {
    if (hours <= 0) return '0h';
    if (hours < 24) return `${Math.round(hours * 10) / 10}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return `${days}d ${remainingHours}h`;
  };

  const getUserName = (userId: string) => {
    const user = mockUsers.find(u => u.id === userId);
    return user?.name || 'Unknown User';
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
            Log, track, and resolve issues from internal units
          </p>
        </div>
        {currentUser?.role === 'it_staff' && (
          <Button onClick={() => setShowNewReportDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Error Report
          </Button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summaryStats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
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
            <CardTitle className="text-sm font-medium">SLA Breached</CardTitle>
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
          <CardTitle className="text-lg">Filter & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search reports, IDs, descriptions, tags..."
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
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
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
                  <SelectItem value="all">All Categories</SelectItem>
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
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="team">Assigned Team</Label>
              <Select value={teamFilter} onValueChange={(value: any) => setTeamFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  <SelectItem value="programmer">Programmer</SelectItem>
                  <SelectItem value="network">Network</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
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
              <SelectItem value="dateReported">Date Reported</SelectItem>
              <SelectItem value="dueDate">Due Date</SelectItem>
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
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Effort</TableHead>
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
                          {report.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(report.status)}>
                          {report.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {report.assignedToId ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {getUserName(report.assignedToId).split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{getUserName(report.assignedToId)}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {report.actualEffort ? `${report.actualEffort}h` : '-'}
                          {report.estimatedEffort && (
                            <span className="text-muted-foreground"> / {report.estimatedEffort}h</span>
                          )}
                        </div>
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
                        <div className="space-y-1">
                          <Badge className={slaStatus.color}>
                            {slaStatus.status}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {report.slaTimeRemaining > 0 
                              ? `${formatSLATime(report.slaTimeRemaining)} left`
                              : `${formatSLATime(Math.abs(report.slaTimeRemaining))} overdue`
                            }
                          </div>
                        </div>
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
                              View Details
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
        />
      )}

      {/* New Error Report Dialog */}
      <NewErrorReportDialog
        open={showNewReportDialog}
        onOpenChange={setShowNewReportDialog}
        onCreated={refreshReports}
      />
    </div>
  );
}

// New Error Report Dialog Component
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
    estimatedEffort: '',
    tags: ''
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
        estimatedEffort: '',
        tags: ''
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
          <DialogTitle>Create New Error Report</DialogTitle>
          <DialogDescription>
            Report a new system error or issue for IT support
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief description of the issue"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the issue including steps to reproduce, error messages, and impact..."
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
                  <SelectItem value="low">Low - Minor issue</SelectItem>
                  <SelectItem value="medium">Medium - Standard issue</SelectItem>
                  <SelectItem value="high">High - Urgent issue</SelectItem>
                  <SelectItem value="critical">Critical - System down</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="estimatedEffort">Estimated Effort (hours)</Label>
              <Input
                id="estimatedEffort"
                type="number"
                min="0"
                step="0.5"
                value={formData.estimatedEffort}
                onChange={(e) => setFormData({ ...formData, estimatedEffort: e.target.value })}
                placeholder="e.g., 4"
              />
            </div>
            
            <div>
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g., database, urgent, login"
              />
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-muted/30">
            <h4 className="font-medium mb-2">SLA Information</h4>
            <p className="text-sm text-muted-foreground">
              Based on priority selected:
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
              {submitting ? 'Creating...' : 'Create Error Report'}
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
}: {
  report: ErrorReport;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const users = getCachedUsers();
  
  const slaStatus = report.slaBreached 
    ? { status: 'Breached', color: 'text-red-600 bg-red-100' }
    : { status: 'On Time', color: 'text-green-600 bg-green-100' };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || 'Unknown User';
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

  const getStatusColor = (status: ErrorReportStatus) => {
    switch (status) {
      case 'pending_approval': return 'text-yellow-600 bg-yellow-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'overdue': return 'text-red-600 bg-red-100';
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

  const getCategoryColor = (category: "hardware" | "network" | "software") => {
    switch (category) {
      case 'hardware': return 'text-purple-600 bg-purple-100';
      case 'network': return 'text-blue-600 bg-blue-100';
      case 'software': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatSLATime = (hours: number) => {
    if (hours <= 0) return '0h';
    if (hours < 24) return `${Math.round(hours * 10) / 10}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return `${days}d ${remainingHours}h`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{report.id}</span>
            <Badge className={`${report.slaBreached ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100'}`}>
              {slaStatus.status}
            </Badge>
            <Badge className={getCategoryColor(report.category)}>
              {report.category}
            </Badge>
          </DialogTitle>
          <DialogDescription>{report.title}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div className="flex flex-wrap gap-2">
            <AssignmentActions
              target="errors"
              resourceId={report.id}
              currentAssigneeId={report.assignedToId}
              currentTeam={report.assignedTeam}
              onCompleted={() => onOpenChange(false)}
            />
            <StatusChangeActions
              target="errors"
              resourceId={report.id}
              currentStatus={report.status}
              options={ERROR_STATUS_OPTIONS}
              onCompleted={() => onOpenChange(false)}
            />
          </div>
          <ApprovalActions
            target="errors"
            resourceId={report.id}
            status={report.status}
            approvalStatus={report.approvalStatus}
            onCompleted={() => onOpenChange(false)}
          />
          <ResourceEditActions
            title={report.title}
            description={report.description}
            onUpdate={async (payload) => {
              await updateErrorReport(report.id, payload);
              onOpenChange(false);
            }}
            onDelete={async () => {
              await deleteErrorReport(report.id);
              onOpenChange(false);
            }}
          />
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="timeline">Progress Timeline</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Report Information</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Report ID:</span>
                        <span className="font-mono">{report.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Category:</span>
                        <Badge className={getCategoryColor(report.category)}>
                          {report.category}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Priority:</span>
                        <Badge className={getPriorityColor(report.priority)}>
                          {report.priority}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge className={getStatusColor(report.status)}>
                          {report.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Assigned Team:</span>
                        <span className="capitalize">{report.assignedTeam || 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">SLA & Timing</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SLA Status:</span>
                        <Badge className={slaStatus.color}>
                          {slaStatus.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time Elapsed:</span>
                        <span>{formatSLATime(report.slaTimeElapsed)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time Remaining:</span>
                        <span className={report.slaTimeRemaining <= 0 ? 'text-red-600' : ''}>
                          {report.slaTimeRemaining <= 0 
                            ? `${formatSLATime(Math.abs(report.slaTimeRemaining))} overdue`
                            : formatSLATime(report.slaTimeRemaining)
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estimated Effort:</span>
                        <span>{report.estimatedEffort ? `${report.estimatedEffort}h` : 'Not estimated'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Actual Effort:</span>
                        <span>{report.actualEffort ? `${report.actualEffort}h` : 'Not logged'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-medium mb-3">Description</h4>
                  <div className="p-4 bg-muted rounded-lg text-sm">
                    {report.description}
                  </div>
                </div>

                {/* Key Dates */}
                <div>
                  <h4 className="font-medium mb-3">Important Dates</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date Reported:</span>
                        <span>{formatDateTime(report.dateReported)}</span>
                      </div>
                      {report.startDate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Start Date:</span>
                          <span>{formatDateTime(report.startDate)}</span>
                        </div>
                      )}
                      {report.dueDate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Due Date:</span>
                          <span className={new Date() > report.dueDate && report.status !== 'completed' ? 'text-red-600' : ''}>
                            {formatDateTime(report.dueDate)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {report.completionDate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Completion Date:</span>
                          <span>{formatDateTime(report.completionDate)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created:</span>
                        <span>{formatDateTime(report.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Updated:</span>
                        <span>{formatDateTime(report.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* People */}
                <div>
                  <h4 className="font-medium mb-3">People Involved</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Reporter:</span>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getUserName(report.reporterId).split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span>{getUserName(report.reporterId)}</span>
                      </div>
                    </div>
                    {report.assignedToId && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Assigned To:</span>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getUserName(report.assignedToId).split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span>{getUserName(report.assignedToId)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <TagManager
                  resourceType="errors"
                  resourceId={report.id}
                  initialTags={report.tags}
                />

                {/* Attachments */}
                <div>
                  <AttachmentPanel
                    parent="errors"
                    parentId={report.id}
                    canUpload
                    canDelete
                  />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <div className="space-y-4">
              <h4 className="font-medium">Comments</h4>
              <CommentThread parent="errors" resourceId={report.id} />
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                <h4 className="font-medium">Activity Timeline</h4>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Report Created</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(report.dateReported)} by {getUserName(report.reporterId)}
                      </p>
                    </div>
                  </div>
                  
                  {report.assignedToId && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2"></div>
                      <div>
                        <p className="text-sm font-medium">Report Assigned</p>
                        <p className="text-xs text-muted-foreground">
                          Assigned to {getUserName(report.assignedToId)}
                        </p>
                      </div>
                    </div>
                  )}

                  {report.status === 'in_progress' && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
                      <div>
                        <p className="text-sm font-medium">Work Started</p>
                        <p className="text-xs text-muted-foreground">
                          Report moved to In Progress
                        </p>
                      </div>
                    </div>
                  )}

                  {report.completionDate && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                      <div>
                        <p className="text-sm font-medium">Report Completed</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(report.completionDate)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
          <DialogTitle>Create New Error Report</DialogTitle>
          <DialogDescription>
            Report a new system error or issue for IT support
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief description of the issue"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the issue including steps to reproduce, error messages, and impact..."
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
                  <SelectItem value="low">Low - Minor issue</SelectItem>
                  <SelectItem value="medium">Medium - Standard issue</SelectItem>
                  <SelectItem value="high">High - Urgent issue</SelectItem>
                  <SelectItem value="critical">Critical - System down</SelectItem>
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
                  <SelectItem value="system_error">System Error</SelectItem>
                  <SelectItem value="software_bug">Software Bug</SelectItem>
                  <SelectItem value="network_issue">Network Issue</SelectItem>
                  <SelectItem value="hardware_problem">Hardware Problem</SelectItem>
                  <SelectItem value="performance_issue">Performance Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Report'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}