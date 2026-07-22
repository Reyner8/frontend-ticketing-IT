import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth, startOfWeek } from "date-fns";
import { toast } from "sonner";
import {
  Award,
  Bug,
  Download,
  LayoutGrid,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { useApp } from "../lib/store";
import {
  downloadServerExport,
  fetchStaffPerformance,
} from "../lib/api/services";
import type {
  StaffPerformanceReport,
  StaffPerformanceSection,
  TeamType,
} from "../types";
import { labelTeam } from "../lib/ui-labels";
import { RESOURCE_COLORS } from "../lib/performance-colors";
import {
  EMPTY_METRICS,
  MetricSummaryCard,
  ResourceCompletionDonut,
  StaffBarChart,
  TeamCompletionDonut,
} from "./performance/StaffPerformanceCharts";
import { QualityIndicatorPanel } from "./performance/QualityIndicatorPanel";

type TabId = "overview" | "tickets" | "errors" | "features" | "staff" | "quality";

const TAB_TO_SECTION: Record<TabId, StaffPerformanceSection> = {
  overview: "all",
  tickets: "tickets",
  errors: "errors",
  features: "features",
  staff: "all",
  quality: "all",
};

const SECTION_META = {
  tickets: { label: "Tickets", icon: Ticket, color: RESOURCE_COLORS.tickets },
  errors: { label: "Error Reports", icon: Bug, color: RESOURCE_COLORS.errors },
  features: { label: "Feature Requests", icon: Sparkles, color: RESOURCE_COLORS.features },
} as const;

type DatePreset = "today" | "week" | "month";

export function TeamPerformance({
  initialTab = "overview",
}: {
  initialTab?: string;
}) {
  const { state } = useApp();
  const currentUser = state.currentUser;
  const role = currentUser?.role;
  const isStaff = role === "it_staff";
  const canManage = role === "admin" || role === "team_lead";

  const normalizeTab = (value: string): TabId => {
    if (
      value === "tickets" ||
      value === "errors" ||
      value === "features" ||
      value === "staff" ||
      value === "quality"
    ) {
      return value;
    }
    // legacy views
    if (value === "reports" || value === "teams" || value === "individual") {
      return value === "individual" ? "staff" : "overview";
    }
    return "overview";
  };

  const [activeTab, setActiveTab] = useState<TabId>(normalizeTab(initialTab));
  const [from, setFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [preset, setPreset] = useState<DatePreset>("month");
  const [team, setTeam] = useState<TeamType | "all">("all");
  const [report, setReport] = useState<StaffPerformanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setActiveTab(normalizeTab(initialTab));
  }, [initialTab]);

  const load = async (section: StaffPerformanceSection = TAB_TO_SECTION[activeTab]) => {
    if (!canManage && !isStaff) {
      setReport(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params: {
        from: string;
        to: string;
        team?: string;
        section: StaffPerformanceSection;
      } = { from, to, section };
      if (canManage && team !== "all") params.team = team;
      const data = await fetchStaffPerformance(params);
      setReport(data);
    } catch {
      setReport(null);
      toast.error("Failed to load performance report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(TAB_TO_SECTION[activeTab]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload via Apply button / tab change handled
  }, [activeTab, currentUser?.id]);

  const handleTabChange = (value: string) => {
    const tab = normalizeTab(value);
    setActiveTab(tab);
  };

  const applyPreset = (value: DatePreset) => {
    setPreset(value);
    const now = new Date();
    const start =
      value === "today"
        ? now
        : value === "week"
          ? startOfWeek(now, { weekStartsOn: 1 })
          : startOfMonth(now);
    setFrom(format(start, "yyyy-MM-dd"));
    setTo(format(now, "yyyy-MM-dd"));
  };

  const subtitle = useMemo(() => {
    if (isStaff) return "Performa Anda: Tickets, Error Reports, dan Feature Requests.";
    return "Laporan sederhana per staf dan per bagian (Tickets / Errors / Features).";
  }, [isStaff]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = {
        from,
        to,
        section: TAB_TO_SECTION[activeTab],
      };
      if (canManage && team !== "all") params.team = team;
      await downloadServerExport("staff-performance", "csv", params);
      toast.success("CSV download started");
    } catch {
      toast.error("Failed to download report");
    } finally {
      setExporting(false);
    }
  };

  if (!canManage && !isStaff) {
    return (
      <div className="flex-1 p-6">
        <h2 className="text-2xl font-semibold">Team Performance</h2>
        <p className="text-muted-foreground mt-2">Akses dibatasi untuk admin, team lead, dan staf IT.</p>
      </div>
    );
  }

  const summary = report?.summary;
  const sectionMetrics = (key: "tickets" | "errors" | "features") =>
    summary?.[key] ?? EMPTY_METRICS;
  const multiStaff = (report?.byUser.length ?? 0) > 1;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Team Performance</h2>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting || loading}>
          <Download className="mr-2 h-4 w-4" />
          Download CSV
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex gap-1">
            {(["today", "week", "month"] as const).map((p) => (
              <Button
                key={p}
                type="button"
                size="sm"
                variant={preset === p ? "default" : "outline"}
                onClick={() => applyPreset(p)}
              >
                {p === "today" ? "Today" : p === "week" ? "This week" : "This month"}
              </Button>
            ))}
          </div>
          <div className="space-y-1">
            <Label htmlFor="from">From</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to">To</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {canManage && (
            <div className="space-y-1 min-w-[180px]">
              <Label>Team</Label>
              <Select
                value={team}
                onValueChange={(v) => setTeam(v as TeamType | "all")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All teams</SelectItem>
                  <SelectItem value="programmer">Software Engineer</SelectItem>
                  <SelectItem value="network">Network Engineer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={() => load(TAB_TO_SECTION[activeTab])} disabled={loading}>
            Apply
          </Button>
          {report && (
            <Badge variant="secondary" className="h-9 px-3">
              {report.period.from} → {report.period.to}
            </Badge>
          )}
        </CardContent>
      </Card>

      {loading || !report ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="overview" className="gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="tickets" className="gap-1.5">
              <Ticket className="h-3.5 w-3.5" /> Tickets
            </TabsTrigger>
            <TabsTrigger value="errors" className="gap-1.5">
              <Bug className="h-3.5 w-3.5" /> Error Reports
            </TabsTrigger>
            <TabsTrigger value="features" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Feature Requests
            </TabsTrigger>
            <TabsTrigger value="staff" className="gap-1.5">
              <Users className="h-3.5 w-3.5" /> By Staff
            </TabsTrigger>
            <TabsTrigger value="quality" className="gap-1.5">
              <Award className="h-3.5 w-3.5" /> Quality Indicator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <MetricSummaryCard title="Tickets" icon={Ticket} accent={RESOURCE_COLORS.tickets} metrics={sectionMetrics("tickets")} />
              <MetricSummaryCard title="Error Reports" icon={Bug} accent={RESOURCE_COLORS.errors} metrics={sectionMetrics("errors")} />
              <MetricSummaryCard title="Feature Requests" icon={Sparkles} accent={RESOURCE_COLORS.features} metrics={sectionMetrics("features")} />
            </div>

            <div className={multiStaff ? "grid gap-4 lg:grid-cols-2" : "grid gap-4"}>
              {multiStaff && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Completed items per staff</CardTitle>
                    <CardDescription>
                      Perbandingan Tickets, Error Reports, dan Feature Requests yang diselesaikan.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <StaffBarChart report={report} />
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Completed work distribution</CardTitle>
                  <CardDescription>Proporsi item selesai antar bagian.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-4">
                  <ResourceCompletionDonut report={report} />
                </CardContent>
              </Card>
            </div>

            {canManage && report.byTeam.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Team summary</CardTitle>
                  <CardDescription>Perbandingan penyelesaian antar tim.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-[176px_1fr] lg:items-center">
                  <div className="flex justify-center">
                    <TeamCompletionDonut report={report} />
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team</TableHead>
                        <TableHead>Tickets completed</TableHead>
                        <TableHead>Errors completed</TableHead>
                        <TableHead>Features completed</TableHead>
                        <TableHead>Overdue (total)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.byTeam.map((t) => (
                        <TableRow key={t.team ?? "none"}>
                          <TableCell className="font-medium">{t.teamLabel}</TableCell>
                          <TableCell>{t.tickets?.completed ?? 0}</TableCell>
                          <TableCell>{t.errors?.completed ?? 0}</TableCell>
                          <TableCell>{t.features?.completed ?? 0}</TableCell>
                          <TableCell className="text-red-600 font-medium">
                            {(t.tickets?.overdue ?? 0) +
                              (t.errors?.overdue ?? 0) +
                              (t.features?.overdue ?? 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {(["tickets", "errors", "features"] as const).map((section) => {
            const meta = SECTION_META[section];
            return (
              <TabsContent key={section} value={section} className="mt-4 space-y-4">
                {multiStaff ? (
                  <div className="grid gap-4 lg:grid-cols-[320px_1fr] lg:items-start">
                    <MetricSummaryCard title={meta.label} icon={meta.icon} accent={meta.color} metrics={sectionMetrics(section)} />
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">By staff</CardTitle>
                        <CardDescription>
                          Selesai, terbuka, dan yang melewati due date
                          {section === "features" ? " (berdasarkan due date Feature Request)." : "."}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <StaffBarChart report={report} resource={section} />
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="max-w-md">
                    <MetricSummaryCard title={meta.label} icon={meta.icon} accent={meta.color} metrics={sectionMetrics(section)} size={112} />
                  </div>
                )}
              </TabsContent>
            );
          })}

          <TabsContent value="staff" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Staff detail</CardTitle>
                <CardDescription>
                  {isStaff
                    ? "Ringkasan performa Anda di ketiga bagian."
                    : "Semua staf aktif (IT staff / team lead) dalam filter yang dipilih."}
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead
                        colSpan={3}
                        className="text-center"
                        style={{ backgroundColor: `${RESOURCE_COLORS.tickets}0d` }}
                      >
                        Tickets
                      </TableHead>
                      <TableHead
                        colSpan={3}
                        className="text-center"
                        style={{ backgroundColor: `${RESOURCE_COLORS.errors}0d` }}
                      >
                        Errors
                      </TableHead>
                      <TableHead
                        colSpan={3}
                        className="text-center"
                        style={{ backgroundColor: `${RESOURCE_COLORS.features}0d` }}
                      >
                        Features
                      </TableHead>
                    </TableRow>
                    <TableRow>
                      <TableHead />
                      <TableHead />
                      {["S", "T", "D", "S", "T", "D", "S", "T", "D"].map((h, i) => (
                        <TableHead key={`${h}-${i}`} className="text-xs text-muted-foreground">
                          {h === "S" ? "Completed" : h === "T" ? "Open" : "Overdue"}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.byUser.map((u) => {
                      const overdueTotal =
                        (u.tickets?.overdue ?? 0) + (u.errors?.overdue ?? 0) + (u.features?.overdue ?? 0);
                      return (
                        <TableRow key={u.userId} className={overdueTotal > 0 ? "bg-red-50/60" : undefined}>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell>{u.teamLabel ?? (u.team ? labelTeam(u.team) : "—")}</TableCell>
                          <TableCell className="text-green-600 font-medium">{u.tickets?.completed ?? 0}</TableCell>
                          <TableCell>{u.tickets?.open ?? 0}</TableCell>
                          <TableCell className="text-red-600 font-medium">{u.tickets?.overdue ?? 0}</TableCell>
                          <TableCell className="text-green-600 font-medium">{u.errors?.completed ?? 0}</TableCell>
                          <TableCell>{u.errors?.open ?? 0}</TableCell>
                          <TableCell className="text-red-600 font-medium">{u.errors?.overdue ?? 0}</TableCell>
                          <TableCell className="text-green-600 font-medium">{u.features?.completed ?? 0}</TableCell>
                          <TableCell>{u.features?.open ?? 0}</TableCell>
                          <TableCell className="text-red-600 font-medium">{u.features?.overdue ?? 0}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quality" className="mt-4">
            <QualityIndicatorPanel canManage={canManage} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
