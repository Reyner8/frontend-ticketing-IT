import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { AtSign } from "lucide-react";
import { fetchMyMentions } from "../lib/api/services";
import type { Mention } from "../types";

export function MentionsView() {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyMentions()
      .then(setMentions)
      .catch(() => setMentions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl tracking-tight flex items-center gap-2">
          <AtSign className="h-8 w-8" />
          My Mentions
        </h2>
        <p className="text-muted-foreground">Comments where you were mentioned</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{mentions.length} mentions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : mentions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No mentions yet.</p>
          ) : (
            mentions.map((m) => (
              <div key={m.id} className="border rounded-md p-3 text-sm">
                <p className="text-xs text-muted-foreground mb-1">
                  {format(m.createdAt, "PPp")}
                  {m.commentableId ? ` · ${m.commentableType} ${m.commentableId}` : ""}
                </p>
                <p>{m.content ?? "—"}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
