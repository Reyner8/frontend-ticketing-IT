import { 
  User, 
  Ticket, 
  DowntimeRecord, 
  TeamWorkload, 
  DashboardStats, 
  Notification, 
  SystemConfiguration,
  CalendarEvent,
  Comment,
  Attachment,
  ErrorReport,
  FeatureRequest,
  StatusHistoryEntry,
  ActivityLogEntry,
  Milestone,
  TimelineEntry,
  TeamType
} from '../types';

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Admin',
    email: 'john.admin@company.com',
    role: 'admin',
    isActive: true,
    lastLogin: new Date('2024-12-21T09:00:00'),
    createdAt: new Date('2024-01-15'),
    preferences: {
      darkMode: false,
      emailNotifications: true,
      slaAlerts: true,
      downtimeAlerts: true,
      digestFrequency: 'immediate',
      quietHours: '22:00-08:00'
    }
  },
  {
    id: '2',
    name: 'Sarah Dev Lead',
    email: 'sarah.devlead@company.com',
    role: 'team_lead',
    team: 'programmer',
    isActive: true,
    lastLogin: new Date('2024-12-21T08:30:00'),
    createdAt: new Date('2024-02-01'),
    preferences: {
      darkMode: true,
      emailNotifications: true,
      slaAlerts: true,
      downtimeAlerts: false,
      digestFrequency: 'daily',
      quietHours: '20:00-09:00'
    }
  },
  {
    id: '3',
    name: 'Mike Network',
    email: 'mike.network@company.com',
    role: 'it_staff',
    team: 'network',
    isActive: true,
    lastLogin: new Date('2024-12-21T10:15:00'),
    createdAt: new Date('2024-03-10'),
    preferences: {
      darkMode: false,
      emailNotifications: true,
      slaAlerts: true,
      downtimeAlerts: true,
      digestFrequency: 'hourly',
      quietHours: 'none'
    }
  },
  {
    id: '4',
    name: 'Lisa Hardware',
    email: 'lisa.hardware@company.com',
    role: 'it_staff',
    team: 'hardware',
    isActive: true,
    lastLogin: new Date('2024-12-21T07:45:00'),
    createdAt: new Date('2024-04-20'),
    preferences: {
      darkMode: false,
      emailNotifications: true,
      slaAlerts: true,
      downtimeAlerts: true,
      digestFrequency: 'daily',
      quietHours: '22:00-08:00'
    }
  },
  {
    id: '5',
    name: 'David Reporter',
    email: 'david.reporter@company.com',
    role: 'reporter',
    isActive: true,
    lastLogin: new Date('2024-12-21T09:30:00'),
    createdAt: new Date('2024-05-15'),
    preferences: {
      darkMode: false,
      emailNotifications: true,
      slaAlerts: false,
      downtimeAlerts: true,
      digestFrequency: 'weekly',
      quietHours: '22:00-08:00'
    }
  },
  {
    id: '6',
    name: 'Alex Programmer',
    email: 'alex.programmer@company.com',
    role: 'it_staff',
    team: 'programmer',
    isActive: true,
    lastLogin: new Date('2024-12-21T08:00:00'),
    createdAt: new Date('2024-06-01'),
    preferences: {
      darkMode: true,
      emailNotifications: true,
      slaAlerts: true,
      downtimeAlerts: false,
      digestFrequency: 'immediate',
      quietHours: '23:00-07:00'
    }
  }
];

export const mockAttachments: Attachment[] = [
  {
    id: 'att-001',
    name: 'error-screenshot.png',
    size: 245632,
    type: 'image/png',
    url: '/uploads/error-screenshot.png',
    uploadedBy: '5',
    uploadedAt: new Date('2024-12-20T10:30:00')
  },
  {
    id: 'att-002',
    name: 'log-file.txt',
    size: 15840,
    type: 'text/plain',
    url: '/uploads/log-file.txt',
    uploadedBy: '3',
    uploadedAt: new Date('2024-12-20T14:15:00')
  }
];

