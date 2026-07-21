import { useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { ArrowRightCircle, Calendar as CalendarIcon } from "lucide-react";
import {
  updateResourceStatus,
  updateErrorReport,
  updateFeatureRequest,
} from "../lib/api/services";
import { ApiError } from "../lib/api/client";
import { useApp } from "../lib/store";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { format } from "date-fns";

interface StatusChangeActionsProps {
  target: "tickets" | "errors" | "features";
  resourceId: string;
  currentStatus: string;
  assignedToId?: string;
  options: { value: string; label: string }[];
  onCompleted?: () => void;
}

export function StatusChangeActions({
  target,
  resourceId,
  currentStatus,
  assignedToId,
  options,
  onCompleted,
}: StatusChangeActionsProps) {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [effectiveAt, setEffectiveAt] = useState(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [submitting, setSubmitting] = useState(false);

  const role = state.currentUser?.role;
  const userId = state.currentUser?.id;

  const canChangeStatus =
    role === "admin" ||
    role === "team_lead" ||
    (role === "it_staff" && !!assignedToId && assignedToId === userId);

  if (!canChangeStatus) return null;

  const handleSubmit = async () => {
    if (status === currentStatus) {
      toast.error("Pilih status yang berbeda");
      return;
    }
    setSubmitting(true);
    try {
      const payload: {
        status: string;
        reason?: string;
        notes?: string;
        effective_at?: string;
      } = {
        status,
        reason: reason || undefined,
        notes: notes || undefined,
      };
      if (target === "features" || target === "errors") {
        payload.effective_at = new Date(effectiveAt).toISOString();
      }
      await updateResourceStatus(target, resourceId, payload);
      if (target === "features" && status === "development" && dueDate) {
        await updateFeatureRequest(resourceId, {
          due_date: format(dueDate, "yyyy-MM-dd"),
        });
      }
      if (target === "errors" && status === "in_progress" && dueDate) {
        await updateErrorReport(resourceId, {
          due_date: format(dueDate, "yyyy-MM-dd"),
        });
      }
      toast.success("Status diperbarui");
      setOpen(false);
      setDueDate(undefined);
      setEffectiveAt(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      onCompleted?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Pembaruan gagal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ArrowRightCircle className="mr-2 h-4 w-4" />
        Ubah status
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah status</DialogTitle>
            <DialogDescription>
              Pindahkan item ke status lain. Riwayat perubahan akan tercatat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Status baru</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Alasan (opsional)</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ringkasan singkat di riwayat status"
                maxLength={500}
              />
            </div>

            <div>
              <Label>Catatan (opsional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Konteks detail untuk jejak audit"
                maxLength={1000}
                rows={3}
              />
            </div>

            {(target === "features" || target === "errors") && (
              <div>
                <Label>Tanggal & waktu efektif</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Kapan perubahan status ini berlaku (wajib untuk pelacakan siklus hidup).
                </p>
                <Input
                  type="datetime-local"
                  value={effectiveAt}
                  onChange={(e) => setEffectiveAt(e.target.value)}
                  required
                />
              </div>
            )}

            {target === "features" && status === "development" && (
              <div>
                <Label>Due Date (opsional)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Due date dapat diatur saat masuk Development. Bisa juga diubah lewat Edit di detail.
                </p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Pilih tanggal target selesai"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {target === "errors" && status === "in_progress" && (
              <div>
                <Label>Due Date (opsional)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Due date dapat disesuaikan saat penanganan dimulai. Bisa juga diubah lewat Edit.
                </p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Pilih target penyelesaian"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Menyimpan..." : "Perbarui"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
