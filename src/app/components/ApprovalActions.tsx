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
import { isResourcePendingApproval } from "../lib/api/mappers";
import { ApiError } from "../lib/api/client";
import { useApp } from "../lib/store";
import type { ApprovalStatusValue } from "../types";

interface ApprovalActionsProps {
  target: "tickets" | "errors" | "features";
  resourceId: string;
  status: string;
  approvalStatus?: ApprovalStatusValue;
  onCompleted?: () => void;
}

export function ApprovalActions({
  target,
  resourceId,
  status,
  approvalStatus,
  onCompleted,
}: ApprovalActionsProps) {
  const { state } = useApp();
  const [approving, setApproving] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const isTeamLead =
    state.currentUser?.role === "team_lead" || state.currentUser?.role === "admin";
  const canApprove = isTeamLead && isResourcePendingApproval(status, approvalStatus);

  if (!canApprove) return null;

  const handleApprove = async () => {
    setApproving(true);
    try {
      await approveResource(target, resourceId);
      toast.success("Disetujui");
      onCompleted?.();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Gagal menyetujui"
      );
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Alasan penolakan wajib diisi");
      return;
    }
    setRejecting(true);
    try {
      await rejectResource(target, resourceId, rejectReason.trim());
      toast.success("Ditolak");
      setShowRejectDialog(false);
      setRejectReason("");
      onCompleted?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal menolak");
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
          {approving ? "Menyetujui..." : "Setujui"}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowRejectDialog(true)}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Tolak
        </Button>
      </div>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak pengajuan</DialogTitle>
            <DialogDescription>
              Berikan alasan agar pengaju tahu cara mengajukan ulang.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Alasan</Label>
            <Textarea
              id="reason"
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Jelaskan alasan penolakan..."
              required
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={rejecting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejecting || !rejectReason.trim()}
            >
              {rejecting ? "Menolak..." : "Konfirmasi tolak"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
