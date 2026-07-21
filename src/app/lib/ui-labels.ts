/** Indonesian display labels for API enum values (values stay snake_case). */

const STATUS: Record<string, string> = {
  draft: 'Draf',
  pending_approval: 'Menunggu persetujuan',
  assigned: 'Ditugaskan',
  in_progress: 'Sedang dikerjakan',
  waiting_for_user: 'Menunggu pengguna',
  resolved: 'Selesai',
  closed: 'Ditutup',
  converted: 'Dikonversi',
  rejected: 'Ditolak',
  submission: 'Pengajuan',
  approved: 'Disetujui',
  development: 'Pengembangan',
  testing: 'Pengujian',
  validation: 'Validasi',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  overdue: 'Terlambat',
  post_implementation_review: 'Review pasca implementasi',
  ongoing: 'Berlangsung',
  planned: 'Terencana',
  unplanned: 'Tidak terencana',
};

const PRIORITY: Record<string, string> = {
  critical: 'Kritis',
  high: 'Tinggi',
  medium: 'Sedang',
  low: 'Rendah',
};

const ROLE: Record<string, string> = {
  admin: 'Admin',
  team_lead: 'Team Lead',
  it_staff: 'IT Staff',
  reporter: 'Reporter',
};

const TEAM: Record<string, string> = {
  programmer: 'Programmer',
  network: 'Network',
  hardware: 'Hardware',
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
