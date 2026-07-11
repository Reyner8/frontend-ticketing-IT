import { useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { HandMetal } from "lucide-react";
import { claimResource } from "../lib/api/services";
import { ApiError } from "../lib/api/client";
import { useApp } from "../lib/store";

interface ClaimActionsProps {
  target: "tickets" | "errors" | "features";
  resourceId: string;
  assignedToId?: string;
  onCompleted?: () => void;
}

export function ClaimActions({
  target,
  resourceId,
  assignedToId,
  onCompleted,
}: ClaimActionsProps) {
  const { state } = useApp();
  const [submitting, setSubmitting] = useState(false);

  if (state.currentUser?.role !== "it_staff") {
    return null;
  }

  if (assignedToId) {
    if (assignedToId === state.currentUser.id) {
      return (
        <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700">
          Anda yang menangani
        </span>
      );
    }
    return null;
  }

  const handleClaim = async () => {
    setSubmitting(true);
    try {
      await claimResource(target, resourceId);
      toast.success("Tiket berhasil diambil");
      onCompleted?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal mengambil tiket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Button variant="default" size="sm" onClick={handleClaim} disabled={submitting}>
      <HandMetal className="mr-2 h-4 w-4" />
      {submitting ? "Mengambil..." : "Ambil Tiket"}
    </Button>
  );
}
