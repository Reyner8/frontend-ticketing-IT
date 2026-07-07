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
import { ArrowRightCircle } from "lucide-react";
import { updateResourceStatus } from "../lib/api/services";
import { ApiError } from "../lib/api/client";
import { useApp } from "../lib/store";

interface StatusChangeActionsProps {
  target: "tickets" | "errors" | "features";
  resourceId: string;
  currentStatus: string;
  options: { value: string; label: string }[];
  onCompleted?: () => void;
}

export function StatusChangeActions({
  target,
  resourceId,
  currentStatus,
  options,
  onCompleted,
}: StatusChangeActionsProps) {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isItStaff = state.currentUser?.role === "it_staff";
  if (!isItStaff) return null;

  const handleSubmit = async () => {
    if (status === currentStatus) {
      toast.error("Select a different status");
      return;
    }
    setSubmitting(true);
    try {
      await updateResourceStatus(target, resourceId, {
        status,
        reason: reason || undefined,
        notes: notes || undefined,
      });
      toast.success("Status updated");
      setOpen(false);
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
