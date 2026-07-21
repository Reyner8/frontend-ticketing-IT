import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Paperclip, Upload, X, FileText, Download } from "lucide-react";
import {
  fetchAttachments,
  uploadAttachment,
  deleteAttachment,
} from "../lib/api/services";
import { useApp } from "../lib/store";
import type { Attachment } from "../types";

interface AttachmentPanelProps {
  parent: "tickets" | "errors" | "features" | "comments" | "backup-restore-tests";
  parentId: string;
  canUpload?: boolean;
  canDelete?: boolean;
}

const MAX_MB = 10;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentPanel({
  parent,
  parentId,
  canUpload = true,
  canDelete = false,
}: AttachmentPanelProps) {
  const { state } = useApp();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAttachments(parent, parentId);
      setAttachments(data);
    } catch {
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [parent, parentId]);

  const handleFile = async (file: File) => {
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Ukuran file melebihi batas ${MAX_MB} MB`);
      return;
    }
    setUploading(true);
    try {
      const created = await uploadAttachment(parent, parentId, file);
      setAttachments((prev) => [created, ...prev]);
      toast.success("File berhasil diunggah");
    } catch {
      toast.error("Gagal mengunggah file");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    if (!confirm(`Hapus ${attachment.name}?`)) return;
    try {
      await deleteAttachment(parent, parentId, attachment.id);
      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
      toast.success("Lampiran dihapus");
    } catch {
      toast.error("Gagal menghapus lampiran");
    }
  };

  const currentUserId = state.currentUser?.id;
  const isAdmin = state.currentUser?.role === "admin";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Lampiran ({attachments.length})</h4>
        {canUpload && (
          <>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Mengunggah..." : "Unggah"}
            </Button>
          </>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Memuat...
        </div>
      ) : attachments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-sm text-muted-foreground border rounded-md border-dashed">
          <Paperclip className="h-6 w-6 mb-2 opacity-40" />
          <span>Belum ada lampiran</span>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((a) => {
            const canRemove =
              canDelete && (isAdmin || String(a.uploadedBy) === String(currentUserId));
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 border rounded-md p-2 text-sm"
              >
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(a.size)} · {a.type || "berkas"}
                  </p>
                </div>
                <a href={a.url} target="_blank" rel="noreferrer">
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </a>
                {canRemove && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(a)}
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
