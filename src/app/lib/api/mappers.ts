import {
  User,
  Ticket,
  ErrorReport,
  FeatureRequest,
  DowntimeAnalyticsSummary,
  DowntimeComponent,
  DowntimeComponentRef,
  DowntimeLocation,
  DowntimeRecord,
  Notification,
  TeamWorkload,
  DashboardStats,
  TicketStatus,
  ErrorReportStatus,
  FeatureRequestStatus,
  StatusHistoryEntry,
  ActivityLogEntry,
  Comment,
  Attachment,
  Milestone,
  CalendarEvent,
} from '../../types';

type WrappedValue<T extends string = string> = T | { value: T; label: string };

export function unwrapValue<T extends string>(field: WrappedValue<T> | null | undefined): T {
  if (!field) return '' as T;
  if (typeof field === 'object' && 'value' in field) return field.value;
  return field as T;
}

export function parseDate(value: string | null | undefined): Date {
  return value ? new Date(value) : new Date();
}

export function mapApprovalStatus(
  data: Record<string, unknown>
): import('../../types').ApprovalStatusValue | undefined {
  const approval = data.approval as { status?: string } | undefined;
  const raw = data.approval_status ?? approval?.status;
  if (raw === null || raw === undefined || raw === '') return undefined;
  const value = unwrapValue(raw as WrappedValue<string>);
  if (value === 'pending' || value === 'approved' || value === 'rejected') {
    return value;
  }
  return undefined;
}

export function isResourcePendingApproval(
  status: string,
  approvalStatus?: import('../../types').ApprovalStatusValue
): boolean {
  if (approvalStatus === 'approved' || approvalStatus === 'rejected') {
    return false;
  }
  if (approvalStatus === 'pending') {
    return true;
  }
  return ['pending_approval', 'submission'].includes(status);
}

export function mapUser(data: Record<string, unknown>): User {
  const team = data.team as { value?: string } | string | null | undefined;
  const preferences = (data.preferences ?? {}) as Record<string, unknown>;

  return {
    id: String(data.id),
    name: String(data.name),
    email: String(data.email),
    role: data.role as User['role'],
    team: (typeof team === 'object' && team?.value ? team.value : team) as User['team'] | undefined,
    avatar: (data.avatar_url ?? data.avatar) as string | undefined,
    isActive: (data.is_active as boolean) ?? true,
    lastLogin: data.last_login ? parseDate(data.last_login as string) : undefined,
    createdAt: parseDate(data.created_at as string),
    preferences: {
      darkMode: (preferences.dark_mode as boolean) ?? false,
      emailNotifications: (preferences.email_notifications as boolean) ?? true,
      slaAlerts: (preferences.sla_alerts as boolean) ?? true,
      downtimeAlerts: (preferences.downtime_alerts as boolean) ?? true,
      digestFrequency: (preferences.digest_frequency as User['preferences']['digestFrequency']) ?? 'daily',
      quietHours: (preferences.quiet_hours as string) ?? '',
    },
  };
}

export function mapTicketListItem(data: Record<string, unknown>): Ticket {
  const reporter = data.reporter as { id?: number; name?: string } | null;
  const assignedUser = data.assigned_user as { id?: number; name?: string } | null;
  const assignedTeam = data.assigned_team as { value?: string } | null;

  return {
    id: String(data.id),
    title: String(data.title),
    description: '',
    category: unwrapValue(data.category as WrappedValue<Ticket['category']>) || 'general_report',
    priority: unwrapValue(data.priority as WrappedValue<Ticket['priority']>) || 'medium',
    status: unwrapValue(data.status as WrappedValue<TicketStatus>) || 'draft',
    reporterId: reporter?.id ? String(reporter.id) : '',
    reporterName: reporter?.name,
    assignedToId: assignedUser?.id ? String(assignedUser.id) : undefined,
    assignedToName: assignedUser?.name,
    assignedTeam: assignedTeam?.value as Ticket['assignedTeam'],
    dateReported: parseDate((data.date_reported ?? data.created_at) as string),
    dueDate: data.due_date ? parseDate(data.due_date as string) : undefined,
    slaBreached: (data.sla_breached as boolean) ?? false,
    attachments: [],
    comments: [],
    isPublicSubmission: (data.is_public_submission as boolean) ?? false,
    submitterName: data.submitter_name as string | undefined,
    submitterUnit: data.submitter_unit as string | undefined,
  };
}

