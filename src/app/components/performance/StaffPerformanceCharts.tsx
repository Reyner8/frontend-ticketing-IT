import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  METRIC_COLORS,
  RESOURCE_COLORS,
  RESOURCE_LABELS,
  TEAM_PALETTE,
} from "../../lib/performance-colors";
import type { StaffPerformanceMetrics, StaffPerformanceReport } from "../../types";

export const EMPTY_METRICS: StaffPerformanceMetrics = { completed: 0, open: 0, overdue: 0 };

export function EmptyChartState({ text }: { text: string }) {
  return (
    <p className="py-8 text-center text-sm italic text-muted-foreground">{text}</p>
  );
}

/** Small donut showing completed / open / overdue composition of one metrics object. */
export function StatusDonut({
  metrics,
  size = 96,
  showLegend = false,
}: {
  metrics: StaffPerformanceMetrics;
  size?: number;
  showLegend?: boolean;
}) {
  const total = metrics.completed + metrics.open + metrics.overdue;
  const data = [
    { key: "completed", label: "Completed", value: metrics.completed, color: METRIC_COLORS.completed },
    { key: "open", label: "Open", value: metrics.open, color: METRIC_COLORS.open },
    { key: "overdue", label: "Overdue", value: metrics.overdue, color: METRIC_COLORS.overdue },
  ];
  const hasData = total > 0;
  const multiSlice = data.filter((d) => d.value > 0).length > 1;

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius={size * 0.32}
                outerRadius={size * 0.5}
                paddingAngle={multiSlice ? 3 : 0}
                strokeWidth={0}
                isAnimationActive={false}
              >
                {data.map((d) => (
                  <Cell key={d.key} fill={d.value > 0 ? d.color : "transparent"} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [String(value), name]} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full rounded-full border-2 border-dashed border-muted" />
        )}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold leading-none">{total}</span>
          <span className="text-[10px] text-muted-foreground">total</span>
        </div>
      </div>
      {showLegend && (
        <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
          {data.map((d) => (
            <li key={d.key} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: d.color }}
              />
              <span className="truncate text-muted-foreground">{d.label}</span>
              <span className="ml-auto font-medium tabular-nums">{d.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** KPI card: icon + title + completion badge + status donut for one resource section. */
export function MetricSummaryCard({
  title,
  icon: Icon,
  accent,
  metrics,
  size = 88,
}: {
  title: string;
  icon: LucideIcon;
  accent: string;
  metrics: StaffPerformanceMetrics;
  size?: number;
}) {
  const total = metrics.completed + metrics.open + metrics.overdue;
  const completionRate = total > 0 ? Math.round((metrics.completed / total) * 100) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${accent}1a`, color: accent }}
            >
              <Icon className="h-4 w-4" />
            </span>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          {completionRate !== null && (
            <Badge variant="secondary" className="font-normal">
              {completionRate}% completed
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <EmptyChartState text="Belum ada data di periode ini." />
        ) : (
          <StatusDonut metrics={metrics} size={size} showLegend />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Bar chart comparing staff.
 * - resource omitted: completed items per staff, grouped by resource (tickets/errors/features).
 * - resource set: completed/open/overdue per staff for that single resource.
 */
export function StaffBarChart({
  report,
  resource,
}: {
  report: StaffPerformanceReport;
  resource?: "tickets" | "errors" | "features";
}) {
  const data = report.byUser.map((u) => {
    const base = { name: u.name.split(" ")[0] || u.name, fullName: u.name };
    if (resource) {
      const m = u[resource] ?? EMPTY_METRICS;
      return { ...base, completed: m.completed, open: m.open, overdue: m.overdue };
    }
    return {
      ...base,
      tickets: u.tickets?.completed ?? 0,
      errors: u.errors?.completed ?? 0,
      features: u.features?.completed ?? 0,
    };
  });

  if (data.length === 0) {
    return <EmptyChartState text="Belum ada data staf untuk periode ini." />;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            labelFormatter={(_, payload) =>
              String((payload?.[0]?.payload as { fullName?: string })?.fullName ?? "")
            }
          />
          <Legend />
          {resource ? (
            <>
              <Bar dataKey="completed" name="Completed" fill={METRIC_COLORS.completed} radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Bar dataKey="open" name="Open" fill={METRIC_COLORS.open} radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Bar dataKey="overdue" name="Overdue" fill={METRIC_COLORS.overdue} radius={[4, 4, 0, 0]} maxBarSize={36} />
            </>
          ) : (
            <>
              <Bar dataKey="tickets" name="Tickets" fill={RESOURCE_COLORS.tickets} radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Bar dataKey="errors" name="Errors" fill={RESOURCE_COLORS.errors} radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Bar dataKey="features" name="Features" fill={RESOURCE_COLORS.features} radius={[4, 4, 0, 0]} maxBarSize={36} />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut: how completed work is distributed across Tickets / Error Reports / Feature Requests. */
export function ResourceCompletionDonut({ report }: { report: StaffPerformanceReport }) {
  const raw = [
    { key: "tickets", label: RESOURCE_LABELS.tickets, value: report.summary.tickets?.completed ?? 0, color: RESOURCE_COLORS.tickets },
    { key: "errors", label: RESOURCE_LABELS.errors, value: report.summary.errors?.completed ?? 0, color: RESOURCE_COLORS.errors },
    { key: "features", label: RESOURCE_LABELS.features, value: report.summary.features?.completed ?? 0, color: RESOURCE_COLORS.features },
  ];
  const total = raw.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return <EmptyChartState text="Belum ada item yang selesai di periode ini." />;
  }

  return (
    <div className="flex w-full items-center justify-center gap-6">
      <div className="relative h-36 w-36 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={raw}
              dataKey="value"
              nameKey="label"
              innerRadius={44}
              outerRadius={64}
              paddingAngle={3}
              strokeWidth={0}
              isAnimationActive={false}
            >
              {raw.map((d) => (
                <Cell key={d.key} fill={d.value > 0 ? d.color : "transparent"} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number, name: string) => [String(value), name]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold leading-none">{total}</span>
          <span className="text-[10px] text-muted-foreground">completed</span>
        </div>
      </div>
      <ul className="space-y-1.5 text-sm">
        {raw.map((d) => (
          <li key={d.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-muted-foreground">{d.label}</span>
            <span className="ml-auto font-medium tabular-nums">
              {d.value}
              <span className="ml-1 text-xs text-muted-foreground">
                ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Donut: how completed work is distributed across teams (admin/team lead view). */
export function TeamCompletionDonut({ report }: { report: StaffPerformanceReport }) {
  const raw = report.byTeam.map((t, i) => ({
    key: t.team ?? `team-${i}`,
    label: t.teamLabel,
    value: (t.tickets?.completed ?? 0) + (t.errors?.completed ?? 0) + (t.features?.completed ?? 0),
    color: TEAM_PALETTE[i % TEAM_PALETTE.length],
  }));
  const total = raw.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return <EmptyChartState text="Belum ada item yang selesai di periode ini." />;
  }

  return (
    <div className="relative h-40 w-40 flex-shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={raw}
            dataKey="value"
            nameKey="label"
            innerRadius={48}
            outerRadius={70}
            paddingAngle={3}
            strokeWidth={0}
            isAnimationActive={false}
          >
            {raw.map((d) => (
              <Cell key={d.key} fill={d.value > 0 ? d.color : "transparent"} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number, name: string) => [String(value), name]} />
          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-4">
        <span className="text-xl font-bold leading-none">{total}</span>
        <span className="text-[10px] text-muted-foreground">completed</span>
      </div>
    </div>
  );
}
