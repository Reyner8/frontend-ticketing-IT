import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface DowntimeChartsProps {
  monthlyData: Array<{
    month: string;
    planned: number;
    unplanned: number;
    incidents: number;
  }>;
  impactData: Array<{ name: string; value: number; color: string }>;
  systemsData: Array<{ name: string; incidents: number; totalDuration?: number }>;
  hideTrend?: boolean;
}

export function DowntimeCharts({
  monthlyData,
  impactData,
  systemsData,
  hideTrend = false,
}: DowntimeChartsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {!hideTrend && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Downtime Trends</CardTitle>
              <CardDescription>Monthly planned vs unplanned downtime (hours)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="planned"
                    stackId="1"
                    stroke="#4ECDC4"
                    fill="#4ECDC4"
                    name="Planned"
                  />
                  <Area
                    type="monotone"
                    dataKey="unplanned"
                    stackId="2"
                    stroke="#FF6B6B"
                    fill="#FF6B6B"
                    name="Unplanned"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Incident Frequency</CardTitle>
              <CardDescription>Number of incidents per month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="incidents"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="Incidents"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Impact Distribution</CardTitle>
          <CardDescription>Downtime incidents by impact level</CardDescription>
        </CardHeader>
        <CardContent>
          {impactData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-16 text-center">No impact data</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={impactData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {impactData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Most Frequent / Affected Components</CardTitle>
          <CardDescription>Components with highest incident counts in the filtered period</CardDescription>
        </CardHeader>
        <CardContent>
          {systemsData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-16 text-center">No component data</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={systemsData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="incidents" fill="#8884d8" name="Incidents" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
