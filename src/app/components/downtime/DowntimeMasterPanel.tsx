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
  { value: "application", label: "Application" },
  { value: "network", label: "Network" },
  { value: "utility", label: "Utility / Electricity" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "equipment", label: "Equipment" },
  { value: "operational_service", label: "Operational Service" },
  { value: "other", label: "Other" },
];

function firstError(err: unknown): string {
  if (err instanceof ApiError) {
    const first = err.errors ? Object.values(err.errors)[0]?.[0] : undefined;
    return first || err.message;
  }
  return err instanceof Error ? err.message : "Request failed";
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
      toast.error("Location name is required");
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
        toast.success("Location updated");
      } else {
        await createDowntimeLocation({
          name: locationForm.name.trim(),
          code: locationForm.code.trim() || undefined,
          description: locationForm.description || undefined,
        });
        toast.success("Location created");
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
      toast.error("Component name is required");
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
        toast.success("Component updated");
      } else {
        await createDowntimeComponent({
          name: componentForm.name.trim(),
          code: componentForm.code.trim() || undefined,
          category: componentForm.category,
          description: componentForm.description || undefined,
        });
        toast.success("Component created");
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
      toast.success("Dependencies updated");
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
          <CardTitle>Master Data</CardTitle>
          <CardDescription>
            Manage locations, components, and default dependency mapping used by downtime events.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="components">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateComponent}>
              <Plus className="mr-2 h-4 w-4" />
              Add Component
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Default Affected</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5}>Loading...</TableCell>
                    </TableRow>
                  ) : components.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>No components yet.</TableCell>
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
                            {component.category.replaceAll("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {component.defaultAffectedComponents.length === 0 ? (
                              <span className="text-xs text-muted-foreground">None</span>
                            ) : (
                              component.defaultAffectedComponents.slice(0, 4).map((c) => (
                                <Badge key={c.id} variant="outline">
                                  {c.name}
                                </Badge>
                              ))
                            )}
                            {component.defaultAffectedComponents.length > 4 && (
                              <Badge variant="outline">
                                +{component.defaultAffectedComponents.length - 4} more
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
                            {component.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditComponent(component)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDependencies(component)}>
                                <Link2 className="mr-2 h-4 w-4" />
                                Dependencies
                              </DropdownMenuItem>
                              {component.isActive ? (
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      await deactivateDowntimeComponent(component.id);
                                      toast.success("Component deactivated");
                                      await load();
                                    } catch (err) {
                                      toast.error(firstError(err));
                                    }
                                  }}
                                >
                                  <PowerOff className="mr-2 h-4 w-4" />
                                  Deactivate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      await updateDowntimeComponent(component.id, { is_active: true });
                                      toast.success("Component reactivated");
                                      await load();
                                    } catch (err) {
                                      toast.error(firstError(err));
                                    }
                                  }}
                                >
                                  <Power className="mr-2 h-4 w-4" />
                                  Activate
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={async () => {
                                  if (!confirm(`Delete component "${component.name}"?`)) return;
                                  try {
                                    await deleteDowntimeComponent(component.id);
                                    toast.success("Component deleted");
                                    await load();
                                  } catch (err) {
                                    toast.error(firstError(err));
                                  }
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
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
              Add Location
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4}>Loading...</TableCell>
                    </TableRow>
                  ) : locations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>No locations yet.</TableCell>
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
                            {location.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditLocation(location)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              {location.isActive ? (
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      await deactivateDowntimeLocation(location.id);
                                      toast.success("Location deactivated");
                                      await load();
                                    } catch (err) {
                                      toast.error(firstError(err));
                                    }
                                  }}
                                >
                                  <PowerOff className="mr-2 h-4 w-4" />
                                  Deactivate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      await updateDowntimeLocation(location.id, { is_active: true });
                                      toast.success("Location reactivated");
                                      await load();
                                    } catch (err) {
                                      toast.error(firstError(err));
                                    }
                                  }}
                                >
                                  <Power className="mr-2 h-4 w-4" />
                                  Activate
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={async () => {
                                  if (!confirm(`Delete location "${location.name}"?`)) return;
                                  try {
                                    await deleteDowntimeLocation(location.id);
                                    toast.success("Location deleted");
                                    await load();
                                  } catch (err) {
                                    toast.error(firstError(err));
                                  }
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
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
            <DialogTitle>{editingLocation ? "Edit Location" : "Add Location"}</DialogTitle>
            <DialogDescription>Locations keep reporting consistent across events.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                value={locationForm.name}
                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Code (optional)</Label>
              <Input
                value={locationForm.code}
                onChange={(e) => setLocationForm({ ...locationForm, code: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={locationForm.description}
                onChange={(e) => setLocationForm({ ...locationForm, description: e.target.value })}
              />
            </div>
            <Button onClick={saveLocation} disabled={busy}>
              {busy ? "Saving..." : "Save Location"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={componentDialogOpen} onOpenChange={setComponentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingComponent ? "Edit Component" : "Add Component"}</DialogTitle>
            <DialogDescription>
              Components can be applications, network, electricity, infrastructure, and more.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                value={componentForm.name}
                onChange={(e) => setComponentForm({ ...componentForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Code (optional)</Label>
              <Input
                value={componentForm.code}
                onChange={(e) => setComponentForm({ ...componentForm, code: e.target.value })}
              />
            </div>
            <div>
              <Label>Category</Label>
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
              <Label>Description</Label>
              <Textarea
                value={componentForm.description}
                onChange={(e) => setComponentForm({ ...componentForm, description: e.target.value })}
              />
            </div>
            <Button onClick={saveComponent} disabled={busy}>
              {busy ? "Saving..." : "Save Component"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dependencyDialogOpen} onOpenChange={setDependencyDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Dependencies for {dependencySource?.name ?? "Component"}
            </DialogTitle>
            <DialogDescription>
              When this component is directly down, these defaults will be suggested as affected.
            </DialogDescription>
          </DialogHeader>
          <ComponentMultiSelect
            label="Default affected components"
            components={activeComponents}
            selectedIds={dependencyIds}
            onChange={setDependencyIds}
            excludeIds={dependencySource ? [dependencySource.id] : []}
          />
          <Button onClick={saveDependencies} disabled={busy}>
            {busy ? "Saving..." : "Save Dependencies"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
