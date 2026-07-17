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
import { updateResourceStatus, updateFeatureRequest } from "../lib/api/services";
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
      toast.error("Select a different status");
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
      if (target === "features") {
        payload.effective_at = new Date(effectiveAt).toISOString();
      }
      await updateResourceStatus(target, resourceId, payload);
      if (target === "features" && status === "development" && dueDate) {
        await updateFeatureRequest(resourceId, {
          due_date: format(dueDate, "yyyy-MM-dd"),
        });
      }
      toast.success("Status updated");
      setOpen(false);
      setDueDate(undefined);
      setEffectiveAt(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      onCompleted?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ArrowRightCircle className="mr-2 h-4 w-4" />
        Change Status
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>
              Move this item to a different state. History is recorded.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>New Status</Label>
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
              <Label>Reason (optional)</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Short summary shown in status history"
                maxLength={500}
              />
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detailed context for the audit trail"
                maxLength={1000}
                rows={3}
              />
            </div>

            {target === "features" && (
              <div>
                <Label>Effective Date & Time</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  When this status change took effect (required for progress tracking).
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
