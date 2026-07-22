import { useEffect, useState } from "react";
import { format, startOfMonth } from "date-fns";
import { Activity, Bug, Sparkles, Ticket } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useApp } from "../lib/store";
import {
  fetchStaffPerformance,
  fetchDowntimeRecords,
} from "../lib/api/services";
import type { StaffPerformanceReport, DowntimeRecord } from "../types";
import { RESOURCE_COLORS } from "../lib/performance-colors";
import {
  EMPTY_METRICS,
  MetricSummaryCard,
  ResourceCompletionDonut,
  StaffBarChart,
} from "./performance/StaffPerformanceCharts";

export function Dashboard({
  onNavigate,
}: {
  onNavigate?: (path: string) => void;
}) {
  const { state } = useApp();
  const currentUser = state.currentUser;
  const role = currentUser?.role;
  const canPerf = role === "admin" || role === "team_lead" || role === "it_staff";

  const [report, setReport] = useState<StaffPerformanceReport | null>(null);
  const [downtimes, setDowntimes] = useState<DowntimeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const from = format(startOfMonth(new Date()), "yyyy-MM-dd");
        const to = format(new Date(), "yyyy-MM-dd");
        const [perf, dt] = await Promise.all([
          canPerf
            ? fetchStaffPerformance({ from, to, section: "all" })
            : Promise.resolve(null),
          fetchDowntimeRecords({ per_page: 20 }).catch(() => ({ records: [] as DowntimeRecord[] })),
        ]);
        setReport(perf);
        setDowntimes((dt.records ?? []).filter((d) => d.status === "ongoing"));
      } catch {
        setReport(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [canPerf, currentUser?.id]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const go = (path: string) => onNavigate?.(path);

  const greeting =
    role === "it_staff"
      ? "Performa Anda bulan ini"
      : role === "reporter"
        ? "Ringkasan pelaporan"
        : "Ringkasan performa staf";

  const multiStaff = (report?.byUser.length ?? 0) > 1;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          {greeting}
          {report ? ` · ${report.period.from} → ${report.period.to}` : ""}
        </p>
      </div>

      {!canPerf && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Dashboard performa staf tersedia untuk admin, team lead, dan staf IT. Reporter dapat
            memantau tiket melalui menu Tickets.
          </CardContent>
        </Card>
      )}

      {canPerf && report && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricSummaryCard
              title="Tickets"
              icon={Ticket}
              accent={RESOURCE_COLORS.tickets}
              metrics={report.summary.tickets ?? EMPTY_METRICS}
              size={72}
            />
            <MetricSummaryCard
              title="Error Reports"
              icon={Bug}
              accent={RESOURCE_COLORS.errors}
              metrics={report.summary.errors ?? EMPTY_METRICS}
              size={72}
            />
            <MetricSummaryCard
              title="Feature Requests"
              icon={Sparkles}
              accent={RESOURCE_COLORS.features}
              metrics={report.summary.features ?? EMPTY_METRICS}
              size={72}
            />
          </div>

          <div className={multiStaff ? "grid gap-4 lg:grid-cols-2" : "grid gap-4"}>
            {multiStaff && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Completed items per staff</CardTitle>
                  <CardDescription>
                    Perbandingan Tickets, Errors, dan Feature Requests yang diselesaikan.
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
                <CardDescription>
                  {role === "it_staff"
                    ? "Proporsi pekerjaan Anda yang selesai per bagian."
                    : "Proporsi item selesai antar bagian."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-4">
                <ResourceCompletionDonut report={report} />
              </CardContent>
            </Card>
          </div>

          {onNavigate && (
            <Button variant="outline" onClick={() => go("/team-performance?view=overview")}>
              Open Team Performance
            </Button>
          )}
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" /> Active downtime
          </CardTitle>
          <CardDescription>Event yang masih berlangsung.</CardDescription>
        </CardHeader>
        <CardContent>
          {downtimes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada downtime aktif.</p>
          ) : (
            <ul className="space-y-2">
              {downtimes.slice(0, 5).map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <span className="truncate font-medium">{d.title}</span>
                  <Badge variant="destructive">{d.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
