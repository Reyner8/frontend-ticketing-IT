import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { Send } from "lucide-react";
import { fetchComments, createComment } from "../lib/api/services";
import { AttachmentPanel } from "./AttachmentPanel";
import { getUserName } from "../lib/user-utils";
import type { Comment } from "../types";

type CommentParent = "tickets" | "errors" | "features";

interface CommentThreadProps {
  parent: CommentParent;
  resourceId: string;
  canUploadAttachments?: boolean;
}

export function CommentThread({
  parent,
  resourceId,
  canUploadAttachments = true,
}: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setComments(await fetchComments(parent, resourceId));
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [parent, resourceId]);

  const handleAdd = async () => {
    const content = newComment.trim();
    if (!content) return;
    setSubmitting(true);
    try {
      const created = await createComment(parent, resourceId, content);
      setComments((prev) => [...prev, created]);
      setNewComment("");
      toast.success("Comment added");
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <ScrollArea className="h-[320px] pr-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet</p>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => (
              <div key={c.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{getUserName(c.userId)}</span>
                  <span>{format(c.createdAt, "PPp")}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                {canUploadAttachments && (
                  <AttachmentPanel
                    parent="comments"
                    parentId={c.id}
                    canUpload
                    canDelete
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      <div className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={2}
          className="flex-1"
        />
        <Button onClick={handleAdd} disabled={submitting || !newComment.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
