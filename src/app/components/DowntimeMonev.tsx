import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { useApp } from "../lib/store";
import { toast } from "sonner";
import { fetchDowntimeRecords, createDowntimeRecord, getCachedUsers } from "../lib/api/services";
import { DowntimeRecord, DowntimeType } from "../types";
import { TableSkeleton, NoDowntimeRecords } from "./LoadingStates";
import { DowntimeTable } from "./downtime/DowntimeTable";
import { DowntimeCharts } from "./downtime/DowntimeCharts";
import { DowntimeCalendar } from "./downtime/DowntimeCalendar";
import { 
  generateDowntimeAnalytics, 
  generateCalendarEvents, 
  calculateUptime,
  formatDate
} from "../lib/downtime-utils";
import { getUserName } from "../lib/user-utils";
import { PAGINATION } from "../lib/constants";
import { isSameDay } from "date-fns";
import { 
  Search, 
  Plus, 
  Clock, 
  AlertTriangle, 
  TrendingDown, 
  Server,
  Activity,
  Download,
  Target
} from "lucide-react";

export function DowntimeMonev() {
  const { state } = useApp();
  const [downtimes, setDowntimes] = useState<DowntimeRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<DowntimeType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"ongoing" | "resolved" | "all">("all");
  const [selectedDowntime, setSelectedDowntime] = useState<DowntimeRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewDowntimeDialog, setShowNewDowntimeDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("list");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<"month" | "week">("month");

  const pageSize = PAGINATION.defaultPageSize;
  const currentUser = state.currentUser;

  const loadDowntimes = async () => {
    setIsLoading(true);
    try {
      const { records } = await fetchDowntimeRecords({ per_page: 100 });
      setDowntimes(records);
    } catch {
      setDowntimes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDowntimes();
  }, []);

  // Filter downtime records
  const filteredDowntimes = useMemo(() => {
    let filtered = downtimes;

    // Apply role-based filtering
    if (currentUser?.role === 'reporter') {
      filtered = filtered.filter(downtime => downtime.reportedBy === currentUser.id);
    }

    // Apply filters
    if (searchTerm) {
      filtered = filtered.filter(downtime =>
        downtime.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        downtime.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        downtime.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        downtime.affectedSystems.some(system => 
          system.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(downtime => downtime.type === typeFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(downtime => downtime.status === statusFilter);
    }

    // Sort by start time (most recent first)
    filtered.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    return filtered;
  }, [downtimes, searchTerm, typeFilter, statusFilter, currentUser]);

  // Pagination
  const totalPages = Math.ceil(filteredDowntimes.length / pageSize);
  const paginatedDowntimes = filteredDowntimes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Analytics data
  const analyticsData = useMemo(() => {
    return generateDowntimeAnalytics(filteredDowntimes);
  }, [filteredDowntimes]);

  // Calendar events
  const calendarEvents = useMemo(() => {
    return generateCalendarEvents(filteredDowntimes);
  }, [filteredDowntimes]);

  // Get events for selected date
  const selectedDateEvents = calendarEvents.filter(event => 
    isSameDay(event.start, selectedDate)
  );

  const canEdit = currentUser?.role === 'it_staff';

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl tracking-tight">Downtime Monitoring & Evaluation</h2>
          <p className="text-muted-foreground">
            Track system downtimes and analyze impact on operations
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowNewDowntimeDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Log Downtime
          </Button>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {calculateUptime(analyticsData.totalDowntime).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Downtime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalDowntime}h</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{analyticsData.activeDowntimes}</div>
            <p className="text-xs text-muted-foreground">Currently ongoing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planned vs Unplanned</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.plannedDowntime}h / {analyticsData.unplannedDowntime}h
            </div>
            <p className="text-xs text-muted-foreground">Planned / Unplanned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Incident</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.avgDowntimePerIncident}m</div>
            <p className="text-xs text-muted-foreground">Average duration</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(analyticsData.totalCost / 1000).toFixed(0)}k</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="list">Downtime List</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filter & Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search downtime events, systems..."
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
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="unplanned">Unplanned</SelectItem>
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
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Downtime Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <TableSkeleton rows={5} columns={8} />
              ) : filteredDowntimes.length === 0 ? (
                <NoDowntimeRecords onLogDowntime={() => setShowNewDowntimeDialog(true)} />
              ) : (
                <DowntimeTable 
                  downtimes={paginatedDowntimes}
                  onViewDetails={setSelectedDowntime}
                  canEdit={canEdit}
                />
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
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <DowntimeCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            calendarEvents={calendarEvents}
            selectedDateEvents={selectedDateEvents}
            calendarView={calendarView}
            onCalendarViewChange={setCalendarView}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <DowntimeCharts
            monthlyData={analyticsData.monthlyData}
            impactData={analyticsData.impactData}
            systemsData={analyticsData.systemsData}
          />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Downtime Reports</CardTitle>
              <CardDescription>
                Generate comprehensive reports for analysis and compliance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Monthly Summary Report</CardTitle>
                    <CardDescription>
                      Complete downtime analysis for the current month
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Incidents:</span>
                        <span className="font-medium">{filteredDowntimes.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Downtime:</span>
                        <span className="font-medium">{analyticsData.totalDowntime}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span>System Uptime:</span>
                        <span className="font-medium text-green-600">
                          {calculateUptime(analyticsData.totalDowntime).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <Button className="w-full mt-4" variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF Report
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">SLA Compliance Report</CardTitle>
                    <CardDescription>
                      Service level agreement performance analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Uptime Target:</span>
                        <span className="font-medium">99.9%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Actual Uptime:</span>
                        <span className="font-medium">
                          {calculateUptime(analyticsData.totalDowntime).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>SLA Status:</span>
                        <Badge className={
                          calculateUptime(analyticsData.totalDowntime) >= 99.9 
                            ? 'text-green-600 bg-green-100' 
                            : 'text-red-600 bg-red-100'
                        }>
                          {calculateUptime(analyticsData.totalDowntime) >= 99.9 ? 'Met' : 'Missed'}
                        </Badge>
                      </div>
                    </div>
                    <Button className="w-full mt-4" variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Download Excel Report
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Downtime Detail Dialog */}
      {selectedDowntime && (
        <DowntimeDetailDialog
          downtime={selectedDowntime}
          open={!!selectedDowntime}
          onOpenChange={(open) => !open && setSelectedDowntime(null)}
        />
      )}

      {/* New Downtime Dialog */}
      <NewDowntimeDialog
        open={showNewDowntimeDialog}
        onOpenChange={setShowNewDowntimeDialog}
        onCreated={loadDowntimes}
      />
    </div>
  );
}

// Downtime Detail Dialog Component
function DowntimeDetailDialog({
  downtime,
  open,
  onOpenChange,
}: {
  downtime: DowntimeRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{downtime.id}</span>
            <Badge className={downtime.status === 'ongoing' ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100'}>
              {downtime.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>{downtime.title}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Incident Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <Badge className={downtime.type === 'planned' ? 'text-blue-600 bg-blue-100' : 'text-orange-600 bg-orange-100'}>
                      {downtime.type}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Impact:</span>
                    <Badge className={`impact-${downtime.impact}`}>
                      {downtime.impact}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{downtime.duration ? `${Math.floor(downtime.duration / 60)}h ${downtime.duration % 60}m` : 'Ongoing'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Timeline</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Started:</span>
                    <span>{formatDate(downtime.startTime)}</span>
                  </div>
                  {downtime.endTime && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ended:</span>
                      <span>{formatDate(downtime.endTime)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reported by:</span>
                    <span>{getUserName(downtime.reportedBy)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="font-medium mb-2">Description & Reason</h4>
              <div className="p-3 bg-muted rounded-lg text-sm">
                {downtime.reason}
              </div>
              {downtime.description && (
                <div className="p-3 bg-muted rounded-lg text-sm mt-2">
                  {downtime.description}
                </div>
              )}
            </div>

            {/* Affected Systems */}
            <div>
              <h4 className="font-medium mb-2">Affected Systems</h4>
              <div className="flex flex-wrap gap-2">
                {downtime.affectedSystems.map((system, index) => (
                  <Badge key={index} variant="outline">
                    {system}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Impact Analysis */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Impact Analysis</h4>
                <div className="space-y-2 text-sm">
                  {downtime.affectedUsers && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Affected Users:</span>
                      <span className="font-medium">{downtime.affectedUsers.toLocaleString()}</span>
                    </div>
                  )}
                  {downtime.estimatedCost && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estimated Cost:</span>
                      <span className="font-medium">${downtime.estimatedCost.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Resolution</h4>
                <div className="space-y-2 text-sm">
                  {downtime.rootCause && (
                    <div>
                      <span className="text-muted-foreground">Root Cause:</span>
                      <p className="mt-1">{downtime.rootCause}</p>
                    </div>
                  )}
                  {downtime.preventiveMeasures && (
                    <div>
                      <span className="text-muted-foreground">Preventive Measures:</span>
                      <p className="mt-1">{downtime.preventiveMeasures}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// New Downtime Dialog Component
function NewDowntimeDialog({
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
    type: 'unplanned' as DowntimeType,
    reason: '',
    impact: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    startTime: new Date().toISOString().slice(0, 16),
    affectedSystems: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createDowntimeRecord({
        title: formData.title,
        type: formData.type,
        reason: formData.reason,
        impact: formData.impact,
        start_time: new Date(formData.startTime).toISOString().slice(0, 19).replace('T', ' '),
        description: formData.description || undefined,
      });
      toast.success('Downtime logged');
      onCreated?.();
      onOpenChange(false);
      setFormData({
        title: '',
        type: 'unplanned',
        reason: '',
        impact: 'medium',
        startTime: new Date().toISOString().slice(0, 16),
        affectedSystems: '',
        description: ''
      });
    } catch {
      toast.error('Failed to log downtime');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Log Downtime Event</DialogTitle>
          <DialogDescription>
            Record a new downtime incident for tracking and analysis
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief title for the downtime event"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={(value: DowntimeType) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned Maintenance</SelectItem>
                  <SelectItem value="unplanned">Unplanned Outage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="impact">Impact Level</Label>
              <Select value={formData.impact} onValueChange={(value: any) => setFormData({ ...formData, impact: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="reason">Reason *</Label>
            <Input
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Primary reason for the downtime"
              required
            />
          </div>

          <div>
            <Label htmlFor="startTime">Start Time *</Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="affectedSystems">Affected Systems</Label>
            <Input
              id="affectedSystems"
              value={formData.affectedSystems}
              onChange={(e) => setFormData({ ...formData, affectedSystems: e.target.value })}
              placeholder="Comma-separated list of affected systems"
            />
          </div>

          <div>
            <Label htmlFor="description">Additional Details</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional details about the incident..."
              rows={3}
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Logging...' : 'Log Downtime Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}