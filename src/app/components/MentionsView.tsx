import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { AtSign } from "lucide-react";
import { fetchMyMentions } from "../lib/api/services";
import { setFocusResource } from "../lib/resource-focus";
import type { Mention } from "../types";

interface MentionsViewProps {
  onNavigate?: (view: string) => void;
}

function resolveMentionRoute(mention: Mention): { type: "ticket" | "error" | "feature"; path: string } | null {
  if (!mention.commentableId || !mention.commentableType) return null;

  const type = mention.commentableType.toLowerCase();
  if (type.includes("ticket")) {
    return { type: "ticket", path: "/tickets" };
  }
  if (type.includes("error")) {
    return { type: "error", path: "/error-reports" };
  }
  if (type.includes("feature")) {
    return { type: "feature", path: "/feature-requests" };
  }
  return null;
}

export function MentionsView({ onNavigate }: MentionsViewProps) {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyMentions()
      .then(setMentions)
      .catch(() => setMentions([]))
      .finally(() => setLoading(false));
  }, []);

  const openMention = (mention: Mention) => {
    const route = resolveMentionRoute(mention);
    if (!route || !mention.commentableId) return;
    setFocusResource(route.type, mention.commentableId);
    onNavigate?.(route.path);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl tracking-tight flex items-center gap-2">
          <AtSign className="h-8 w-8" />
          My Mentions
        </h2>
        <p className="text-muted-foreground">Komentar yang menyebut Anda</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{mentions.length} mention</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : mentions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No mentions yet.</p>
          ) : (
            mentions.map((m) => {
              const route = resolveMentionRoute(m);
              return (
                <div key={m.id} className="border rounded-md p-3 text-sm space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {format(m.createdAt, "PPp")}
                    {m.commentableId ? ` · ${m.commentableType} ${m.commentableId}` : ""}
                  </p>
                  <p>{m.content ?? "—"}</p>
                  {route && (
                    <Button variant="outline" size="sm" onClick={() => openMention(m)}>
                      Open {route.type.replace(/_/g, " ")}
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
