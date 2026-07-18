import { format } from "date-fns";
import { DowntimeRecord, CalendarEvent } from "../types";
import { STATUS_COLORS, TYPE_COLORS, IMPACT_COLORS, DATE_FORMATS } from "./constants";

export const getStatusColor = (status: string) => {
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'text-gray-600 bg-gray-100';
};

export const getTypeColor = (type: 'planned' | 'unplanned') => {
  return TYPE_COLORS[type];
};

export const getImpactColor = (impact: string) => {
  return IMPACT_COLORS[impact as keyof typeof IMPACT_COLORS] || 'text-gray-600 bg-gray-100';
};

const COMPONENT_CATEGORY_COLORS: Record<string, string> = {
  application: 'text-blue-600 bg-blue-100',
  network: 'text-purple-600 bg-purple-100',
  utility: 'text-yellow-600 bg-yellow-100',
  infrastructure: 'text-orange-600 bg-orange-100',
  equipment: 'text-cyan-600 bg-cyan-100',
  operational_service: 'text-pink-600 bg-pink-100',
  other: 'text-gray-600 bg-gray-100',
};

export const getComponentCategoryColor = (category: string) => {
  return COMPONENT_CATEGORY_COLORS[category] || 'text-gray-600 bg-gray-100';
};

export const getUptimeColor = (percent: number) => {
  if (percent >= 99.5) return 'text-green-700 bg-green-100';
  if (percent >= 98) return 'text-yellow-700 bg-yellow-100';
  return 'text-red-700 bg-red-100';
};

export const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

export const formatDate = (date: Date) => {
  return format(date, DATE_FORMATS.full);
};

export const formatShortDate = (date: Date) => {
  return format(date, DATE_FORMATS.short);
};

export const calculateUptime = (totalDowntimeHours: number, periodDays: number = 30) => {
  const totalMinutesInPeriod = periodDays * 24 * 60;
  const downtimeMinutes = totalDowntimeHours * 60;
  const uptime = ((totalMinutesInPeriod - downtimeMinutes) / totalMinutesInPeriod) * 100;
  return Math.max(0, Math.min(100, uptime));
};

export const generateDowntimeAnalytics = (downtimes: DowntimeRecord[]) => {
  const totalDowntime = downtimes.reduce((sum, d) => sum + (d.duration || 0), 0);
  const plannedDowntime = downtimes.filter(d => d.type === 'planned').reduce((sum, d) => sum + (d.duration || 0), 0);
  const unplannedDowntime = downtimes.filter(d => d.type === 'unplanned').reduce((sum, d) => sum + (d.duration || 0), 0);
  const activeDowntimes = downtimes.filter(d => d.status === 'ongoing').length;
  const avgDowntimePerIncident = downtimes.length > 0 ? totalDowntime / downtimes.length : 0;
  const totalCost = downtimes.reduce((sum, d) => sum + (d.estimatedCost || 0), 0);

  // Monthly trend data
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthName = format(date, 'MMM');
    
    const monthDowntimes = downtimes.filter(d => {
      const downtimeMonth = d.startTime.getMonth();
      const downtimeYear = d.startTime.getFullYear();
      return downtimeMonth === date.getMonth() && downtimeYear === date.getFullYear();
    });

    monthlyData.push({
      month: monthName,
      planned: monthDowntimes.filter(d => d.type === 'planned').reduce((sum, d) => sum + (d.duration || 0), 0) / 60,
      unplanned: monthDowntimes.filter(d => d.type === 'unplanned').reduce((sum, d) => sum + (d.duration || 0), 0) / 60,
      incidents: monthDowntimes.length
    });
  }

  // Impact distribution
  const impactData = [
    { name: 'Low', value: downtimes.filter(d => d.impact === 'low').length, color: '#00C49F' },
    { name: 'Medium', value: downtimes.filter(d => d.impact === 'medium').length, color: '#FFBB28' },
    { name: 'High', value: downtimes.filter(d => d.impact === 'high').length, color: '#FF8042' },
    { name: 'Critical', value: downtimes.filter(d => d.impact === 'critical').length, color: '#FF6B6B' },
  ].filter(d => d.value > 0);

  // Component affected analysis (prefer structured components)
  const systemsMap = new Map();
  downtimes.forEach(downtime => {
    const names =
      downtime.affectedComponents?.length
        ? downtime.affectedComponents.map((c) => c.name)
        : downtime.affectedSystems ?? [];
    names.forEach((system) => {
      const current = systemsMap.get(system) || { name: system, incidents: 0, totalDuration: 0 };
      current.incidents += 1;
      current.totalDuration += downtime.duration || 0;
      systemsMap.set(system, current);
    });
  });

  const systemsData = Array.from(systemsMap.values())
    .sort((a, b) => b.incidents - a.incidents)
    .slice(0, 5);

  return {
    totalDowntime: Math.round(totalDowntime / 60), // Convert to hours
    plannedDowntime: Math.round(plannedDowntime / 60),
    unplannedDowntime: Math.round(unplannedDowntime / 60),
    activeDowntimes,
    avgDowntimePerIncident: Math.round(avgDowntimePerIncident),
    totalCost,
    monthlyData,
    impactData,
    systemsData
  };
};

export const generateCalendarEvents = (downtimes: DowntimeRecord[]): CalendarEvent[] => {
  const events: CalendarEvent[] = [];
  
  downtimes.forEach(downtime => {
    if (downtime.type === 'planned' || downtime.startTime > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
      events.push({
        id: `downtime-${downtime.id}`,
        title: downtime.title,
        start: downtime.startTime,
        end: downtime.endTime || new Date(downtime.startTime.getTime() + (downtime.duration || 0) * 60 * 1000),
        type: downtime.type === 'planned' ? 'planned_downtime' : 'maintenance',
        description: downtime.reason,
        color: downtime.status === 'ongoing' ? '#FF6B6B' : 
               downtime.type === 'planned' ? '#4ECDC4' : '#FFA500',
        allDay: false
      });
    }
  });

  return events;
};