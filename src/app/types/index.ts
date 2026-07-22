export type UserRole = 'admin' | 'team_lead' | 'it_staff' | 'reporter';

export type TeamType = 'programmer' | 'network' | 'hardware';

export type TicketStatus = 
  | 'draft' 
  | 'pending_approval' 
  | 'assigned' 
  | 'in_progress' 
  | 'waiting_for_user' 
  | 'resolved' 
  | 'closed'
  | 'converted';

// Enhanced status for Feature Requests lifecycle
export type FeatureRequestStatus = 
  | 'submission'
  | 'pending_approval'
  | 'approved'
  | 'assigned'
  | 'development'
  | 'testing'
  | 'validation'
  | 'completed'
  | 'post_implementation_review'
  | 'rejected'
  | 'cancelled';

// Enhanced status for Error Reports
export type ErrorReportStatus =
  | 'pending_approval'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'overdue';

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

// Target application code from master `applications` (e.g. simrs, antrean)
export type TargetApplication = string;

export type ApprovalStatusValue = 'pending' | 'approved' | 'rejected';

export type TicketCategory = 
  | 'general_report'
  | 'software_bug' 
  | 'feature_request' 
  | 'network_issue' 
  | 'hardware_problem' 
  | 'system_error' 
  | 'performance_issue';

export type DowntimeType = 'planned' | 'unplanned';

export type NotificationType = 
  | 'ticket_assigned' 
  | 'ticket_updated' 
  | 'sla_breach' 
  | 'downtime_alert' 
  | 'maintenance_reminder'
  | 'comment_mention';

export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  team?: TeamType;
  avatar?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  darkMode: boolean;
  emailNotifications: boolean;
  slaAlerts: boolean;
  downtimeAlerts: boolean;
  digestFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHours: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  approvalStatus?: ApprovalStatusValue;
  rejectionReason?: string;
  reporterId: string;
  reporterName?: string;
  assignedToId?: string;
  assignedToName?: string;
  assignedTeam?: TeamType;
  dateReported: Date;
  dueDate?: Date;
  resolvedDate?: Date;
  closedDate?: Date;
  slaBreached: boolean;
  responseTime?: number; // in hours
  resolutionTime?: number; // in hours
  attachments: Attachment[];
  comments: Comment[];
  estimatedEffort?: number; // in hours
  actualEffort?: number; // in hours
  mergedTickets?: string[]; // IDs of merged tickets
  parentTicketId?: string; // For sub-tickets
  isPublicSubmission?: boolean;
  submitterName?: string;
  submitterUnit?: string;
  submitterEmail?: string;
  submitterPhone?: string;
}

