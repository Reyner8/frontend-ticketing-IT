import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Calendar } from "./ui/calendar";
import { ScrollArea } from "./ui/scroll-area";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { format, isSameDay, startOfMonth, endOfMonth } from "date-fns";
import { fetchCalendarEvents, fetchUpcomingEvents, createCalendarEvent, deleteCalendarEvent } from "../lib/api/services";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { useApp } from "../lib/store";
import type { CalendarEvent } from "../types";

const TYPE_COLORS: Record<CalendarEvent["type"], string> = {
  planned_downtime: "bg-orange-100 text-orange-700 border-orange-300",
  maintenance: "bg-blue-100 text-blue-700 border-blue-300",
  deadline: "bg-red-100 text-red-700 border-red-300",
};

const TYPE_LABELS: Record<CalendarEvent["type"], string> = {
  planned_downtime: "Planned Downtime",
  maintenance: "Maintenance",
  deadline: "Deadline",
};

export function CalendarView() {
  const { state } = useApp();
  const canManage = state.currentUser?.role === "admin" || state.currentUser?.role === "team_lead";
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [upcoming, setUpcoming] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    start: "",
    end: "",
    type: "maintenance" as CalendarEvent["type"],
    color: "#3b82f6",
  });

  const load = async () => {
      setLoading(true);
      const start = startOfMonth(selectedDate);
      const end = endOfMonth(selectedDate);
      try {
        const [all, next] = await Promise.all([
          fetchCalendarEvents({
            from: format(start, "yyyy-MM-dd"),
            to: format(end, "yyyy-MM-dd"),
          }),
          fetchUpcomingEvents(14).catch(() => []),
        ]);
        setEvents(all);
        setUpcoming(next);
      } catch {
        toast.error("Failed to load calendar events");
      } finally {
        setLoading(false);
      }
    };
  useEffect(() => {
    load();
  }, [selectedDate]);

  const handleCreate = async () => {
    if (!form.title || !form.start || !form.end) return;
    try {
      await createCalendarEvent({
        title: form.title,
        start: form.start,
        end: form.end,
        type: form.type,
        color: form.color,
      });
      toast.success("Event created");
      setCreateOpen(false);
      load();
    } catch {
      toast.error("Failed to create event");
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Delete this event?")) return;
    try {
      await deleteCalendarEvent(eventId);
      toast.success("Event deleted");
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  const eventDates = useMemo(
    () => events.map((e) => e.start),
    [events]
  );

  const selectedDayEvents = useMemo(
    () => events.filter((e) => isSameDay(e.start, selectedDate)),
    [events, selectedDate]
  );

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl tracking-tight">Calendar View</h2>
          <p className="text-muted-foreground">
            Planned maintenance, downtime windows, and deadlines
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              <span>{format(selectedDate, "MMMM yyyy")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              modifiers={{ hasEvent: eventDates }}
              modifiersStyles={{
                hasEvent: {
                  fontWeight: 600,
                  boxShadow: "inset 0 -2px 0 #3b82f6",
                },
              }}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Events on {format(selectedDate, "MMM d")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : selectedDayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No events scheduled
              </p>
            ) : (
              <ScrollArea className="h-[240px]">
                <div className="space-y-3">
                  {selectedDayEvents.map((event) => (
                    <div
                      key={event.id}
                      className="border rounded-md p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">{event.title}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${TYPE_COLORS[event.type]}`}
                        >
                          {TYPE_LABELS[event.type]}
                        </Badge>
                        {canManage && (
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(event.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-xs text-muted-foreground">
                          {event.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {event.allDay
                          ? "All day"
                          : `${format(event.start, "HH:mm")} - ${format(event.end, "HH:mm")}`}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming (Next 14 days)</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing scheduled in the next two weeks
            </p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between border rounded-md p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{event.title}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${TYPE_COLORS[event.type]}`}
                      >
                        {TYPE_LABELS[event.type]}
                      </Badge>
                    </div>
                    {event.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {event.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>{format(event.start, "MMM d, yyyy")}</div>
                    {!event.allDay && (
                      <div>
                        {format(event.start, "HH:mm")} -{" "}
                        {format(event.end, "HH:mm")}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Calendar Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Start</Label>
                <Input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>End</Label>
                <Input type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as CalendarEvent["type"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="planned_downtime">Planned Downtime</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