export const mockComments: Comment[] = [
  {
    id: 'comm-001',
    ticketId: 'TKT-001',
    userId: '2',
    content: 'Looking into this issue. @mike-network can you check the server logs?',
    createdAt: new Date('2024-12-20T11:00:00'),
    mentions: ['3'],
    attachments: [],
    isInternal: false
  },
  {
    id: 'comm-002',
    ticketId: 'TKT-001',
    userId: '3',
    content: 'Server logs show authentication service timeouts. Investigating network connectivity.',
    createdAt: new Date('2024-12-20T11:30:00'),
    mentions: [],
    attachments: [mockAttachments[1]],
    isInternal: true
  }
];

export const mockTickets: Ticket[] = [
  {
    id: 'TKT-001',
    title: 'Login system not working',
    description: 'Users unable to login to the main application. Error message shows "Invalid credentials" even with correct details. This affects multiple departments and is causing productivity issues.',
    category: 'system_error',
    priority: 'high',
    status: 'in_progress',
    reporterId: '5',
    assignedToId: '2',
    assignedTeam: 'programmer',
    dateReported: new Date('2024-12-20T09:00:00'),
    dueDate: new Date('2024-12-22T17:00:00'),
    slaBreached: false,
    responseTime: 2,
    resolutionTime: undefined,
    attachments: [mockAttachments[0]],
    comments: mockComments,
    tags: ['authentication', 'urgent', 'multiple-users'],
    estimatedEffort: 8,
    actualEffort: 6,
    watchers: ['1', '3']
  },
  {
    id: 'TKT-002',
    title: 'Request for new reporting dashboard',
    description: 'Need a comprehensive dashboard for sales team to track monthly performance metrics including revenue, conversion rates, and customer acquisition data.',
    category: 'feature_request',
    priority: 'medium',
    status: 'pending_approval',
    reporterId: '5',
    assignedTeam: 'programmer',
    dateReported: new Date('2024-12-19T14:30:00'),
    dueDate: new Date('2024-12-31T17:00:00'),
    slaBreached: false,
    responseTime: 4,
    attachments: [],
    comments: [],
    tags: ['dashboard', 'reporting', 'sales'],
    estimatedEffort: 40,
    watchers: ['2']
  },
  {
    id: 'TKT-003',
    title: 'Server room temperature alert',
    description: 'Temperature monitoring system showing alerts for server room exceeding 25°C. Multiple servers at risk of overheating.',
    category: 'hardware_problem',
    priority: 'critical',
    status: 'assigned',
    reporterId: '3',
    assignedToId: '4',
    assignedTeam: 'hardware',
    dateReported: new Date('2024-12-21T06:00:00'),
    dueDate: new Date('2024-12-21T12:00:00'),
    slaBreached: true,
    responseTime: 0.5,
    attachments: [],
    comments: [],
    tags: ['server', 'temperature', 'critical', 'infrastructure'],
    estimatedEffort: 4,
    watchers: ['1', '2']
  },
  {
    id: 'TKT-004',
    title: 'Slow network connectivity in Building A',
    description: 'Multiple users reporting slow internet connectivity in Building A, 3rd floor. Affecting productivity and video calls.',
    category: 'network_issue',
    priority: 'medium',
    status: 'resolved',
    reporterId: '5',
    assignedToId: '3',
    assignedTeam: 'network',
    dateReported: new Date('2024-12-18T10:00:00'),
    resolvedDate: new Date('2024-12-20T16:30:00'),
    slaBreached: false,
    responseTime: 1,
    resolutionTime: 54.5,
    attachments: [],
    comments: [],
    tags: ['network', 'performance', 'building-a'],
    estimatedEffort: 6,
    actualEffort: 8,
    watchers: []
  },
  {
    id: 'TKT-005',
    title: 'Email server intermittent failures',
    description: 'Email server experiencing intermittent failures causing delayed message delivery.',
    category: 'system_error',
    priority: 'high',
    status: 'waiting_for_user',
    reporterId: '5',
    assignedToId: '3',
    assignedTeam: 'network',
    dateReported: new Date('2024-12-19T16:00:00'),
    dueDate: new Date('2024-12-23T17:00:00'),
    slaBreached: false,
    responseTime: 3,
    attachments: [],
    comments: [],
    tags: ['email', 'intermittent', 'communication'],
    estimatedEffort: 12,
    actualEffort: 8,
    watchers: ['1']
  },
  {
    id: 'TKT-006',
    title: 'Mobile app performance optimization',
    description: 'Mobile application loading slowly on older devices. Need performance optimization.',
    category: 'performance_issue',
    priority: 'low',
    status: 'draft',
    reporterId: '5',
    assignedTeam: 'programmer',
    dateReported: new Date('2024-12-21T11:00:00'),
    slaBreached: false,
    responseTime: undefined,
    attachments: [],
    comments: [],
    tags: ['mobile', 'performance', 'optimization'],
    estimatedEffort: 20,
    watchers: []
  }
];