export function mapTicketDetail(data: Record<string, unknown>): Ticket {
  const reporter = data.reporter as { id?: number; name?: string } | null;
  const assignedUser = data.assigned_user as { id?: number; name?: string } | null;
  const assignedTeam = data.assigned_team as { value?: string } | null;
  const effort = (data.effort ?? {}) as Record<string, unknown>;
  const time = (data.time ?? {}) as Record<string, unknown>;
  const submitter = data.submitter as {
    name?: string;
    email?: string;
    phone?: string;
    unit?: string;
  } | null;

  return {
    id: String(data.id),
    title: String(data.title),
    description: String(data.description ?? ''),
    category: unwrapValue(data.category as WrappedValue<Ticket['category']>) || 'general_report',
    priority: unwrapValue(data.priority as WrappedValue<Ticket['priority']>) || 'medium',
    status: unwrapValue(data.status as WrappedValue<TicketStatus>) || 'draft',
    approvalStatus: mapApprovalStatus(data),
    rejectionReason: (data.rejection_reason ??
      (data.approval as { rejection_reason?: string } | undefined)?.rejection_reason) as
      | string
      | undefined,
    reporterId: reporter?.id ? String(reporter.id) : '',
    reporterName: reporter?.name,
    assignedToId: assignedUser?.id ? String(assignedUser.id) : undefined,
    assignedToName: assignedUser?.name,
    assignedTeam: assignedTeam?.value as Ticket['assignedTeam'],
    dateReported: parseDate(data.date_reported as string),
    dueDate: data.due_date ? parseDate(data.due_date as string) : undefined,
    resolvedDate: data.resolved_date ? parseDate(data.resolved_date as string) : undefined,
    closedDate: data.closed_date ? parseDate(data.closed_date as string) : undefined,
    slaBreached: (data.sla_breached as boolean) ?? false,
    responseTime: time.response_time as number | undefined,
    resolutionTime: time.resolution_time as number | undefined,
    estimatedEffort: effort.estimated_effort as number | undefined,
    actualEffort: effort.actual_effort as number | undefined,
    parentTicketId: data.parent_ticket_id ? String(data.parent_ticket_id) : undefined,
    attachments: [],
    comments: [],
    isPublicSubmission: (data.is_public_submission as boolean) ?? false,
    submitterName: submitter?.name,
    submitterUnit: submitter?.unit,
    submitterEmail: submitter?.email,
    submitterPhone: submitter?.phone,
  };
}

export function mapErrorReportListItem(data: Record<string, unknown>): ErrorReport {
  const reporter = data.reporter as { id?: number; name?: string } | null;
  const assignedUser = data.assigned_user as { id?: number; name?: string } | null;
  const assignedTeam = data.assigned_team as { value?: string } | null;

  return {
    id: String(data.id),
    title: String(data.title),
    description: String(data.description ?? ''),
    category: unwrapValue(data.category as WrappedValue<ErrorReport['category']>) || 'software',
    priority: unwrapValue(data.priority as WrappedValue<ErrorReport['priority']>) || 'medium',
    status: unwrapValue(data.status as WrappedValue<ErrorReportStatus>) || 'pending_approval',
    reporterId: reporter?.id ? String(reporter.id) : '',
    reporterName: reporter?.name,
    assignedToId: assignedUser?.id ? String(assignedUser.id) : undefined,
    assignedToName: assignedUser?.name,
    assignedTeam: assignedTeam?.value as ErrorReport['assignedTeam'],
    dateReported: parseDate((data.date_reported ?? data.created_at) as string),
    completionDate: data.completion_date ? parseDate(data.completion_date as string) : undefined,
    attachments: [],
    comments: [],
    slaBreached: (data.sla_breached as boolean) ?? false,
    statusHistory: [],
    activityLog: [],
    createdAt: parseDate((data.created_at ?? data.date_reported) as string),
    updatedAt: parseDate((data.updated_at ?? data.created_at) as string),
  };
}

