import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
  apiRequest,
  apiGetPaginated,
  apiDownload,
  setToken,
  clearToken,
} from './client';
import {
  mapUser,
  mapTicketListItem,
  mapTicketDetail,
  mapErrorReportListItem,
  mapErrorReportDetail,
  mapFeatureListItem,
  mapFeatureDetail,
  mapDowntimeRecord,
  mapNotification,
  mapTeamWorkload,
  mapStatusHistory,
  mapActivityLog,
  mapComment,
  mapAttachment,
  mapMilestone,
  mapTimelineEntry,
  mapCalendarEvent,
  computeDashboardStats,
  preferencesToApi,
  mapTag,
  mapTicketWatcher,
  mapConversionHistory,
  mapSystemConfigItem,
} from './mappers';
import {
  User,
  Ticket,
  ErrorReport,
  FeatureRequest,
  DowntimeRecord,
  Notification,
  TeamWorkload,
  DashboardStats,
  UserPreferences,
  Comment,
  Attachment,
  Milestone,
  TimelineEntry,
  CalendarEvent,
  Tag,
  TicketWatcher,
  ConversionHistoryEntry,
  SystemConfigItem,
  ActivityLogEntry,
} from '../../types';

let usersCache: User[] = [];

export function getCachedUsers(): User[] {
  return usersCache;
}

export function setCachedUsers(users: User[]): void {
  usersCache = users;
}

export interface LoginResult {
  user: User;
  token: string;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const response = await apiPost<{ user: Record<string, unknown>; token: string }>(
    '/login',
    { email, password },
    false
  );
  setToken(response.token);
  const user = mapUser(response.user);
  return { user, token: response.token };
}

export async function logout(): Promise<void> {
  try {
    await apiPost('/logout');
  } finally {
    clearToken();
    usersCache = [];
  }
}

export async function fetchCurrentUser(): Promise<User> {
  const response = await apiGet<{ success: boolean; data: Record<string, unknown> }>('/me');
  return mapUser(response.data);
}

export async function updatePreferences(preferences: Partial<UserPreferences>): Promise<User> {
  const response = await apiPatch<{ success: boolean; data: Record<string, unknown> }>(
    '/me/preferences',
    preferencesToApi(preferences)
  );
  return mapUser(response.data);
}

export async function fetchUsers(params?: Record<string, string | number>): Promise<User[]> {
  const { data } = await apiGetPaginated<Record<string, unknown>[]>('/users', {
    per_page: 100,
    ...params,
  });
  usersCache = (data as unknown as Record<string, unknown>[]).map(mapUser);
  return usersCache;
}

export interface UserPayload {
  name: string;
  username: string;
  email: string;
  password?: string;
  role: string;
  team?: string | null;
  is_active?: boolean;
}

export async function fetchUserDetail(id: string): Promise<User> {
  const response = await apiGet<{ success: boolean; data: Record<string, unknown> }>(
    `/users/${id}`
  );
  return mapUser(response.data);
}

export async function createUser(payload: UserPayload): Promise<User> {
  const response = await apiPost<{ success: boolean; data: Record<string, unknown> }>(
    '/users',
    payload
  );
  return mapUser(response.data);
}

export async function updateUser(id: string, payload: Partial<UserPayload>): Promise<User> {
  const response = await apiRequest<{ success: boolean; data: Record<string, unknown> }>(
    `/users/${id}`,
    { method: 'PUT', body: payload }
  );
  return mapUser(response.data);
}

export async function deleteUser(id: string): Promise<void> {
  await apiDelete(`/users/${id}`);
}

export async function toggleUserActive(id: string): Promise<User> {
  const response = await apiPatch<{ success: boolean; data: Record<string, unknown> }>(
    `/users/${id}/toggle-active`
  );
  return mapUser(response.data);
}

export async function fetchTickets(params?: Record<string, string | number>): Promise<{
  tickets: Ticket[];
  total: number;
}> {
  const { data, meta } = await apiGetPaginated<Record<string, unknown>[]>('/tickets', {
    per_page: 50,
    ...params,
  });
  const tickets = (data as unknown as Record<string, unknown>[]).map(mapTicketListItem);
  return { tickets, total: meta.total };
}

export async function createTicket(payload: {
  title: string;
  description: string;
  category: string;
  priority: string;
  due_date?: string;
}): Promise<Ticket> {
  const response = await apiPost<{ success: boolean; data: Record<string, unknown> }>(
    '/tickets',
    payload
  );
  return mapTicketDetail(response.data);
}