export const mockDowntimes: DowntimeRecord[] = [
  {
    id: 'DT-001',
    title: 'Scheduled server maintenance',
    type: 'planned',
    reason: 'Monthly security updates and system optimization',
    startTime: new Date('2024-12-22T02:00:00'),
    endTime: new Date('2024-12-22T06:00:00'),
    duration: 240,
    affectedSystems: ['Main Database', 'Web Application', 'Email Server'],
    impact: 'high',
    reportedBy: '1',
    description: 'Scheduled maintenance window for critical security updates and performance optimizations.',
    status: 'resolved',
    rootCause: 'Planned maintenance',
    preventiveMeasures: 'Regular maintenance schedule established',
    affectedUsers: 850,
    estimatedCost: 5000
  },
  {
    id: 'DT-002',
    title: 'Database connection failure',
    type: 'unplanned',
    reason: 'Hardware failure on primary database server',
    startTime: new Date('2024-12-21T14:30:00'),
    endTime: new Date('2024-12-21T16:15:00'),
    duration: 105,
    affectedSystems: ['Main Database', 'Web Application', 'Mobile App'],
    impact: 'critical',
    reportedBy: '3',
    description: 'Unexpected database failure caused widespread service disruption.',
    status: 'resolved',
    rootCause: 'Faulty disk controller on primary database server',
    preventiveMeasures: 'Implemented automated failover and upgraded monitoring',
    affectedUsers: 1200,
    estimatedCost: 15000
  },
  {
    id: 'DT-003',
    title: 'Network infrastructure upgrade',
    type: 'planned',
    reason: 'Upgrading network switches in data center',
    startTime: new Date('2024-12-23T01:00:00'),
    duration: 180,
    affectedSystems: ['Internal Network', 'VPN Access'],
    impact: 'medium',
    reportedBy: '3',
    description: 'Planned network infrastructure upgrade to improve performance.',
    status: 'ongoing',
    affectedUsers: 300,
    estimatedCost: 8000
  }
];

export const mockTeamWorkload: TeamWorkload[] = [
  {
    team: 'programmer',
    totalTickets: 45,
    openTickets: 12,
    resolvedTickets: 28,
    overdueTickets: 2,
    averageResponseTime: 3.2,
    averageResolutionTime: 28.5,
    slaCompliance: 89,
    workloadPercentage: 75,
    members: ['2', '6']
  },
  {
    team: 'network',
    totalTickets: 28,
    openTickets: 8,
    resolvedTickets: 18,
    overdueTickets: 1,
    averageResponseTime: 2.1,
    averageResolutionTime: 18.2,
    slaCompliance: 94,
    workloadPercentage: 60,
    members: ['3']
  },
  {
    team: 'hardware',
    totalTickets: 35,
    openTickets: 15,
    resolvedTickets: 18,
    overdueTickets: 3,
    averageResponseTime: 4.8,
    averageResolutionTime: 32.1,
    slaCompliance: 82,
    workloadPercentage: 85,
    members: ['4']
  }
];

export const mockDashboardStats: DashboardStats = {
  totalTickets: 108,
  openTickets: 35,
  resolvedToday: 8,
  overdueTickets: 6,
  averageResolutionTime: 24.5,
  slaCompliance: 88,
  downtimeHours: 12.5,
  activeDowntimes: 1,
  criticalTickets: 3,
  userSatisfactionScore: 4.2
};

