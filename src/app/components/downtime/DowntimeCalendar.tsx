import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Calendar } from "../ui/calendar";
import { ScrollArea } from "../ui/scroll-area";
import { CalendarEvent } from "../../types";
import { format, isSameDay } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

interface DowntimeCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  calendarEvents: CalendarEvent[];
  selectedDateEvents: CalendarEvent[];
  calendarView: "month" | "week";
  onCalendarViewChange: (view: "month" | "week") => void;
}

export function DowntimeCalendar({
  selectedDate,
  onSelectDate,
  calendarEvents,
  selectedDateEvents,
  calendarView,
  onCalendarViewChange
}: DowntimeCalendarProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Calendar */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Downtime Calendar</span>
            <div className="flex items-center gap-2">
              <Button
                variant={calendarView === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onCalendarViewChange('month')}
              >
                Month
              </Button>
              <Button
                variant={calendarView === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onCalendarViewChange('week')}
              >
                Week
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && onSelectDate(date)}
            className="rounded-md border"
            modifiers={{
              hasEvent: (date) => calendarEvents.some(event => isSameDay(event.start, date))
            }}
            modifiersStyles={{
              hasEvent: { fontWeight: 'bold', backgroundColor: '#e3f2fd' }
            }}
          />
        </CardContent>
      </Card>

      {/* Selected Date Events */}
      <Card>
        <CardHeader>
          <CardTitle>
            Events for {format(selectedDate, 'MMM dd, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {selectedDateEvents.length > 0 ? (
              <div className="space-y-3">
                {selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 border rounded-lg space-y-2"
                    style={{ borderLeftColor: event.color, borderLeftWidth: '4px' }}
                  >
                    <div className="font-medium">{event.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {event.type.replace('_', ' ')}
                    </Badge>
                    {event.description && (
                      <div className="text-sm">{event.description}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No events scheduled for this date</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}