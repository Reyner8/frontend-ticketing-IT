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
import type { ConversionHistoryEntry, TargetApplication, TicketPriority } from "../types";
import { ApplicationSelect } from "./ApplicationSelect";
import { labelPriority } from "../lib/ui-labels";

interface ConversionActionsProps {
  ticketId: string;
  ticketStatus: string;
  ticketPriority?: TicketPriority;
  onCompleted?: () => void;
}

export function ConversionActions({
  ticketId,
  ticketStatus,
  ticketPriority = "medium",
  onCompleted,
}: ConversionActionsProps) {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<"error_report" | "feature_request">("error_report");
  const [category, setCategory] = useState("software");
  const [requestType, setRequestType] = useState("feature_request");
  const [targetApplication, setTargetApplication] = useState<TargetApplication>("simrs");
  const [priority, setPriority] = useState<TicketPriority>(ticketPriority);
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState<ConversionHistoryEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isItStaff =
    state.currentUser?.role === "it_staff" || state.currentUser?.role === "admin";

  useEffect(() => {
    setPriority(ticketPriority);
  }, [ticketPriority]);

  useEffect(() => {
    fetchTicketConversionHistory(ticketId)
      .then(setHistory)
      .catch(() => setHistory(null));
  }, [ticketId]);

  if (history || ticketStatus === "converted") {
    const targetType = history?.targetType?.replace(/_/g, " ") ?? "resource";
    const targetId = history?.targetId;
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700"
        title={
          history?.targetTitle
            ? `${targetType} ${targetId ?? ""} — ${history.targetTitle}`
            : undefined
        }
      >
        <ArrowRightLeft className="h-3.5 w-3.5" />
        Converted{targetId ? ` → ${targetId}` : ` to ${targetType}`}
      </span>
    );
  }

  if (!isItStaff) {
    return null;
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
          priority,
        });
      } else {
        await convertTicketToFeature(ticketId, {
          request_type: requestType,
          target_application: targetApplication,
          conversion_reason: reason.trim(),
          priority,
        });
      }
      toast.success("Ticket converted successfully");
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
            <DialogTitle>Convert Ticket — Route to Team</DialogTitle>
            <DialogDescription>
              Tentukan apakah laporan ini masuk Error Report (insiden) atau Feature
              Request/Bug Fix (pengembangan). Untuk Error Report, pilih ranah
              hardware, network, atau software.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Conversion target</Label>
              <Select
                value={target}
                onValueChange={(v) => setTarget(v as typeof target)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="error_report">Error Report (IT incident)</SelectItem>
                  <SelectItem value="feature_request">
                    Feature Request / Bug Fix (development)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {target === "error_report" ? (
              <div>
                <Label>Problem domain (IT)</Label>
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
              <>
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
                <div>
                  <Label>Target Application</Label>
                  <ApplicationSelect
                    value={targetApplication}
                    onValueChange={(v) => setTargetApplication(v as TargetApplication)}
                  />
                </div>
              </>
            )}

            <div>
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as TicketPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{labelPriority("low")}</SelectItem>
                  <SelectItem value="medium">{labelPriority("medium")}</SelectItem>
                  <SelectItem value="high">{labelPriority("high")}</SelectItem>
                  <SelectItem value="critical">{labelPriority("critical")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Conversion reason</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this ticket being routed to that module?"
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
