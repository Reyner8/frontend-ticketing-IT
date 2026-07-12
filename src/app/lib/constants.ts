// Chart colors
export const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// Status colors
export const STATUS_COLORS = {
  ongoing: 'text-red-600 bg-red-100',
  resolved: 'text-green-600 bg-green-100'
} as const;

// Type colors
export const TYPE_COLORS = {
  planned: 'text-blue-600 bg-blue-100',
  unplanned: 'text-orange-600 bg-orange-100'
} as const;

// Impact colors
export const IMPACT_COLORS = {
  critical: 'text-red-600 bg-red-100',
  high: 'text-orange-600 bg-orange-100',
  medium: 'text-yellow-600 bg-yellow-100',
  low: 'text-green-600 bg-green-100'
} as const;

// Priority colors
export const PRIORITY_COLORS = {
  critical: 'text-red-600 bg-red-100',
  high: 'text-orange-600 bg-orange-100',
  medium: 'text-yellow-600 bg-yellow-100',
  low: 'text-green-600 bg-green-100'
} as const;

// Ticket status colors
export const TICKET_STATUS_COLORS = {
  draft: 'text-gray-600 bg-gray-100',
  pending_approval: 'text-yellow-600 bg-yellow-100',
  assigned: 'text-blue-600 bg-blue-100',
  in_progress: 'text-purple-600 bg-purple-100',
  waiting_for_user: 'text-orange-600 bg-orange-100',
  resolved: 'text-green-600 bg-green-100',
  closed: 'text-gray-600 bg-gray-200',
  converted: 'text-purple-600 bg-purple-100'
} as const;

// SLA thresholds in hours
export const SLA_THRESHOLDS = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 168
} as const;

// Progress colors
export const PROGRESS_COLORS = {
  completed: 'text-green-600 bg-green-100',
  high: 'text-blue-600 bg-blue-100',
  medium: 'text-yellow-600 bg-yellow-100',
  low: 'text-orange-600 bg-orange-100',
  none: 'text-gray-600 bg-gray-100'
} as const;

// Default pagination settings
export const PAGINATION = {
  defaultPageSize: 10,
  pageSizeOptions: [5, 10, 20, 50]
} as const;

// Date format strings
export const DATE_FORMATS = {
  full: 'MMM dd, yyyy HH:mm',
  short: 'MMM dd, yyyy',
  time: 'HH:mm',
  display: 'MMM dd, yyyy'
} as const;