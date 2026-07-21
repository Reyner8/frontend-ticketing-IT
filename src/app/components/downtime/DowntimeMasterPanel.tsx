import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { toast } from "sonner";
import { ApiError } from "../../lib/api/client";
import {
  createDowntimeComponent,
  createDowntimeLocation,
  deactivateDowntimeComponent,
  deactivateDowntimeLocation,
  deleteDowntimeComponent,
  deleteDowntimeLocation,
  fetchDowntimeComponents,
  fetchDowntimeLocations,
  syncDowntimeComponentDependencies,
  updateDowntimeComponent,
  updateDowntimeLocation,
} from "../../lib/api/services";
import { DowntimeComponent, DowntimeComponentCategory, DowntimeLocation } from "../../types";
import { getComponentCategoryColor } from "../../lib/downtime-utils";
import { ComponentMultiSelect } from "./ComponentMultiSelect";
import { Plus, MoreHorizontal, Pencil, Link2, Power, PowerOff, Trash2 } from "lucide-react";

const CATEGORIES: Array<{ value: DowntimeComponentCategory; label: string }> = [
  { value: "application", label: "Aplikasi" },
  { value: "network", label: "Jaringan" },
  { value: "utility", label: "Utilitas / Listrik" },
  { value: "infrastructure", label: "Infrastruktur" },
  { value: "equipment", label: "Peralatan" },
  { value: "operational_service", label: "Layanan operasional" },
  { value: "other", label: "Lainnya" },
];

function firstError(err: unknown): string {
  if (err instanceof ApiError) {
    const first = err.errors ? Object.values(err.errors)[0]?.[0] : undefined;
    return first || err.message;
  }
  return err instanceof Error ? err.message : "Permintaan gagal";
}