export function mapErrorReportDetail(data: Record<string, unknown>): ErrorReport {
  const reporter = data.reporter as { id?: number; name?: string } | null;
  const assignedUser = data.assigned_user as { id?: number; name?: string } | null;
  const assignedTeam = data.assigned_team as { value?: string } | null;
  const sla = (data.sla ?? {}) as Record<string, unknown>;

  return {
    id: String(data.id),
    title: String(data.title),
    description: String(data.description ?? ''),
    category: unwrapValue(data.category as WrappedValue<ErrorReport['category']>) || 'software',
    priority: unwrapValue(data.priority as WrappedValue<ErrorReport['priority']>) || 'medium',
    status: unwrapValue(data.status as WrappedValue<ErrorReportStatus>) || 'pending_approval',
    approvalStatus: mapApprovalStatus(data),
    rejectionReason: (data.rejection_reason ??
      (data.approval as { rejection_reason?: string } | undefined)?.rejection_reason) as
      | string
      | undefined,
    reporterId: reporter?.id ? String(reporter.id) : '',
    reporterName: reporter?.name,
    assignedToId: assignedUser?.id ? String(assignedUser.id) : undefined,
    assignedToName: assignedUser?.name,
    assignedTeam: assignedTeam?.value as ErrorReport['assignedTeam'],
    dateReported: parseDate(data.date_reported as string),
    startDate: data.start_date ? parseDate(data.start_date as string) : undefined,
    dueDate: data.due_date ? parseDate(data.due_date as string) : undefined,
    completionDate: data.completion_date ? parseDate(data.completion_date as string) : undefined,
    slaBreached: (sla.breached as boolean) ?? false,
    attachments: [],
    comments: [],
    statusHistory: [],
    activityLog: [],
    createdAt: parseDate(data.created_at as string),
    updatedAt: parseDate(data.updated_at as string),
  };
}

export function mapFeatureListItem(data: Record<string, unknown>): FeatureRequest {
  const reporter = data.reporter as { id?: number; name?: string } | null;
  const assignedUser = data.assigned_user as { id?: number; name?: string } | null;
  const assignedTeam = data.assigned_team as { value?: string } | string | null;
  const targetApplication = data.target_application as { value?: string } | null;
  const assignedTeamValue =
    typeof assignedTeam === 'object' && assignedTeam?.value
      ? assignedTeam.value
      : (assignedTeam as string | undefined);

  return {
    id: String(data.id),
    title: String(data.title),
    description: '',
    requestType: unwrapValue(data.request_type as WrappedValue<FeatureRequest['requestType']>) || 'feature_request',
    targetApplication: (targetApplication?.value as FeatureRequest['targetApplication']) ?? undefined,
    priority: unwrapValue(data.priority as WrappedValue<FeatureRequest['priority']>) || 'medium',
    status: unwrapValue(data.status as WrappedValue<FeatureRequestStatus>) || 'submission',
    progress: (data.progress as number) ?? 0,
    reporterId: reporter?.id ? String(reporter.id) : (data.reporter_id ? String(data.reporter_id) : ''),
    reporterName: reporter?.name,
    assignedToId: assignedUser?.id
      ? String(assignedUser.id)
      : data.assigned_to_id
        ? String(data.assigned_to_id)
        : undefined,
    assignedToName: assignedUser?.name,
    assignedTeam: assignedTeamValue as FeatureRequest['assignedTeam'],
    dueDate: data.due_date ? parseDate(data.due_date as string) : undefined,
    attachments: [],
    comments: [],
    milestones: [],
    slaBreached: (data.sla_breached as boolean) ?? false,
    statusHistory: [],
    activityLog: [],
    createdAt: parseDate(data.created_at as string),
    updatedAt: parseDate(data.updated_at as string),
  };
}

export function mapFeatureDetail(data: Record<string, unknown>): FeatureRequest {
  return {
    ...mapFeatureListItem(data),
    description: String(data.description ?? ''),
    approvalStatus: mapApprovalStatus(data),
    approvedBy: data.approved_by ? String(data.approved_by) : undefined,
    rejectionReason: data.rejection_reason as string | undefined,
    postImplementationNotes: data.post_implementation_notes as string | undefined,
  };
}

function mapDowntimeComponentRef(data: Record<string, unknown>): DowntimeComponentRef {
  const category = data.category as { value?: string } | string | undefined;
  const categoryValue =
    typeof category === 'object' && category?.value ? category.value : (category as string | undefined);

  return {
    id: String(data.id),
    code: String(data.code ?? ''),
    name: String(data.name ?? ''),
    category: (categoryValue as DowntimeComponentRef['category']) || 'other',
    isActive: Boolean(data.is_active ?? true),
  };
}

export function mapDowntimeLocation(data: Record<string, unknown>): DowntimeLocation {
  return {
    id: String(data.id),
    code: String(data.code ?? ''),
    name: String(data.name ?? ''),
    description: data.description as string | undefined,
    isActive: Boolean(data.is_active ?? true),
  };
}

