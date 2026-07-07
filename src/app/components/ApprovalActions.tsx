import { useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { CheckCircle2, XCircle } from "lucide-react";
import { approveResource, rejectResource } from "../lib/api/services";
import { ApiError } from "../lib/api/client";
import { useApp } from "../lib/store";

interface ApprovalActionsProps {
  target: "tickets" | "errors" | "features";
  resourceId: string;
  status: string;
  onCompleted?: () => void;
}

export function ApprovalActions({
  target,
  resourceId,
  status,
  onCompleted,
}: ApprovalActionsProps) {
  const { state } = useApp();
  const [approving, setApproving] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const isTeamLead = state.currentUser?.role === "team_lead";
  const canApprove = isTeamLead && status === "pending_approval";

  if (!canApprove) return null;

  const handleApprove = async () => {
    setApproving(true);
    try {
      await approveResource(target, resourceId);
      toast.success("Approved");
      onCompleted?.();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to approve"
      );
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    setRejecting(true);
    try {
      await rejectResource(target, resourceId, rejectReason.trim());
      toast.success("Rejected");
      setShowRejectDialog(false);
      setRejectReason("");
      onCompleted?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to reject");
    } finally {
      setRejecting(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleApprove}
          disabled={approving}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {approving ? "Approving..." : "Approve"}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowRejectDialog(true)}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Reject
        </Button>
      </div>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>
              Provide a reason so the submitter knows how to resubmit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this is being rejected..."
              required
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={rejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejecting || !rejectReason.trim()}
            >
              {rejecting ? "Rejecting..." : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
