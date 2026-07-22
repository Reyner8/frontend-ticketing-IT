/** English display labels for API enum values (values stay snake_case). */

const STATUS: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  waiting_for_user: 'Waiting for User',
  resolved: 'Resolved',
  closed: 'Closed',
  converted: 'Converted',
  rejected: 'Rejected',
  submission: 'Submission',
  approved: 'Approved',
  development: 'Development',
  testing: 'Testing',
  validation: 'Validation',
  completed: 'Completed',
  cancelled: 'Cancelled',
  overdue: 'Overdue',
  post_implementation_review: 'Post-Implementation Review',
  ongoing: 'Ongoing',
  planned: 'Planned',
  unplanned: 'Unplanned',
};

const PRIORITY: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const ROLE: Record<string, string> = {
  admin: 'Admin',
  team_lead: 'Team Lead',
  it_staff: 'IT Staff',
  reporter: 'Reporter',
};

const TEAM: Record<string, string> = {
  programmer: 'Software Engineer',
  network: 'Network Engineer',
  hardware: 'Network Engineer', // legacy — hardware issues routed to SE/Network team
};

export function labelStatus(value: string): string {
  return STATUS[value] ?? value.replace(/_/g, ' ');
}

export function labelPriority(value: string): string {
  return PRIORITY[value] ?? value;
}

export function labelRole(value: string): string {
  return ROLE[value] ?? value.replace(/_/g, ' ');
}

export function labelTeam(value: string): string {
  return TEAM[value] ?? value;
}
