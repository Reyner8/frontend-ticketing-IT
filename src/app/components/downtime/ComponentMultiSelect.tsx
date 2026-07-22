import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { DowntimeComponent } from "../../types";
import { useMemo, useState } from "react";

interface ComponentMultiSelectProps {
  label: string;
  components: DowntimeComponent[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  excludeIds?: string[];
  suggestedIds?: string[];
  helperText?: string;
}

export function ComponentMultiSelect({
  label,
  components,
  selectedIds,
  onChange,
  excludeIds = [],
  suggestedIds = [],
  helperText,
}: ComponentMultiSelectProps) {
  const [search, setSearch] = useState("");

  const options = useMemo(() => {
    const excluded = new Set(excludeIds);
    const lower = search.toLowerCase();
    return components
      .filter((c) => c.isActive && !excluded.has(c.id))
      .filter(
        (c) =>
          !lower ||
          c.name.toLowerCase().includes(lower) ||
          c.code.toLowerCase().includes(lower) ||
          c.category.toLowerCase().includes(lower)
      );
  }, [components, excludeIds, search]);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
      <Input
        placeholder="Search components..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ScrollArea className="h-40 rounded-md border p-2">
        <div className="space-y-2">
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground">No components found.</p>
          ) : (
            options.map((component) => {
              const checked = selectedIds.includes(component.id);
              const suggested = suggestedIds.includes(component.id);
              return (
                <label
                  key={component.id}
                  className="flex items-start gap-2 rounded-md p-1.5 hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(component.id)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{component.name}</span>
                      {suggested && (
                        <Badge variant="outline" className="text-[10px]">
                          Suggested
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {component.category.replace(/_/g, " ")}
                    </p>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </ScrollArea>
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedIds.map((id) => {
            const component = components.find((c) => c.id === id);
            if (!component) return null;
            return (
              <Badge key={id} variant="secondary" className="cursor-pointer" onClick={() => toggle(id)}>
                {component.name} ×
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
