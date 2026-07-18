import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
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
import { ApiError } from "../lib/api/client";
import {
  createDowntimeComponent,
  createDowntimeRecord,
  fetchDowntimeAnalytics,
  fetchDowntimeComponents,
  fetchDowntimeLocations,
  fetchDowntimeRecords,
  resolveDowntimeRecord,
  suggestAffectedComponents,
  updateDowntimeRecord,
} from "../lib/api/services";
import {
  DowntimeAnalyticsSummary,
  DowntimeComponent,
  DowntimeComponentCategory,
  DowntimeLocation,
  DowntimeRecord,
  DowntimeType,
} from "../types";
import { TableSkeleton, NoDowntimeRecords } from "./LoadingStates";
import { DowntimeTable } from "./downtime/DowntimeTable";
import { DowntimeCalendar } from "./downtime/DowntimeCalendar";
import { DowntimeMasterPanel } from "./downtime/DowntimeMasterPanel";
import { DowntimeAnalyticsPanel } from "./downtime/DowntimeAnalyticsPanel";
import { ComponentMultiSelect } from "./downtime/ComponentMultiSelect";
import { LocationMultiSelect } from "./downtime/LocationMultiSelect";
import { generateCalendarEvents, formatDate, formatDuration } from "../lib/downtime-utils";
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
  Zap,
} from "lucide-react";
import { getImpactColor, getStatusColor, getTypeColor } from "../lib/downtime-utils";
import { Separator } from "./ui/separator";

function firstError(err: unknown): string {
  if (err instanceof ApiError) {
    const first = err.errors ? Object.values(err.errors)[0]?.[0] : undefined;
    return first || err.message;
  }
  return err instanceof Error ? err.message : "Request failed";
}

function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toApiDateTime(local: string): string {
  if (!local) return local;
  const normalized = local.includes("T") ? local.replace("T", " ") : local;
  return normalized.length === 16 ? `${normalized}:00` : normalized;
}

function liveMinutes(start: Date): number {
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / 60000));
}

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
  const [summary, setSummary] = useState<DowntimeAnalyticsSummary | null>(null);

  const pageSize = PAGINATION.defaultPageSize;
  const currentUser = state.currentUser;
  const canManage =
    currentUser?.role === "it_staff" || currentUser?.role === "admin";

  const loadDowntimes = async () => {
    setIsLoading(true);
    try {
      const [{ records }, analytics] = await Promise.all([
        fetchDowntimeRecords({ per_page: 100 }),
        fetchDowntimeAnalytics().catch(() => null),
      ]);
      setDowntimes(records);
      setSummary(analytics);
    } catch {
      setDowntimes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDowntimes();
  }, []);

  const filteredDowntimes = useMemo(() => {
    let filtered = [...downtimes];

    if (currentUser?.role === "reporter") {
      filtered = filtered.filter((downtime) => downtime.reportedBy === currentUser.id);
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (downtime) =>
          downtime.title.toLowerCase().includes(lower) ||
          downtime.reason.toLowerCase().includes(lower) ||
          downtime.id.toLowerCase().includes(lower) ||
          downtime.locations.some((location) => location.name.toLowerCase().includes(lower)) ||
          downtime.sourceComponents.some((c) => c.name.toLowerCase().includes(lower)) ||
          downtime.affectedComponents.some((c) => c.name.toLowerCase().includes(lower))
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((downtime) => downtime.type === typeFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((downtime) => downtime.status === statusFilter);
    }

    filtered.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    return filtered;
  }, [downtimes, searchTerm, typeFilter, statusFilter, currentUser]);

  const totalPages = Math.max(1, Math.ceil(filteredDowntimes.length / pageSize));
  const paginatedDowntimes = filteredDowntimes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const calendarEvents = useMemo(
    () => generateCalendarEvents(filteredDowntimes),
    [filteredDowntimes]
  );
  const selectedDateEvents = calendarEvents.filter((event) =>
    isSameDay(event.start, selectedDate)
  );

  const summaryStats = summary?.summary;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl tracking-tight flex items-center gap-2">
            <Zap className="h-8 w-8" />
            Downtime Monitoring & Evaluation
          </h2>
          <p className="text-muted-foreground">
            Track component downtimes, dependency impact, and location-aware reporting
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowNewDowntimeDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Log Downtime
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incidents (period)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats?.incidentCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">Current month by default</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Downtime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(summaryStats?.totalDowntimeMinutes ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">Selected analytics period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summaryStats?.ongoingCount ?? downtimes.filter((d) => d.status === "ongoing").length}
            </div>
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
              {summaryStats?.plannedCount ?? 0} / {summaryStats?.unplannedCount ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Incident counts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Incident</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(summaryStats?.averageDowntimeMinutes ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">Average duration</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(summaryStats?.totalEstimatedCost ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Filtered period</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${canManage ? "grid-cols-5" : "grid-cols-4"}`}>
          <TabsTrigger value="list">Downtime List</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          {canManage && <TabsTrigger value="master">Master Data</TabsTrigger>}
        </TabsList>

        <TabsContent value="list" className="space-y-4">
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
                      placeholder="Search events, locations, components..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={typeFilter}
                    onValueChange={(value: DowntimeType | "all") => {
                      setTypeFilter(value);
                      setCurrentPage(1);
                    }}
                  >
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
                  <Label>Status</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={(value: "ongoing" | "resolved" | "all") => {
                      setStatusFilter(value);
                      setCurrentPage(1);
                    }}
                  >
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

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <TableSkeleton rows={5} columns={8} />
              ) : filteredDowntimes.length === 0 ? (
                <NoDowntimeRecords
                  onLogDowntime={canManage ? () => setShowNewDowntimeDialog(true) : undefined}
                />
              ) : (
                <DowntimeTable
                  downtimes={paginatedDowntimes}
                  onViewDetails={setSelectedDowntime}
                  canEdit={canManage}
                />
              )}
            </CardContent>
          </Card>

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
          <DowntimeAnalyticsPanel mode="analytics" />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <DowntimeAnalyticsPanel mode="reports" />
        </TabsContent>

        {canManage && (
          <TabsContent value="master" className="space-y-4">
            <DowntimeMasterPanel />
          </TabsContent>
        )}
      </Tabs>

      {selectedDowntime && (
        <DowntimeDetailDialog
          downtime={selectedDowntime}
          open={!!selectedDowntime}
          onOpenChange={(open) => !open && setSelectedDowntime(null)}
          onUpdated={loadDowntimes}
          canManage={canManage}
        />
      )}

      <NewDowntimeDialog
        open={showNewDowntimeDialog}
        onOpenChange={setShowNewDowntimeDialog}
        onCreated={loadDowntimes}
      />
    </div>
  );
}

