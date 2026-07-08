import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Progress } from "./ui/progress";
import { useApp } from "../lib/store";
import { toast } from "sonner";
import { fetchTeamWorkloadLatest, fetchTickets, getCachedUsers, fetchTeamWorkloadCompare, generateTeamWorkload } from "../lib/api/services";
import { TeamType, TeamWorkload } from "../types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { 
  Users, 
  Target, 
  Clock, 
  TrendingUp, 
  Award, 
  CheckCircle,
  AlertTriangle,
  Download 
} from "lucide-react";

export function TeamPerformance() {
  const { state } = useApp();
  const [selectedTeam, setSelectedTeam] = useState<TeamType | "all">("all");
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [teamWorkload, setTeamWorkload] = useState<TeamWorkload[]>([]);
  const [tickets, setTickets] = useState<Awaited<ReturnType<typeof fetchTickets>>['tickets']>([]);
  const [loading, setLoading] = useState(true);
  
  const currentUser = state.currentUser;
  const mockUsers = getCachedUsers();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [workload, ticketsResult] = await Promise.all([
          fetchTeamWorkloadLatest(),
          fetchTickets({ per_page: 100 }),
        ]);
        setTeamWorkload(workload);
        setTickets(ticketsResult.tickets);
      } catch {
        setTeamWorkload([]);
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);
  
  // Filter data based on user role
  const accessibleTeams = useMemo(() => {
    if (currentUser?.role === 'admin') {
      return [...teamWorkload];
    } else if (currentUser?.role === 'team_lead' && currentUser.team) {
      return teamWorkload.filter(t => t.team === currentUser.team);
    }
    return [];
  }, [currentUser, teamWorkload]);

  // Generate performance metrics
  const performanceData = useMemo(() => {
    const teamData = selectedTeam === "all" ? accessibleTeams : accessibleTeams.filter(t => t.team === selectedTeam);
    
    // Team comparison data
    const teamComparison = teamData.map(team => ({
      team: team.team,
      slaCompliance: team.slaCompliance,
      responseTime: team.averageResponseTime,
      resolutionTime: team.averageResolutionTime,
      workload: team.workloadPercentage,
      efficiency: Math.round((team.resolvedTickets / team.totalTickets) * 100)
    }));

    // Individual performance (for team leads)
    const individualPerformance = currentUser?.team 
      ? mockUsers.filter(u => u.team === currentUser.team && u.role === 'it_staff').map(user => {
          const userTickets = tickets.filter(t => t.assignedToId === user.id);
          const resolvedTickets = userTickets.filter(t => ['resolved', 'closed'].includes(t.status));
          const overdueTickets = userTickets.filter(t => t.slaBreached);
          
          return {
            id: user.id,
            name: user.name,
            totalTickets: userTickets.length,
            resolvedTickets: resolvedTickets.length,
            overdueTickets: overdueTickets.length,
            efficiency: userTickets.length > 0 ? Math.round((resolvedTickets.length / userTickets.length) * 100) : 0,
            avgResponseTime: 2.5,
            slaCompliance: userTickets.length > 0 ? Math.round(((userTickets.length - overdueTickets.length) / userTickets.length) * 100) : 100
          };
        })
      : [];

    // Monthly trends
    const monthlyTrends = [
      { month: 'Aug', tickets: 98, resolved: 89, sla: 92 },
      { month: 'Sep', tickets: 112, resolved: 95, sla: 89 },
      { month: 'Oct', tickets: 125, resolved: 108, sla: 86 },
      { month: 'Nov', tickets: 134, resolved: 118, sla: 88 },
      { month: 'Dec', tickets: 108, resolved: 95, sla: 91 }
    ];

    return {
      teamComparison,
      individualPerformance,
      monthlyTrends
    };
  }, [selectedTeam, accessibleTeams, currentUser, tickets]);

  const chartColors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Calculate top performer with safe access
  const getTopPerformer = () => {
    if (accessibleTeams.length === 0) return 'N/A';
    // Create a copy of the array before sorting to avoid mutation
    const sortedTeams = [...accessibleTeams].sort((a, b) => b.slaCompliance - a.slaCompliance);
    return sortedTeams[0]?.team || 'N/A';
  };

  // Check access rights
  if (currentUser?.role === 'reporter' || currentUser?.role === 'it_staff') {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Access Restricted</h3>
          <p className="text-muted-foreground">
            You don't have permission to view team performance data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl tracking-tight">Team Performance</h2>
          <p className="text-muted-foreground">
            Monitor team metrics and performance analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={async () => {
            try {
              const data = await fetchTeamWorkloadCompare(new Date().toISOString().slice(0, 10));
              setTeamWorkload(data);
              toast.success("Loaded team comparison snapshot");
            } catch {
              toast.error("Compare failed");
            }
          }}>
            Compare Teams
          </Button>
          <Button variant="outline" onClick={async () => {
            try {
              const data = await generateTeamWorkload();
              setTeamWorkload(data);
              toast.success("Workload snapshot generated");
            } catch {
              toast.error("Generate failed");
            }
          }}>
            Generate Snapshot
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Team Filter */}
      {currentUser?.role === 'admin' && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Filter by Team:</span>
              <Select value={selectedTeam} onValueChange={(value: any) => setSelectedTeam(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  <SelectItem value="programmer">Programmer Team</SelectItem>
                  <SelectItem value="network">Network Team</SelectItem>
                  <SelectItem value="hardware">Hardware Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accessibleTeams.length}</div>
            <p className="text-xs text-muted-foreground">Active teams</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg SLA Compliance</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {accessibleTeams.length > 0 
                ? Math.round(accessibleTeams.reduce((sum, t) => sum + t.slaCompliance, 0) / accessibleTeams.length)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Across all teams</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accessibleTeams.length > 0 
                ? (accessibleTeams.reduce((sum, t) => sum + t.averageResponseTime, 0) / accessibleTeams.length).toFixed(1)
                : 0}h
            </div>
            <p className="text-xs text-muted-foreground">Team average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getTopPerformer()}
            </div>
            <p className="text-xs text-muted-foreground">Highest SLA compliance</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="teams">Team Details</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="individual">Individual</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Team Performance Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Team SLA Compliance</CardTitle>
                <CardDescription>Compliance percentage by team</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData.teamComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="team" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="slaCompliance" fill="#4ECDC4" name="SLA Compliance %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Workload Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Team Workload</CardTitle>
                <CardDescription>Current workload percentage by team</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={performanceData.teamComparison}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ team, workload }) => `${team}: ${workload}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="workload"
                    >
                      {performanceData.teamComparison.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Response Time Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Response Time Analysis</CardTitle>
                <CardDescription>Average response and resolution times</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData.teamComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="team" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="responseTime" fill="#FF6B6B" name="Response Time (h)" />
                    <Bar dataKey="resolutionTime" fill="#4ECDC4" name="Resolution Time (h)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Team Efficiency Radar */}
            <Card>
              <CardHeader>
                <CardTitle>Team Performance Radar</CardTitle>
                <CardDescription>Multi-dimensional performance view</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={performanceData.teamComparison}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="team" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar name="SLA Compliance" dataKey="slaCompliance" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    <Radar name="Efficiency" dataKey="efficiency" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance Details</CardTitle>
              <CardDescription>Detailed metrics for each team</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>Total Tickets</TableHead>
                    <TableHead>Open</TableHead>
                    <TableHead>Resolved</TableHead>
                    <TableHead>Overdue</TableHead>
                    <TableHead>SLA Compliance</TableHead>
                    <TableHead>Avg Response</TableHead>
                    <TableHead>Workload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accessibleTeams.map((team) => (
                    <TableRow key={team.team}>
                      <TableCell className="font-medium capitalize">{team.team}</TableCell>
                      <TableCell>{team.totalTickets}</TableCell>
                      <TableCell>{team.openTickets}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          {team.resolvedTickets}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          {team.overdueTickets}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={team.slaCompliance} className="w-16 h-2" />
                          <span className="text-sm font-medium">{team.slaCompliance}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{team.averageResponseTime}h</TableCell>
                      <TableCell>
                        <Badge 
                          variant={team.workloadPercentage > 80 ? "destructive" : team.workloadPercentage > 60 ? "secondary" : "default"}
                        >
                          {team.workloadPercentage}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Monthly performance trends across teams</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={performanceData.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="tickets" stroke="#8884d8" strokeWidth={2} name="Total Tickets" />
                  <Line type="monotone" dataKey="resolved" stroke="#82ca9d" strokeWidth={2} name="Resolved Tickets" />
                  <Line type="monotone" dataKey="sla" stroke="#ffc658" strokeWidth={2} name="SLA Compliance %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individual" className="space-y-4">
          {currentUser?.role === 'team_lead' ? (
            <Card>
              <CardHeader>
                <CardTitle>Individual Performance</CardTitle>
                <CardDescription>Performance metrics for team members</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team Member</TableHead>
                      <TableHead>Total Tickets</TableHead>
                      <TableHead>Resolved</TableHead>
                      <TableHead>Overdue</TableHead>
                      <TableHead>Efficiency</TableHead>
                      <TableHead>SLA Compliance</TableHead>
                      <TableHead>Avg Response</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performanceData.individualPerformance.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{member.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{member.totalTickets}</TableCell>
                        <TableCell>{member.resolvedTickets}</TableCell>
                        <TableCell>
                          <Badge variant={member.overdueTickets > 0 ? "destructive" : "default"}>
                            {member.overdueTickets}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={member.efficiency} className="w-16 h-2" />
                            <span className="text-sm font-medium">{member.efficiency}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={member.slaCompliance >= 95 ? "default" : member.slaCompliance >= 85 ? "secondary" : "destructive"}
                          >
                            {member.slaCompliance}%
                          </Badge>
                        </TableCell>
                        <TableCell>{member.avgResponseTime}h</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Individual Performance</h3>
                <p className="text-muted-foreground">
                  Individual performance metrics are only available to team leads for their team members.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}