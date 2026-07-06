import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { DowntimeRecord } from "../../types";
import { getStatusColor, getTypeColor, getImpactColor, formatDuration, formatDate } from "../../lib/downtime-utils";
import { getUserName } from "../../lib/user-utils";
import { Clock, MoreHorizontal, Eye, Edit } from "lucide-react";
import * as React from "react";

interface DowntimeTableProps {
  downtimes: DowntimeRecord[];
  onViewDetails: (downtime: DowntimeRecord) => void;
  canEdit: boolean;
}

export function DowntimeTable({ downtimes, onViewDetails, canEdit }: DowntimeTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Incident ID</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Impact</TableHead>
          <TableHead>Start Time</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Affected Systems</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {downtimes.map((downtime) => (
          <TableRow key={downtime.id} className="cursor-pointer hover:bg-muted/50">
            <TableCell className="font-mono text-sm">{downtime.id}</TableCell>
            <TableCell>
              <div className="max-w-xs">
                <p className="truncate font-medium">{downtime.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {downtime.reason}
                </p>
              </div>
            </TableCell>
            <TableCell>
              <Badge className={getTypeColor(downtime.type)}>
                {downtime.type}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge className={getStatusColor(downtime.status)}>
                {downtime.status}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge className={getImpactColor(downtime.impact)}>
                {downtime.impact}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="text-sm">
                {formatDate(downtime.startTime)}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm">
                  {downtime.duration ? formatDuration(downtime.duration) : 'Ongoing'}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <div className="max-w-xs">
                <p className="text-sm truncate">
                  {downtime.affectedSystems.join(', ')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {downtime.affectedSystems.length} system(s)
                </p>
              </div>
            </TableCell>
            <TableCell>
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
                  {canEdit && (
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}