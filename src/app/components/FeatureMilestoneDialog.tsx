import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import {
  fetchFeatureMilestones,
  createMilestone,
  completeMilestone,
  deleteMilestone,
} from "../lib/api/services";
import { ApiError } from "../lib/api/client";
import type { Milestone } from "../types";

interface FeatureMilestoneDialogProps {
  featureId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function FeatureMilestoneDialog({
  featureId,
  open,
  onOpenChange,
  onUpdated,
}: FeatureMilestoneDialogProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [msTitle, setMsTitle] = useState("");
  const [msDate, setMsDate] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!featureId) return;
    setLoading(true);
    try {
      const ms = await fetchFeatureMilestones(featureId);
      setMilestones(ms);
    } catch {
      setMilestones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && featureId) {
      load();
    }
  }, [open, featureId]);

  const addMilestone = async () => {
    if (!featureId || !msTitle.trim() || !msDate) return;
    try {
      await createMilestone(featureId, {
        title: msTitle.trim(),
        target_date: msDate,
      });
      setMsTitle("");
      setMsDate("");
      await load();
      onUpdated?.();
      toast.success("Milestone dibuat");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Gagal membuat milestone";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Milestones</DialogTitle>
          <DialogDescription>
            {featureId ? `Feature ${featureId}` : "Kelola milestone pengiriman"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[320px] pr-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Memuat milestone...</p>
          ) : milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Belum ada milestone</p>
          ) : (
            <div className="space-y-2">
              {milestones.map((m) => (
                <div key={m.id} className="border rounded-md p-3 text-sm flex justify-between gap-2">
                  <div>
                    <p className="font-medium">{m.title}</p>
                    <p className="text-muted-foreground">
                      Target: {format(m.targetDate, "PP")} · {m.progress}%
                      {m.isCompleted && " · Selesai"}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!m.isCompleted && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          if (!featureId) return;
                          await completeMilestone(featureId, m.id);
                          await load();
                          onUpdated?.();
                        }}
                      >
                        Selesaikan
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (!featureId) return;
                        await deleteMilestone(featureId, m.id);
                        await load();
                        onUpdated?.();
                      }}
                    >
                      Hapus
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="grid gap-2 sm:grid-cols-3 pt-2 border-t">
          <Input placeholder="Judul" value={msTitle} onChange={(e) => setMsTitle(e.target.value)} />
          <Input
            type="date"
            min={format(new Date(), "yyyy-MM-dd")}
            value={msDate}
            onChange={(e) => setMsDate(e.target.value)}
          />
          <Button onClick={addMilestone} disabled={!featureId}>
            Tambah milestone
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
