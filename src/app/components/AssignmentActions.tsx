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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { UserPlus, Users, UserMinus } from "lucide-react";
import {
  assignUser,
  assignTeam,
  unassignUser,
  unassignTeam,
  fetchUsers,
  getCachedUsers,
} from "../lib/api/services";
import { ApiError } from "../lib/api/client";
import { useApp } from "../lib/store";
import type { TeamType, User } from "../types";

interface AssignmentActionsProps {
  target: "tickets" | "errors" | "features";
  resourceId: string;
  currentAssigneeId?: string;
  currentTeam?: TeamType;
  onCompleted?: () => void;
}

const TEAMS: { value: TeamType; label: string }[] = [
  { value: "programmer", label: "Tim Programmer" },
  { value: "network", label: "Tim Jaringan" },
  { value: "hardware", label: "Tim Hardware" },
];

export function AssignmentActions({
  target,
  resourceId,
  currentAssigneeId,
  currentTeam,
  onCompleted,
}: AssignmentActionsProps) {
  const { state } = useApp();
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>(currentAssigneeId ?? "");
  const [selectedTeam, setSelectedTeam] = useState<TeamType | "">(currentTeam ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>(() =>
    getCachedUsers().filter((u) => u.role === "it_staff" && u.isActive)
  );

  useEffect(() => {
    if (!showUserDialog) return;
    let cancelled = false;
    fetchUsers()
      .then((list) => {
        if (cancelled) return;
        setUsers(list.filter((u) => u.role === "it_staff" && u.isActive));
      })
      .catch(() => {
        if (!cancelled) {
          setUsers(getCachedUsers().filter((u) => u.role === "it_staff" && u.isActive));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [showUserDialog]);

  if (state.currentUser?.role !== "team_lead" && state.currentUser?.role !== "admin") {
    return null;
  }

  const withSubmitting = async <T,>(fn: () => Promise<T>) => {
    setSubmitting(true);
    try {
      await fn();
      onCompleted?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Aksi gagal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignUser = () =>
    withSubmitting(async () => {
      if (!selectedUser) return;
      await assignUser(target, resourceId, selectedUser);
      toast.success("Berhasil ditugaskan ke pengguna");
      setShowUserDialog(false);
    });

  const handleAssignTeam = () =>
    withSubmitting(async () => {
      if (!selectedTeam) return;
      await assignTeam(target, resourceId, selectedTeam);
      toast.success("Berhasil ditugaskan ke tim");
      setShowTeamDialog(false);
    });

  const handleUnassignUser = () =>
    withSubmitting(async () => {
      await unassignUser(target, resourceId);
      toast.success("Penugasan pengguna dihapus");
    });

  const handleUnassignTeam = () =>
    withSubmitting(async () => {
      await unassignTeam(target, resourceId);
      toast.success("Penugasan tim dihapus");
    });

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowUserDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          {currentAssigneeId ? "Tugaskan Ulang Pengguna" : "Tugaskan Pengguna"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowTeamDialog(true)}>
          <Users className="mr-2 h-4 w-4" />
          {currentTeam ? "Tugaskan Ulang Tim" : "Tugaskan Tim"}
        </Button>
        {currentAssigneeId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUnassignUser}
            disabled={submitting}
          >
            <UserMinus className="mr-2 h-4 w-4" />
            Hapus Pengguna
          </Button>
        )}
        {currentTeam && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUnassignTeam}
            disabled={submitting}
          >
            <UserMinus className="mr-2 h-4 w-4" />
            Hapus Tim
          </Button>
        )}
      </div>

      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tugaskan ke Staf IT</DialogTitle>
            <DialogDescription>
              Pilih anggota staf IT aktif untuk menangani item ini.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Penerima Tugas</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih pengguna" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} {u.team ? `— ${u.team}` : ""}
                  </SelectItem>
                ))}
                {users.length === 0 && (
                  <SelectItem value="none" disabled>
                    Tidak ada staf IT aktif
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={handleAssignUser}
              disabled={submitting || !selectedUser}
            >
              {submitting ? "Menugaskan..." : "Tugaskan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tugaskan ke Tim</DialogTitle>
            <DialogDescription>
              Arahkan item ini ke tim IT tertentu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Tim</Label>
            <Select
              value={selectedTeam}
              onValueChange={(v) => setSelectedTeam(v as TeamType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih tim" />
              </SelectTrigger>
              <SelectContent>
                {TEAMS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTeamDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={handleAssignTeam}
              disabled={submitting || !selectedTeam}
            >
              {submitting ? "Menugaskan..." : "Tugaskan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
