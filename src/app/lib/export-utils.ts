import { format } from 'date-fns';
import type {
  Ticket,
  ErrorReport,
  FeatureRequest,
  DowntimeRecord,
  User,
} from '../types';

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = value instanceof Date ? format(value, 'yyyy-MM-dd HH:mm') : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.join(',');
  const rowLines = rows.map((row) => row.map(escapeCsv).join(','));
  return [headerLine, ...rowLines].join('\n');
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function timestamp(): string {
  return format(new Date(), 'yyyyMMdd-HHmm');
}

export function exportTicketsCsv(tickets: Ticket[]): void {
  const csv = toCsv(
    ['id', 'title', 'category', 'priority', 'status', 'reporter_id', 'assignee_id', 'date_reported', 'due_date', 'resolved_date'],
    tickets.map((t) => [
      t.id,
      t.title,
      t.category,
      t.priority,
      t.status,
      t.reporterId,
      t.assignedToId ?? '',
      t.dateReported,
      t.dueDate ?? '',
      t.resolvedDate ?? '',
    ])
  );
  downloadCsv(`tickets-${timestamp()}.csv`, csv);
}

export function exportErrorsCsv(reports: ErrorReport[]): void {
  const csv = toCsv(
    ['id', 'title', 'category', 'priority', 'status', 'reporter_id', 'assignee_id', 'team', 'date_reported', 'completion_date'],
    reports.map((r) => [
      r.id,
      r.title,
      r.category,
      r.priority,
      r.status,
      r.reporterId,
      r.assignedToId ?? '',
      r.assignedTeam ?? '',
      r.dateReported,
      r.completionDate ?? '',
    ])
  );
  downloadCsv(`error-reports-${timestamp()}.csv`, csv);
}

export function exportFeaturesCsv(features: FeatureRequest[]): void {
  const csv = toCsv(
    ['id', 'title', 'request_type', 'priority', 'status', 'progress', 'reporter_id', 'assignee_id', 'team', 'date_submitted', 'completion_date'],
    features.map((f) => [
      f.id,
      f.title,
      f.requestType,
      f.priority,
      f.status,
      f.progress,
      f.reporterId,
      f.assignedToId ?? '',
      f.assignedTeam ?? '',
      f.dateSubmitted,
      f.completionDate ?? '',
    ])
  );
  downloadCsv(`feature-requests-${timestamp()}.csv`, csv);
}

export function exportDowntimesCsv(downtimes: DowntimeRecord[]): void {
  const csv = toCsv(
    ['id', 'title', 'type', 'reason', 'impact', 'start_time', 'end_time', 'duration_min'],
    downtimes.map((d) => [
      d.id,
      d.title,
      d.type,
      d.reason,
      d.impact,
      d.startTime,
      d.endTime ?? '',
      d.duration ?? '',
    ])
  );
  downloadCsv(`downtime-records-${timestamp()}.csv`, csv);
}

export function exportUsersCsv(users: User[]): void {
  const csv = toCsv(
    ['id', 'name', 'email', 'role', 'team', 'is_active'],
    users.map((u) => [
      u.id,
      u.name,
      u.email,
      u.role,
      u.team ?? '',
      u.isActive ? 'yes' : 'no',
    ])
  );
  downloadCsv(`users-${timestamp()}.csv`, csv);
}
