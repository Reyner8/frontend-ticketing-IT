import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { CheckCircle2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  deleteAuditFinding,
  fetchSecurityAuditDetail,
  updateAuditFinding,
} from "../../lib/api/services";
import type { SecurityAudit, SecurityAuditFinding } from "../../types";
import {
  auditStatusLabel,
  auditTypeLabel,
  AUDIT_STATUS_BADGE,
  FINDING_STATUS_BADGE,
  findingStatusLabel,
  firstAuditError,
  SEVERITY_BADGE,
  severityLabel,
} from "./audit-options";
import { FindingFormDialog } from "./FindingFormDialog";

interface SecurityAuditDetailDialogProps {
  /** Baris dari list; detail + temuan diambil ulang dari server saat dialog dibuka. */
  audit: SecurityAudit | null;
  canManage: boolean;
  onClose: () => void;
  onEdit: (audit: SecurityAudit) => void;
  onDelete: (audit: SecurityAudit) => void;
  /** Dipanggil setelah temuan berubah supaya list di parent di-refresh. */
  onChanged: () => void;
}

export function SecurityAuditDetailDialog({
  audit,
  canManage,
  onClose,
  onEdit,
  onDelete,
  onChanged,
}: SecurityAuditDetailDialogProps) {
  const [detail, setDetail] = useState<SecurityAudit | null>(null);
  const [loading, setLoading] = useState(false);
  const [findingFormOpen, setFindingFormOpen] = useState(false);
  const [editingFinding, setEditingFinding] = useState<SecurityAuditFinding | null>(null);

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true);
    try {
      setDetail(await fetchSecurityAuditDetail(id));
    } catch {
      toast.error("Gagal memuat detail audit");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (audit) {
      setDetail(audit);
      loadDetail(audit.id);
    } else {
      setDetail(null);
      setFindingFormOpen(false);
      setEditingFinding(null);
    }
  }, [audit, loadDetail]);

  const refresh = async () => {
    if (detail) await loadDetail(detail.id);
    onChanged();
  };

  const handleCompleteFinding = async (finding: SecurityAuditFinding) => {
    try {
      await updateAuditFinding(finding.id, { status: "completed" });
      toast.success("Temuan ditandai selesai");
      await refresh();
    } catch (err) {
      toast.error(firstAuditError(err, "Gagal menyelesaikan temuan"));
    }
  };

  const handleDeleteFinding = async (finding: SecurityAuditFinding) => {
    if (!confirm("Hapus temuan ini?")) return;
    try {
      await deleteAuditFinding(finding.id);
      toast.success("Temuan dihapus");
      await refresh();
    } catch (err) {
      toast.error(firstAuditError(err, "Gagal menghapus temuan"));
    }
  };

  const findings = detail?.findings ?? [];

  return (
    <>
      <Dialog open={!!audit} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono">{detail.id}</span>
                  <Badge variant={AUDIT_STATUS_BADGE[detail.status]}>
                    {auditStatusLabel(detail.status)}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              {loading && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Memuat…
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="col-span-2">
                  <p className="text-muted-foreground">Judul</p>
                  <p className="font-medium">{detail.title}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Jenis audit</p>
                  <p>{auditTypeLabel(detail.type)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tanggal audit</p>
                  <p>{format(detail.auditDate, "dd MMM yyyy")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Periode</p>
                  <p>{detail.period ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Auditor internal</p>
                  <p>{detail.performedBy?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Auditor eksternal</p>
                  <p>{detail.externalAuditor ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Dibuat oleh</p>
                  <p>{detail.createdBy?.name ?? "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Sistem yang diaudit</p>
                  <p className="whitespace-pre-wrap">{detail.scope ?? "—"}</p>
                </div>
                {detail.summary && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Ringkasan hasil</p>
                    <p className="whitespace-pre-wrap">{detail.summary}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">
                    Temuan ({findings.filter((f) => f.status !== "completed").length} terbuka /{" "}
                    {findings.length} total)
                  </h4>
                  {canManage && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingFinding(null);
                        setFindingFormOpen(true);
                      }}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Tambah Temuan
                    </Button>
                  )}
                </div>
                {findings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada temuan.</p>
                ) : (
                  <div className="space-y-2">
                    {findings.map((f) => (
                      <div key={f.id} className="rounded-md border p-3 text-sm space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={SEVERITY_BADGE[f.severity]}>
                            {severityLabel(f.severity)}
                          </Badge>
                          <Badge variant={FINDING_STATUS_BADGE[f.status]}>
                            {findingStatusLabel(f.status)}
                          </Badge>
                          {f.dueDate && (
                            <span className="text-xs text-muted-foreground">
                              Tenggat: {format(f.dueDate, "dd MMM yyyy")}
                            </span>
                          )}
                        </div>
                        <p className="font-medium whitespace-pre-wrap">{f.description}</p>
                        {f.recommendation && (
                          <p className="text-muted-foreground">
                            <span className="font-medium">Rekomendasi:</span>{" "}
                            {f.recommendation}
                          </p>
                        )}
                        {f.correctiveAction && (
                          <p className="text-muted-foreground">
                            <span className="font-medium">Tindak lanjut:</span>{" "}
                            {f.correctiveAction}
                          </p>
                        )}
                        {f.completedAt && (
                          <p className="text-xs text-muted-foreground">
                            Selesai: {format(f.completedAt, "dd MMM yyyy HH:mm")}
                          </p>
                        )}
                        {canManage && (
                          <div className="flex items-center gap-1 pt-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingFinding(f);
                                setFindingFormOpen(true);
                              }}
                            >
                              <Pencil className="mr-1 h-3 w-3" />
                              Edit
                            </Button>
                            {f.status !== "completed" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCompleteFinding(f)}
                              >
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Selesaikan
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => handleDeleteFinding(f)}
                            >
                              <Trash2 className="mr-1 h-3 w-3" />
                              Hapus
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {canManage && (
                <DialogFooter className="gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => onEdit(detail)}>
                    Edit Audit
                  </Button>
                  <Button variant="destructive" onClick={() => onDelete(detail)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {detail && (
        <FindingFormDialog
          open={findingFormOpen}
          auditId={detail.id}
          finding={editingFinding}
          onClose={() => setFindingFormOpen(false)}
          onSaved={refresh}
        />
      )}
    </>
  );
}