export async function fetchTicketDetail(id: string): Promise<Ticket> {
  const response = await apiGet<{ success: boolean; data: Record<string, unknown> }>(
    `/tickets/${id}`
  );
  return mapTicketDetail(response.data);
}

export async function fetchTicketStatusHistory(id: string) {
  const response = await apiGet<{ success: boolean; data: Record<string, unknown>[] }>(
    `/tickets/${id}/status`
  );
  return (response.data ?? []).map(mapStatusHistory);
}

export async function fetchTicketActivityLogs(id: string) {
  const response = await apiGet<{ success: boolean; data: Record<string, unknown>[] }>(
    `/tickets/${id}/activity-logs`
  );
  return (response.data ?? []).map(mapActivityLog);
}

export async function fetchGlobalActivityLogs(params?: {
  per_page?: number;
  action?: string;
}): Promise<ActivityLogEntry[]> {
  const { data } = await apiGetPaginated<Record<string, unknown>[]>('/activity-logs', {
    per_page: params?.per_page ?? 30,
    action: params?.action,
  });
  return (data as unknown as Record<string, unknown>[]).map(mapActivityLog);
}

export async function fetchErrorReports(params?: Record<string, string | number>): Promise<{
  reports: ErrorReport[];
  total: number;
}> {
  const { data, meta } = await apiGetPaginated<Record<string, unknown>[]>('/error-reports', {
    per_page: 50,
    ...params,
  });
  const reports = (data as unknown as Record<string, unknown>[]).map(mapErrorReportListItem);
  return { reports, total: meta.total };
}

export async function fetchErrorReportDetail(id: string): Promise<ErrorReport> {
  const response = await apiGet<{ success: boolean; data: Record<string, unknown> }>(
    `/error-reports/${id}`
  );
  return mapErrorReportDetail(response.data);
}

export async function createErrorReport(payload: {
  title: string;
  description: string;
  category: string;
  priority: string;
}): Promise<ErrorReport> {
  const response = await apiPost<{ success: boolean; data: Record<string, unknown> }>(
    '/error-reports',
    payload
  );
  return mapErrorReportDetail(response.data);
}

export async function fetchErrorStatusHistory(id: string) {
  const response = await apiGet<{ success: boolean; data: Record<string, unknown>[] }>(
    `/errors/${id}/status`
  );
  return (response.data ?? []).map(mapStatusHistory);
}

export async function fetchErrorActivityLogs(id: string) {
  const response = await apiGet<{ success: boolean; data: Record<string, unknown>[] }>(
    `/errors/${id}/activity-logs`
  );
  return (response.data ?? []).map(mapActivityLog);
}

type CommentParent = 'tickets' | 'errors' | 'features';

export async function fetchComments(parent: CommentParent, id: string): Promise<Comment[]> {
  const response = await apiGet<{ data: Record<string, unknown>[] } | { success: boolean; data: Record<string, unknown>[] }>(
    `/${parent}/${id}/comments`
  );
  const data = (response as { data?: Record<string, unknown>[] }).data ?? [];
  return data.map(mapComment);
}

export async function createComment(
  parent: CommentParent,
  id: string,
  content: string,
  isInternal = false
): Promise<Comment> {
  const response = await apiPost<{ data: Record<string, unknown> } | { success: boolean; data: Record<string, unknown> }>(
    `/${parent}/${id}/comments`,
    { content, is_internal: isInternal }
  );
  const data = (response as { data?: Record<string, unknown> }).data ?? (response as unknown as Record<string, unknown>);
  return mapComment(data);
}

export interface PublicSubmissionPayload {
  submission_type: 'error_report' | 'feature_request';
  title: string;
  description: string;
  category: string;
  priority: string;
  submitter_name: string;
  submitter_email: string;
  submitter_phone?: string;
  submitter_unit?: string;
}

export interface PublicSubmissionResult {
  reference_number: string;
  submission_type: string;
  status: string;
  submitted_at: string;
}

export async function submitPublicRequest(
  payload: PublicSubmissionPayload,
  files: File[] = []
): Promise<PublicSubmissionResult> {
  const apiKey = import.meta.env.VITE_PUBLIC_API_KEY;
  if (!apiKey) {
    throw new Error('Public submissions are not configured on this deployment.');
  }

  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      form.append(key, String(value));
    }
  });
  files.forEach((file) => form.append('files[]', file));

  const response = await apiRequest<{ success: boolean; data: PublicSubmissionResult }>(
    '/public/submit',
    {
      method: 'POST',
      body: form,
      auth: false,
      headers: { 'X-API-Key': apiKey },
    }
  );
  return response.data;
}