function DowntimeDetailDialog({
  downtime,
  open,
  onOpenChange,
  onUpdated,
  canManage,
}: {
  downtime: DowntimeRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
  canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [title, setTitle] = useState(downtime.title);
  const [reason, setReason] = useState(downtime.reason);
  const [description, setDescription] = useState(downtime.description ?? "");
  const [startTime, setStartTime] = useState(toLocalInput(downtime.startTime));
  const [endTime, setEndTime] = useState(
    downtime.endTime ? toLocalInput(downtime.endTime) : toLocalInput(new Date())
  );
  const [rootCause, setRootCause] = useState(downtime.rootCause ?? "");
  const [preventiveMeasures, setPreventiveMeasures] = useState(downtime.preventiveMeasures ?? "");
  const [affectedUsers, setAffectedUsers] = useState(String(downtime.affectedUsers ?? ""));
  const [estimatedCost, setEstimatedCost] = useState(String(downtime.estimatedCost ?? ""));
  const [busy, setBusy] = useState(false);
  const [components, setComponents] = useState<DowntimeComponent[]>([]);
  const [locations, setLocations] = useState<DowntimeLocation[]>([]);
  const [locationIds, setLocationIds] = useState(downtime.locations.map((location) => location.id));
  const [sourceIds, setSourceIds] = useState(downtime.sourceComponents.map((c) => c.id));
  const [affectedIds, setAffectedIds] = useState(downtime.affectedComponents.map((c) => c.id));
  const [suggestedIds, setSuggestedIds] = useState<string[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setTitle(downtime.title);
    setReason(downtime.reason);
    setDescription(downtime.description ?? "");
    setStartTime(toLocalInput(downtime.startTime));
    setEndTime(downtime.endTime ? toLocalInput(downtime.endTime) : toLocalInput(new Date()));
    setRootCause(downtime.rootCause ?? "");
    setPreventiveMeasures(downtime.preventiveMeasures ?? "");
    setAffectedUsers(String(downtime.affectedUsers ?? ""));
    setEstimatedCost(String(downtime.estimatedCost ?? ""));
    setLocationIds(downtime.locations.map((location) => location.id));
    setSourceIds(downtime.sourceComponents.map((c) => c.id));
    setAffectedIds(downtime.affectedComponents.map((c) => c.id));
    setEditing(false);
    setResolving(false);
  }, [downtime]);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetchDowntimeComponents({ per_page: 100, is_active: true }),
      fetchDowntimeLocations({ per_page: 100, is_active: true }),
    ])
      .then(([compRes, locRes]) => {
        setComponents(compRes.components);
        setLocations(locRes.locations);
      })
      .catch(() => undefined);
  }, [open]);

  useEffect(() => {
    if (downtime.status !== "ongoing") return;
    const id = window.setInterval(() => setTick((t) => t + 1), 30000);
    return () => window.clearInterval(id);
  }, [downtime.status]);

  useEffect(() => {
    if (!editing || sourceIds.length === 0) {
      setSuggestedIds([]);
      return;
    }
    suggestAffectedComponents(sourceIds.map(Number))
      .then((suggested) => {
        const ids = suggested.map((c) => c.id);
        setSuggestedIds(ids);
        setAffectedIds((prev) => Array.from(new Set([...prev, ...ids])));
      })
      .catch(() => setSuggestedIds([]));
  }, [sourceIds, editing]);

  const elapsed =
    downtime.duration ??
    (downtime.status === "ongoing" ? liveMinutes(downtime.startTime) : undefined);
  void tick;

  const saveEdit = async () => {
    if (locationIds.length === 0) {
      toast.error("Select at least one location");
      return;
    }
    if (sourceIds.length === 0) {
      toast.error("Select at least one directly-down component");
      return;
    }
    setBusy(true);
    try {
      await updateDowntimeRecord(downtime.id, {
        title,
        reason,
        description: description || null,
        start_time: toApiDateTime(startTime),
        location_ids: locationIds.map(Number),
        source_component_ids: sourceIds.map(Number),
        affected_component_ids: affectedIds.map(Number),
      });
      toast.success("Downtime updated");
      setEditing(false);
      onUpdated?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(firstError(err));
    } finally {
      setBusy(false);
    }
  };

  const resolve = async () => {
    if (!rootCause.trim() || !preventiveMeasures.trim()) {
      toast.error("Root cause and preventive measures are required");
      return;
    }
    setBusy(true);
    try {
      await resolveDowntimeRecord(downtime.id, {
        root_cause: rootCause.trim(),
        preventive_measures: preventiveMeasures.trim(),
        end_time: toApiDateTime(endTime),
        affected_users: affectedUsers ? Number(affectedUsers) : undefined,
        estimated_cost: estimatedCost ? Number(estimatedCost) : undefined,
      });
      toast.success("Downtime resolved");
      onOpenChange(false);
      onUpdated?.();
    } catch (err) {
      toast.error(firstError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-8">
            <Zap className="h-5 w-5" />
            <span>{downtime.id}</span>
            <Badge className={getStatusColor(downtime.status)}>{downtime.status}</Badge>
            <Badge className={getTypeColor(downtime.type)}>{downtime.type}</Badge>
            <Badge className={getImpactColor(downtime.impact)}>{downtime.impact}</Badge>
          </DialogTitle>
          <DialogDescription>{downtime.title}</DialogDescription>
        </DialogHeader>

        {canManage && downtime.status === "ongoing" && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 bg-slate-50/50 dark:bg-slate-900/20 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Actions
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
                {editing ? "Cancel edit" : "Edit"}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setResolving(true);
                  setEndTime(toLocalInput(new Date()));
                }}
              >
                Resolve
              </Button>
            </div>
          </div>
        )}

        {editing && (
          <div className="space-y-3 mb-4 border rounded-md p-3">
            <h4 className="font-medium text-sm">Edit Incident</h4>
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Reason</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1">
              <Label>Start time</Label>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <LocationMultiSelect
              locations={locations}
              selectedIds={locationIds}
              onChange={setLocationIds}
            />
            <ComponentMultiSelect
              label="Directly down components"
              components={components}
              selectedIds={sourceIds}
              onChange={setSourceIds}
              excludeIds={affectedIds}
            />
            <ComponentMultiSelect
              label="Affected components"
              components={components}
              selectedIds={affectedIds}
              onChange={setAffectedIds}
              excludeIds={sourceIds}
              suggestedIds={suggestedIds}
              helperText="Suggestions from master dependencies are preselected and editable."
            />
            <div className="flex gap-2">
              <Button onClick={saveEdit} disabled={busy}>
                {busy ? "Saving..." : "Save changes"}
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {resolving && downtime.status === "ongoing" && (
          <div className="space-y-3 mb-4 border rounded-md p-3">
            <h4 className="font-medium text-sm">Resolve Incident</h4>
            <div className="space-y-1">
              <Label>Actual end time</Label>
              <Input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Root cause *</Label>
              <Textarea value={rootCause} onChange={(e) => setRootCause(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1">
              <Label>Preventive measures *</Label>
              <Textarea
                value={preventiveMeasures}
                onChange={(e) => setPreventiveMeasures(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Affected users</Label>
                <Input
                  type="number"
                  min={0}
                  value={affectedUsers}
                  onChange={(e) => setAffectedUsers(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Estimated cost</Label>
                <Input
                  type="number"
                  min={0}
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={resolve} disabled={busy}>
                {busy ? "Resolving..." : "Confirm Resolve"}
              </Button>
              <Button variant="outline" onClick={() => setResolving(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="h-[420px] pr-4">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Incident Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <Badge className={getTypeColor(downtime.type)}>{downtime.type}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Impact:</span>
                    <Badge className={getImpactColor(downtime.impact)}>{downtime.impact}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Locations:</span>
                    <span className="max-w-[65%] text-right">
                      {downtime.locations.map((location) => location.name).join(", ") || "Unspecified"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{elapsed != null ? formatDuration(elapsed) : "—"}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Timeline</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Started:</span>
                    <span>{formatDate(downtime.startTime)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Ended:</span>
                    <span>{downtime.endTime ? formatDate(downtime.endTime) : "Still ongoing"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Reported by:</span>
                    <span>{getUserName(downtime.reportedBy)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Description & Reason</h4>
              <div className="p-3 bg-muted rounded-lg text-sm">{downtime.reason}</div>
              {downtime.description && (
                <div className="p-3 bg-muted rounded-lg text-sm mt-2">{downtime.description}</div>
              )}
            </div>

            <div>
              <h4 className="font-medium mb-2">Directly Down</h4>
              <div className="flex flex-wrap gap-2">
                {downtime.sourceComponents.length === 0 ? (
                  <span className="text-sm text-muted-foreground">None recorded</span>
                ) : (
                  downtime.sourceComponents.map((component) => (
                    <Badge key={component.id}>{component.name}</Badge>
                  ))
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Affected Components</h4>
              <div className="flex flex-wrap gap-2">
                {downtime.affectedComponents.length === 0 ? (
                  <span className="text-sm text-muted-foreground">None recorded</span>
                ) : (
                  downtime.affectedComponents.map((component) => (
                    <Badge key={component.id} variant="outline">
                      {component.name}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Impact Analysis</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Affected Users:</span>
                    <span className="font-medium">
                      {downtime.affectedUsers?.toLocaleString() ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated Cost:</span>
                    <span className="font-medium">
                      {downtime.estimatedCost != null
                        ? `$${downtime.estimatedCost.toLocaleString()}`
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Resolution</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Root Cause:</span>
                    <p className="mt-1">{downtime.rootCause || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Preventive Measures:</span>
                    <p className="mt-1">{downtime.preventiveMeasures || "—"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

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
    title: "",
    type: "unplanned" as DowntimeType,
    reason: "",
    impact: "medium" as "low" | "medium" | "high" | "critical",
    startTime: toLocalInput(new Date()),
    endTime: "",
    description: "",
  });
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [affectedIds, setAffectedIds] = useState<string[]>([]);
  const [suggestedIds, setSuggestedIds] = useState<string[]>([]);
  const [components, setComponents] = useState<DowntimeComponent[]>([]);
  const [locations, setLocations] = useState<DowntimeLocation[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickCategory, setQuickCategory] = useState<DowntimeComponentCategory>("application");

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetchDowntimeComponents({ per_page: 100, is_active: true }),
      fetchDowntimeLocations({ per_page: 100, is_active: true }),
    ])
      .then(([compRes, locRes]) => {
        setComponents(compRes.components);
        setLocations(locRes.locations);
      })
      .catch((err) => toast.error(firstError(err)));
  }, [open]);

  useEffect(() => {
    if (sourceIds.length === 0) {
      setSuggestedIds([]);
      return;
    }
    let cancelled = false;
    suggestAffectedComponents(sourceIds.map(Number))
      .then((suggested) => {
        if (cancelled) return;
        const ids = suggested.map((c) => c.id);
        setSuggestedIds(ids);
        setAffectedIds((prev) => Array.from(new Set([...prev.filter((id) => !sourceIds.includes(id)), ...ids])));
      })
      .catch(() => {
        if (!cancelled) setSuggestedIds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [sourceIds]);

  const createMissingComponent = async () => {
    if (!quickName.trim()) return;
    try {
      const created = await createDowntimeComponent({
        name: quickName.trim(),
        category: quickCategory,
      });
      setComponents((prev) => [...prev, created]);
      setSourceIds((prev) => [...prev, created.id]);
      setQuickName("");
      toast.success("Component created and selected as source");
    } catch (err) {
      toast.error(firstError(err));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locationIds.length === 0) {
      toast.error("Select at least one location");
      return;
    }
    if (sourceIds.length === 0) {
      toast.error("Select at least one directly-down component");
      return;
    }
    setSubmitting(true);
    try {
      await createDowntimeRecord({
        title: formData.title,
        type: formData.type,
        reason: formData.reason,
        impact: formData.impact,
        start_time: toApiDateTime(formData.startTime),
        end_time: formData.endTime ? toApiDateTime(formData.endTime) : undefined,
        description: formData.description || undefined,
        location_ids: locationIds.map(Number),
        source_component_ids: sourceIds.map(Number),
        affected_component_ids: affectedIds.map(Number),
      });
      toast.success("Downtime logged");
      onCreated?.();
      onOpenChange(false);
      setFormData({
        title: "",
        type: "unplanned",
        reason: "",
        impact: "medium",
        startTime: toLocalInput(new Date()),
        endTime: "",
        description: "",
      });
      setLocationIds([]);
      setSourceIds([]);
      setAffectedIds([]);
      setSuggestedIds([]);
    } catch (err) {
      toast.error(firstError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Downtime Event</DialogTitle>
          <DialogDescription>
            Record location, directly-down components, and editable affected impact.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Basic Information</h4>
          <div>
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: DowntimeType) => setFormData({ ...formData, type: value })}
              >
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
              <Label>Impact Level</Label>
              <Select
                value={formData.impact}
                onValueChange={(value: "low" | "medium" | "high" | "critical") =>
                  setFormData({ ...formData, impact: value })
                }
              >
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
            <Label>Reason *</Label>
            <Input
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
            />
          </div>

          <Separator />
          <h4 className="font-medium text-sm text-muted-foreground">Timing & Location</h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Actual start time *</Label>
              <Input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>End time (optional)</Label>
              <Input
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>

          <LocationMultiSelect
            locations={locations}
            selectedIds={locationIds}
            onChange={setLocationIds}
            helperText="Select each affected unit, or use Select all locations."
          />

          <Separator />
          <h4 className="font-medium text-sm text-muted-foreground">Impacted Components</h4>

          <ComponentMultiSelect
            label="Directly down components *"
            components={components}
            selectedIds={sourceIds}
            onChange={setSourceIds}
            excludeIds={affectedIds}
          />

          <div className="rounded-md border p-3 space-y-2">
            <Label>Quick-add missing component</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                className="col-span-1"
                placeholder="Name"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
              />
              <Select
                value={quickCategory}
                onValueChange={(value: DowntimeComponentCategory) => setQuickCategory(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="application">Application</SelectItem>
                  <SelectItem value="network">Network</SelectItem>
                  <SelectItem value="utility">Utility</SelectItem>
                  <SelectItem value="infrastructure">Infrastructure</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="operational_service">Operational Service</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={createMissingComponent}>
                Create & Select
              </Button>
            </div>
          </div>

          <ComponentMultiSelect
            label="Affected components"
            components={components}
            selectedIds={affectedIds}
            onChange={setAffectedIds}
            excludeIds={sourceIds}
            suggestedIds={suggestedIds}
            helperText="Dependency suggestions are preselected and can be edited before saving."
          />

          <Separator />

          <div>
            <Label>Additional Details</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Logging..." : "Log Downtime Event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
