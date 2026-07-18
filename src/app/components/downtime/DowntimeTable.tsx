import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { DowntimeRecord } from "../../types";
import { getStatusColor, getTypeColor, getImpactColor, formatDuration, formatDate } from "../../lib/downtime-utils";
import { Clock, MoreHorizontal, Eye } from "lucide-react";

interface DowntimeTableProps {
  downtimes: DowntimeRecord[];
  onViewDetails: (downtime: DowntimeRecord) => void;
  canEdit: boolean;
}

function liveMinutes(start: Date): number {
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / 60000));
}

export function DowntimeTable({ downtimes, onViewDetails, canEdit }: DowntimeTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Incident ID</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Impact</TableHead>
          <TableHead>Start</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Directly Down</TableHead>
          <TableHead>Affected</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {downtimes.map((downtime) => {
          const durationMinutes =
            downtime.duration ??
            (downtime.status === "ongoing" ? liveMinutes(downtime.startTime) : undefined);

          return (
            <TableRow
              key={downtime.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onViewDetails(downtime)}
            >
              <TableCell className="font-mono text-sm">{downtime.id}</TableCell>
              <TableCell>
                <div className="max-w-xs">
                  <p className="truncate font-medium">{downtime.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{downtime.reason}</p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex max-w-[180px] flex-wrap gap-1">
                  {downtime.locations.length === 0 ? (
                    <span className="text-sm text-muted-foreground">—</span>
                  ) : (
                    <>
                      {downtime.locations.slice(0, 2).map((location) => (
                        <Badge key={location.id} variant="outline">
                          {location.name}
                        </Badge>
                      ))}
                      {downtime.locations.length > 2 && (
                        <Badge variant="outline">+{downtime.locations.length - 2}</Badge>
                      )}
                    </>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getTypeColor(downtime.type)}>{downtime.type}</Badge>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(downtime.status)}>{downtime.status}</Badge>
              </TableCell>
              <TableCell>
                <Badge className={getImpactColor(downtime.impact)}>{downtime.impact}</Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">{formatDate(downtime.startTime)}</div>
                <div className="text-xs text-muted-foreground">
                  {downtime.endTime ? `End: ${formatDate(downtime.endTime)}` : "Still ongoing"}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">
                    {durationMinutes != null ? formatDuration(durationMinutes) : "—"}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <p className="text-sm truncate max-w-[140px]">
                  {downtime.sourceComponents.map((c) => c.name).join(", ") || "—"}
                </p>
              </TableCell>
              <TableCell>
                <p className="text-sm truncate max-w-[140px]">
                  {downtime.affectedComponents.map((c) => c.name).join(", ") || "—"}
                </p>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewDetails(downtime)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    {canEdit && downtime.status === "ongoing" && (
                      <DropdownMenuItem onClick={() => onViewDetails(downtime)}>
                        Resolve / Edit
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
