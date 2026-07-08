import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { History } from "lucide-react";
import { fetchGlobalConversionHistory } from "../lib/api/services";
import type { ConversionHistoryEntry } from "../types";

export function ConversionHistoryView() {
  const [entries, setEntries] = useState<ConversionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGlobalConversionHistory({ per_page: 100 })
      .then(({ entries: data }) => setEntries(data))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl tracking-tight flex items-center gap-2">
          <History className="h-8 w-8" />
          Conversion History
        </h2>
        <p className="text-muted-foreground">Tickets converted to errors or feature requests</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{entries.length} conversions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No conversion history yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source Ticket</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Converted By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.sourceTicketId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{e.targetType}</Badge>{" "}
                      <span className="font-mono text-xs">{e.targetId}</span>
                    </TableCell>
                    <TableCell>{e.convertedBy ?? "—"}</TableCell>
                    <TableCell>{format(e.convertedAt, "PPp")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
