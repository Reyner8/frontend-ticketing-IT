import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fetchApplications } from "../lib/api/services";
import { setApplicationLabelCache } from "../lib/constants";
import type { CatalogApplication } from "../types";

/** Load active application master rows for selects across the app. */
export function useActiveApplications() {
  const [applications, setApplications] = useState<CatalogApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchApplications({ is_active: true })
      .then(({ applications: rows }) => {
        if (cancelled) return;
        setApplications(rows);
        setApplicationLabelCache(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setApplications([]);
          toast.error("Failed to load application master data — make sure migrations & seeders have been run");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { applications, loading };
}
