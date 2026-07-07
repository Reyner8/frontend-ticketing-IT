import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tag as TagIcon, Plus } from "lucide-react";
import { createTag, fetchTags, syncResourceTags } from "../lib/api/services";
import { ApiError } from "../lib/api/client";
import { useApp } from "../lib/store";
import type { Tag } from "../types";

interface TagManagerProps {
  resourceType: "tickets" | "errors" | "features";
  resourceId: string;
  initialTags?: string[];
  onUpdated?: (tags: string[]) => void;
}

export function TagManager({
  resourceType,
  resourceId,
  initialTags = [],
  onUpdated,
}: TagManagerProps) {
  const { state } = useApp();
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const canEdit =
    state.currentUser?.role === "it_staff" || state.currentUser?.role === "admin";

  useEffect(() => {
    setLoading(true);
    fetchTags()
      .then((tags) => {
        setAllTags(tags);
        const ids = tags
          .filter((t) => initialTags.includes(t.name))
          .map((t) => Number(t.id));
        setSelectedIds(ids);
      })
      .catch(() => setAllTags([]))
      .finally(() => setLoading(false));
  }, [resourceId, initialTags.join(",")]);

  const handleCreateTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const created = await createTag(name);
      setAllTags((prev) => [...prev, created]);
      setSelectedIds((prev) => [...prev, Number(created.id)]);
      setNewTagName("");
      toast.success("Tag created");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create tag");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const synced = await syncResourceTags(resourceType, resourceId, selectedIds);
      onUpdated?.(synced.map((t) => t.name));
      toast.success("Tags updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to sync tags");
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tagId: string) => {
    const id = Number(tagId);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedNames = allTags
    .filter((t) => selectedIds.includes(Number(t.id)))
    .map((t) => t.name);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TagIcon className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-medium">Tags</h4>
      </div>

      <div className="flex flex-wrap gap-2 min-h-[28px]">
        {selectedNames.length > 0 ? (
          selectedNames.map((name) => (
            <Badge key={name} variant="secondary">
              {name}
            </Badge>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">No tags</span>
        )}
      </div>

      {canEdit && (
        <>
          <div className="space-y-2">
            <Label>Attach tags</Label>
            <Select
              value=""
              onValueChange={(value) => toggleTag(value)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Loading tags..." : "Select tag to toggle"} />
              </SelectTrigger>
              <SelectContent>
                {allTags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {selectedIds.includes(Number(tag.id)) ? "✓ " : ""}
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="New tag name"
              maxLength={50}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCreateTag}
              disabled={saving || !newTagName.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Tags"}
          </Button>
        </>
      )}
    </div>
  );
}