// Enhanced Error Report interface
export interface ErrorReport {
  id: string;
  title: string;
  description: string;
  category: 'hardware' | 'network' | 'software';
  priority: TicketPriority;
  status: ErrorReportStatus;
  approvalStatus?: ApprovalStatusValue;
  rejectionReason?: string;
  reporterId: string;
  reporterName?: string;
  assignedToId?: string;
  assignedToName?: string;
  assignedTeam?: TeamType;
  dateReported: Date;
  startDate?: Date;
  dueDate?: Date;
  completionDate?: Date;
  attachments: Attachment[];
  comments: Comment[];
  slaBreached: boolean;
  statusHistory: StatusHistoryEntry[];
  activityLog: ActivityLogEntry[];
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced Feature Request interface
export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  requestType: 'feature_request' | 'bug_fix';
  targetApplication?: TargetApplication;
  priority: TicketPriority;
  status: FeatureRequestStatus;
  approvalStatus?: ApprovalStatusValue;
  progress: number; // percentage 0-100
  reporterId: string;
  reporterName?: string;
  assignedToId?: string;
  assignedToName?: string;
  assignedTeam?: TeamType;
  dueDate?: Date;
  attachments: Attachment[];
  comments: Comment[];
  milestones: Milestone[];
  slaBreached: boolean;
  statusHistory: StatusHistoryEntry[];
  activityLog: ActivityLogEntry[];
  approvedBy?: string;
  rejectionReason?: string;
  postImplementationNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Supporting interfaces for enhanced tracking
export interface StatusHistoryEntry {
  id: string;
  previousStatus: string;
  newStatus: string;
  changedBy: string;
  changedAt: Date;
  effectiveAt: Date;
  reason?: string;
  notes?: string;
}

export interface ActivityLogEntry {
  id: string;
  action: 'created' | 'updated' | 'assigned' | 'commented' | 'status_changed' | 'attachment_added' | 'milestone_reached' | 'converted' | 'mention_added' | string;
  description: string;
  performedBy: string;
  performedAt: Date;
  details?: Record<string, unknown>;
  targetUserId?: string;
  loggableId?: string;
  loggableType?: string;
}

export interface Mention {
  id: string;
  commentId: string;
  userName?: string;
  content?: string;
  commentableId?: string;
  commentableType?: string;
  createdAt: Date;
}

export interface ConversionHistoryEntry {
  id: string;
  sourceTicketId: string;
  sourceTicketTitle: string;
  targetType: string;
  targetId: string;
  targetTitle?: string;
  convertedBy?: string;
  convertedAt: Date;
  reason?: string;
  notes?: string;
}

export interface SystemConfigItem {
  id: string;
  key: string;
  value: string;
  description?: string;
  updatedBy?: string;
  updatedAt?: Date;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  targetDate: Date;
  completedDate?: Date;
  isCompleted: boolean;
  progress: number; // percentage
  createdBy: string;
  createdAt: Date;
}

export interface Comment {
  id: string;
  ticketId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  mentions: string[];
  attachments: Attachment[];
  isInternal: boolean; // Internal comments vs user-visible
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export type DowntimeComponentCategory =
  | 'application'
  | 'network'
  | 'utility'
  | 'infrastructure'
  | 'equipment'
  | 'operational_service'
  | 'other';

export interface DowntimeComponentRef {
  id: string;
  code: string;
  name: string;
  category: DowntimeComponentCategory;
  isActive: boolean;
}

export interface DowntimeLocation {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface DowntimeComponent extends DowntimeComponentRef {
  description?: string;
  defaultAffectedComponents: DowntimeComponentRef[];
}

export interface DowntimeAnalyticsSummary {
  period: { from: string; to: string; periodMinutes: number };
  summary: {
    incidentCount: number;
    ongoingCount: number;
    resolvedCount: number;
    plannedCount: number;
    unplannedCount: number;
    totalDowntimeMinutes: number;
    averageDowntimeMinutes: number;
    totalEstimatedCost: number;
    totalAffectedUsers: number;
  };
  impactBreakdown: Array<{ impact: string; count: number; totalMinutes: number }>;
  mostFrequentSources: Array<{
    componentId: string;
    name: string;
    category: string;
    incidentCount: number;
    totalMinutes: number;
    uptimePercent: number;
  }>;
  mostAffectedComponents: Array<{
    componentId: string;
    name: string;
    category: string;
    incidentCount: number;
    totalMinutes: number;
    uptimePercent: number;
  }>;
  locationFrequency: Array<{
    locationId: string | null;
    locationName: string;
    incidentCount: number;
    totalMinutes: number;
  }>;
  componentUptime: Array<{
    componentId: string;
    name: string;
    category: string;
    incidentCount: number;
    totalMinutes: number;
    uptimePercent: number;
    downtimePercent: number;
  }>;
  categoryUptime: Array<{
    category: string;
    incidentCount: number;
    totalMinutes: number;
    uptimePercent: number;
    downtimePercent: number;
  }>;
}

export interface DowntimeRecord {
  id: string;
  title: string;
  type: DowntimeType;
  reason: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in minutes
  /** @deprecated prefer affectedComponents */
  affectedSystems: string[];
  locations: DowntimeLocation[];
  sourceComponents: DowntimeComponentRef[];
  affectedComponents: DowntimeComponentRef[];
  impact: 'low' | 'medium' | 'high' | 'critical';
  reportedBy: string;
  description?: string;
  status: 'ongoing' | 'resolved';
  rootCause?: string;
  preventiveMeasures?: string;
  affectedUsers?: number;
  estimatedCost?: number;
}

/** Metrik sederhana completed / open / overdue */
export interface StaffPerformanceMetrics {
  completed: number;
  open: number;
  overdue: number;
}

export type StaffPerformanceSection = 'all' | 'tickets' | 'errors' | 'features';

export interface StaffPerformanceUserRow {
  userId: string;
  name: string;
  username?: string;
  team?: string | null;
  teamLabel?: string;
  tickets?: StaffPerformanceMetrics;
  errors?: StaffPerformanceMetrics;
  features?: StaffPerformanceMetrics;
}

export interface StaffPerformanceTeamRow {
  team: string | null;
  teamLabel: string;
  tickets?: StaffPerformanceMetrics;
  errors?: StaffPerformanceMetrics;
  features?: StaffPerformanceMetrics;
}

export interface StaffPerformanceReport {
  period: { from: string; to: string };
  section: StaffPerformanceSection;
  team: string | null;
  userId: string | null;
  summary: {
    tickets?: StaffPerformanceMetrics;
    errors?: StaffPerformanceMetrics;
    features?: StaffPerformanceMetrics;
  };
  byTeam: StaffPerformanceTeamRow[];
  byUser: StaffPerformanceUserRow[];
}

export interface QualityIndicatorSemesterRow {
  year: number;
  semester: 1 | 2;
  label: string;
  period: { from: string; to: string };
  total: number;
  completed: number;
  completionRate: number;
}

export interface QualityIndicatorReport {
  application: { value: string; label: string };
  userId: string | null;
  userName?: string;
  generatedAt: string;
  semesters: QualityIndicatorSemesterRow[];
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  userId: string;
  ticketId?: string;
  downtimeId?: string;
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface SearchResult {
  id: string;
  type: 'ticket' | 'error' | 'feature' | 'downtime' | 'user' | 'comment';
  title: string;
  description: string;
  url: string;
  relevanceScore: number;
  createdAt: Date;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  shortcut?: string;
  roles: UserRole[];
}

export interface ExportRequest {
  type: 'tickets' | 'downtime' | 'performance';
  format: ExportFormat;
  filters: Record<string, any>;
  dateRange: {
    start: Date;
    end: Date;
  };
  columns: string[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'planned_downtime' | 'maintenance' | 'deadline';
  description?: string;
  color: string;
  allDay: boolean;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
  };
}

// State management types
export interface AppState {
  currentUser: User | null;
  authLoading: boolean;
  notifications: Notification[];
  unreadNotificationCount: number;
  quickActions: QuickAction[];
  loading: {
    [key: string]: boolean;
  };
  errors: {
    [key: string]: string | null;
  };
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: TicketStatus[];
  priority?: TicketPriority[];
  category?: TicketCategory[];
  team?: TeamType[];
  assignedTo?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  slaStatus?: 'compliant' | 'breached' | 'at_risk';
}

/** Ops logging modules */
export type RestoreType = 'database' | 'application' | 'both';
export type RestoreTestResult = 'success' | 'failed' | 'success_with_notes';
export type BackupSource = 'nas' | 'hdd' | 'pc' | 'server';
export type TestEnvironment = 'local_development' | 'server_staging';
export type VisitorStatus = 'inside' | 'completed';
export type InspectionType = 'weekly' | 'incidental';
export type InspectionConclusion = 'safe' | 'findings';
export type InspectionEscalation = 'ipsrs' | 'director';

export interface OpsUserRef {
  id: string;
  name: string;
  username?: string;
}

export interface CatalogApplication {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface BackupRestoreTest {
  id: string;
  testDate: Date;
  performedBy?: OpsUserRef;
  /** Application master code (e.g. simrs). */
  applicationSystem: string;
  /** Display name from master. */
  applicationLabel: string;
  restoreType: RestoreType;
  backupDatetime?: Date;
  backupSource?: BackupSource;
  backupSourceLabel?: string;
  testEnvironment: TestEnvironment;
  testEnvironmentLabel: string;
  result: RestoreTestResult;
  notes?: string;
  followUp?: string;
  createdBy?: OpsUserRef;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServerRoomVisitor {
  id: string;
  entryAt: Date;
  exitAt?: Date;
  visitorName: string;
  unitOrVendor: string;
  purpose: string;
  escortedBy?: OpsUserRef;
  notes?: string;
  status: VisitorStatus;
  createdBy?: OpsUserRef;
  createdAt: Date;
  updatedAt: Date;
}

export interface InspectionChecklistItem {
  ok: boolean;
  notes?: string | null;
}

/** Peralatan ruang server yang dicek per inspeksi. */
export type InspectionChecklistKey =
  | "ups"
  | "cable"
  | "rack"
  | "ac"
  | "pc_server"
  | "mikrotik"
  | "switch";

export type InspectionChecklistItems = Record<
  InspectionChecklistKey,
  InspectionChecklistItem
>;

export interface ServerRoomInspection {
  id: string;
  inspectionDate: Date;
  inspector?: OpsUserRef;
  inspectionType: InspectionType;
  checklistItems: InspectionChecklistItems;
  conclusion: InspectionConclusion;
  followUp?: string;
  escalation?: InspectionEscalation;
  notes?: string;
  createdBy?: OpsUserRef;
  createdAt: Date;
  updatedAt: Date;
}
