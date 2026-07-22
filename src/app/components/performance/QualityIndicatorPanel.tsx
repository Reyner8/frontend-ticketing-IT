import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { useActiveApplications } from "../../hooks/useActiveApplications";
import { downloadServerExport, fetchQualityIndicators, fetchUsers } from "../../lib/api/services";
import type { QualityIndicatorReport, User } from "../../types";
import { METRIC_COLORS } from "../../lib/performance-colors";
import { EmptyChartState } from "./StaffPerformanceCharts";

const TOTAL_COLOR = "#2563eb";

export function QualityIndicatorPanel({ canManage }: { canManage: boolean }) {
  const { applications } = useActiveApplications();
  const [application, setApplication] = useState("rme");
  const [userId, setUserId] = useState<string>("all");
  const [staff, setStaff] = useState<User[]>([]);
  const [report, setReport] = useState<QualityIndicatorReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!canManage) return;
    fetchUsers()
      .then((list) =>
        setStaff(list.filter((u) => u.isActive && (u.role === "it_staff" || u.role === "team_lead")))
      )
      .catch(() => setStaff([]));
  }, [canManage]);

  const load = async () => {
    setLoading(true);
    try {
      const params: { application: string; user_id?: string } = { application };
      if (canManage && userId !== "all") params.user_id = userId;
      const data = await fetchQualityIndicators(params);
      setReport(data);
    } catch {
      setReport(null);
      toast.error("Failed to load quality indicator report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on filter change only
  }, [application, userId]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = { application };
      if (canManage && userId !== "all") params.user_id = userId;
      await downloadServerExport("quality-indicators", "csv", params);
      toast.success("CSV download started");
    } catch {
      toast.error("Failed to download report");
    } finally {
      setExporting(false);
    }
  };

  const semesters = report?.semesters ?? [];
  const latest = semesters[semesters.length - 1];
  const chartData = semesters.map((s) => ({
    label: `S${s.semester} ${s.year}`,
    total: s.total,
    completed: s.completed,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1 min-w-[200px]">
            <Label>Application</Label>
            <Select value={application} onValueChange={setApplication}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {applications.length === 0 && <SelectItem value="rme">RME</SelectItem>}
                {applications.map((a) => (
                  <SelectItem key={a.id} value={a.code}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {canManage && (
            <div className="space-y-1 min-w-[200px]">
              <Label>Staff</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All staff</SelectItem>
                  {staff.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting || loading}>
          <Download className="mr-2 h-4 w-4" />
          Download CSV
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : semesters.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyChartState
              text={`Belum ada Feature Request untuk aplikasi ${report?.application.label ?? application} pada filter ini.`}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Total requests</CardTitle>
                <CardDescription>Kumulatif s.d. {latest?.label}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{latest?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground">{report?.application.label}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Completed</CardTitle>
                <CardDescription>Kumulatif s.d. {latest?.label}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{latest?.completed ?? 0}</p>
                <p className="text-xs text-muted-foreground">Status Completed / Post-Implementation Review</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Completion rate</CardTitle>
                <CardDescription>Kumulatif s.d. {latest?.label}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{latest?.completionRate ?? 0}%</p>
                <p className="text-xs text-muted-foreground">Completed dibagi total kumulatif</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Total vs Completed per semester</CardTitle>
              <CardDescription>
                Nilai kumulatif (tidak reset tiap tahun) — tiap semester menampilkan total sejak data pertama.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" name="Total" fill={TOTAL_COLOR} radius={[4, 4, 0, 0]} maxBarSize={48} />
                    <Bar
                      dataKey="completed"
                      name="Completed"
                      fill={METRIC_COLORS.completed}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Semester detail</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Semester</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Completion rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {semesters.map((s) => (
                    <TableRow key={`${s.year}-${s.semester}`}>
                      <TableCell className="font-medium">{s.label}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.period.from} → {s.period.to}
                      </TableCell>
                      <TableCell>{s.total}</TableCell>
                      <TableCell className="text-green-600 font-medium">{s.completed}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{s.completionRate}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