export function mapDowntimeComponent(data: Record<string, unknown>): DowntimeComponent {
  const defaults = (data.default_affected_components as Record<string, unknown>[] | undefined) ?? [];
  return {
    ...mapDowntimeComponentRef(data),
    description: data.description as string | undefined,
    defaultAffectedComponents: defaults.map(mapDowntimeComponentRef),
  };
}

export function mapDowntimeAnalytics(data: Record<string, unknown>): DowntimeAnalyticsSummary {
  const period = (data.period as Record<string, unknown>) ?? {};
  const summary = (data.summary as Record<string, unknown>) ?? {};

  const mapComponentStat = (row: Record<string, unknown>) => ({
    componentId: String(row.component_id ?? ''),
    name: String(row.name ?? ''),
    category: String(row.category ?? ''),
    incidentCount: Number(row.incident_count ?? 0),
    totalMinutes: Number(row.total_minutes ?? 0),
    uptimePercent: Number(row.uptime_percent ?? 0),
    downtimePercent: Number(row.downtime_percent ?? 0),
  });

  return {
    period: {
      from: String(period.from ?? ''),
      to: String(period.to ?? ''),
      periodMinutes: Number(period.period_minutes ?? 0),
    },
    summary: {
      incidentCount: Number(summary.incident_count ?? 0),
      ongoingCount: Number(summary.ongoing_count ?? 0),
      resolvedCount: Number(summary.resolved_count ?? 0),
      plannedCount: Number(summary.planned_count ?? 0),
      unplannedCount: Number(summary.unplanned_count ?? 0),
      totalDowntimeMinutes: Number(summary.total_downtime_minutes ?? 0),
      averageDowntimeMinutes: Number(summary.average_downtime_minutes ?? 0),
      totalEstimatedCost: Number(summary.total_estimated_cost ?? 0),
      totalAffectedUsers: Number(summary.total_affected_users ?? 0),
    },
    impactBreakdown: ((data.impact_breakdown as Record<string, unknown>[]) ?? []).map((row) => ({
      impact: String(row.impact ?? ''),
      count: Number(row.count ?? 0),
      totalMinutes: Number(row.total_minutes ?? 0),
    })),
    mostFrequentSources: ((data.most_frequent_sources as Record<string, unknown>[]) ?? []).map(mapComponentStat),
    mostAffectedComponents: ((data.most_affected_components as Record<string, unknown>[]) ?? []).map(
      mapComponentStat
    ),
    locationFrequency: ((data.location_frequency as Record<string, unknown>[]) ?? []).map((row) => ({
      locationId: row.location_id != null ? String(row.location_id) : null,
      locationName: String(row.location_name ?? 'Unspecified'),
      incidentCount: Number(row.incident_count ?? 0),
      totalMinutes: Number(row.total_minutes ?? 0),
    })),
    componentUptime: ((data.component_uptime as Record<string, unknown>[]) ?? []).map(mapComponentStat),
    categoryUptime: ((data.category_uptime as Record<string, unknown>[]) ?? []).map((row) => ({
      category: String(row.category ?? ''),
      incidentCount: Number(row.incident_count ?? 0),
      totalMinutes: Number(row.total_minutes ?? 0),
      uptimePercent: Number(row.uptime_percent ?? 0),
      downtimePercent: Number(row.downtime_percent ?? 0),
    })),
  };
}

export function mapDowntimeRecord(data: Record<string, unknown>): DowntimeRecord {
  const type = data.type as { value?: string } | string;
  const impact = data.impact as { value?: string } | string;
  const status = data.status as { value?: string } | string;
  const duration = data.duration as { minutes?: number } | number | null;
  const reportedBy = data.reported_by as { id?: number } | null;
  const locations = ((data.locations as Record<string, unknown>[]) ?? []).map(mapDowntimeLocation);
  const sourceComponents = ((data.source_components as Record<string, unknown>[]) ?? []).map(
    mapDowntimeComponentRef
  );
  const affectedComponents = ((data.affected_components as Record<string, unknown>[]) ?? []).map(
    mapDowntimeComponentRef
  );

  const typeValue = typeof type === 'object' && type?.value ? type.value : (type as string);
  const impactValue = typeof impact === 'object' && impact?.value ? impact.value : (impact as string);
  const statusValue = typeof status === 'object' && status?.value ? status.value : (status as string);
  const durationMinutes =
    typeof duration === 'object' && duration?.minutes != null
      ? duration.minutes
      : (duration as number | undefined);

  return {
    id: String(data.id),
    title: String(data.title),
    type: (typeValue as DowntimeRecord['type']) || 'unplanned',
    reason: String(data.reason ?? ''),
    startTime: parseDate(data.start_time as string),
    endTime: data.end_time ? parseDate(data.end_time as string) : undefined,
    duration: durationMinutes ?? undefined,
    affectedSystems: affectedComponents.map((c) => c.name),
    locations,
    sourceComponents,
    affectedComponents,
    impact: (impactValue as DowntimeRecord['impact']) || 'medium',
    reportedBy: reportedBy?.id ? String(reportedBy.id) : '',
    description: data.description as string | undefined,
    status: (statusValue as DowntimeRecord['status']) || 'ongoing',
    rootCause: data.root_cause as string | undefined,
    preventiveMeasures: data.preventive_measures as string | undefined,
    affectedUsers: data.affected_users as number | undefined,
    estimatedCost: data.estimated_cost as number | undefined,
  };
}

