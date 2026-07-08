import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Eye } from "lucide-react";
import { fetchWatchedTickets } from "../lib/api/services";
import type { Ticket } from "../types";

export function WatchedTicketsView() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWatchedTickets({ per_page: 100 })
      .then(({ tickets: data }) => setTickets(data))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl tracking-tight flex items-center gap-2">
          <Eye className="h-8 w-8" />
          Watched Tickets
        </h2>
        <p className="text-muted-foreground">Tickets you are watching for updates</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{tickets.length} watched</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">You are not watching any tickets yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Reported</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.id}</TableCell>
                    <TableCell>{t.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.status.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell>{t.priority}</TableCell>
                    <TableCell>{format(t.dateReported, "PP")}</TableCell>
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
