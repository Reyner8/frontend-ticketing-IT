import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useActiveApplications } from "../hooks/useActiveApplications";

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Include inactive code currently selected (e.g. edit form). */
  includeCode?: string;
};

export function ApplicationSelect({
  value,
  onValueChange,
  placeholder = "Select application / system",
  disabled,
  includeCode,
}: Props) {
  const { applications, loading } = useActiveApplications();
  const options = applications.slice();
  if (
    includeCode &&
    value === includeCode &&
    !options.some((a) => a.code === includeCode)
  ) {
    options.unshift({
      id: `legacy-${includeCode}`,
      code: includeCode,
      name: includeCode,
      isActive: false,
      sortOrder: 0,
    });
  }

  return (
    <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled || loading}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? "Loading…" : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((app) => (
          <SelectItem key={app.id} value={app.code}>
            {app.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