export function mapNotification(data: Record<string, unknown>): Notification {
  const type = data.type as { value?: string } | string;
  const priority = data.priority as { value?: string } | string;
  const ticket = data.ticket as { id?: number } | null;
  const downtime = data.downtime as { id?: number } | null;

  return {
    id: String(data.id),
    type: (typeof type === 'object' && type?.value ? type.value : type) as Notification['type'],
    title: String(data.title),
    message: String(data.message ?? ''),
    userId: '',
    ticketId: ticket?.id ? String(ticket.id) : undefined,
    downtimeId: downtime?.id ? String(downtime.id) : undefined,
    isRead: (data.is_read as boolean) ?? false,
    createdAt: parseDate(data.created_at as string),
    actionUrl: data.action_url as string | undefined,
    priority: (typeof priority === 'object' && priority?.value ? priority.value : priority) as Notification['priority'],
  };
}

export function mapTeamWorkload(data: Record<string, unknown>): TeamWorkload {
  const team = data.team as { value?: string };
  const tickets = (data.tickets ?? {}) as Record<string, number>;
  const performance = (data.performance ?? {}) as Record<string, unknown>;
  const avgResponse = performance.average_response_time as { hours?: number } | null;
  const avgResolution = performance.average_resolution_time as { hours?: number } | null;

  return {
    team: (team?.value ?? 'programmer') as TeamWorkload['team'],
    totalTickets: tickets.total ?? 0,
    openTickets: tickets.open ?? 0,
    resolvedTickets: tickets.resolved ?? 0,
    overdueTickets: tickets.overdue ?? 0,
    averageResponseTime: avgResponse?.hours ?? 0,
    averageResolutionTime: avgResolution?.hours ?? 0,
    slaCompliance: (performance.sla_compliance as number) ?? 0,
    workloadPercentage: Number(data.workload_percentage ?? 0),
    members: [],
  };
}

export function mapStatusHistory(data: Record<string, unknown>): StatusHistoryEntry {
  const changedAt = parseDate((data.changed_at ?? data.created_at) as string);
  return {
    id: String(data.id),
    previousStatus: String(data.previous_status ?? data.from_status ?? ''),
    newStatus: String(data.new_status ?? data.to_status ?? data.status ?? ''),
    changedBy: String(data.changed_by ?? data.user_id ?? ''),
    changedAt,
    effectiveAt: parseDate((data.effective_at ?? data.changed_at ?? data.created_at) as string),
    reason: data.reason as string | undefined,
    notes: data.notes as string | undefined,
  };
}

export function mapCalendarEvent(data: Record<string, unknown>): CalendarEvent {
  const type = data.type as { value?: string } | string | null | undefined;
  const rawType = typeof type === 'object' && type ? type.value : (type as string);
  const allowed: CalendarEvent['type'][] = ['planned_downtime', 'maintenance', 'deadline'];
  const parsedType = (allowed.includes(rawType as CalendarEvent['type'])
    ? rawType
    : 'maintenance') as CalendarEvent['type'];

  const recurring = data.recurring as
    | { frequency?: string; interval?: number; end_date?: string | null }
    | null;

  const allowedFrequencies = ['daily', 'weekly', 'monthly'] as const;
  type Frequency = (typeof allowedFrequencies)[number];
  const parsedFrequency: Frequency = allowedFrequencies.includes(
    recurring?.frequency as Frequency
  )
    ? (recurring!.frequency as Frequency)
    : 'weekly';

  return {
    id: String(data.id),
    title: String(data.title ?? ''),
    start: parseDate(data.start as string),
    end: parseDate(data.end as string),
    type: parsedType,
    description: (data.description as string) ?? undefined,
    color: String(data.color ?? '#3b82f6'),
    allDay: Boolean(data.all_day ?? true),
    recurring: recurring
      ? {
          frequency: parsedFrequency,
          interval: recurring.interval ?? 1,
          endDate: recurring.end_date ? parseDate(recurring.end_date) : undefined,
        }
      : undefined,
  };
}

