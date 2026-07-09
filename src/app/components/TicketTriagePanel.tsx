import { useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Settings2 } from "lucide-react";
import { updateTicket } from "../lib/api/services";
import { useApp } from "../lib/store";
import type { Ticket, TicketCategory, TicketPriority } from "../types";

const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: "general_report", label: "Belum diklasifikasi" },
  { value: "hardware_problem", label: "Hardware" },
  { value: "network_issue", label: "Network" },
  { value: "software_bug", label: "Software / Bug" },
  { value: "system_error", label: "System Error" },
  { value: "performance_issue", label: "Performance" },
  { value: "feature_request", label: "Permintaan Fitur" },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

interface TicketTriagePanelProps {
  ticket: Ticket;
  onUpdated: (ticket: Ticket) => void;
}

export function TicketTriagePanel({ ticket, onUpdated }: TicketTriagePanelProps) {
  const { state } = useApp();
  const canTriage =
    state.currentUser?.role === "it_staff" || state.currentUser?.role === "admin";

  const [category, setCategory] = useState<TicketCategory>(ticket.category);
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority);
  const [saving, setSaving] = useState(false);

  if (!canTriage || ticket.status === "converted") {
    return null;
  }

  const hasChanges = category !== ticket.category || priority !== ticket.priority;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateTicket(ticket.id, { category, priority });
      onUpdated(updated);
      toast.success("Klasifikasi ticket diperbarui");
    } catch {
      toast.error("Gagal memperbarui klasifikasi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
        <Settings2 className="h-4 w-4" />
        Triage IT — tentukan kategori & prioritas sebelum convert
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Kategori masalah</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Prioritas</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Setelah diklasifikasi, gunakan tombol <strong>Convert</strong> untuk mengarahkan ke
        Error Report (hardware/network/software) atau Feature Request / Bug Fix.
      </p>

      <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving}>
        {saving ? "Menyimpan..." : "Simpan Klasifikasi"}
      </Button>
    </div>
  );
}
