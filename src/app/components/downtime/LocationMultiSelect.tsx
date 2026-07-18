import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { ScrollArea } from "../ui/scroll-area";
import { DowntimeLocation } from "../../types";

interface LocationMultiSelectProps {
  locations: DowntimeLocation[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  helperText?: string;
}

export function LocationMultiSelect({
  locations,
  selectedIds,
  onChange,
  label = "Locations *",
  helperText = "Select one or more affected locations.",
}: LocationMultiSelectProps) {
  const activeLocations = locations.filter((location) => location.isActive);
  const activeIds = activeLocations.map((location) => location.id);
  const selectedActiveCount = activeIds.filter((id) => selectedIds.includes(id)).length;
  const allSelected = activeIds.length > 0 && selectedActiveCount === activeIds.length;
  const partlySelected = selectedActiveCount > 0 && !allSelected;

  const toggleAll = () => {
    onChange(allSelected ? [] : activeIds);
  };

  const toggleLocation = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id]
    );
  };

  return (
    <div className="space-y-2">
      <div>
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">{helperText}</p>
      </div>

      <div className="overflow-hidden rounded-md border">
        <label className="flex cursor-pointer items-center gap-3 border-b bg-muted/40 px-3 py-2.5">
          <Checkbox
            checked={allSelected ? true : partlySelected ? "indeterminate" : false}
            onCheckedChange={toggleAll}
          />
          <span className="text-sm font-medium">Select all locations</span>
          <span className="ml-auto text-xs text-muted-foreground">
            {selectedActiveCount}/{activeLocations.length}
          </span>
        </label>

        <ScrollArea className="h-44">
          <div className="grid gap-1 p-2 sm:grid-cols-2">
            {activeLocations.map((location) => (
              <label
                key={location.id}
                className="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-muted/50"
              >
                <Checkbox
                  checked={selectedIds.includes(location.id)}
                  onCheckedChange={() => toggleLocation(location.id)}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{location.name}</span>
                  {location.description && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {location.description}
                    </span>
                  )}
                </span>
              </label>
            ))}
            {activeLocations.length === 0 && (
              <p className="p-2 text-sm text-muted-foreground">No active locations available.</p>
            )}
          </div>
        </ScrollArea>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedIds.map((id) => {
            const location = locations.find((item) => item.id === id);
            if (!location) return null;
            return (
              <Badge
                key={id}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => toggleLocation(id)}
              >
                {location.name} ×
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
