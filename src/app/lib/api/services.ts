import {
  apiGet,
  apiPost,
  apiPut,
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
  mapDowntimeLocation,
  mapDowntimeComponent,
  mapDowntimeAnalytics,
  mapNotification,
  mapStaffPerformanceReport,
  mapQualityIndicatorReport,
  mapStatusHistory,
  mapActivityLog,
  mapComment,
  mapAttachment,
  mapMilestone,
  mapCalendarEvent,
  preferencesToApi,
  mapConversionHistory,
  mapSystemConfigItem,
  mapMention,
  mapBackupRestoreTest,
  mapServerRoomVisitor,
  mapServerRoomInspection,
  mapCatalogApplication,
} from './mappers';
import {
  User,
  Ticket,
  ErrorReport,
  FeatureRequest,
  DowntimeRecord,
  DowntimeLocation,
  DowntimeComponent,
  DowntimeComponentRef,
  DowntimeAnalyticsSummary,
  DowntimeComponentCategory,
  Notification,
  StaffPerformanceReport,
  StaffPerformanceSection,
  QualityIndicatorReport,
  UserPreferences,
  Comment,
  Attachment,
  Milestone,
  CalendarEvent,
  ConversionHistoryEntry,
  SystemConfigItem,
  ActivityLogEntry,
  Mention,
  BackupRestoreTest,
  ServerRoomVisitor,
  ServerRoomInspection,
  CatalogApplication,
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
  title: string;
  description: string;
  submitter_name: string;
  submitter_unit: string;
}

export interface PublicSubmissionResult {
  reference_number: string;
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
  payload: { status: string; reason?: string; notes?: string; effective_at?: string }
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

export async function claimResource(
  target: AssignmentTarget,
  id: string
): Promise<void> {
  await apiPost(`/${target}/${id}/claim`);
}

type AttachmentParent = 'tickets' | 'errors' | 'features' | 'comments' | 'backup-restore-tests';

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
  target_application?: string;
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
  location_ids: number[];
  source_component_ids: number[];
  affected_component_ids?: number[];
  affected_users?: number;
  estimated_cost?: number;
  root_cause?: string;
  preventive_measures?: string;
}): Promise<DowntimeRecord> {
  const response = await apiPost<{ success: boolean; data: Record<string, unknown> }>(
    '/downtime-records',
    payload
  );
  return mapDowntimeRecord(response.data);
}

export async function fetchDowntimeLocations(params?: Record<string, string | number | boolean>): Promise<{
  locations: DowntimeLocation[];
  total: number;
}> {
  const { data, meta } = await apiGetPaginated<Record<string, unknown>[]>('/downtime-locations', {
    per_page: 100,
    ...params,
  });
  return {
    locations: (data as unknown as Record<string, unknown>[]).map(mapDowntimeLocation),
    total: meta.total,
  };
}

export async function createDowntimeLocation(payload: {
  name: string;
  code?: string;
  description?: string;
  is_active?: boolean;
}): Promise<DowntimeLocation> {
  const response = await apiPost<{ success: boolean; data: Record<string, unknown> }>(
    '/downtime-locations',
    payload
  );
  return mapDowntimeLocation(response.data);
}

export async function updateDowntimeLocation(
  id: string,
  payload: Record<string, unknown>
): Promise<DowntimeLocation> {
  const response = await apiPut<{ success: boolean; data: Record<string, unknown> }>(
    `/downtime-locations/${id}`,
    payload
  );
  return mapDowntimeLocation(response.data);
}

export async function deactivateDowntimeLocation(id: string): Promise<DowntimeLocation> {
  const response = await apiPatch<{ success: boolean; data: Record<string, unknown> }>(
    `/downtime-locations/${id}/deactivate`
  );
  return mapDowntimeLocation(response.data);
}

export async function deleteDowntimeLocation(id: string): Promise<void> {
  await apiDelete(`/downtime-locations/${id}`);
}

export async function fetchDowntimeComponents(params?: Record<string, string | number | boolean>): Promise<{
  components: DowntimeComponent[];
  total: number;
}> {
  const { data, meta } = await apiGetPaginated<Record<string, unknown>[]>('/downtime-components', {
    per_page: 100,
    ...params,
  });
  return {
    components: (data as unknown as Record<string, unknown>[]).map(mapDowntimeComponent),
    total: meta.total,
  };
}

