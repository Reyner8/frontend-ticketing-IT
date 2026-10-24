import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { createAuditFinding, updateAuditFinding } from "../../lib/api/services";
import type { SecurityAuditFinding } from "../../types";
import {
  FINDING_STATUS_OPTIONS,
  SEVERITY_OPTIONS,
  firstAuditError,
} from "./audit-options";

interface FindingFormDialogProps {
  open: boolean;
  auditId: string;
  /** null = tambah temuan baru */
  finding: SecurityAuditFinding | null;
  onClose: () => void;
  onSaved: () => void;
}

const emptyForm = {
  description: "",
  severity: "sedang",
  recommendation: "",
  corrective_action: "",
  status: "open",
  due_date: "",
};

export function FindingFormDialog({
  open,
  auditId,
  finding,
  onClose,
  onSaved,
}: FindingFormDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        finding
          ? {
              description: finding.description,
              severity: finding.severity,
              recommendation: finding.recommendation ?? "",
              corrective_action: finding.correctiveAction ?? "",
              status: finding.status,
              due_date: finding.dueDate
                ? format(finding.dueDate, "yyyy-MM-dd")
                : "",
            }
          : emptyForm
      );
    }
  }, [open, finding]);

  const handleSave = async () => {
    if (!form.description.trim()) {
      toast.error("Uraian temuan wajib diisi");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      description: form.description.trim(),
      severity: form.severity,
      status: form.status,
      recommendation: form.recommendation || null,
      corrective_action: form.corrective_action || null,
      due_date: form.due_date || null,
    };
    try {
      if (finding) {
        await updateAuditFinding(finding.id, payload);
        toast.success("Temuan diperbarui");
      } else {
        await createAuditFinding(auditId, payload);
        toast.success("Temuan dicatat");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(firstAuditError(err, "Gagal menyimpan temuan"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{finding ? "Edit Temuan" : "Tambah Temuan"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Uraian temuan *</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Jelaskan temuan yang ditemukan saat audit…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tingkat risiko *</Label>
              <Select
                value={form.severity}
                onValueChange={(v) => setForm({ ...form, severity: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status temuan</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINDING_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Rekomendasi</Label>
            <Textarea
              value={form.recommendation}
              onChange={(e) => setForm({ ...form, recommendation: e.target.value })}
              rows={2}
              placeholder="Rekomendasi perbaikan…"
            />
          </div>
          <div>
            <Label>Tindak lanjut yang dilakukan</Label>
            <Textarea
              value={form.corrective_action}
              onChange={(e) => setForm({ ...form, corrective_action: e.target.value })}
              rows={2}
              placeholder="Tindak lanjut yang sudah/akan dilakukan…"
            />
          </div>
          <div>
            <Label>Tenggat</Label>
            <Input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