export const mockNotifications: Notification[] = [
  {
    id: 'notif-001',
    type: 'sla_breach',
    title: 'SLA Breach Alert',
    message: 'Ticket TKT-003 has breached SLA deadline',
    userId: '1',
    ticketId: 'TKT-003',
    isRead: false,
    createdAt: new Date('2024-12-21T12:00:00'),
    priority: 'high'
  },
  {
    id: 'notif-002',
    type: 'ticket_assigned',
    title: 'New Ticket Assigned',
    message: 'You have been assigned to ticket TKT-001',
    userId: '2',
    ticketId: 'TKT-001',
    isRead: false,
    createdAt: new Date('2024-12-20T11:00:00'),
    priority: 'medium'
  },
  {
    id: 'notif-003',
    type: 'downtime_alert',
    title: 'Planned Maintenance',
    message: 'Scheduled maintenance will begin in 2 hours',
    userId: '1',
    downtimeId: 'DT-003',
    isRead: true,
    createdAt: new Date('2024-12-22T23:00:00'),
    priority: 'medium'
  },
  {
    id: 'notif-004',
    type: 'comment_mention',
    title: 'You were mentioned',
    message: 'Sarah mentioned you in a comment on TKT-001',
    userId: '3',
    ticketId: 'TKT-001',
    isRead: false,
    createdAt: new Date('2024-12-20T11:05:00'),
    priority: 'low'
  }
];

export const mockCalendarEvents: CalendarEvent[] = [
  {
    id: 'cal-001',
    title: 'Database Maintenance',
    start: new Date('2024-12-22T02:00:00'),
    end: new Date('2024-12-22T06:00:00'),
    type: 'planned_downtime',
    description: 'Monthly database maintenance and security updates',
    color: '#4ECDC4',
    allDay: false
  },
  {
    id: 'cal-002',
    title: 'Network Upgrade',
    start: new Date('2024-12-23T01:00:00'),
    end: new Date('2024-12-23T04:00:00'),
    type: 'maintenance',
    description: 'Network infrastructure upgrade',
    color: '#45B7D1',
    allDay: false
  },
  {
    id: 'cal-003',
    title: 'TKT-002 Deadline',
    start: new Date('2024-12-31T17:00:00'),
    end: new Date('2024-12-31T17:00:00'),
    type: 'deadline',
    description: 'Feature request deadline',
    color: '#FF6B6B',
    allDay: false
  }
];

export const mockSystemConfig: SystemConfiguration = {
  slaThresholds: {
    critical: 4,
    high: 24,
    medium: 72,
    low: 168
  },
  autoAssignment: true,
  workingHours: {
    start: '09:00',
    end: '17:00',
    days: [1, 2, 3, 4, 5] // Monday to Friday
  },
  escalationRules: {
    level1Hours: 2,
    level2Hours: 8,
    level3Hours: 24
  },
  maintenanceWindow: {
    day: 0, // Sunday
    startTime: '02:00',
    duration: 4
  }
};

// Current user (can be changed to simulate different roles)
export const currentUser: User = mockUsers[0]; // Admin user by default

