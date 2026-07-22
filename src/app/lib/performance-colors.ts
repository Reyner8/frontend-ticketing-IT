// Shared color palette for staff performance visualizations (Dashboard + Team Performance).
// Keep in sync with the status color conventions used elsewhere in the app
// (green = selesai/on-track, blue = in progress/terbuka, red = overdue/melanggar).

export const METRIC_COLORS = {
  completed: "#16a34a", // green-600
  open: "#2563eb", // blue-600
  overdue: "#dc2626", // red-600
} as const;

export const RESOURCE_COLORS = {
  tickets: "#2563eb", // blue-600
  errors: "#7c3aed", // violet-600
  features: "#16a34a", // green-600
} as const;

export const RESOURCE_LABELS = {
  tickets: "Tickets",
  errors: "Error Reports",
  features: "Feature Requests",
} as const;

export const TEAM_PALETTE = ["#2563eb", "#7c3aed", "#0d9488", "#d97706", "#db2777"];
