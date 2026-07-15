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
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useApp } from "../lib/store";
import { toast } from "sonner";
import { fetchFeatureRequests, fetchFeatureDetail, createFeatureRequest, fetchFeatureMilestones, fetchFeatureTimeline, getCachedUsers, fetchFeatureActivityLogs, fetchFeatureStatusHistory, updateFeatureRequest, deleteFeatureRequest } from "../lib/api/services";
import type { Milestone, TimelineEntry, ActivityLogEntry, StatusHistoryEntry } from "../types";
import { CommentThread } from "./CommentThread";
import { MilestoneTimelinePanel } from "./MilestoneTimelinePanel";
import { ResourceEditActions } from "./ResourceEditActions";
import { AttachmentPanel } from "./AttachmentPanel";
import { ApprovalActions } from "./ApprovalActions";
import { AssignmentActions } from "./AssignmentActions";
import { ClaimActions } from "./ClaimActions";
import { StatusChangeActions } from "./StatusChangeActions";
import { TagManager } from "./TagManager";
import { Send } from "lucide-react";

const FEATURE_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "submission", label: "Submission" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "assigned", label: "Assigned" },
  { value: "development", label: "Development" },
  { value: "testing", label: "Testing" },
  { value: "validation", label: "Validation" },
  { value: "completed", label: "Completed" },
  { value: "post_implementation_review", label: "Post-Implementation Review" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

const TARGET_APPLICATION_OPTIONS: { value: TargetApplication; label: string }[] = [
  { value: "simrs", label: "SIMRS" },
  { value: "rme", label: "RME" },
  { value: "antrean", label: "ANTREAN" },
  { value: "lainnya", label: "Lainnya" },
];

function getApplicationLabel(app?: TargetApplication): string {
  return TARGET_APPLICATION_OPTIONS.find((o) => o.value === app)?.label ?? "-";
}

function getApplicationColor(app?: TargetApplication): string {
  switch (app) {
    case "simrs": return "text-blue-600 bg-blue-100";
    case "rme": return "text-green-600 bg-green-100";
    case "antrean": return "text-purple-600 bg-purple-100";
    case "lainnya": return "text-gray-600 bg-gray-100";
    default: return "text-gray-600 bg-gray-100";
  }
}
import { FeatureRequest, FeatureRequestStatus, TargetApplication, TicketPriority } from "../types";
import { TableSkeleton, NoTicketsFound } from "./LoadingStates";
import { 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  MoreHorizontal,
  Lightbulb,
  Bug,
  Target,
  Users,
  Timer
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { format } from "date-fns";
import { consumeFocusResource } from "../lib/resource-focus";
import { ActivityTimelinePanel } from "./ActivityTimelinePanel";

export function FeatureRequests() {
  const { state } = useApp();
  const [features, setFeatures] = useState<FeatureRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<FeatureRequestStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
  const [typeFilter, setTypeFilter] = useState<"feature_request" | "bug_fix" | "all">("all");
  const [applicationFilter, setApplicationFilter] = useState<TargetApplication | "all">("all");
  const [selectedTicket, setSelectedTicket] = useState<FeatureRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'dateSubmitted' | 'priority' | 'status' | 'dueDate' | 'progress'>('dateSubmitted');
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
      const [detail, milestones, timeline] = await Promise.all([
        fetchFeatureDetail(feature.id),
        fetchFeatureMilestones(feature.id).catch(() => [] as Milestone[]),
        fetchFeatureTimeline(feature.id).catch(() => [] as TimelineEntry[]),
      ]);
      setSelectedTicket({ ...detail, milestones, timeline });
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

  // Helper functions
  const calculateProgress = (ticket: FeatureRequest) => {
    if (ticket.progress > 0) return ticket.progress;
    if (ticket.status === 'completed') return 100;
    if (['development', 'testing', 'validation'].includes(ticket.status)) return 60;
    if (ticket.status === 'assigned') return 20;
    if (ticket.status === 'pending_approval' || ticket.status === 'submission') return 10;
    return 0;
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

  const getUserName = (userId: string) => {
    const user = mockUsers.find(u => u.id === userId);
    return user?.name || 'Unknown User';
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
      if (!t.dueDate) return false;
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
            Track development requests and software improvements
          </p>
        </div>
        {currentUser?.role === 'it_staff' && (
          <Button onClick={() => setShowNewRequestDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
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
            <CardTitle className="text-sm font-medium">Bug Fixes</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summaryStats.bugFixes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{summaryStats.inProgress}</div>
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
          <CardTitle className="text-lg">Filter & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search requests, descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="feature_request">Feature Requests</SelectItem>
                  <SelectItem value="bug_fix">Bug Fixes</SelectItem>
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
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="submission">Submission</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="testing">Testing</SelectItem>
                  <SelectItem value="validation">Validation</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="post_implementation_review">Post-Implementation Review</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
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
              <Label htmlFor="progress">Progress</Label>
              <Select value={progressFilter} onValueChange={(value: any) => setProgressFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Progress</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {paginatedTickets.length} of {filteredTickets.length} requests
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dateSubmitted">Date Created</SelectItem>
              <SelectItem value="dueDate">Due Date</SelectItem>
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
                  <TableHead>Type</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('dateSubmitted')}
                  >
                    Request ID
                    {sortBy === 'dateSubmitted' && (
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
                            {ticket.requestType === 'feature_request' ? 'Feature' : 'Bug Fix'}
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
                            Created {formatDate(ticket.dateSubmitted)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(ticket.status)}>
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{progress}%</span>
                            <Badge className={getProgressColor(progress)}>
                              {progress === 100 ? 'Done' : progress === 0 ? 'Not Started' : 'In Progress'}
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
                                {getUserName(ticket.assignedToId).split(' ').map((n: string) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{getUserName(ticket.assignedToId)}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {ticket.dueDate ? (
                          <div className="space-y-1">
                            <div className="text-sm">{formatDate(ticket.dueDate)}</div>
                            {daysUntilDue !== null && (
                              <div className={`text-xs ${
                                daysUntilDue < 0 ? 'text-red-600' : 
                                daysUntilDue <= 7 ? 'text-yellow-600' : 
                                'text-muted-foreground'
                              }`}>
                                {daysUntilDue < 0 
                                  ? `${Math.abs(daysUntilDue)} days overdue`
                                  : daysUntilDue === 0 
                                  ? 'Due today'
                                  : `${daysUntilDue} days left`
                                }
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No due date</span>
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
                              View Details
                            </DropdownMenuItem>
                            {(currentUser?.role === 'admin' || 
                              currentUser?.role === 'team_lead' || 
                              ticket.assignedToId === currentUser?.id) && (
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
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

      {/* Feature Request Detail Dialog */}
      {selectedTicket && (
        <FeatureRequestDetailDialog
          ticket={selectedTicket}
          open={!!selectedTicket}
          onOpenChange={(open) => !open && setSelectedTicket(null)}
        />
      )}

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
}: {
  ticket: FeatureRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [liveTicket, setLiveTicket] = useState(ticket);

  useEffect(() => {
    setLiveTicket(ticket);
    fetchFeatureDetail(ticket.id)
      .then(setLiveTicket)
      .catch(() => setLiveTicket(ticket));
  }, [ticket.id]);

  const refreshDetail = () => {
    fetchFeatureDetail(liveTicket.id)
      .then(setLiveTicket)
      .catch(() => {});
  };

  const progress = liveTicket.progress > 0 ? liveTicket.progress :
                  liveTicket.status === 'completed' ? 100 :
                  ['development', 'testing', 'validation'].includes(liveTicket.status) ? 60 :
                  liveTicket.status === 'assigned' ? 20 : 0;

  const users = getCachedUsers();
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || 'Unknown User';
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

  const getProgressSteps = () => {
    const steps = [
      { name: 'Submitted', status: 'completed' as const, date: ticket.dateSubmitted },
      { name: 'Under Review', status: (ticket.status === 'submission' ? 'pending' : 'completed') as 'pending' | 'completed' | 'current', date: null as Date | null },
      { name: 'Approved', status: (['submission', 'pending_approval', 'rejected'].includes(ticket.status) ? 'pending' : 'completed') as 'pending' | 'completed' | 'current', date: ticket.approvalDate as Date | null },
      { name: 'In Development', status: (['submission', 'pending_approval', 'approved', 'assigned', 'rejected'].includes(ticket.status) ? 'pending' : 'completed') as 'pending' | 'completed' | 'current', date: null as Date | null },
      { name: 'Testing', status: (['testing', 'validation'].includes(ticket.status) ? 'current' : ['completed', 'post_implementation_review'].includes(ticket.status) ? 'completed' : 'pending') as 'pending' | 'completed' | 'current', date: null as Date | null },
      { name: 'Completed', status: (['completed', 'post_implementation_review'].includes(ticket.status) ? 'completed' : 'pending') as 'pending' | 'completed' | 'current', date: ticket.completionDate as Date | null },
    ];

    return steps;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-8">
            {ticket.requestType === 'feature_request' ? <Lightbulb className="h-5 w-5" /> : <Bug className="h-5 w-5" />}
            <span>{ticket.id}</span>
            <Badge className={ticket.requestType === 'feature_request' ? 'text-blue-600 bg-blue-100' : 'text-red-600 bg-red-100'}>
              {ticket.requestType === 'feature_request' ? 'Feature Request' : 'Bug Fix'}
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
              title={ticket.title}
              description={ticket.description}
              onUpdate={async (payload) => {
                await updateFeatureRequest(ticket.id, payload);
                onOpenChange(false);
              }}
              onDelete={async () => {
                await deleteFeatureRequest(ticket.id);
                onOpenChange(false);
              }}
            />
          </div>
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="inline-flex h-auto w-max min-w-full flex-wrap gap-1 p-1">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="progress">Progress Timeline</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {/* Progress Overview */}
                <div>
                  <h4 className="font-medium mb-4">Progress Overview</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Overall Progress</span>
                      <span className="text-sm font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Started {formatDate(ticket.dateSubmitted)}</span>
                      {ticket.dueDate && <span>Due {formatDate(ticket.dueDate)}</span>}
                    </div>
                  </div>
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Request Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge className={getStatusColor(ticket.status)}>
                          {ticket.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Priority:</span>
                        <Badge className={`${ticket.priority === 'critical' ? 'text-red-600 bg-red-100' : 'text-yellow-600 bg-yellow-100'}`}>
                          {ticket.priority}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
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
                        <span className="text-muted-foreground">Assigned Team:</span>
                        <span className="capitalize">{ticket.assignedTeam || 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Development Metrics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estimated Effort:</span>
                        <span>{ticket.estimatedEffort ? `${ticket.estimatedEffort}h` : 'Not estimated'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Actual Effort:</span>
                        <span>{ticket.actualEffort ? `${ticket.actualEffort}h` : 'In progress'}</span>
                      </div>
                      {ticket.estimatedEffort && ticket.actualEffort && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Efficiency:</span>
                          <span className={ticket.actualEffort <= ticket.estimatedEffort ? 'text-green-600' : 'text-red-600'}>
                            {Math.round((ticket.estimatedEffort / ticket.actualEffort) * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <div className="p-4 bg-muted rounded-lg text-sm">
                    {ticket.description}
                  </div>
                </div>

                {/* People Involved */}
                <div>
                  <h4 className="font-medium mb-2">People Involved</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Requested By:</span>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getUserName(ticket.reporterId).split(' ').map((n: string) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span>{getUserName(ticket.reporterId)}</span>
                      </div>
                    </div>
                    {ticket.assignedToId && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Developer:</span>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getUserName(ticket.assignedToId).split(' ').map((n: string) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span>{getUserName(ticket.assignedToId)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <TagManager
                  resourceType="features"
                  resourceId={ticket.id}
                  initialTags={ticket.tags}
                />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="progress" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Lifecycle</h4>
                  <div className="space-y-4">
                    {getProgressSteps().map((step, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className={`w-4 h-4 rounded-full mt-1 ${
                          step.status === 'completed' ? 'bg-green-500' :
                          step.status === 'current' ? 'bg-blue-500' :
                          'bg-gray-300'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`font-medium ${
                              step.status === 'completed' ? 'text-green-700' :
                              step.status === 'current' ? 'text-blue-700' :
                              'text-gray-500'
                            }`}>
                              {step.name}
                            </span>
                            {step.date && (
                              <span className="text-xs text-muted-foreground">
                                {formatDate(step.date)}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {step.status === 'completed' ? 'Completed' :
                             step.status === 'current' ? 'In Progress' :
                             'Pending'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {ticket.timeline && ticket.timeline.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Timeline Entries</h4>
                    <div className="space-y-3">
                      {ticket.timeline.map((entry) => (
                        <div key={entry.id} className="flex items-start gap-3 border rounded-md p-3">
                          <div
                            className={`w-2 h-2 rounded-full mt-2 ${
                              entry.isCompleted ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs capitalize">
                                {entry.phase.replace(/_/g, ' ')}
                              </Badge>
                              <span className="font-medium text-sm">{entry.title}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {entry.description}
                            </p>
                            {(entry.startDate || entry.endDate) && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {entry.startDate && `Start: ${formatDate(entry.startDate)}`}
                                {entry.startDate && entry.endDate && ' · '}
                                {entry.endDate && `End: ${formatDate(entry.endDate)}`}
                              </p>
                            )}
                            {entry.progress > 0 && (
                              <div className="mt-2">
                                <Progress value={entry.progress} className="h-1.5" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {ticket.milestones && ticket.milestones.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Milestones</h4>
                    <div className="space-y-3">
                      {ticket.milestones.map((m) => (
                        <div key={m.id} className="flex items-start gap-3 border rounded-md p-3">
                          <div
                            className={`w-2 h-2 rounded-full mt-2 ${
                              m.isCompleted ? 'bg-green-500' : 'bg-yellow-500'
                            }`}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{m.title}</span>
                              {m.targetDate && (
                                <span className="text-xs text-muted-foreground">
                                  Target: {formatDate(m.targetDate)}
                                </span>
                              )}
                            </div>
                            {m.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {m.description}
                              </p>
                            )}
                            {m.progress > 0 && (
                              <div className="mt-2">
                                <Progress value={m.progress} className="h-1.5" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!ticket.timeline || ticket.timeline.length === 0) &&
                  (!ticket.milestones || ticket.milestones.length === 0) && (
                    <p className="text-sm text-muted-foreground italic">
                      No timeline entries or milestones yet
                    </p>
                  )}
                <MilestoneTimelinePanel featureId={ticket.id} />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            <CommentThread parent="features" resourceId={ticket.id} />
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <FeatureActivityTab featureId={ticket.id} />
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
    dueDate: undefined as Date | undefined
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
      toast.success('Feature request created');
      onCreated?.();
      onOpenChange(false);
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        type: 'feature_request',
        targetApplication: 'simrs',
        dueDate: undefined
      });
    } catch {
      toast.error('Failed to create feature request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Request</DialogTitle>
          <DialogDescription>
            Submit a new feature request or bug fix for the development team
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="type">Request Type</Label>
            <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feature_request">Feature Request</SelectItem>
                <SelectItem value="bug_fix">Bug Fix</SelectItem>
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
              placeholder="Brief description of the feature or bug"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description including business requirements, user stories, or bug reproduction steps..."
              rows={5}
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
                  <SelectItem value="low">Low - Nice to have</SelectItem>
                  <SelectItem value="medium">Medium - Standard request</SelectItem>
                  <SelectItem value="high">High - Important feature</SelectItem>
                  <SelectItem value="critical">Critical - Urgent bug fix</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="dueDate">Desired Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dueDate ? format(formData.dueDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.dueDate}
                    onSelect={(date) => setFormData({ ...formData, dueDate: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FeatureActivityTab({ featureId }: { featureId: string }) {
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchFeatureStatusHistory(featureId).catch(() => []),
      fetchFeatureActivityLogs(featureId).catch(() => []),
    ])
      .then(([history, logs]) => {
        setStatusHistory(history);
        setActivityLog(logs);
      })
      .finally(() => setLoading(false));
  }, [featureId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading activity...</p>;
  }

  return (
    <ActivityTimelinePanel
      statusHistory={statusHistory}
      activityLog={activityLog}
    />
  );
}