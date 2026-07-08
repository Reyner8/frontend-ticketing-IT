import { format } from "date-fns";
import { ScrollArea } from "./ui/scroll-area";
import type { ActivityLogEntry, StatusHistoryEntry } from "../types";

interface ActivityTimelinePanelProps {
  statusHistory?: StatusHistoryEntry[];
  activityLog?: ActivityLogEntry[];
  heightClass?: string;
}

export function ActivityTimelinePanel({
  statusHistory = [],
  activityLog = [],
  heightClass = "h-[400px]",
}: ActivityTimelinePanelProps) {
  return (
    <ScrollArea className={`${heightClass} pr-4 space-y-4`}>
      {statusHistory.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Status History</h4>
          <ul className="space-y-2 text-sm">
            {statusHistory.map((entry) => (
              <li key={entry.id} className="border-l-2 pl-3">
                {entry.previousStatus} → {entry.newStatus}
                <span className="text-muted-foreground ml-2">
                  {format(entry.changedAt, "PPp")}
                </span>
                {entry.reason && (
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.reason}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h4 className="font-medium mb-2">Activity Log</h4>
        {activityLog.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {activityLog.map((entry) => (
              <li key={entry.id} className="border-l-2 pl-3">
                <span className="font-medium capitalize">
                  {String(entry.action).replace(/_/g, " ")}
                </span>
                {entry.description ? ` — ${entry.description}` : ""}
                <span className="text-muted-foreground block">
                  {format(entry.performedAt, "PPp")}
                  {entry.performedBy ? ` · ${entry.performedBy}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ScrollArea>
  );
}