type StatusTarget = 'tickets' | 'errors' | 'features';

export async function updateResourceStatus(
  target: StatusTarget,
  id: string,
  payload: { status: string; reason?: string; notes?: string }
): Promise<void> {
  await apiPatch(`/${target}/${id}/status`, payload);
}

type ApprovalTarget = 'tickets' | 'errors' | 'features';

export async function approveResource(target: ApprovalTarget, id: string): Promise<void> {
  await apiPost(`/${target}/${id}/approve`);
}

export async function rejectResource(
  target: ApprovalTarget,
  id: string,
  rejectionReason: string
): Promise<void> {
  await apiPost(`/${target}/${id}/reject`, { rejection_reason: rejectionReason });
}

type AssignmentTarget = 'tickets' | 'errors' | 'features';

export async function assignUser(
  target: AssignmentTarget,
  id: string,
  userId: string | number
): Promise<void> {
  await apiPost(`/${target}/${id}/assign/user`, { user_id: Number(userId) });
}

export async function assignTeam(
  target: AssignmentTarget,
  id: string,
  team: string
): Promise<void> {
  await apiPost(`/${target}/${id}/assign/team`, { team });
}

export async function unassignUser(target: AssignmentTarget, id: string): Promise<void> {
  await apiPost(`/${target}/${id}/unassign/user`);
}

export async function unassignTeam(target: AssignmentTarget, id: string): Promise<void> {
  await apiPost(`/${target}/${id}/unassign/team`);
}

type AttachmentParent = 'tickets' | 'errors' | 'features' | 'comments';

export async function fetchAttachments(
  parent: AttachmentParent,
  id: string
): Promise<Attachment[]> {
  const { data } = await apiGetPaginated<Record<string, unknown>[]>(
    `/${parent}/${id}/attachments`,
    { per_page: 100 }
  );
  return (data as unknown as Record<string, unknown>[]).map(mapAttachment);
}

export async function uploadAttachment(
  parent: AttachmentParent,
  id: string,
  file: File
): Promise<Attachment> {
  const form = new FormData();
  form.append('file', file);
  const response = await apiRequest<{ success: boolean; data: Record<string, unknown> }>(
    `/${parent}/${id}/attachments`,
    { method: 'POST', body: form }
  );
  return mapAttachment(response.data);
}

export async function deleteAttachment(
  parent: AttachmentParent,
  parentId: string,
  attachmentId: string
): Promise<void> {
  await apiDelete(`/${parent}/${parentId}/attachments/${attachmentId}`);
}

export async function fetchFeatureRequests(params?: Record<string, string | number>): Promise<{
  features: FeatureRequest[];
  total: number;
}> {
  const { data, meta } = await apiGetPaginated<Record<string, unknown>[]>('/feature-requests', {
    per_page: 50,
    ...params,
  });
  const features = (data as unknown as Record<string, unknown>[]).map(mapFeatureListItem);
  return { features, total: meta.total };
}

export async function fetchFeatureDetail(id: string): Promise<FeatureRequest> {
  const response = await apiGet<{ success: boolean; data: Record<string, unknown> }>(
    `/feature-requests/${id}`
  );
  return mapFeatureDetail(response.data);
}

export async function createFeatureRequest(payload: {
  title: string;
  description: string;
  request_type: string;
  priority: string;
}): Promise<FeatureRequest> {
  const response = await apiPost<{ success: boolean; data: Record<string, unknown> }>(
    '/feature-requests',
    { ...payload, is_direct_input: true }
  );
  return mapFeatureDetail(response.data);
}

export async function fetchFeatureMilestones(featureId: string): Promise<Milestone[]> {
  const { data } = await apiGetPaginated<Record<string, unknown>[]>(
    `/feature-requests/${featureId}/milestones`,
    { per_page: 100 }
  );
  return (data as unknown as Record<string, unknown>[]).map(mapMilestone);
}

export async function fetchFeatureTimeline(featureId: string): Promise<TimelineEntry[]> {
  const { data } = await apiGetPaginated<Record<string, unknown>[]>(
    `/feature-requests/${featureId}/timelines`,
    { per_page: 100 }
  );
  return (data as unknown as Record<string, unknown>[]).map(mapTimelineEntry);
}

