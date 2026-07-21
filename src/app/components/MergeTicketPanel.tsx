import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { GitMerge, X } from "lucide-react";
import {
  fetchMergedTickets,
  mergeTickets,
  unmergeTicket,
} from "../lib/api/services";
import type { Ticket } from "../types";

interface MergeTicketPanelProps {
  ticketId: string;
  onChanged?: () => void;
}

export function MergeTicketPanel({ ticketId, onChanged }: MergeTicketPanelProps) {
  const [merged, setMerged] = useState<Ticket[]>([]);
  const [mergeId, setMergeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setMerged(await fetchMergedTickets(ticketId));
    } catch {
      setMerged([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [ticketId]);

  const handleMerge = async () => {
    const id = mergeId.trim();
    if (!id || id === ticketId) return;
    setBusy(true);
    try {
      setMerged(await mergeTickets(ticketId, [id]));
      setMergeId("");
      toast.success("Ticket digabung");
      onChanged?.();
    } catch {
      toast.error("Gagal menggabungkan");
    } finally {
      setBusy(false);
    }
  };

  const handleUnmerge = async (mergedTicketId: string) => {
    setBusy(true);
    try {
      setMerged(await unmergeTicket(ticketId, mergedTicketId));
      toast.success("Gabungan dilepas");
      onChanged?.();
    } catch {
      toast.error("Gagal melepas gabungan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 border rounded-md p-4">
      <div className="flex items-center gap-2">
        <GitMerge className="h-4 w-4" />
        <h4 className="font-medium">Merged Tickets</h4>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : merged.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada ticket digabung</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {merged.map((t) => (
            <Badge key={t.id} variant="secondary" className="gap-1 pr-1">
              {t.id}
              <button
                type="button"
                className="ml-1 rounded hover:bg-muted"
                onClick={() => handleUnmerge(t.id)}
                disabled={busy}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <Label htmlFor="merge-id">ID ticket yang digabung</Label>
          <Input
            id="merge-id"
            value={mergeId}
            onChange={(e) => setMergeId(e.target.value)}
            placeholder="TKT-2026-0001"
          />
        </div>
        <Button onClick={handleMerge} disabled={busy || !mergeId.trim()}>
          Gabungkan
        </Button>
      </div>
    </div>
  );
}
