import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
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
import { ArrowRightLeft } from "lucide-react";
import {
  convertTicketToError,
  convertTicketToFeature,
  fetchTicketConversionHistory,
} from "../lib/api/services";
import { ApiError } from "../lib/api/client";
import { useApp } from "../lib/store";
import type { ConversionHistoryEntry } from "../types";

interface ConversionActionsProps {
  ticketId: string;
  ticketStatus: string;
  onCompleted?: () => void;
}

export function ConversionActions({
  ticketId,
  ticketStatus,
  onCompleted,
}: ConversionActionsProps) {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<"error_report" | "feature_request">("error_report");
  const [category, setCategory] = useState("software");
  const [requestType, setRequestType] = useState("feature_request");
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState<ConversionHistoryEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isItStaff = state.currentUser?.role === "it_staff";

  useEffect(() => {
    fetchTicketConversionHistory(ticketId)
      .then(setHistory)
      .catch(() => setHistory(null));
  }, [ticketId]);

  if (!isItStaff) {
    return history ? (
      <div className="rounded-md border p-3 text-sm">
        <p className="font-medium">Converted to {history.targetType}</p>
        <p className="text-muted-foreground">
          Target ID: {history.targetId}
          {history.targetTitle ? ` — ${history.targetTitle}` : ""}
        </p>
      </div>
    ) : null;
  }

  if (history || ticketStatus === "converted") {
    return (
      <div className="rounded-md border p-3 text-sm space-y-1">
        <p className="font-medium">Already converted</p>
        <p className="text-muted-foreground">
          {history?.targetType ?? "Resource"} {history?.targetId ?? ""}
        </p>
      </div>
    );
  }

  const handleConvert = async () => {
    if (!reason.trim()) {
      toast.error("Conversion reason is required");
      return;
    }
    setSubmitting(true);
    try {
      if (target === "error_report") {
        await convertTicketToError(ticketId, {
          category,
          conversion_reason: reason.trim(),
        });
      } else {
        await convertTicketToFeature(ticketId, {
          request_type: requestType,
          conversion_reason: reason.trim(),
        });
      }
      toast.success("Ticket converted");
      setOpen(false);
      onCompleted?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Conversion failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ArrowRightLeft className="mr-2 h-4 w-4" />
        Convert
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Ticket</DialogTitle>
            <DialogDescription>
              Turn this ticket into an error report or feature request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Target type</Label>
              <Select
                value={target}
                onValueChange={(v) => setTarget(v as typeof target)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="error_report">Error Report</SelectItem>
                  <SelectItem value="feature_request">Feature Request</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {target === "error_report" ? (
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="network">Network</SelectItem>
                    <SelectItem value="software">Software</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>Request type</Label>
                <Select value={requestType} onValueChange={setRequestType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feature_request">Feature Request</SelectItem>
                    <SelectItem value="bug_fix">Bug Fix</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Reason</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this ticket being converted?"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConvert} disabled={submitting}>
              {submitting ? "Converting..." : "Convert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
