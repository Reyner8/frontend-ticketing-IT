import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useApp } from '../lib/store';
import { fetchDashboardData, getCachedUsers, fetchGlobalActivityLogs } from '../lib/api/services';
import { Ticket, DowntimeRecord, DashboardStats, TeamWorkload, ActivityLogEntry } from '../types';
import { AlertTriangle, CheckCircle, Clock, TrendingUp, Zap, Users, Target, Star, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function Dashboard() {
  const { state } = useApp();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [downtimes, setDowntimes] = useState<DowntimeRecord[]>([]);
  const [teamWorkload, setTeamWorkload] = useState<TeamWorkload[]>([]);
  const [globalActivity, setGlobalActivity] = useState<ActivityLogEntry[]>([]);
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
  }, []);
  
  if (loading || !stats) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const mockUsers = getCachedUsers();

  // Get user-specific data based on role
  const getUserSpecificData = () => {
    if (!currentUser) return { tickets: [], downtimes: [] };
    
    switch (currentUser.role) {
      case 'admin':
        return { 
          tickets, 
          downtimes 
        };
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
  
  // Active downtimes
  const activeDowntimes = downtimes.filter(d => d.status === 'ongoing');

  // Ticket status distribution
  const statusData = [
    { name: 'Open', value: stats.openTickets, color: '#FFBB28' },
    { name: 'In Progress', value: 15, color: '#0088FE' },
    { name: 'Resolved', value: stats.totalTickets - stats.openTickets - 15, color: '#00C49F' },
    { name: 'Overdue', value: stats.overdueTickets, color: '#FF8042' },
  ];

  // Performance trends (mock data)
  const performanceTrends = [
    { month: 'Aug', tickets: 98, resolved: 89, sla: 92 },
    { month: 'Sep', tickets: 112, resolved: 95, sla: 89 },
    { month: 'Oct', tickets: 125, resolved: 108, sla: 86 },
    { month: 'Nov', tickets: 134, resolved: 118, sla: 88 },
    { month: 'Dec', tickets: 108, resolved: 95, sla: 91 }
  ];

  // Team productivity over time
  const teamProductivity = [
    { week: 'W1', programmer: 85, network: 92, hardware: 78 },
    { week: 'W2', programmer: 88, network: 89, hardware: 82 },
    { week: 'W3', programmer: 91, network: 94, hardware: 85 },
    { week: 'W4', programmer: 87, network: 96, hardware: 88 }
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
                <div className="text-2xl font-bold">{mockUsers.length}</div>
                <p className="text-xs text-muted-foreground">
                  {mockUsers.filter(u => u.isActive).length} active
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">98.5%</div>
                <p className="text-xs text-muted-foreground">
                  Uptime this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">User Satisfaction</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.userSatisfactionScore}/5</div>
                <p className="text-xs text-muted-foreground">
                  Based on 150 responses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cost Impact</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$28k</div>
                <p className="text-xs text-muted-foreground">
                  Downtime cost this month
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case 'team_lead':
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

      case 'it_staff':
        const myTickets = userSpecificData.tickets;
        const myOpenTickets = myTickets.filter(t => !['resolved', 'closed'].includes(t.status));
        const myOverdueTickets = myTickets.filter(t => t.slaBreached);
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
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">
                  Great progress!
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Performance</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">94%</div>
                <p className="text-xs text-muted-foreground">
                  SLA compliance rate
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case 'reporter':
        const myReportedTickets = userSpecificData.tickets;
        const myPendingTickets = myReportedTickets.filter(t => !['resolved', 'closed'].includes(t.status));
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
                <div className="text-2xl font-bold">18h</div>
                <p className="text-xs text-muted-foreground">
                  Average response time
                </p>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Welcome Header */}
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
      
      {/* Role-specific Stats */}
      {getRoleSpecificStats()}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Key Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTickets}</div>
                <p className="text-xs text-muted-foreground flex items-center">
                  <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                  +12% from last month
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
                <p className="text-xs text-muted-foreground flex items-center">
                  <ArrowDownRight className="h-3 w-3 text-green-600 mr-1" />
                  -2.5h from last month
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
          
          {/* Charts and Detailed Views */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Team Workload Chart */}
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Team Workload Overview</CardTitle>
                <CardDescription>
                  Current ticket distribution by team
                </CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
            
            {/* Ticket Status Distribution */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Ticket Status</CardTitle>
                <CardDescription>
                  Current ticket distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>
                Monthly ticket volume and resolution trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="tickets" stackId="1" stroke="#8884d8" fill="#8884d8" name="Total Tickets" />
                  <Area type="monotone" dataKey="resolved" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="Resolved" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Productivity</CardTitle>
              <CardDescription>
                Weekly SLA compliance by team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={teamProductivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis domain={[70, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="programmer" stroke="#4ECDC4" strokeWidth={2} name="Programmer Team" />
                  <Line type="monotone" dataKey="network" stroke="#45B7D1" strokeWidth={2} name="Network Team" />
                  <Line type="monotone" dataKey="hardware" stroke="#96CEB4" strokeWidth={2} name="Hardware Team" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Activity */}
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
                    {recentActivity.map((activity, index) => (
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
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Recent Tickets */}
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
                    {recentTickets.map((ticket) => (
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
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Active Downtimes Alert */}
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
                  AI-powered insights and recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Performance Improvement</p>
                    <p className="text-xs text-muted-foreground">
                      Network team has improved response time by 25% this month
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Attention Needed</p>
                    <p className="text-xs text-muted-foreground">
                      Hardware team workload is at 85% capacity
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Goal Achievement</p>
                    <p className="text-xs text-muted-foreground">
                      SLA compliance target of 90% exceeded this month
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Actions</CardTitle>
                <CardDescription>
                  Recommended actions and scheduled tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="text-sm font-medium">Database Maintenance</p>
                      <p className="text-xs text-muted-foreground">Scheduled for tomorrow 2:00 AM</p>
                    </div>
                    <Badge variant="outline">Planned</Badge>
                  </div>

                  <div className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="text-sm font-medium">Review Overdue Tickets</p>
                      <p className="text-xs text-muted-foreground">6 tickets need attention</p>
                    </div>
                    <Badge variant="destructive">Urgent</Badge>
                  </div>

                  <div className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="text-sm font-medium">Team Performance Review</p>
                      <p className="text-xs text-muted-foreground">Monthly review due Friday</p>
                    </div>
                    <Badge variant="secondary">Upcoming</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}