// Helper function to get user notifications
export const getUserNotifications = (userId: string, includeRead: boolean = false): Notification[] => {
  return mockNotifications.filter(n => 
    n.userId === userId && (includeRead || !n.isRead)
  ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

// Helper function to get unread notification count
export const getUnreadNotificationCount = (userId: string): number => {
  return mockNotifications.filter(n => n.userId === userId && !n.isRead).length;
};

// Helper function to get user's team tickets
export const getTeamTickets = (teamType: TeamType): Ticket[] => {
  return mockTickets.filter(ticket => ticket.assignedTeam === teamType);
};

// Helper function to get user's assigned tickets
export const getUserTickets = (userId: string): Ticket[] => {
  return mockTickets.filter(ticket => ticket.assignedToId === userId);
};

// Mock Error Reports Data
export const mockErrorReports: ErrorReport[] = [
  {
    id: 'ERR-2024-001',
    title: 'Database Connection Timeout',
    description: 'Multiple users experiencing timeout errors when accessing customer database. Error occurs intermittently during peak hours affecting order processing.',
    category: 'software',
    priority: 'high',
    status: 'in_progress',
    reporterId: '5',
    assignedToId: '2',
    assignedTeam: 'programmer',
    dateReported: new Date('2024-12-20T09:15:00'),
    startDate: new Date('2024-12-20T11:00:00'),
    dueDate: new Date('2024-12-21T17:00:00'),
    estimatedEffort: 6,
    actualEffort: 4.5,
    attachments: [mockAttachments[0]],
    comments: [],
    tags: ['database', 'timeout', 'performance'],
    slaTimeElapsed: 32.5,
    slaTimeRemaining: 8.5,
    slaBreached: false,
    statusHistory: [
      {
        id: 'sh-001',
        previousStatus: 'pending_approval',
        newStatus: 'in_progress',
        changedBy: '2',
        changedAt: new Date('2024-12-20T11:00:00'),
        reason: 'Approved and assigned to development team',
        notes: 'High priority issue affecting customer operations'
      }
    ],
    activityLog: [
      {
        id: 'al-001',
        action: 'created',
        description: 'Error report created by David Reporter',
        performedBy: '5',
        performedAt: new Date('2024-12-20T09:15:00'),
        details: { category: 'software', priority: 'high' }
      },
      {
        id: 'al-002',
        action: 'assigned',
        description: 'Assigned to Sarah Dev Lead',
        performedBy: '1',
        performedAt: new Date('2024-12-20T11:00:00'),
        details: { assignedTo: '2', team: 'programmer' }
      }
    ],
    createdAt: new Date('2024-12-20T09:15:00'),
    updatedAt: new Date('2024-12-20T14:30:00')
  },
  {
    id: 'ERR-2024-002',
    title: 'Server Room AC Malfunction',
    description: 'Air conditioning unit in server room failing to maintain proper temperature. Temperature readings show 28°C and rising.',
    category: 'hardware',
    priority: 'critical',
    status: 'completed',
    reporterId: '3',
    assignedToId: '4',
    assignedTeam: 'hardware',
    dateReported: new Date('2024-12-19T08:30:00'),
    startDate: new Date('2024-12-19T09:00:00'),
    dueDate: new Date('2024-12-19T14:00:00'),
    completionDate: new Date('2024-12-19T13:45:00'),
    estimatedEffort: 4,
    actualEffort: 4.75,
    attachments: [],
    comments: [],
    tags: ['hardware', 'server-room', 'cooling', 'critical'],
    slaTimeElapsed: 5.25,
    slaTimeRemaining: 0,
    slaBreached: false,
    statusHistory: [
      {
        id: 'sh-002',
        previousStatus: 'pending_approval',
        newStatus: 'in_progress',
        changedBy: '4',
        changedAt: new Date('2024-12-19T09:00:00'),
        reason: 'Critical priority - immediate action required'
      },
      {
        id: 'sh-003',
        previousStatus: 'in_progress',
        newStatus: 'completed',
        changedBy: '4',
        changedAt: new Date('2024-12-19T13:45:00'),
        reason: 'AC unit repaired and temperature normalized'
      }
    ],
    activityLog: [
      {
        id: 'al-003',
        action: 'created',
        description: 'Critical hardware issue reported',
        performedBy: '3',
        performedAt: new Date('2024-12-19T08:30:00'),
        details: { category: 'hardware', priority: 'critical' }
      },
      {
        id: 'al-004',
        action: 'status_changed',
        description: 'Status changed to completed',
        performedBy: '4',
        performedAt: new Date('2024-12-19T13:45:00'),
        details: { newStatus: 'completed' }
      }
    ],
    createdAt: new Date('2024-12-19T08:30:00'),
    updatedAt: new Date('2024-12-19T13:45:00')
  },
  {
    id: 'ERR-2024-003',
    title: 'Network Switch Port Failure',
    description: 'Port 24 on switch SW-03 not responding. Multiple workstations in finance department unable to connect to network.',
    category: 'network',
    priority: 'medium',
    status: 'overdue',
    reporterId: '5',
    assignedToId: '3',
    assignedTeam: 'network',
    dateReported: new Date('2024-12-18T14:20:00'),
    startDate: new Date('2024-12-18T15:00:00'),
    dueDate: new Date('2024-12-20T17:00:00'),
    estimatedEffort: 3,
    actualEffort: 2,
    attachments: [],
    comments: [],
    tags: ['network', 'switch', 'finance'],
    slaTimeElapsed: 75,
    slaTimeRemaining: -3,
    slaBreached: true,
    statusHistory: [
      {
        id: 'sh-004',
        previousStatus: 'pending_approval',
        newStatus: 'in_progress',
        changedBy: '3',
        changedAt: new Date('2024-12-18T15:00:00'),
        reason: 'Assigned to network team for resolution'
      }
    ],
    activityLog: [
      {
        id: 'al-005',
        action: 'created',
        description: 'Network connectivity issue reported',
        performedBy: '5',
        performedAt: new Date('2024-12-18T14:20:00'),
        details: { category: 'network', priority: 'medium' }
      }
    ],
    createdAt: new Date('2024-12-18T14:20:00'),
    updatedAt: new Date('2024-12-18T15:30:00')
  }
];

// Mock Feature Requests Data
export const mockFeatureRequests: FeatureRequest[] = [
  {
    id: 'FR-2024-001',
    title: 'Two-Factor Authentication Implementation',
    description: 'Implement two-factor authentication for enhanced security across all user accounts. Should support SMS, email, and authenticator app options.',
    requestType: 'feature_request',
    priority: 'high',
    status: 'development',
    progress: 65,
    reporterId: '5',
    assignedToId: '6',
    assignedTeam: 'programmer',
    dateSubmitted: new Date('2024-12-15T10:00:00'),
    approvalDate: new Date('2024-12-16T09:30:00'),
    assignmentDate: new Date('2024-12-16T11:00:00'),
    startDate: new Date('2024-12-17T09:00:00'),
    dueDate: new Date('2024-12-30T17:00:00'),
    estimatedEffort: 40,
    actualEffort: 26,
    attachments: [],
    comments: [],
    tags: ['security', '2fa', 'authentication'],
    milestones: [
      {
        id: 'ms-001',
        title: 'SMS Integration Complete',
        description: 'SMS-based 2FA functionality implemented',
        targetDate: new Date('2024-12-22T17:00:00'),
        completedDate: new Date('2024-12-20T16:30:00'),
        isCompleted: true,
        progress: 100,
        createdBy: '6',
        createdAt: new Date('2024-12-17T09:00:00')
      },
      {
        id: 'ms-002',
        title: 'Authenticator App Support',
        description: 'Support for Google Authenticator and similar apps',
        targetDate: new Date('2024-12-27T17:00:00'),
        isCompleted: false,
        progress: 60,
        createdBy: '6',
        createdAt: new Date('2024-12-17T09:00:00')
      }
    ],
    timeline: [
      {
        id: 'tl-001',
        phase: 'submission',
        title: 'Request Submitted',
        description: 'Feature request submitted by user',
        startDate: new Date('2024-12-15T10:00:00'),
        endDate: new Date('2024-12-15T10:00:00'),
        isCompleted: true,
        progress: 100
      },
      {
        id: 'tl-002',
        phase: 'approval',
        title: 'Management Approval',
        description: 'Request reviewed and approved by management',
        startDate: new Date('2024-12-16T09:00:00'),
        endDate: new Date('2024-12-16T09:30:00'),
        isCompleted: true,
        progress: 100
      },
      {
        id: 'tl-003',
        phase: 'development',
        title: 'Development Phase',
        description: 'Active development of 2FA features',
        startDate: new Date('2024-12-17T09:00:00'),
        endDate: new Date('2024-12-27T17:00:00'),
        isCompleted: false,
        progress: 65,
        assignedTo: '6'
      }
    ],
    slaTimeElapsed: 144,
    slaTimeRemaining: 216,
    slaBreached: false,
    statusHistory: [
      {
        id: 'sh-005',
        previousStatus: 'submission',
        newStatus: 'approved',
        changedBy: '1',
        changedAt: new Date('2024-12-16T09:30:00'),
        reason: 'Approved for implementation - high security priority'
      },
      {
        id: 'sh-006',
        previousStatus: 'approved',
        newStatus: 'development',
        changedBy: '2',
        changedAt: new Date('2024-12-17T09:00:00'),
        reason: 'Assigned to Alex Programmer for development'
      }
    ],
    activityLog: [
      {
        id: 'al-006',
        action: 'created',
        description: 'Feature request submitted',
        performedBy: '5',
        performedAt: new Date('2024-12-15T10:00:00'),
        details: { requestType: 'feature_request', priority: 'high' }
      },
      {
        id: 'al-007',
        action: 'milestone_reached',
        description: 'SMS Integration milestone completed',
        performedBy: '6',
        performedAt: new Date('2024-12-20T16:30:00'),
        details: { milestone: 'SMS Integration Complete' }
      }
    ],
    approvedBy: '1',
    createdAt: new Date('2024-12-15T10:00:00'),
    updatedAt: new Date('2024-12-20T16:30:00')
  },
  {
    id: 'FR-2024-002',
    title: 'Fix Login Page Layout on Mobile',
    description: 'Login page elements are misaligned on mobile devices smaller than 375px width. Submit button is partially hidden.',
    requestType: 'bug_fix',
    priority: 'medium',
    status: 'testing',
    progress: 85,
    reporterId: '5',
    assignedToId: '6',
    assignedTeam: 'programmer',
    dateSubmitted: new Date('2024-12-18T11:30:00'),
    approvalDate: new Date('2024-12-18T14:00:00'),
    assignmentDate: new Date('2024-12-18T14:30:00'),
    startDate: new Date('2024-12-19T09:00:00'),
    dueDate: new Date('2024-12-23T17:00:00'),
    estimatedEffort: 8,
    actualEffort: 6.5,
    attachments: [],
    comments: [],
    tags: ['bug', 'mobile', 'ui', 'responsive'],
    milestones: [
      {
        id: 'ms-003',
        title: 'CSS Fixes Applied',
        description: 'Mobile responsive CSS fixes implemented',
        targetDate: new Date('2024-12-20T17:00:00'),
        completedDate: new Date('2024-12-20T14:00:00'),
        isCompleted: true,
        progress: 100,
        createdBy: '6',
        createdAt: new Date('2024-12-19T09:00:00')
      }
    ],
    timeline: [
      {
        id: 'tl-004',
        phase: 'submission',
        title: 'Bug Reported',
        description: 'Mobile UI bug reported by user',
        startDate: new Date('2024-12-18T11:30:00'),
        endDate: new Date('2024-12-18T11:30:00'),
        isCompleted: true,
        progress: 100
      },
      {
        id: 'tl-005',
        phase: 'development',
        title: 'Bug Fix Development',
        description: 'CSS fixes for mobile layout',
        startDate: new Date('2024-12-19T09:00:00'),
        endDate: new Date('2024-12-20T14:00:00'),
        isCompleted: true,
        progress: 100,
        assignedTo: '6'
      },
      {
        id: 'tl-006',
        phase: 'testing',
        title: 'QA Testing',
        description: 'Testing fix across multiple mobile devices',
        startDate: new Date('2024-12-20T14:00:00'),
        endDate: new Date('2024-12-22T17:00:00'),
        isCompleted: false,
        progress: 70,
        assignedTo: '6'
      }
    ],
    slaTimeElapsed: 78,
    slaTimeRemaining: 45,
    slaBreached: false,
    statusHistory: [
      {
        id: 'sh-007',
        previousStatus: 'submission',
        newStatus: 'development',
        changedBy: '2',
        changedAt: new Date('2024-12-19T09:00:00'),
        reason: 'Approved and assigned for quick fix'
      },
      {
        id: 'sh-008',
        previousStatus: 'development',
        newStatus: 'testing',
        changedBy: '6',
        changedAt: new Date('2024-12-20T14:00:00'),
        reason: 'Development complete, moving to testing phase'
      }
    ],
    activityLog: [
      {
        id: 'al-008',
        action: 'created',
        description: 'Bug fix request submitted',
        performedBy: '5',
        performedAt: new Date('2024-12-18T11:30:00'),
        details: { requestType: 'bug_fix', priority: 'medium' }
      },
      {
        id: 'al-009',
        action: 'status_changed',
        description: 'Moved to testing phase',
        performedBy: '6',
        performedAt: new Date('2024-12-20T14:00:00'),
        details: { newStatus: 'testing' }
      }
    ],
    approvedBy: '2',
    createdAt: new Date('2024-12-18T11:30:00'),
    updatedAt: new Date('2024-12-20T14:00:00')
  }
];

// Helper function to simulate real-time updates
export const getRecentActivity = () => {
  const activities = [
    { type: 'ticket_created', message: 'New ticket TKT-007 created by David Reporter', time: new Date() },
    { type: 'ticket_resolved', message: 'Ticket TKT-004 resolved by Mike Network', time: new Date(Date.now() - 30 * 60 * 1000) },
    { type: 'downtime_started', message: 'Planned maintenance started for Network Upgrade', time: new Date(Date.now() - 45 * 60 * 1000) },
    { type: 'sla_breach', message: 'SLA breached for ticket TKT-003', time: new Date(Date.now() - 60 * 60 * 1000) }
  ];
  
  return activities.slice(0, 5);
};