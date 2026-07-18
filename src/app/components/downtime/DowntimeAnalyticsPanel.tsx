import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { toast } from "sonner";
import { ApiError } from "../../lib/api/client";
import {
  downloadServerExport,
  fetchDowntimeAnalytics,
  fetchDowntimeComponents,
  fetchDowntimeLocations,
} from "../../lib/api/services";
import { DowntimeAnalyticsSummary, DowntimeComponent, DowntimeLocation } from "../../types";
import { formatDuration } from "../../lib/downtime-utils";
import { DowntimeCharts } from "./DowntimeCharts";
import { Download } from "lucide-react";

function firstError(err: unknown): string {
  if (err instanceof ApiError) {
    const first = err.errors ? Object.values(err.errors)[0]?.[0] : undefined;
    return first || err.message;
  }
  return err instanceof Error ? err.message : "Request failed";
}

function monthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface DowntimeAnalyticsPanelProps {
  mode?: "analytics" | "reports";
}

export function DowntimeAnalyticsPanel({ mode = "analytics" }: DowntimeAnalyticsPanelProps) {
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(today());
  const [locationId, setLocationId] = useState<string>("all");
  const [componentId, setComponentId] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [locations, setLocations] = useState<DowntimeLocation[]>([]);
  const [components, setComponents] = useState<DowntimeComponent[]>([]);
  const [analytics, setAnalytics] = useState<DowntimeAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadMasters = async () => {
    try {
      const [locRes, compRes] = await Promise.all([
        fetchDowntimeLocations({ per_page: 100, is_active: true }),
        fetchDowntimeComponents({ per_page: 100, is_active: true }),
      ]);
      setLocations(locRes.locations);
      setComponents(compRes.components);
    } catch (err) {
      toast.error(firstError(err));
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        from_date: fromDate,
        to_date: toDate,
      };
      if (locationId !== "all") params.location_id = Number(locationId);
      if (componentId !== "all") params.component_id = Number(componentId);
      if (category !== "all") params.category = category;
      const data = await fetchDowntimeAnalytics(params);
      setAnalytics(data);
    } catch (err) {
      setAnalytics(null);
      toast.error(firstError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasters();
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const exportData = async (format: "csv" | "excel" | "pdf") => {
    setExporting(true);
    try {
      const params: Record<string, string | number> = {
        from_date: fromDate,
        to_date: toDate,
      };
      if (locationId !== "all") params.location_id = Number(locationId);
      if (componentId !== "all") params.component_id = Number(componentId);
      if (category !== "all") params.category = category;
      const { blob, filename } = await downloadServerExport("downtimes", format, params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `downtimes-export.${format === "excel" ? "xls" : format === "pdf" ? "html" : "csv"}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (err) {
      toast.error(firstError(err));
    } finally {
      setExporting(false);
    }
  };

  const summary = analytics?.summary;
  const impactData =
    analytics?.impactBreakdown.map((row, index) => ({
      name: row.impact,
      value: row.count,
      color: ["#00C49F", "#FFBB28", "#FF8042", "#FF6B6B"][index % 4],
    })) ?? [];
  const systemsData =
    analytics?.mostAffectedComponents.map((row) => ({
      name: row.name,
      incidents: row.incidentCount,
      totalDuration: row.totalMinutes,
    })) ?? [];
  const sourceData =
    analytics?.mostFrequentSources.map((row) => ({
      name: row.name,
      incidents: row.incidentCount,
      totalDuration: row.totalMinutes,
    })) ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "reports" ? "Downtime Reports" : "Analytics Filters"}</CardTitle>
          <CardDescription>
            Filtered by selected period. Uptime is reported per component/category, not as one global percentage.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div>
            <Label>From</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div>
            <Label>Location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Component</Label>
            <Select value={componentId} onValueChange={setComponentId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All components</SelectItem>
                {components.map((component) => (
                  <SelectItem key={component.id} value={component.id}>
                    {component.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="application">Application</SelectItem>
                <SelectItem value="network">Network</SelectItem>
                <SelectItem value="utility">Utility</SelectItem>
                <SelectItem value="infrastructure">Infrastructure</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="operational_service">Operational Service</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-5 flex gap-2">
            <Button onClick={loadAnalytics} disabled={loading}>
              {loading ? "Loading..." : "Apply Filters"}
            </Button>
            {mode === "reports" && (
              <>
                <Button variant="outline" onClick={() => exportData("csv")} disabled={exporting}>
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </Button>
                <Button variant="outline" onClick={() => exportData("excel")} disabled={exporting}>
                  <Download className="mr-2 h-4 w-4" />
                  Excel
                </Button>
                <Button variant="outline" onClick={() => exportData("pdf")} disabled={exporting}>
                  <Download className="mr-2 h-4 w-4" />
                  PDF/HTML
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.incidentCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {summary?.plannedCount ?? 0} planned / {summary?.unplannedCount ?? 0} unplanned
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Downtime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(summary?.totalDowntimeMinutes ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg {formatDuration(summary?.averageDowntimeMinutes ?? 0)} / incident
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Affected Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalAffectedUsers ?? 0}</div>
            <p className="text-xs text-muted-foreground">Across filtered events</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Estimated Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(summary?.totalEstimatedCost ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.ongoingCount ?? 0} still ongoing
            </p>
          </CardContent>
        </Card>
      </div>

      {mode === "analytics" && (
        <DowntimeCharts
          monthlyData={[]}
          impactData={impactData}
          systemsData={systemsData.length ? systemsData : sourceData}
          hideTrend
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Component Uptime (direct sources)</CardTitle>
            <CardDescription>Per-component availability for the selected period</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Incidents</TableHead>
                  <TableHead>Downtime</TableHead>
                  <TableHead>Uptime</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(analytics?.componentUptime ?? []).slice(0, 10).map((row) => (
                  <TableRow key={row.componentId}>
                    <TableCell>
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {row.category.replaceAll("_", " ")}
                      </div>
                    </TableCell>
                    <TableCell>{row.incidentCount}</TableCell>
                    <TableCell>{formatDuration(row.totalMinutes)}</TableCell>
                    <TableCell>
                      <Badge className="text-green-700 bg-green-100">{row.uptimePercent}%</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(analytics?.componentUptime ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>No source-component downtime in this period.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category Uptime</CardTitle>
            <CardDescription>Grouped by direct-source category</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Incidents</TableHead>
                  <TableHead>Downtime</TableHead>
                  <TableHead>Uptime</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(analytics?.categoryUptime ?? []).map((row) => (
                  <TableRow key={row.category}>
                    <TableCell className="capitalize">{row.category.replaceAll("_", " ")}</TableCell>
                    <TableCell>{row.incidentCount}</TableCell>
                    <TableCell>{formatDuration(row.totalMinutes)}</TableCell>
                    <TableCell>
                      <Badge className="text-green-700 bg-green-100">{row.uptimePercent}%</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(analytics?.categoryUptime ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>No category data in this period.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Location Frequency</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead>Incidents</TableHead>
                <TableHead>Total Downtime</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(analytics?.locationFrequency ?? []).map((row) => (
                <TableRow key={`${row.locationId ?? "none"}-${row.locationName}`}>
                  <TableCell>{row.locationName}</TableCell>
                  <TableCell>{row.incidentCount}</TableCell>
                  <TableCell>{formatDuration(row.totalMinutes)}</TableCell>
                </TableRow>
              ))}
              {(analytics?.locationFrequency ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>No location data in this period.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
