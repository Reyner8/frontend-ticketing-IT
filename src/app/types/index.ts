export type UserRole = 'admin' | 'team_lead' | 'it_staff' | 'reporter';

export type TeamType = 'programmer' | 'network' | 'hardware';

export type TicketStatus = 
  | 'draft' 
  | 'pending_approval' 
  | 'assigned' 
  | 'in_progress' 
  | 'waiting_for_user' 
  | 'resolved' 
  | 'closed';

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
  | 'in_progress'
  | 'completed'
  | 'overdue';

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export type TicketCategory = 
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
  reporterId: string;
  assignedToId?: string;
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
  tags: string[];
  estimatedEffort?: number; // in hours
  actualEffort?: number; // in hours
  mergedTickets?: string[]; // IDs of merged tickets
  parentTicketId?: string; // For sub-tickets
  watchers: string[]; // User IDs watching this ticket
}

// Enhanced Error Report interface
export interface ErrorReport {
  id: string;
  title: string;
  description: string;
  category: 'hardware' | 'network' | 'software';
  priority: TicketPriority;
  status: ErrorReportStatus;
  reporterId: string;
  assignedToId?: string;
  assignedTeam?: TeamType;
  dateReported: Date;
  startDate?: Date;
  dueDate?: Date;
  completionDate?: Date;
  estimatedEffort?: number; // in hours
  actualEffort?: number; // in hours
  attachments: Attachment[];
  comments: Comment[];
  tags: string[];
  slaTimeElapsed: number; // in hours since creation
  slaTimeRemaining: number; // in hours until deadline
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
  priority: TicketPriority;
  status: FeatureRequestStatus;
  progress: number; // percentage 0-100
  reporterId: string;
  assignedToId?: string;
  assignedTeam?: TeamType;
  dateSubmitted: Date;
  approvalDate?: Date;
  assignmentDate?: Date;
  startDate?: Date;
  dueDate?: Date;
  completionDate?: Date;
  reviewDate?: Date;
  estimatedEffort?: number; // in hours
  actualEffort?: number; // in hours
  attachments: Attachment[];
  comments: Comment[];
  tags: string[];
  milestones: Milestone[];
  timeline: TimelineEntry[];
  slaTimeElapsed: number; // in hours since creation
  slaTimeRemaining: number; // in hours until deadline
  slaBreached: boolean;
  statusHistory: StatusHistoryEntry[];
  activityLog: ActivityLogEntry[];
  approvedBy?: string;
  rejectionReason?: string;
  roiImpact?: string;
  qualityImpact?: string;
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

export interface Tag {
  id: string;
  name: string;
  createdAt?: Date;
}

export interface TicketWatcher {
  id: string;
  name: string;
  username?: string;
  watchingSince?: Date;
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

export interface TimelineEntry {
  id: string;
  phase: 'submission' | 'approval' | 'assignment' | 'development' | 'testing' | 'validation' | 'completion' | 'review';
  title: string;
  description: string;
  startDate?: Date;
  endDate?: Date;
  isCompleted: boolean;
  progress: number; // percentage
  assignedTo?: string;
  notes?: string;
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

export interface DowntimeRecord {
  id: string;
  title: string;
  type: DowntimeType;
  reason: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in minutes
  affectedSystems: string[];
  impact: 'low' | 'medium' | 'high' | 'critical';
  reportedBy: string;
  description?: string;
  status: 'ongoing' | 'resolved';
  rootCause?: string;
  preventiveMeasures?: string;
  affectedUsers?: number;
  estimatedCost?: number;
}

export interface TeamWorkload {
  team: TeamType;
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  overdueTickets: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  slaCompliance: number;
  workloadPercentage: number;
  members: string[]; // User IDs
}

export interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  resolvedToday: number;
  overdueTickets: number;
  averageResolutionTime: number;
  slaCompliance: number;
  downtimeHours: number;
  activeDowntimes: number;
  criticalTickets: number;
  userSatisfactionScore: number;
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
  type: 'ticket' | 'downtime' | 'user' | 'comment';
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

export interface SystemConfiguration {
  slaThresholds: Record<TicketPriority, number>;
  autoAssignment: boolean;
  workingHours: {
    start: string;
    end: string;
    days: number[]; // 0-6, Sunday to Saturday
  };
  escalationRules: {
    level1Hours: number;
    level2Hours: number;
    level3Hours: number;
  };
  maintenanceWindow: {
    day: number; // 0-6
    startTime: string;
    duration: number; // in hours
  };
}

// State management types
export interface AppState {
  currentUser: User | null;
  authLoading: boolean;
  notifications: Notification[];
  unreadNotificationCount: number;
  quickActions: QuickAction[];
  systemConfig: SystemConfiguration;
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