import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { DowntimeRecord } from "../../types";
import { getStatusColor, getTypeColor, getImpactColor, formatDuration, formatDate } from "../../lib/downtime-utils";
import { labelStatus, labelPriority } from "../../lib/ui-labels";
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
          <TableHead>ID insiden</TableHead>
          <TableHead>Judul</TableHead>
          <TableHead>Lokasi</TableHead>
          <TableHead>Tipe</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Dampak</TableHead>
          <TableHead>Mulai</TableHead>
          <TableHead>Durasi</TableHead>
          <TableHead>Down langsung</TableHead>
          <TableHead>Terdampak</TableHead>
          <TableHead>Tindakan</TableHead>
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
                <Badge className={getTypeColor(downtime.type)}>{labelStatus(downtime.type)}</Badge>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(downtime.status)}>{labelStatus(downtime.status)}</Badge>
              </TableCell>
              <TableCell>
                <Badge className={getImpactColor(downtime.impact)}>{labelPriority(downtime.impact)}</Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">{formatDate(downtime.startTime)}</div>
                <div className="text-xs text-muted-foreground">
                  {downtime.endTime ? `Selesai: ${formatDate(downtime.endTime)}` : "Masih berlangsung"}
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
                      <span className="sr-only">Buka menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewDetails(downtime)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Lihat detail
                    </DropdownMenuItem>
                    {canEdit && downtime.status === "ongoing" && (
                      <DropdownMenuItem onClick={() => onViewDetails(downtime)}>
                        Selesaikan / ubah
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