export async function createDowntimeComponent(payload: {
  name: string;
  category: DowntimeComponentCategory | string;
  code?: string;
  description?: string;
  is_active?: boolean;
  default_affected_component_ids?: number[];
}): Promise<DowntimeComponent> {
  const response = await apiPost<{ success: boolean; data: Record<string, unknown> }>(
    '/downtime-components',
    payload
  );
  return mapDowntimeComponent(response.data);
}

export async function updateDowntimeComponent(
  id: string,
  payload: Record<string, unknown>
): Promise<DowntimeComponent> {
  const response = await apiPut<{ success: boolean; data: Record<string, unknown> }>(
    `/downtime-components/${id}`,
    payload
  );
  return mapDowntimeComponent(response.data);
}

export async function syncDowntimeComponentDependencies(
  id: string,
  defaultAffectedComponentIds: number[]
): Promise<DowntimeComponent> {
  const response = await apiPut<{ success: boolean; data: Record<string, unknown> }>(
    `/downtime-components/${id}/dependencies`,
    { default_affected_component_ids: defaultAffectedComponentIds }
  );
  return mapDowntimeComponent(response.data);
}

export async function suggestAffectedComponents(
  sourceComponentIds: number[]
): Promise<DowntimeComponentRef[]> {
  const response = await apiGet<{ success: boolean; data: Record<string, unknown>[] }>(
    '/downtime-components/suggest-affected',
    { source_component_ids: sourceComponentIds.join(',') }
  );
  return ((response.data ?? []) as Record<string, unknown>[]).map((row) => {
    const category = row.category as { value?: DowntimeComponentCategory } | DowntimeComponentCategory | undefined;
    const categoryValue =
      typeof category === 'object' && category?.value ? category.value : (category as DowntimeComponentCategory | undefined);

    return {
      id: String(row.id),
      code: String(row.code ?? ''),
      name: String(row.name ?? ''),
      category: categoryValue || 'other',
      isActive: Boolean(row.is_active ?? true),
    };
  });
}

export async function deactivateDowntimeComponent(id: string): Promise<DowntimeComponent> {
  const response = await apiPatch<{ success: boolean; data: Record<string, unknown> }>(
    `/downtime-components/${id}/deactivate`
  );
  return mapDowntimeComponent(response.data);
}

export async function deleteDowntimeComponent(id: string): Promise<void> {
  await apiDelete(`/downtime-components/${id}`);
}