export async function fetchCalendarEvents(params?: {
  from?: string;
  to?: string;
  type?: string;
}): Promise<CalendarEvent[]> {
  const { data } = await apiGetPaginated<Record<string, unknown>[]>('/calendar-events', {
    per_page: 200,
    ...(params ?? {}),
  });
  return (data as unknown as Record<string, unknown>[]).map(mapCalendarEvent);
}

export async function fetchUpcomingEvents(days = 7): Promise<CalendarEvent[]> {
  const response = await apiGet<{ success: boolean; data: Record<string, unknown>[] }>(
    '/calendar-events/upcoming',
    { days }
  );
  return (response.data ?? []).map(mapCalendarEvent);
}

export async function fetchDowntimeRecords(params?: Record<string, string | number>): Promise<{
  records: DowntimeRecord[];
  total: number;
}> {
  const { data, meta } = await apiGetPaginated<Record<string, unknown>[]>('/downtime-records', {
    per_page: 100,
    ...params,
  });
  const records = (data as unknown as Record<string, unknown>[]).map(mapDowntimeRecord);
  return { records, total: meta.total };
}

export async function createDowntimeRecord(payload: {
  title: string;
  type: string;
  reason: string;
  start_time: string;
  impact: string;
  description?: string;
  end_time?: string;
}): Promise<DowntimeRecord> {
  const response = await apiPost<{ success: boolean; data: Record<string, unknown> }>(
    '/downtime-records',
    payload
  );
  return mapDowntimeRecord(response.data);
}

export async function fetchNotifications(params?: Record<string, string | number>): Promise<Notification[]> {
  const response = await apiGet<{ success: boolean; data: Record<string, unknown>[] }>(
    '/notifications',
    { per_page: 50, ...params }
  );
  return (response.data ?? []).map(mapNotification);
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const response = await apiGet<{ success: boolean; data: { count: number } }>(
    '/notifications/unread-count'
  );
  return response.data?.count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiPatch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiPatch('/notifications/read-all');
}

export async function fetchTeamWorkloadLatest(): Promise<TeamWorkload[]> {
  const response = await apiGet<{ success: boolean; data: Record<string, unknown>[] }>(
    '/team-workload/latest'
  );
  const data = response.data ?? [];
  return (Array.isArray(data) ? data : [data]).map(mapTeamWorkload);
}

export async function fetchDashboardData(): Promise<{
  stats: DashboardStats;
  tickets: Ticket[];
  downtimes: DowntimeRecord[];
  teamWorkload: TeamWorkload[];
}> {
  const [ticketsResult, downtimesResult, teamWorkload] = await Promise.all([
    fetchTickets({ per_page: 50 }),
    fetchDowntimeRecords({ per_page: 50 }),
    fetchTeamWorkloadLatest().catch(() => [] as TeamWorkload[]),
  ]);

  const stats = computeDashboardStats(
    ticketsResult.tickets,
    downtimesResult.records,
    teamWorkload,
    ticketsResult.total
  );

  return {
    stats,
    tickets: ticketsResult.tickets,
    downtimes: downtimesResult.records,
    teamWorkload,
  };
}

export async function searchTickets(query: string): Promise<Ticket[]> {
  const { tickets } = await fetchTickets({ search: query, per_page: 10 });
  return tickets;
}

export async function searchDowntimes(query: string): Promise<DowntimeRecord[]> {
  const { records } = await fetchDowntimeRecords({ per_page: 100 });
  const lower = query.toLowerCase();
  return records.filter(
    (d) =>
      d.title.toLowerCase().includes(lower) ||
      d.reason.toLowerCase().includes(lower) ||
      d.id.toLowerCase().includes(lower)
  );
}

export async function searchUsers(query: string): Promise<User[]> {
  if (usersCache.length === 0) {
    try {
      await fetchUsers({ search: query, per_page: 10 });
    } catch {
      return [];
    }
  }
  const lower = query.toLowerCase();
  return usersCache.filter(
    (u) =>
      u.name.toLowerCase().includes(lower) ||
      u.email.toLowerCase().includes(lower)
  );
}

type TagResourceType = 'tickets' | 'errors' | 'features';

export async function fetchTags(params?: Record<string, string | number>): Promise<Tag[]> {
  const { data } = await apiGetPaginated<Record<string, unknown>[]>('/tags', {
    per_page: 100,
    ...params,
  });
  return (data as unknown as Record<string, unknown>[]).map(mapTag);
}

