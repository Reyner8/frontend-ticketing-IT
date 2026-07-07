import { useEffect, useState } from "react";
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
import { Eye, EyeOff, UserMinus, UserPlus } from "lucide-react";
import {
  addTicketWatcher,
  fetchTicketWatchers,
  fetchWatchStatus,
  getCachedUsers,
  removeTicketWatcher,
  toggleTicketWatch,
} from "../lib/api/services";
import { ApiError } from "../lib/api/client";
import { useApp } from "../lib/store";
import type { TicketWatcher } from "../types";

interface WatcherPanelProps {
  ticketId: string;
}

export function WatcherPanel({ ticketId }: WatcherPanelProps) {
  const { state } = useApp();
  const [watchers, setWatchers] = useState<TicketWatcher[]>([]);
  const [isWatching, setIsWatching] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const canManage =
    state.currentUser?.role === "it_staff" || state.currentUser?.role === "admin";

  const load = async () => {
    setLoading(true);
    try {
      const [list, status] = await Promise.all([
        fetchTicketWatchers(ticketId),
        fetchWatchStatus(ticketId),
      ]);
      setWatchers(list);
      setIsWatching(status.isWatching);
    } catch {
      setWatchers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [ticketId]);

  const handleToggle = async () => {
    setSubmitting(true);
    try {
      const watching = await toggleTicketWatch(ticketId);
      setIsWatching(watching);
      await load();
      toast.success(watching ? "Now watching ticket" : "Stopped watching");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const updated = await addTicketWatcher(ticketId, selectedUser);
      setWatchers(updated);
      setSelectedUser("");
      toast.success("Watcher added");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add watcher");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setSubmitting(true);
    try {
      const updated = await removeTicketWatcher(ticketId, userId);
      setWatchers(updated);
      toast.success("Watcher removed");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove watcher");
    } finally {
      setSubmitting(false);
    }
  };

  const users = getCachedUsers().filter((u) => u.isActive);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Watchers ({watchers.length})</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggle}
          disabled={submitting || loading}
        >
          {isWatching ? (
            <>
              <EyeOff className="mr-2 h-4 w-4" />
              Unwatch
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" />
              Watch
            </>
          )}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading watchers...</p>
      ) : watchers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No watchers yet</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {watchers.map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-2">
              <span>{w.name}</span>
              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(w.id)}
                  disabled={submitting}
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <Label>Add watcher</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAdd} disabled={submitting || !selectedUser}>
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
