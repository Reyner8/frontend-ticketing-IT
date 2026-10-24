import { ApiError } from "../../lib/api/client";
import type {
  AuditFindingStatus,
  FindingSeverity,
  SecurityAuditStatus,
  SecurityAuditType,
} from "../../types";

/** Jenis audit + penjelasan singkat apa yang dicatat per jenis (tampil di form input). */
export const AUDIT_TYPE_OPTIONS: {
  value: SecurityAuditType;
  label: string;
  description: string;
}[] = [
  {
    value: "hak_akses",
    label: "Audit Hak Akses",
    description:
      "Review akun & hak akses: kesesuaian dengan tugas, akun mantan pegawai/tak terpakai, akun istimewa & vendor, kebijakan password",
  },
  {
    value: "log_aktivitas",
    label: "Audit Log Aktivitas",
    description:
      "Review audit trail: login gagal berulang, akses di luar jam kerja, akses/ubah data pasien (RME)",
  },
  {
    value: "keamanan_data",
    label: "Audit Keamanan Data",
    description:
      "Enkripsi, kepatuhan UU PDP, keamanan backup, potensi kebocoran data",
  },
  {
    value: "jaringan_infrastruktur",
    label: "Audit Jaringan & Infrastruktur",
    description:
      "Firewall, segmentasi VLAN, patch management, antivirus, keamanan Wi-Fi",
  },
  {
    value: "insiden_keamanan",
    label: "Audit Insiden Keamanan",
    description:
      "Kronologi, dampak & penanganan insiden keamanan: malware, phishing, akses tidak sah",
  },
  {
    value: "kepatuhan_sop",
    label: "Audit Kepatuhan SOP TI",
    description:
      "Change management & kepatuhan terhadap SOP/kebijakan TI rumah sakit",
  },
];

export const AUDIT_STATUS_OPTIONS: { value: SecurityAuditStatus; label: string }[] = [
  { value: "planned", label: "Direncanakan" },
  { value: "ongoing", label: "Berjalan" },
  { value: "completed", label: "Selesai" },
];

export const SEVERITY_OPTIONS: { value: FindingSeverity; label: string }[] = [
  { value: "rendah", label: "Rendah" },
  { value: "sedang", label: "Sedang" },
  { value: "tinggi", label: "Tinggi" },
  { value: "kritis", label: "Kritis" },
];

export const FINDING_STATUS_OPTIONS: { value: AuditFindingStatus; label: string }[] = [
  { value: "open", label: "Buka" },
  { value: "in_progress", label: "Diproses" },
  { value: "completed", label: "Selesai" },
];

export const SEVERITY_BADGE: Record<
  FindingSeverity,
  "secondary" | "outline" | "default" | "destructive"
> = {
  rendah: "secondary",
  sedang: "outline",
  tinggi: "default",
  kritis: "destructive",
};

export const AUDIT_STATUS_BADGE: Record<
  SecurityAuditStatus,
  "secondary" | "default" | "outline"
> = {
  planned: "secondary",
  ongoing: "default",
  completed: "outline",
};

export const FINDING_STATUS_BADGE: Record<
  AuditFindingStatus,
  "destructive" | "secondary" | "default"
> = {
  open: "destructive",
  in_progress: "secondary",
  completed: "default",
};

export function auditTypeLabel(type: SecurityAuditType): string {
  return AUDIT_TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type;
}

export function auditStatusLabel(status: SecurityAuditStatus): string {
  return AUDIT_STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

export function severityLabel(severity: FindingSeverity): string {
  return SEVERITY_OPTIONS.find((s) => s.value === severity)?.label ?? severity;
}

export function findingStatusLabel(status: AuditFindingStatus): string {
  return FINDING_STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

/** Ambil pesan validasi Laravel pertama dari ApiError, atau fallback. */
export function firstAuditError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const first = Object.values(err.errors ?? {})[0]?.[0];
    if (first) return first;
    if (err.message) return err.message;
  }
  return fallback;
}
