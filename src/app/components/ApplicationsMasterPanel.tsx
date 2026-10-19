import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Plus, Trash2 } from "lucide-react";
import {
  fetchApplications,
  createApplication,
  updateApplication,
  deactivateApplication,
  deleteApplication,
} from "../lib/api/services";
import { usePaginatedList } from "../lib/api/hooks";
import type { PaginatedListParams, PaginatedListResult } from "../lib/api/hooks";
import { PaginationControls } from "./PaginationControls";
import type { CatalogApplication } from "../types";

export function ApplicationsMasterPanel() {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");

  // Paginasi dikerjakan backend (cap per_page 100 di endpoint applications).
  const fetcher = useCallback(
    async ({
      page,
      perPage,
    }: PaginatedListParams): Promise<PaginatedListResult<CatalogApplication>> => {
      const { applications, meta } = await fetchApplications({
        page,
        per_page: perPage,
      });
      return { data: applications, meta };
    },
    []
  );

  const {
    items: rows,
    meta,
    loading,
    error,
    setPage,
    setPerPage,
    refetch,
  } = usePaginatedList(fetcher);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createApplication({
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
      });
      setName("");
      setCode("");
      setDescription("");
      refetch();
      toast.success("Application added");
    } catch {
      toast.error("Failed to add application");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (row: CatalogApplication) => {
    try {
      if (row.isActive) {
        await deactivateApplication(row.id);
      } else {
        await updateApplication(row.id, { is_active: true });
      }
      refetch();
      toast.success(row.isActive ? "Application deactivated" : "Application activated");
    } catch {
      toast.error("Failed to change status");
    }
  };

  const handleDelete = async (row: CatalogApplication) => {
    if (!confirm(`Delete ${row.name}?`)) return;
    try {
      await deleteApplication(row.id);
      refetch();
      toast.success("Application deleted");
    } catch {
      toast.error("Cannot delete (still in use). Deactivate it instead.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application / System Master</CardTitle>
        <CardDescription>
          Digunakan di Backup Restore Tests, Feature Requests, dan menu lain yang memilih aplikasi
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="SIMRS"
            />
          </div>
          <div>
            <Label>Code (optional)</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="simrs"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        <Button onClick={handleCreate} disabled={saving || !name.trim()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Application
        </Button>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet. Run the ApplicationSeeder seeder.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium">{row.name}</div>
                    {row.description && (
                      <div className="text-xs text-muted-foreground">{row.description}</div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{row.code}</TableCell>
                  <TableCell>
                    <Badge variant={row.isActive ? "default" : "secondary"}>
                      {row.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleToggleActive(row)}>
                      {row.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(row)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <PaginationControls
          meta={meta}
          disabled={loading}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
        />
      </CardContent>
    </Card>
  );
}
