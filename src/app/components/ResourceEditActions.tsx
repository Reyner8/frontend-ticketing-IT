import { useState } from "react";
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
import { Pencil, Trash2 } from "lucide-react";

import { useApp } from "../lib/store";

interface ResourceEditActionsProps {
  title: string;
  description?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  onUpdate: (payload: { title: string; description?: string }) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function ResourceEditActions({
  title,
  description,
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
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    try {
      await onUpdate({
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      });
      toast.success("Updated");
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
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
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