export function mapMilestone(data: Record<string, unknown>): Milestone {
  return {
    id: String(data.id),
    title: String(data.title ?? ''),
    description: (data.description as string) ?? undefined,
    targetDate: data.target_date ? parseDate(data.target_date as string) : new Date(),
    completedDate: data.completed_date ? parseDate(data.completed_date as string) : undefined,
    isCompleted: Boolean(data.is_completed),
    progress: Number(data.progress ?? 0),
    createdBy: String(data.created_by ?? ''),
    createdAt: parseDate(data.created_at as string),
  };
}

export function mapAttachment(data: Record<string, unknown>): Attachment {
  const uploader = data.uploader as { id?: number | string; name?: string } | null;
  return {
    id: String(data.id),
    name: String(data.name ?? ''),
    size: Number(data.size ?? 0),
    type: String(data.type ?? ''),
    url: String(data.url ?? ''),
    uploadedBy: uploader ? String(uploader.id ?? '') : String(data.uploaded_by ?? ''),
    uploadedAt: parseDate(data.uploaded_at as string),
  };
}

export function mapComment(data: Record<string, unknown>): Comment {
  return {
    id: String(data.id),
    ticketId: String(data.ticket_id ?? data.error_id ?? data.feature_id ?? ''),
    userId: String(data.user_id ?? ''),
    content: String(data.content ?? ''),
    createdAt: parseDate(data.created_at as string),
    updatedAt: data.updated_at ? parseDate(data.updated_at as string) : undefined,
    mentions: (data.mentions as Array<{ user_id?: string | number }> ?? []).map((m) =>
      String(m.user_id ?? '')
    ),
    attachments: [],
    isInternal: (data.is_internal as boolean) ?? false,
  };
}

export function mapActivityLog(data: Record<string, unknown>): ActivityLogEntry {
  const actionRaw = data.action;
  const actionValue =
    typeof actionRaw === 'object' && actionRaw !== null
      ? String((actionRaw as { value?: string }).value ?? 'updated')
      : String(actionRaw ?? 'updated');

  const performer = data.performed_by as { id?: number | string } | string | number | null;
  const performedById =
    typeof performer === 'object' && performer !== null
      ? String(performer.id ?? '')
      : String(performer ?? data.user_id ?? '');

  const loggable = data.loggable as { id?: string | number; type?: string } | undefined;

  return {
    id: String(data.id),
    action: actionValue,
    description: String(data.description ?? data.message ?? ''),
    performedBy: performedById,
    performedAt: parseDate((data.performed_at ?? data.created_at) as string),
    details: data.details as Record<string, unknown> | undefined,
    targetUserId: data.target_user_id ? String(data.target_user_id) : undefined,
    loggableId: loggable?.id != null ? String(loggable.id) : undefined,
    loggableType: loggable?.type ? String(loggable.type) : undefined,
  };
}

export function mapConversionHistory(data: Record<string, unknown>): import('../../types').ConversionHistoryEntry {
  const sourceRaw = data.source_ticket;
  const source =
    typeof sourceRaw === 'string'
      ? { id: sourceRaw, title: '' }
      : ((sourceRaw ?? {}) as Record<string, unknown>);
  const target = (data.target ?? {}) as Record<string, unknown>;
  const targetDetail = (target.detail ?? {}) as Record<string, unknown>;
  const convertedByRaw = data.converted_by;
  const convertedByName =
    typeof convertedByRaw === 'string'
      ? convertedByRaw
      : typeof convertedByRaw === 'object' && convertedByRaw !== null
        ? String((convertedByRaw as { name?: string }).name ?? (convertedByRaw as { id?: string }).id ?? '')
        : undefined;

  return {
    id: String(data.id),
    sourceTicketId: String(source.id ?? sourceRaw ?? ''),
    sourceTicketTitle: String(source.title ?? ''),
    targetType: String(target.type ?? data.target_type ?? target.label ?? ''),
    targetId: String(target.id ?? ''),
    targetTitle: targetDetail.title ? String(targetDetail.title) : undefined,
    convertedBy: convertedByName || undefined,
    convertedAt: parseDate((data.converted_at ?? data.created_at) as string),
    reason: data.reason as string | undefined,
    notes: data.notes as string | undefined,
  };
}