export async function fetchDowntimeAnalytics(
  params?: Record<string, string | number>
): Promise<DowntimeAnalyticsSummary> {
  const response = await apiGet<{ success: boolean; data: Record<string, unknown> }>(
    '/downtime-records/analytics',
    params
  );
  return mapDowntimeAnalytics(response.data ?? {});
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

export async function fetchStaffPerformance(params?: {
  from?: string;
  to?: string;
  team?: string;
  user_id?: string | number;
  section?: StaffPerformanceSection;
}): Promise<StaffPerformanceReport> {
  const response = await apiGet<{ success: boolean; data: Record<string, unknown> }>(
    '/staff-performance',
    params
  );
  return mapStaffPerformanceReport(response.data ?? {});
}

export async function fetchQualityIndicators(params?: {
  application?: string;
  user_id?: string | number;
}): Promise<QualityIndicatorReport> {
  const response = await apiGet<{ success: boolean; data: Record<string, unknown> }>(
    '/quality-indicators/feature-requests',
    params
  );
  return mapQualityIndicatorReport(response.data ?? {});
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

export async function searchErrorReports(query: string): Promise<ErrorReport[]> {
  const { reports } = await fetchErrorReports({ search: query, per_page: 10 });
  return reports;
}

export async function searchFeatures(query: string): Promise<FeatureRequest[]> {
  const { features } = await fetchFeatureRequests({ per_page: 100 });
  const lower = query.toLowerCase();
  return features
    .filter(
      (f) =>
        f.title.toLowerCase().includes(lower) ||
        f.id.toLowerCase().includes(lower) ||
        (f.description?.toLowerCase().includes(lower) ?? false)
    )
    .slice(0, 10);
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
  payload: {
    request_type: string;
    target_application: string;
    conversion_reason: string;
    priority?: string;
  }
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

export type ExportDataset =
  | 'tickets'
  | 'errors'
  | 'features'
  | 'downtimes'
  | 'users'
  | 'staff-performance'
  | 'quality-indicators';
export type ExportFormat = 'csv' | 'excel' | 'pdf';

export async function downloadServerExport(
  dataset: ExportDataset,
  format: ExportFormat = 'csv',
  params?: Record<string, string | number>
): Promise<{ blob: Blob; filename: string }> {
  return apiDownload(`/exports/${dataset}`, { format, ...params });
}

export async function updateDowntimeRecord(
  id: string,
  payload: Record<string, unknown>
): Promise<DowntimeRecord> {
  const response = await apiPut<{ success: boolean; data: Record<string, unknown> }>(
    `/downtime-records/${id}`,
    payload
  );
  return mapDowntimeRecord(response.data);
}

export async function resolveDowntimeRecord(
  id: string,
  payload: {
    root_cause: string;
    preventive_measures: string;
    end_time: string;
    affected_users?: number;
    estimated_cost?: number;
  }
): Promise<DowntimeRecord> {
  const response = await apiPatch<{ success: boolean; data: Record<string, unknown> }>(
    `/downtime-records/${id}/resolve`,
    payload
  );
  return mapDowntimeRecord(response.data);
}

export async function createMilestone(
  featureId: string,
  payload: { title: string; description?: string; target_date: string; progress?: number }
): Promise<Milestone> {
  const response = await apiPost<{ success: boolean; data: Record<string, unknown> }>(
    `/feature-requests/${featureId}/milestones`,
    payload
  );
  return mapMilestone(response.data);
}

export async function updateMilestone(
  featureId: string,
  milestoneId: string,
  payload: Record<string, unknown>
): Promise<Milestone> {
  const response = await apiPut<{ success: boolean; data: Record<string, unknown> }>(
    `/feature-requests/${featureId}/milestones/${milestoneId}`,
    payload
  );
  return mapMilestone(response.data);
}

export async function completeMilestone(featureId: string, milestoneId: string): Promise<Milestone> {
  const response = await apiPatch<{ success: boolean; data: Record<string, unknown> }>(
    `/feature-requests/${featureId}/milestones/${milestoneId}/complete`
  );
  return mapMilestone(response.data);
}

export async function deleteMilestone(featureId: string, milestoneId: string): Promise<void> {
  await apiDelete(`/feature-requests/${featureId}/milestones/${milestoneId}`);
}

export async function fetchMergedTickets(ticketId: string): Promise<Ticket[]> {
  const response = await apiGet<{ success: boolean; data: Record<string, unknown>[] }>(
    `/tickets/${ticketId}/merge`
  );
  return (response.data ?? []).map(mapTicketListItem);
}

export async function mergeTickets(ticketId: string, mergedTicketIds: string[]): Promise<Ticket[]> {
  const response = await apiPost<{ success: boolean; data: Record<string, unknown>[] }>(
    `/tickets/${ticketId}/merge`,
    { merged_ticket_ids: mergedTicketIds }
  );
  return (response.data ?? []).map(mapTicketListItem);
}

export async function unmergeTicket(ticketId: string, mergedTicketId: string): Promise<Ticket[]> {
  const response = await apiDelete<{ success: boolean; data: Record<string, unknown>[] }>(
    `/tickets/${ticketId}/merge/${mergedTicketId}`
  );
  return (response.data ?? []).map(mapTicketListItem);
}

export async function fetchGlobalConversionHistory(params?: Record<string, string | number>): Promise<{
  entries: ConversionHistoryEntry[];
  total: number;
}> {
  const { data, meta } = await apiGetPaginated<Record<string, unknown>[]>('/conversion-history', {
    per_page: 50,
    ...params,
  });
  return {
    entries: (data as unknown as Record<string, unknown>[]).map(mapConversionHistory),
    total: meta.total,
  };
}

export async function fetchMyMentions(): Promise<Mention[]> {
  const response = await apiGet<{ success: boolean; data: Record<string, unknown>[] }>(
    '/mentions/me',
    { per_page: 50 }
  );
  return (response.data ?? []).map(mapMention);
}

export async function fetchFeatureStatusHistory(featureId: string) {
  const response = await apiGet<{ success: boolean; data: Record<string, unknown>[] }>(
    `/features/${featureId}/status`
  );
  return (response.data ?? []).map(mapStatusHistory);
}

export async function fetchFeatureActivityLogs(featureId: string): Promise<ActivityLogEntry[]> {
  const response = await apiGet<{ success: boolean; data: Record<string, unknown>[] }>(
    `/features/${featureId}/activity-logs`
  );
  return (response.data ?? []).map(mapActivityLog);
}

export async function createCalendarEvent(payload: Record<string, unknown>): Promise<CalendarEvent> {
  const response = await apiPost<{ success: boolean; data: Record<string, unknown> }>(
    '/calendar-events/',
    payload
  );
  return mapCalendarEvent(response.data);
}

export async function updateCalendarEvent(
  eventId: string,
  payload: Record<string, unknown>
): Promise<CalendarEvent> {
  const response = await apiPost<{ success: boolean; data: Record<string, unknown> }>(
    `/calendar-events/${eventId}`,
    payload
  );
  return mapCalendarEvent(response.data);
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  await apiDelete(`/calendar-events/${eventId}`);
}

export async function updateTicket(id: string, payload: Record<string, unknown>): Promise<Ticket> {
  const response = await apiPut<{ success: boolean; data: Record<string, unknown> }>(
    `/tickets/${id}`,
    payload
  );
  return mapTicketDetail(response.data);
}

export async function deleteTicket(id: string): Promise<void> {
  await apiDelete(`/tickets/${id}`);
}

export async function updateErrorReport(id: string, payload: Record<string, unknown>): Promise<ErrorReport> {
  const response = await apiPut<{ success: boolean; data: Record<string, unknown> }>(
    `/error-reports/${id}`,
    payload
  );
  return mapErrorReportDetail(response.data);
}

export async function deleteErrorReport(id: string): Promise<void> {
  await apiDelete(`/error-reports/${id}`);
}

export async function updateFeatureRequest(
  id: string,
  payload: Record<string, unknown>
): Promise<FeatureRequest> {
  const response = await apiPut<{ success: boolean; data: Record<string, unknown> }>(
    `/feature-requests/${id}`,
    payload
  );
  return mapFeatureDetail(response.data);
}

export async function deleteFeatureRequest(id: string): Promise<void> {
  await apiDelete(`/feature-requests/${id}`);
}

export async function registerUser(payload: {
  name: string;
  username: string;
  email: string;
  password: string;
}): Promise<User> {
  const response = await apiPost<{ success: boolean; data: Record<string, unknown> }>(
    '/register',
    payload,
    false
  );
  return mapUser(response.data);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiPost('/forgot-password', { email }, false);
}

export async function resetPassword(payload: {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<void> {
  await apiPost('/reset-password', payload, false);
}

/* ── Shared application / system master ── */

export async function fetchApplications(params?: Record<string, string | number | boolean>): Promise<{
  applications: CatalogApplication[];
  total: number;
}> {
  const { data, meta } = await apiGetPaginated<Record<string, unknown>[]>('/applications', {
    per_page: 100,
    ...params,
  });
  return {
    applications: (data as unknown as Record<string, unknown>[]).map(mapCatalogApplication),
    total: meta.total,
  };
}

export async function createApplication(payload: {
  name: string;
  code?: string;
  description?: string;
  is_active?: boolean;
  sort_order?: number;
}): Promise<CatalogApplication> {
  const response = await apiPost<{ success: boolean; data: Record<string, unknown> }>(
    '/applications',
    payload
  );
  return mapCatalogApplication(response.data);
}

export async function updateApplication(
  id: string,
  payload: Record<string, unknown>
): Promise<CatalogApplication> {
  const response = await apiPut<{ success: boolean; data: Record<string, unknown> }>(
    `/applications/${id}`,
    payload
  );
  return mapCatalogApplication(response.data);
}

export async function deactivateApplication(id: string): Promise<CatalogApplication> {
  const response = await apiPatch<{ success: boolean; data: Record<string, unknown> }>(
    `/applications/${id}/deactivate`
  );
  return mapCatalogApplication(response.data);
}

export async function deleteApplication(id: string): Promise<void> {
  await apiDelete(`/applications/${id}`);
}

/* ── Ops logging modules ── */

export async function fetchBackupRestoreTests(
  params?: Record<string, string | number>
): Promise<{ records: BackupRestoreTest[]; total: number }> {
  const { data, meta } = await apiGetPaginated<Record<string, unknown>[]>(
    '/backup-restore-tests',
    { per_page: 50, ...params }
  );
  return {
    records: (data as unknown as Record<string, unknown>[]).map(mapBackupRestoreTest),
    total: meta?.total ?? 0,
  };
}

export async function createBackupRestoreTest(
  payload: Record<string, unknown>
): Promise<BackupRestoreTest> {
  const response = await apiPost<{ success: boolean; data: Record<string, unknown> }>(
    '/backup-restore-tests',
    payload
  );
  return mapBackupRestoreTest(response.data);
}

export async function updateBackupRestoreTest(
  id: string,
  payload: Record<string, unknown>
): Promise<BackupRestoreTest> {
  const response = await apiPut<{ success: boolean; data: Record<string, unknown> }>(
    `/backup-restore-tests/${id}`,
    payload
  );
  return mapBackupRestoreTest(response.data);
}

export async function deleteBackupRestoreTest(id: string): Promise<void> {
  await apiDelete(`/backup-restore-tests/${id}`);
}

export async function fetchServerRoomVisitors(
  params?: Record<string, string | number>
): Promise<{ records: ServerRoomVisitor[]; total: number }> {
  const { data, meta } = await apiGetPaginated<Record<string, unknown>[]>(
    '/server-room-visitors',
    { per_page: 50, ...params }
  );
  return {
    records: (data as unknown as Record<string, unknown>[]).map(mapServerRoomVisitor),
    total: meta?.total ?? 0,
  };
}

export async function createServerRoomVisitor(
  payload: Record<string, unknown>
): Promise<ServerRoomVisitor> {
  const response = await apiPost<{ success: boolean; data: Record<string, unknown> }>(
    '/server-room-visitors',
    payload
  );
  return mapServerRoomVisitor(response.data);
}

export async function updateServerRoomVisitor(
  id: string,
  payload: Record<string, unknown>
): Promise<ServerRoomVisitor> {
  const response = await apiPut<{ success: boolean; data: Record<string, unknown> }>(
    `/server-room-visitors/${id}`,
    payload
  );
  return mapServerRoomVisitor(response.data);
}

export async function checkoutServerRoomVisitor(
  id: string,
  exitAt: string
): Promise<ServerRoomVisitor> {
  const response = await apiPatch<{ success: boolean; data: Record<string, unknown> }>(
    `/server-room-visitors/${id}/checkout`,
    { exit_at: exitAt }
  );
  return mapServerRoomVisitor(response.data);
}

export async function deleteServerRoomVisitor(id: string): Promise<void> {
  await apiDelete(`/server-room-visitors/${id}`);
}

export async function fetchServerRoomInspections(
  params?: Record<string, string | number>
): Promise<{ records: ServerRoomInspection[]; total: number }> {
  const { data, meta } = await apiGetPaginated<Record<string, unknown>[]>(
    '/server-room-inspections',
    { per_page: 50, ...params }
  );
  return {
    records: (data as unknown as Record<string, unknown>[]).map(mapServerRoomInspection),
    total: meta?.total ?? 0,
  };
}

export async function createServerRoomInspection(
  payload: Record<string, unknown>
): Promise<ServerRoomInspection> {
  const response = await apiPost<{ success: boolean; data: Record<string, unknown> }>(
    '/server-room-inspections',
    payload
  );
  return mapServerRoomInspection(response.data);
}

export async function updateServerRoomInspection(
  id: string,
  payload: Record<string, unknown>
): Promise<ServerRoomInspection> {
  const response = await apiPut<{ success: boolean; data: Record<string, unknown> }>(
    `/server-room-inspections/${id}`,
    payload
  );
  return mapServerRoomInspection(response.data);
}

export async function deleteServerRoomInspection(id: string): Promise<void> {
  await apiDelete(`/server-room-inspections/${id}`);
}