export async function createTag(name: string): Promise<Tag> {
  const response = await apiPost<{ success: boolean; data: Record<string, unknown> }>(
    '/tags',
    { name }
  );
  return mapTag(response.data);
}

export async function syncResourceTags(
  resourceType: TagResourceType,
  resourceId: string,
  tagIds: number[]
): Promise<Tag[]> {
  const response = await apiRequest<{ success: boolean; data: Record<string, unknown>[] }>(
    `/${resourceType}/${resourceId}/tags/sync`,
    { method: 'PUT', body: { tag_ids: tagIds } }
  );
  return (response.data ?? []).map(mapTag);
}

export async function fetchTicketWatchers(ticketId: string): Promise<TicketWatcher[]> {
  const response = await apiGet<{ success: boolean; data: Record<string, unknown>[] }>(
    `/tickets/${ticketId}/watchers`
  );
  return (response.data ?? []).map(mapTicketWatcher);
}

export async function fetchWatchStatus(ticketId: string): Promise<{ isWatching: boolean; watchersCount: number }> {
  const response = await apiGet<{ success: boolean; data: { is_watching: boolean; watchers_count: number } }>(
    `/tickets/${ticketId}/watch/status`
  );
  return {
    isWatching: response.data?.is_watching ?? false,
    watchersCount: response.data?.watchers_count ?? 0,
  };
}

export async function toggleTicketWatch(ticketId: string): Promise<boolean> {
  const response = await apiPost<{ success: boolean; data: { is_watching: boolean } }>(
    `/tickets/${ticketId}/watch`
  );
  return response.data?.is_watching ?? false;
}

export async function addTicketWatcher(ticketId: string, userId: string): Promise<TicketWatcher[]> {
  const response = await apiPost<{ success: boolean; data: Record<string, unknown>[] }>(
    `/tickets/${ticketId}/watchers`,
    { user_id: Number(userId) }
  );
  return (response.data ?? []).map(mapTicketWatcher);
}

export async function removeTicketWatcher(ticketId: string, userId: string): Promise<TicketWatcher[]> {
  const response = await apiDelete<{ success: boolean; data: Record<string, unknown>[] }>(
    `/tickets/${ticketId}/watchers/${userId}`
  );
  return (response.data ?? []).map(mapTicketWatcher);
}

export async function fetchTicketConversionHistory(ticketId: string): Promise<ConversionHistoryEntry | null> {
  const response = await apiGet<{ success: boolean; data: Record<string, unknown> | null }>(
    `/tickets/${ticketId}/conversion-history`
  );
  return response.data ? mapConversionHistory(response.data) : null;
}

export async function convertTicketToError(
  ticketId: string,
  payload: { category: string; conversion_reason: string; priority?: string }
): Promise<void> {
  await apiPost(`/tickets/${ticketId}/convert/error-report`, payload);
}

export async function convertTicketToFeature(
  ticketId: string,
  payload: { request_type: string; conversion_reason: string; priority?: string }
): Promise<void> {
  await apiPost(`/tickets/${ticketId}/convert/feature-request`, payload);
}

export async function fetchSystemConfigs(params?: Record<string, string | number>): Promise<SystemConfigItem[]> {
  const { data } = await apiGetPaginated<Record<string, unknown>[]>('/system-configuration', {
    per_page: 100,
    ...params,
  });
  return (data as unknown as Record<string, unknown>[]).map(mapSystemConfigItem);
}

export async function createSystemConfig(payload: {
  config_key: string;
  config_value: string;
  description?: string;
}): Promise<SystemConfigItem> {
  const response = await apiPost<{ success: boolean; data: Record<string, unknown> }>(
    '/system-configuration',
    payload
  );
  return mapSystemConfigItem(response.data);
}

export async function updateSystemConfig(
  id: string,
  payload: { config_value?: string; description?: string }
): Promise<SystemConfigItem> {
  const response = await apiRequest<{ success: boolean; data: Record<string, unknown> }>(
    `/system-configuration/${id}`,
    { method: 'PUT', body: payload }
  );
  return mapSystemConfigItem(response.data);
}

export async function deleteSystemConfig(id: string): Promise<void> {
  await apiDelete(`/system-configuration/${id}`);
}

export type ExportDataset = 'tickets' | 'errors' | 'features' | 'downtimes' | 'users';

export async function downloadServerExport(dataset: ExportDataset): Promise<{ blob: Blob; filename: string }> {
  return apiDownload(`/exports/${dataset}`);
}