export function mapSystemConfigItem(data: Record<string, unknown>): import('../../types').SystemConfigItem {
  const updater = data.updated_by as { name?: string } | null;
  return {
    id: String(data.id),
    key: String(data.config_key ?? data.key ?? ''),
    value: String(data.config_value ?? data.value ?? ''),
    description: data.description as string | undefined,
    updatedBy: updater?.name,
    updatedAt: data.updated_at ? parseDate(data.updated_at as string) : undefined,
  };
}

export function mapDashboardStatsFromApi(data: Record<string, unknown>): import('../../types').DashboardStats {
  const breakdown = (data.status_breakdown ?? {}) as Record<string, number>;
  return {
    totalTickets: Number(data.total_tickets ?? 0),
    openTickets: Number(data.open_tickets ?? 0),
    resolvedToday: Number(data.resolved_today ?? 0),
    overdueTickets: Number(data.overdue_tickets ?? 0),
    criticalTickets: Number(data.critical_tickets ?? 0),
    activeDowntimes: Number(data.active_downtimes ?? 0),
    downtimeHours: Number(data.downtime_hours ?? 0),
    averageResolutionTime: Number(data.average_resolution_time ?? 0),
    slaCompliance: Number(data.sla_compliance ?? 0),
    userSatisfactionScore: data.user_satisfaction_score != null
      ? Number(data.user_satisfaction_score)
      : 0,
    uptimePercent: data.uptime_percent != null ? Number(data.uptime_percent) : undefined,
    statusBreakdown: {
      inProgress: Number(breakdown.in_progress ?? 0),
      resolved: Number(breakdown.resolved ?? 0),
    },
  };
}

export function mapMention(data: Record<string, unknown>): import('../../types').Mention {
  const user = data.user as Record<string, unknown> | undefined;
  const comment = data.comment as Record<string, unknown> | undefined;
  return {
    id: String(data.id),
    commentId: String(data.comment_id ?? ''),
    userName: user?.name ? String(user.name) : undefined,
    content: comment?.content ? String(comment.content) : undefined,
    commentableId: comment?.commentable_id ? String(comment.commentable_id) : undefined,
    commentableType: comment?.commentable_type ? String(comment.commentable_type) : undefined,
    createdAt: comment?.created_at ? parseDate(comment.created_at as string) : new Date(),
  };
}

export function computeDashboardStats(
  tickets: Ticket[],
  downtimes: DowntimeRecord[],
  teamWorkloads: TeamWorkload[],
  totalTicketCount?: number
): DashboardStats {
  const openStatuses: TicketStatus[] = ['draft', 'pending_approval', 'assigned', 'in_progress', 'waiting_for_user'];
  const openTickets = tickets.filter((t) => openStatuses.includes(t.status)).length;
  const overdueTickets = tickets.filter((t) => t.slaBreached).length;
  const criticalTickets = tickets.filter((t) => t.priority === 'critical').length;
  const resolvedToday = tickets.filter((t) => {
    if (!t.resolvedDate) return false;
    const today = new Date();
    return t.resolvedDate.toDateString() === today.toDateString();
  }).length;

  const activeDowntimes = downtimes.filter((d) => d.status === 'ongoing').length;
  const downtimeHours = downtimes.reduce((sum, d) => sum + (d.duration ?? 0) / 60, 0);

  const avgSla =
    teamWorkloads.length > 0
      ? teamWorkloads.reduce((sum, t) => sum + t.slaCompliance, 0) / teamWorkloads.length
      : 0;

  const avgResolution =
    teamWorkloads.length > 0
      ? teamWorkloads.reduce((sum, t) => sum + t.averageResolutionTime, 0) / teamWorkloads.length
      : 0;

  return {
    totalTickets: totalTicketCount ?? tickets.length,
    openTickets,
    resolvedToday,
    overdueTickets,
    averageResolutionTime: avgResolution,
    slaCompliance: Math.round(avgSla),
    downtimeHours: Math.round(downtimeHours * 10) / 10,
    activeDowntimes,
    criticalTickets,
    userSatisfactionScore: 0,
  };
}