export function DowntimeMasterPanel() {
  const [locations, setLocations] = useState<DowntimeLocation[]>([]);
  const [components, setComponents] = useState<DowntimeComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [componentDialogOpen, setComponentDialogOpen] = useState(false);
  const [dependencyDialogOpen, setDependencyDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<DowntimeLocation | null>(null);
  const [editingComponent, setEditingComponent] = useState<DowntimeComponent | null>(null);
  const [dependencySource, setDependencySource] = useState<DowntimeComponent | null>(null);

  const [locationForm, setLocationForm] = useState({ name: "", code: "", description: "" });
  const [componentForm, setComponentForm] = useState({
    name: "",
    code: "",
    category: "application" as DowntimeComponentCategory,
    description: "",
  });
  const [dependencyIds, setDependencyIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [locRes, compRes] = await Promise.all([
        fetchDowntimeLocations({ per_page: 100 }),
        fetchDowntimeComponents({ per_page: 100 }),
      ]);
      setLocations(locRes.locations);
      setComponents(compRes.components);
    } catch (err) {
      toast.error(firstError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const activeComponents = useMemo(() => components.filter((c) => c.isActive), [components]);

  const openCreateLocation = () => {
    setEditingLocation(null);
    setLocationForm({ name: "", code: "", description: "" });
    setLocationDialogOpen(true);
  };

  const openEditLocation = (location: DowntimeLocation) => {
    setEditingLocation(location);
    setLocationForm({
      name: location.name,
      code: location.code,
      description: location.description ?? "",
    });
    setLocationDialogOpen(true);
  };

  const saveLocation = async () => {
    if (!locationForm.name.trim()) {
      toast.error("Nama lokasi wajib diisi");
      return;
    }
    setBusy(true);
    try {
      if (editingLocation) {
        await updateDowntimeLocation(editingLocation.id, {
          name: locationForm.name.trim(),
          code: locationForm.code.trim() || undefined,
          description: locationForm.description || null,
        });
        toast.success("Lokasi diperbarui");
      } else {
        await createDowntimeLocation({
          name: locationForm.name.trim(),
          code: locationForm.code.trim() || undefined,
          description: locationForm.description || undefined,
        });
        toast.success("Lokasi dibuat");
      }
      setLocationDialogOpen(false);
      await load();
    } catch (err) {
      toast.error(firstError(err));
    } finally {
      setBusy(false);
    }
  };

  const openCreateComponent = () => {
    setEditingComponent(null);
    setComponentForm({ name: "", code: "", category: "application", description: "" });
    setComponentDialogOpen(true);
  };

  const openEditComponent = (component: DowntimeComponent) => {
    setEditingComponent(component);
    setComponentForm({
      name: component.name,
      code: component.code,
      category: component.category,
      description: component.description ?? "",
    });
    setComponentDialogOpen(true);
  };

  const saveComponent = async () => {
    if (!componentForm.name.trim()) {
      toast.error("Nama komponen wajib diisi");
      return;
    }
    setBusy(true);
    try {
      if (editingComponent) {
        await updateDowntimeComponent(editingComponent.id, {
          name: componentForm.name.trim(),
          code: componentForm.code.trim() || undefined,
          category: componentForm.category,
          description: componentForm.description || null,
        });
        toast.success("Komponen diperbarui");
      } else {
        await createDowntimeComponent({
          name: componentForm.name.trim(),
          code: componentForm.code.trim() || undefined,
          category: componentForm.category,
          description: componentForm.description || undefined,
        });
        toast.success("Komponen dibuat");
      }
      setComponentDialogOpen(false);
      await load();
    } catch (err) {
      toast.error(firstError(err));
    } finally {
      setBusy(false);
    }
  };

  const openDependencies = (component: DowntimeComponent) => {
    setDependencySource(component);
    setDependencyIds(component.defaultAffectedComponents.map((c) => c.id));
    setDependencyDialogOpen(true);
  };

  const saveDependencies = async () => {
    if (!dependencySource) return;
    setBusy(true);
    try {
      await syncDowntimeComponentDependencies(
        dependencySource.id,
        dependencyIds.map((id) => Number(id))
      );
      toast.success("Dependensi diperbarui");
      setDependencyDialogOpen(false);
      await load();
    } catch (err) {
      toast.error(firstError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Data master</CardTitle>
          <CardDescription>
            Kelola lokasi, komponen, dan pemetaan dependensi default untuk insiden downtime.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="components">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="components">Komponen</TabsTrigger>
          <TabsTrigger value="locations">Lokasi</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateComponent}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah komponen
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Terdampak default</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5}>Memuat...</TableCell>
                    </TableRow>
                  ) : components.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>Belum ada komponen.</TableCell>
                    </TableRow>
                  ) : (
                    components.map((component) => (
                      <TableRow key={component.id}>
                        <TableCell>
                          <div className="font-medium">{component.name}</div>
                          <div className="text-xs text-muted-foreground">{component.code}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getComponentCategoryColor(component.category)}>
                            {component.category.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {component.defaultAffectedComponents.length === 0 ? (
                              <span className="text-xs text-muted-foreground">Tidak ada</span>
                            ) : (
                              component.defaultAffectedComponents.slice(0, 4).map((c) => (
                                <Badge key={c.id} variant="outline">
                                  {c.name}
                                </Badge>
                              ))
                            )}
                            {component.defaultAffectedComponents.length > 4 && (
                              <Badge variant="outline">
                                +{component.defaultAffectedComponents.length - 4} lainnya
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              component.isActive
                                ? "text-green-700 bg-green-100"
                                : "text-gray-600 bg-gray-100"
                            }
                          >
                            {component.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Buka menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditComponent(component)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Ubah
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDependencies(component)}>
                                <Link2 className="mr-2 h-4 w-4" />
                                Dependensi
                              </DropdownMenuItem>
                              {component.isActive ? (
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      await deactivateDowntimeComponent(component.id);
                                      toast.success("Komponen dinonaktifkan");
                                      await load();
                                    } catch (err) {
                                      toast.error(firstError(err));
                                    }
                                  }}
                                >
                                  <PowerOff className="mr-2 h-4 w-4" />
                                  Nonaktifkan
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      await updateDowntimeComponent(component.id, { is_active: true });
                                      toast.success("Komponen diaktifkan kembali");
                                      await load();
                                    } catch (err) {
                                      toast.error(firstError(err));
                                    }
                                  }}
                                >
                                  <Power className="mr-2 h-4 w-4" />
                                  Aktifkan kembali
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={async () => {
                                  if (!confirm(`Hapus komponen "${component.name}"?`)) return;
                                  try {
                                    await deleteDowntimeComponent(component.id);
                                    toast.success("Komponen dihapus");
                                    await load();
                                  } catch (err) {
                                    toast.error(firstError(err));
                                  }
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateLocation}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah lokasi
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4}>Memuat...</TableCell>
                    </TableRow>
                  ) : locations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>Belum ada lokasi.</TableCell>
                    </TableRow>
                  ) : (
                    locations.map((location) => (
                      <TableRow key={location.id}>
                        <TableCell>
                          <div className="font-medium">{location.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {location.description || "—"}
                          </div>
                        </TableCell>
                        <TableCell>{location.code}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              location.isActive
                                ? "text-green-700 bg-green-100"
                                : "text-gray-600 bg-gray-100"
                            }
                          >
                            {location.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Buka menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditLocation(location)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Ubah
                              </DropdownMenuItem>
                              {location.isActive ? (
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      await deactivateDowntimeLocation(location.id);
                                      toast.success("Lokasi dinonaktifkan");
                                      await load();
                                    } catch (err) {
                                      toast.error(firstError(err));
                                    }
                                  }}
                                >
                                  <PowerOff className="mr-2 h-4 w-4" />
                                  Nonaktifkan
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      await updateDowntimeLocation(location.id, { is_active: true });
                                      toast.success("Lokasi diaktifkan kembali");
                                      await load();
                                    } catch (err) {
                                      toast.error(firstError(err));
                                    }
                                  }}
                                >
                                  <Power className="mr-2 h-4 w-4" />
                                  Aktifkan kembali
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={async () => {
                                  if (!confirm(`Hapus lokasi "${location.name}"?`)) return;
                                  try {
                                    await deleteDowntimeLocation(location.id);
                                    toast.success("Lokasi dihapus");
                                    await load();
                                  } catch (err) {
                                    toast.error(firstError(err));
                                  }
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLocation ? "Ubah lokasi" : "Tambah lokasi"}</DialogTitle>
            <DialogDescription>Lokasi menjaga konsistensi pelaporan antar insiden.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nama</Label>
              <Input
                value={locationForm.name}
                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Kode (opsional)</Label>
              <Input
                value={locationForm.code}
                onChange={(e) => setLocationForm({ ...locationForm, code: e.target.value })}
              />
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Textarea
                value={locationForm.description}
                onChange={(e) => setLocationForm({ ...locationForm, description: e.target.value })}
              />
            </div>
            <Button onClick={saveLocation} disabled={busy}>
              {busy ? "Menyimpan..." : "Simpan lokasi"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={componentDialogOpen} onOpenChange={setComponentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingComponent ? "Ubah komponen" : "Tambah komponen"}</DialogTitle>
            <DialogDescription>
              Komponen dapat berupa aplikasi, jaringan, listrik, infrastruktur, dan lainnya.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nama</Label>
              <Input
                value={componentForm.name}
                onChange={(e) => setComponentForm({ ...componentForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Kode (opsional)</Label>
              <Input
                value={componentForm.code}
                onChange={(e) => setComponentForm({ ...componentForm, code: e.target.value })}
              />
            </div>
            <div>
              <Label>Kategori</Label>
              <Select
                value={componentForm.category}
                onValueChange={(value: DowntimeComponentCategory) =>
                  setComponentForm({ ...componentForm, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Textarea
                value={componentForm.description}
                onChange={(e) => setComponentForm({ ...componentForm, description: e.target.value })}
              />
            </div>
            <Button onClick={saveComponent} disabled={busy}>
              {busy ? "Menyimpan..." : "Simpan komponen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dependencyDialogOpen} onOpenChange={setDependencyDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Dependensi untuk {dependencySource?.name ?? "Komponen"}
            </DialogTitle>
            <DialogDescription>
              Saat komponen ini down langsung, default berikut akan disarankan sebagai terdampak.
            </DialogDescription>
          </DialogHeader>
          <ComponentMultiSelect
            label="Komponen terdampak default"
            components={activeComponents}
            selectedIds={dependencyIds}
            onChange={setDependencyIds}
            excludeIds={dependencySource ? [dependencySource.id] : []}
          />
          <Button onClick={saveDependencies} disabled={busy}>
            {busy ? "Menyimpan..." : "Simpan dependensi"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
