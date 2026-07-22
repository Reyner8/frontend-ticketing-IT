import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Pencil, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { format } from "date-fns";
import type { TargetApplication } from "../types";
import { ApplicationSelect } from "./ApplicationSelect";

import { useApp } from "../lib/store";

interface ResourceEditActionsProps {
  title: string;
  description?: string;
  showTargetApplication?: boolean;
  targetApplication?: TargetApplication;
  showDueDate?: boolean;
  dueDate?: Date;
  canEdit?: boolean;
  canDelete?: boolean;
  onUpdate: (payload: {
    title: string;
    description?: string;
    target_application?: string;
    due_date?: string | null;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function ResourceEditActions({
  title,
  description,
  showTargetApplication = false,
  targetApplication,
  showDueDate = false,
  dueDate,
  canEdit: canEditProp,
  canDelete: canDeleteProp,
  onUpdate,
  onDelete,
}: ResourceEditActionsProps) {
  const { state } = useApp();
  const role = state.currentUser?.role;
  const canMutate = role === "admin" || role === "it_staff";
  const canEdit = canEditProp ?? canMutate;
  const canDelete = canDeleteProp ?? canMutate;
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description ?? "");
  const [editTargetApplication, setEditTargetApplication] = useState<TargetApplication>(
    targetApplication ?? "simrs"
  );
  const [editDueDate, setEditDueDate] = useState<Date | undefined>(dueDate);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editOpen) {
      setEditTitle(title);
      setEditDescription(description ?? "");
      setEditTargetApplication(targetApplication ?? "simrs");
      setEditDueDate(dueDate);
    }
  }, [editOpen, title, description, targetApplication, dueDate]);

  const handleSave = async () => {
    setBusy(true);
    try {
      await onUpdate({
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        ...(showTargetApplication ? { target_application: editTargetApplication } : {}),
        ...(showDueDate
          ? { due_date: editDueDate ? format(editDueDate, "yyyy-MM-dd") : null }
          : {}),
      });
      toast.success("Updated successfully");
      setEditOpen(false);
    } catch {
      toast.error("Update failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${title}"?`)) return;
    setBusy(true);
    try {
      await onDelete();
      toast.success("Deleted successfully");
    } catch {
      toast.error("Deletion failed");
    } finally {
      setBusy(false);
    }
  };

  if (!canEdit && !canDelete) return null;

  return (
    <div className="flex gap-2">
      {canEdit && (
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4 mr-1" />
          Edit
        </Button>
      )}
      {canDelete && (
        <Button size="sm" variant="destructive" onClick={handleDelete} disabled={busy}>
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      )}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
              />
            </div>
            {showTargetApplication && (
              <div className="space-y-1">
                <Label>Target Application</Label>
                <ApplicationSelect
                  value={editTargetApplication}
                  includeCode={targetApplication}
                  onValueChange={(v) => setEditTargetApplication(v as TargetApplication)}
                />
              </div>
            )}
            {showDueDate && (
              <div className="space-y-1">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editDueDate ? format(editDueDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editDueDate}
                      onSelect={setEditDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {editDueDate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="px-0 h-auto text-xs text-muted-foreground"
                    onClick={() => setEditDueDate(undefined)}
                  >
                    Remove due date
                  </Button>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={busy || !editTitle.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