export function preferencesToApi(preferences: Partial<User['preferences']>): Record<string, unknown> {
  const map: Record<string, string> = {
    darkMode: 'dark_mode',
    emailNotifications: 'email_notifications',
    slaAlerts: 'sla_alerts',
    downtimeAlerts: 'downtime_alerts',
    digestFrequency: 'digest_frequency',
    quietHours: 'quiet_hours',
  };

  const result: Record<string, unknown> = {};
  Object.entries(preferences).forEach(([key, value]) => {
    const apiKey = map[key];
    if (apiKey) result[apiKey] = value;
  });
  return result;
}

function mapOpsUser(data: Record<string, unknown> | null | undefined): import('../../types').OpsUserRef | undefined {
  if (!data?.id) return undefined;
  return {
    id: String(data.id),
    name: String(data.name ?? ''),
    username: data.username ? String(data.username) : undefined,
  };
}

function unwrapEnumValue(raw: unknown, fallback: string): string {
  if (typeof raw === 'object' && raw !== null && 'value' in raw) {
    return String((raw as { value?: string }).value ?? fallback);
  }
  return String(raw ?? fallback);
}

export function mapBackupRestoreTest(data: Record<string, unknown>): import('../../types').BackupRestoreTest {
  return {
    id: String(data.id),
    testDate: parseDate(data.test_date as string),
    performedBy: mapOpsUser(data.performed_by as Record<string, unknown>),
    applicationSystem: String(data.application_system ?? ''),
    restoreType: unwrapEnumValue(data.restore_type, 'database') as import('../../types').RestoreType,
    backupDatetime: data.backup_datetime ? parseDate(data.backup_datetime as string) : undefined,
    backupSource: data.backup_source ? String(data.backup_source) : undefined,
    testEnvironment: String(data.test_environment ?? ''),
    result: unwrapEnumValue(data.result, 'success') as import('../../types').RestoreTestResult,
    notes: data.notes ? String(data.notes) : undefined,
    followUp: data.follow_up ? String(data.follow_up) : undefined,
    createdBy: mapOpsUser(data.created_by as Record<string, unknown>),
    createdAt: parseDate(data.created_at as string),
    updatedAt: parseDate(data.updated_at as string),
  };
}

export function mapServerRoomVisitor(data: Record<string, unknown>): import('../../types').ServerRoomVisitor {
  return {
    id: String(data.id),
    entryAt: parseDate(data.entry_at as string),
    exitAt: data.exit_at ? parseDate(data.exit_at as string) : undefined,
    visitorName: String(data.visitor_name ?? ''),
    unitOrVendor: String(data.unit_or_vendor ?? ''),
    identityDocument: String(data.identity_document ?? ''),
    purpose: String(data.purpose ?? ''),
    escortedBy: mapOpsUser(data.escorted_by as Record<string, unknown>),
    notes: data.notes ? String(data.notes) : undefined,
    status: unwrapEnumValue(data.status, 'inside') as import('../../types').VisitorStatus,
    createdBy: mapOpsUser(data.created_by as Record<string, unknown>),
    createdAt: parseDate(data.created_at as string),
    updatedAt: parseDate(data.updated_at as string),
  };
}

export function mapServerRoomInspection(data: Record<string, unknown>): import('../../types').ServerRoomInspection {
  const items = (data.checklist_items ?? {}) as Record<string, { ok?: boolean; notes?: string | null }>;
  const mapItem = (key: string) => ({
    ok: Boolean(items[key]?.ok),
    notes: items[key]?.notes ?? null,
  });

  return {
    id: String(data.id),
    inspectionDate: parseDate(data.inspection_date as string),
    inspector: mapOpsUser(data.inspector as Record<string, unknown>),
    inspectionType: unwrapEnumValue(data.inspection_type, 'weekly') as import('../../types').InspectionType,
    checklistItems: {
      ups: mapItem('ups'),
      alarm: mapItem('alarm'),
      cable_rack: mapItem('cable_rack'),
    },
    conclusion: unwrapEnumValue(data.conclusion, 'safe') as import('../../types').InspectionConclusion,
    followUp: data.follow_up ? String(data.follow_up) : undefined,
    escalation: data.escalation
      ? (unwrapEnumValue(data.escalation, '') as import('../../types').InspectionEscalation)
      : undefined,
    notes: data.notes ? String(data.notes) : undefined,
    createdBy: mapOpsUser(data.created_by as Record<string, unknown>),
    createdAt: parseDate(data.created_at as string),
    updatedAt: parseDate(data.updated_at as string),
  };
}

