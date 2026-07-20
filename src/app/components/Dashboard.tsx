import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useApp } from '../lib/store';
import { fetchDashboardData, fetchUsers, fetchGlobalActivityLogs } from '../lib/api/services';
import { Ticket, DowntimeRecord, DashboardStats, TeamWorkload, ActivityLogEntry, User } from '../types';
import { AlertTriangle, CheckCircle, Clock, TrendingUp, Users, Target, Star, Activity } from "lucide-react";

export function Dashboard() {
  const { state } = useApp();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [downtimes, setDowntimes] = useState<DowntimeRecord[]>([]);
  const [teamWorkload, setTeamWorkload] = useState<TeamWorkload[]>([]);
  const [globalActivity, setGlobalActivity] = useState<ActivityLogEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  const currentUser = state.currentUser;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchDashboardData();
        setStats(data.stats);
        setTickets(data.tickets);
        setDowntimes(data.downtimes);
        setTeamWorkload(data.teamWorkload);
        fetchGlobalActivityLogs({ per_page: 20 })
          .then(setGlobalActivity)
          .catch(() => setGlobalActivity([]));
        if (currentUser?.role === 'admin' || currentUser?.role === 'team_lead') {
          fetchUsers().then(setUsers).catch(() => setUsers([]));
        }
      } catch {
        setStats({
          totalTickets: 0, openTickets: 0, resolvedToday: 0, overdueTickets: 0,
          averageResolutionTime: 0, slaCompliance: 0, downtimeHours: 0,
          activeDowntimes: 0, criticalTickets: 0, userSatisfactionScore: 0,
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser?.role]);
  
  if (loading || !stats) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const getUserSpecificData = () => {
    if (!currentUser) return { tickets: [] as Ticket[], downtimes: [] as DowntimeRecord[] };
    
    switch (currentUser.role) {
      case 'admin':
        return { tickets, downtimes };
      case 'team_lead':
        return { 
          tickets: tickets.filter(t => t.assignedTeam === currentUser.team),
          downtimes 
        };
      case 'it_staff':
        return { 
          tickets: tickets.filter(t => t.assignedToId === currentUser.id),
          downtimes: downtimes.filter(d => d.reportedBy === currentUser.id) 
        };
      case 'reporter':
        return { 
          tickets: tickets.filter(t => t.reporterId === currentUser.id),
          downtimes: [] 
        };
      default:
        return { tickets: [], downtimes: [] };
    }
  };

  const userSpecificData = getUserSpecificData();
  const recentTickets = userSpecificData.tickets.slice(0, 5);

  const recentActivity =
    globalActivity.length > 0
      ? globalActivity.map((entry) => ({
          type: entry.action as string,
          message: entry.loggableId
            ? `[${entry.loggableType ?? "Resource"} ${entry.loggableId}] ${entry.description}`
            : entry.description,
          time: entry.performedAt,
        }))
      : recentTickets.map((ticket) => ({
          type: 'ticket_created' as const,
          message: `${ticket.title} — ${ticket.status.replace(/_/g, ' ')}`,
          time: ticket.dateReported,
        }));
  
  const activeDowntimes = downtimes.filter(d => d.status === 'ongoing');

  const inProgressCount =
    stats.statusBreakdown?.inProgress ??
    tickets.filter((t) => t.status === 'in_progress').length;
  const resolvedCount =
    stats.statusBreakdown?.resolved ??
    tickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length;
  const otherOpen = Math.max(0, stats.openTickets - inProgressCount);

  const statusData = [
    { name: 'Open', value: otherOpen, color: '#FFBB28' },
    { name: 'In Progress', value: inProgressCount, color: '#0088FE' },
    { name: 'Resolved', value: resolvedCount, color: '#00C49F' },
    { name: 'Overdue', value: stats.overdueTickets, color: '#FF8042' },
  ].filter((d) => d.value > 0);

  const teamSlaChart = teamWorkload.map((t) => ({
    team: t.team,
    sla: t.slaCompliance,
    open: t.openTickets,
    resolved: t.resolvedTickets,
    workload: t.workloadPercentage,
  }));

  const downtimeCostThisMonth = downtimes
    .filter((d) => {
      const start = new Date(d.startTime);
      const now = new Date();
      return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
    })
    .reduce((sum, d) => sum + (d.estimatedCost ?? 0), 0);

  const insights = (() => {
    const items: { icon: 'trend' | 'warn' | 'ok'; title: string; detail: string }[] = [];
    if (teamWorkload.length === 0) {
      items.push({
        icon: 'warn',
        title: 'No workload data',
        detail: 'Generate a team workload snapshot to see performance insights.',
      });
      return items;
    }
    const bySla = [...teamWorkload].sort((a, b) => b.slaCompliance - a.slaCompliance);
    const byLoad = [...teamWorkload].sort((a, b) => b.workloadPercentage - a.workloadPercentage);
    const top = bySla[0];
    const loaded = byLoad[0];
    if (top) {
      items.push({
        icon: 'ok',
        title: 'Highest SLA',
        detail: `${top.team} leads with ${top.slaCompliance}% SLA compliance.`,
      });
    }
    if (loaded && loaded.workloadPercentage >= 70) {
      items.push({
        icon: 'warn',
        title: 'Capacity pressure',
        detail: `${loaded.team} workload is at ${loaded.workloadPercentage}%.`,
      });
    } else if (loaded) {
      items.push({
        icon: 'trend',
        title: 'Workload balanced',
        detail: `Highest load is ${loaded.team} at ${loaded.workloadPercentage}%.`,
      });
    }
    if (stats.slaCompliance >= 90) {
      items.push({
        icon: 'ok',
        title: 'SLA on track',
        detail: `Overall SLA compliance is ${stats.slaCompliance}%.`,
      });
    } else if (stats.overdueTickets > 0) {
      items.push({
        icon: 'warn',
        title: 'Overdue backlog',
        detail: `${stats.overdueTickets} ticket(s) breached SLA and need attention.`,
      });
    }
    return items;
  })();

  const upcomingActions = [
    ...(stats.overdueTickets > 0
      ? [{
          title: 'Review overdue tickets',
          detail: `${stats.overdueTickets} ticket(s) need attention`,
          badge: 'Urgent' as const,
        }]
      : []),
    ...(activeDowntimes.length > 0
      ? [{
          title: 'Resolve active downtimes',
          detail: `${activeDowntimes.length} ongoing incident(s)`,
          badge: 'Urgent' as const,
        }]
      : []),
    ...(stats.criticalTickets > 0
      ? [{
          title: 'Triage critical tickets',
          detail: `${stats.criticalTickets} critical ticket(s) open`,
          badge: 'Urgent' as const,
        }]
      : []),
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getRoleSpecificStats = () => {
    if (!currentUser) return null;

    switch (currentUser.role) {
      case 'admin':
        return (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.length}</div>
                <p className="text-xs text-muted-foreground">
                  {users.filter(u => u.isActive).length} active
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(stats.uptimePercent ?? 100) >= 95 ? 'text-green-600' : 'text-amber-600'}`}>
                  {stats.uptimePercent != null ? `${stats.uptimePercent}%` : '—'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Uptime this month ({stats.downtimeHours}h downtime)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Downtimes</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeDowntimes}</div>
                <p className="text-xs text-muted-foreground">
                  Ongoing incidents
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cost Impact</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {downtimeCostThisMonth > 0
                    ? `Rp ${Math.round(downtimeCostThisMonth).toLocaleString('id-ID')}`
                    : '—'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Estimated downtime cost this month
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case 'team_lead': {
        const teamStats = teamWorkload.find(t => t.team === currentUser.team);
        return (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Tickets</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamStats?.openTickets || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {teamStats?.totalTickets || 0} total this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team SLA</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamStats?.slaCompliance || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  Target: 95%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamStats?.averageResponseTime || 0}h</div>
                <p className="text-xs text-muted-foreground">
                  Team average
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Workload</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamStats?.workloadPercentage || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  Capacity utilization
                </p>
              </CardContent>
            </Card>
          </div>
        );
      }

      case 'it_staff': {
        const myTickets = userSpecificData.tickets;
        const myOpenTickets = myTickets.filter(t => !['resolved', 'closed'].includes(t.status));
        const myOverdueTickets = myTickets.filter(t => t.slaBreached);
        const today = new Date();
        const myResolvedToday = myTickets.filter((t) =>
          t.resolvedDate && t.resolvedDate.toDateString() === today.toDateString()
        ).length;
        const mySla = myTickets.length > 0
          ? Math.round(((myTickets.length - myOverdueTickets.length) / myTickets.length) * 100)
          : 100;
        return (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Open Tickets</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{myOpenTickets.length}</div>
                <p className="text-xs text-muted-foreground">
                  {myTickets.length} total assigned
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{myOverdueTickets.length}</div>
                <p className="text-xs text-muted-foreground">
                  Require immediate attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{myResolvedToday}</div>
                <p className="text-xs text-muted-foreground">
                  Closed or resolved today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Performance</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mySla}%</div>
                <p className="text-xs text-muted-foreground">
                  SLA compliance rate
                </p>
              </CardContent>
            </Card>
          </div>
        );
      }

      case 'reporter': {
        const myReportedTickets = userSpecificData.tickets;
        const myPendingTickets = myReportedTickets.filter(t => !['resolved', 'closed'].includes(t.status));
        const resolvedWithDates = myReportedTickets.filter(
          (t) => t.resolvedDate && t.dateReported
        );
        const avgHours = resolvedWithDates.length > 0
          ? Math.round(
              resolvedWithDates.reduce((sum, t) => {
                const ms = t.resolvedDate!.getTime() - t.dateReported.getTime();
                return sum + ms / (1000 * 60 * 60);
              }, 0) / resolvedWithDates.length
            )
          : null;
        return (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Tickets</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{myReportedTickets.length}</div>
                <p className="text-xs text-muted-foreground">
                  Total reported
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{myPendingTickets.length}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting resolution
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {myReportedTickets.filter(t => ['resolved', 'closed'].includes(t.status)).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Issues fixed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgHours != null ? `${avgHours}h` : '—'}</div>
                <p className="text-xs text-muted-foreground">
                  Average time to resolve
                </p>
              </CardContent>
            </Card>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl tracking-tight">
            {getGreeting()}, {currentUser?.name.split(' ')[0]}!
          </h2>
          <p className="text-muted-foreground">
            Here's what's happening with your IT systems today.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="hidden md:flex">
            Last updated: {new Date().toLocaleTimeString()}
          </Badge>
        </div>
      </div>
      
      {getRoleSpecificStats()}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTickets}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.resolvedToday} resolved today
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.openTickets}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.overdueTickets} overdue
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Resolution</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageResolutionTime}h</div>
                <p className="text-xs text-muted-foreground">
                  From latest team snapshots
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.slaCompliance}%</div>
                <Progress value={stats.slaCompliance} className="mt-2" />
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Team Workload Overview</CardTitle>
                <CardDescription>
                  Current ticket distribution by team
                </CardDescription>
              </CardHeader>
              <CardContent>
                {teamWorkload.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-12 text-center">
                    No workload snapshot available yet.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={teamWorkload}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="team" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="openTickets" fill="#FF6B6B" name="Open Tickets" />
                      <Bar dataKey="resolvedTickets" fill="#4ECDC4" name="Resolved Tickets" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Ticket Status</CardTitle>
                <CardDescription>
                  Current ticket distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statusData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-12 text-center">No tickets yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team SLA Compliance</CardTitle>
              <CardDescription>
                Latest snapshot per team
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teamSlaChart.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">
                  No performance data. Generate a workload snapshot first.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={teamSlaChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="team" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="sla" fill="#8884d8" name="SLA %" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Workload %</CardTitle>
              <CardDescription>
                Capacity utilization from latest snapshots
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teamSlaChart.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">No workload data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={teamSlaChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="team" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="workload" fill="#45B7D1" name="Workload %" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest system events and updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  <div className="space-y-4">
                    {recentActivity.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No recent activity.</p>
                    ) : (
                      recentActivity.map((activity, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            activity.type === 'ticket_created' ? 'bg-blue-500' :
                            activity.type === 'ticket_resolved' ? 'bg-green-500' :
                            activity.type === 'downtime_started' ? 'bg-orange-500' :
                            'bg-red-500'
                          }`} />
                          <div className="flex-1 space-y-1">
                            <p className="text-sm">{activity.message}</p>
                            <p className="text-xs text-muted-foreground">
                              {activity.time.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Tickets</CardTitle>
                <CardDescription>
                  Latest ticket activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  <div className="space-y-4">
                    {recentTickets.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No tickets to show.</p>
                    ) : (
                      recentTickets.map((ticket) => (
                        <div key={ticket.id} className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">
                              {ticket.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ticket.id} • {ticket.category} • {ticket.priority}
                            </p>
                          </div>
                          <Badge 
                            variant={
                              ticket.status === 'resolved' ? 'default' : 
                              ticket.status === 'in_progress' ? 'secondary' : 
                              ticket.slaBreached ? 'destructive' : 'outline'
                            }
                          >
                            {ticket.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {activeDowntimes.length > 0 && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Active Downtimes
                </CardTitle>
                <CardDescription>
                  Systems currently experiencing issues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeDowntimes.map((downtime) => (
                    <div key={downtime.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{downtime.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Started: {downtime.startTime.toLocaleString()} • 
                          Impact: {downtime.impact} • 
                          Sources: {(downtime.sourceComponents?.map((c) => c.name).join(', ') || downtime.affectedSystems.join(', ') || '—')}
                        </p>
                      </div>
                      <Badge variant="destructive">
                        Ongoing
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
                <CardDescription>
                  Derived from current tickets and workload snapshots
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {insights.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start space-x-3 p-3 rounded-lg ${
                      item.icon === 'warn'
                        ? 'bg-yellow-50 dark:bg-yellow-950'
                        : item.icon === 'ok'
                          ? 'bg-green-50 dark:bg-green-950'
                          : 'bg-blue-50 dark:bg-blue-950'
                    }`}
                  >
                    {item.icon === 'warn' ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    ) : item.icon === 'ok' ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommended Actions</CardTitle>
                <CardDescription>
                  Based on overdue tickets and active incidents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingActions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No urgent actions right now.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingActions.map((action, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="text-sm font-medium">{action.title}</p>
                          <p className="text-xs text-muted-foreground">{action.detail}</p>
                        </div>
                        <Badge variant="destructive">{action.badge}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
