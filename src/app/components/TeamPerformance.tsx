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
import {
  fetchTeamWorkloadLatest,
  fetchTickets,
  fetchUsers,
  fetchTeamWorkloadCompare,
  generateTeamWorkload,
} from "../lib/api/services";
import { exportTeamWorkloadCsv } from "../lib/export-utils";
import { TeamType, TeamWorkload, User } from "../types";
import { labelTeam } from "../lib/ui-labels";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { 
  Users, 
  Target, 
  Clock, 
  Award, 
  CheckCircle,
  AlertTriangle,
  Download 
} from "lucide-react";

export function TeamPerformance() {
  const { state } = useApp();
  const [selectedTeam, setSelectedTeam] = useState<TeamType | "all">("all");
  const [teamWorkload, setTeamWorkload] = useState<TeamWorkload[]>([]);
  const [tickets, setTickets] = useState<Awaited<ReturnType<typeof fetchTickets>>['tickets']>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  const currentUser = state.currentUser;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [workload, ticketsResult, userList] = await Promise.all([
          fetchTeamWorkloadLatest(),
          fetchTickets({ per_page: 100 }),
          fetchUsers().catch(() => [] as User[]),
        ]);
        setTeamWorkload(workload);
        setTickets(ticketsResult.tickets);
        setUsers(userList);
      } catch {
        setTeamWorkload([]);
        setTickets([]);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);
  
  const accessibleTeams = useMemo(() => {
    if (currentUser?.role === 'admin') {
      return [...teamWorkload];
    } else if (currentUser?.role === 'team_lead' && currentUser.team) {
      return teamWorkload.filter(t => t.team === currentUser.team);
    }
    return [];
  }, [currentUser, teamWorkload]);

  const performanceData = useMemo(() => {
    const teamData = selectedTeam === "all" ? accessibleTeams : accessibleTeams.filter(t => t.team === selectedTeam);
    
    const teamComparison = teamData.map(team => ({
      team: team.team,
      slaCompliance: team.slaCompliance,
      responseTime: team.averageResponseTime,
      resolutionTime: team.averageResolutionTime,
      workload: team.workloadPercentage,
      efficiency: team.totalTickets > 0
        ? Math.round((team.resolvedTickets / team.totalTickets) * 100)
        : 0,
    }));

    const individualPerformance = currentUser?.team 
      ? users.filter(u => u.team === currentUser.team && u.role === 'it_staff').map(user => {
          const userTickets = tickets.filter(t => t.assignedToId === user.id);
          const resolvedTickets = userTickets.filter(t => ['resolved', 'closed'].includes(t.status));
          const overdueTickets = userTickets.filter(t => t.slaBreached);
          const resolvedWithDates = resolvedTickets.filter((t) => t.resolvedDate && t.dateReported);
          const avgResponseTime = resolvedWithDates.length > 0
            ? Math.round(
                (resolvedWithDates.reduce((sum, t) => {
                  const ms = t.resolvedDate!.getTime() - t.dateReported.getTime();
                  return sum + ms / (1000 * 60 * 60);
                }, 0) / resolvedWithDates.length) * 10
              ) / 10
            : 0;
          
          return {
            id: user.id,
            name: user.name,
            totalTickets: userTickets.length,
            resolvedTickets: resolvedTickets.length,
            overdueTickets: overdueTickets.length,
            efficiency: userTickets.length > 0 ? Math.round((resolvedTickets.length / userTickets.length) * 100) : 0,
            avgResponseTime,
            slaCompliance: userTickets.length > 0 ? Math.round(((userTickets.length - overdueTickets.length) / userTickets.length) * 100) : 100
          };
        })
      : [];

    return {
      teamComparison,
      individualPerformance,
    };
  }, [selectedTeam, accessibleTeams, currentUser, tickets, users]);

  const chartColors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const getTopPerformer = () => {
    if (accessibleTeams.length === 0) return 'N/A';
    const sortedTeams = [...accessibleTeams].sort((a, b) => b.slaCompliance - a.slaCompliance);
    return sortedTeams[0]?.team ? labelTeam(sortedTeams[0].team) : 'N/A';
  };

  if (currentUser?.role === 'reporter' || currentUser?.role === 'it_staff') {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Akses dibatasi</h3>
          <p className="text-muted-foreground">
            Anda tidak memiliki izin untuk melihat data performa tim.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl tracking-tight">Team Performance</h2>
          <p className="text-muted-foreground">
            Pantau metrik tim dan analitik performa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={async () => {
            try {
              const data = await fetchTeamWorkloadCompare(new Date().toISOString().slice(0, 10));
              setTeamWorkload(data);
              toast.success("Snapshot perbandingan tim dimuat");
            } catch {
              toast.error("Gagal membandingkan");
            }
          }}>
            Bandingkan tim
          </Button>
          <Button variant="outline" onClick={async () => {
            try {
              const data = await generateTeamWorkload();
              setTeamWorkload(data);
              toast.success("Snapshot beban kerja dibuat");
            } catch {
              toast.error("Gagal membuat snapshot");
            }
          }}>
            Buat snapshot
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (accessibleTeams.length === 0) {
                toast.error("Tidak ada data beban kerja untuk diekspor");
                return;
              }
              exportTeamWorkloadCsv(accessibleTeams);
              toast.success("CSV beban kerja tim diekspor");
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Ekspor
          </Button>
        </div>
      </div>

      {currentUser?.role === 'admin' && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Filter menurut tim:</span>
              <Select value={selectedTeam} onValueChange={(value: TeamType | "all") => setSelectedTeam(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua tim</SelectItem>
                  <SelectItem value="programmer">Tim {labelTeam("programmer")}</SelectItem>
                  <SelectItem value="network">Tim {labelTeam("network")}</SelectItem>
                  <SelectItem value="hardware">Tim {labelTeam("hardware")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total tim</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accessibleTeams.length}</div>
            <p className="text-xs text-muted-foreground">Tim aktif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata kepatuhan SLA</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {accessibleTeams.length > 0 
                ? Math.round(accessibleTeams.reduce((sum, t) => sum + t.slaCompliance, 0) / accessibleTeams.length)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Di semua tim</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata waktu respons</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accessibleTeams.length > 0 
                ? (accessibleTeams.reduce((sum, t) => sum + t.averageResponseTime, 0) / accessibleTeams.length).toFixed(1)
                : 0}h
            </div>
            <p className="text-xs text-muted-foreground">Rata-rata tim</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performa terbaik</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getTopPerformer()}
            </div>
            <p className="text-xs text-muted-foreground">Kepatuhan SLA tertinggi</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="teams">Detail tim</TabsTrigger>
          <TabsTrigger value="individual">Individual</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Kepatuhan SLA tim</CardTitle>
                <CardDescription>Persentase kepatuhan per tim</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData.teamComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="team" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="slaCompliance" fill="#4ECDC4" name="Kepatuhan SLA %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Beban kerja tim</CardTitle>
                <CardDescription>Persentase beban kerja saat ini per tim</CardDescription>
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
                      {performanceData.teamComparison.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Analisis waktu respons</CardTitle>
                <CardDescription>Rata-rata waktu respons dan penyelesaian</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData.teamComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="team" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="responseTime" fill="#FF6B6B" name="Waktu respons (j)" />
                    <Bar dataKey="resolutionTime" fill="#4ECDC4" name="Waktu penyelesaian (j)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Radar performa tim</CardTitle>
                <CardDescription>Tampilan performa multidimensi</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={performanceData.teamComparison}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="team" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar name="Kepatuhan SLA" dataKey="slaCompliance" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    <Radar name="Efisiensi" dataKey="efficiency" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
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
              <CardTitle>Detail performa tim</CardTitle>
              <CardDescription>Metrik detail untuk setiap tim</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tim</TableHead>
                    <TableHead>Total tiket</TableHead>
                    <TableHead>Terbuka</TableHead>
                    <TableHead>Selesai</TableHead>
                    <TableHead>Terlambat</TableHead>
                    <TableHead>Kepatuhan SLA</TableHead>
                    <TableHead>Rata-rata respons</TableHead>
                    <TableHead>Beban kerja</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accessibleTeams.map((team) => (
                    <TableRow key={team.team}>
                      <TableCell className="font-medium">{labelTeam(team.team)}</TableCell>
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

        <TabsContent value="individual" className="space-y-4">
          {currentUser?.role === 'team_lead' ? (
            <Card>
              <CardHeader>
                <CardTitle>Performa individu</CardTitle>
                <CardDescription>Metrik performa anggota tim</CardDescription>
              </CardHeader>
              <CardContent>
                {performanceData.individualPerformance.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Anggota tim tidak ditemukan. Pastikan pengguna dimuat dan ditugaskan ke tim Anda.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Anggota tim</TableHead>
                        <TableHead>Total tiket</TableHead>
                        <TableHead>Selesai</TableHead>
                        <TableHead>Terlambat</TableHead>
                        <TableHead>Efisiensi</TableHead>
                        <TableHead>Kepatuhan SLA</TableHead>
                        <TableHead>Rata-rata penyelesaian</TableHead>
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
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Individual Performance</h3>
                <p className="text-muted-foreground">
                  Metrik performa individu hanya tersedia untuk team lead anggota timnya.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
