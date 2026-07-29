export type FocusResourceType = "ticket" | "error" | "feature";

const STORAGE_KEY = "ticketing:focusResource";
export const FOCUS_RESOURCE_EVENT = "ticketing:focus-resource";

export function setFocusResource(type: FocusResourceType, id: string): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ type, id }));
  window.dispatchEvent(new CustomEvent(FOCUS_RESOURCE_EVENT));
}

export function consumeFocusResource(): { type: FocusResourceType; id: string } | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(STORAGE_KEY);
  try {
    const parsed = JSON.parse(raw) as { type?: FocusResourceType; id?: string };
    if (parsed.type && parsed.id) {
      return { type: parsed.type, id: parsed.id };
    }
  } catch {
    /* ignore malformed payload */
  }
  return null;
}
