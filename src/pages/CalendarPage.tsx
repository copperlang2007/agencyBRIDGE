import { useState, useMemo, useEffect } from "react";
import { logAudit } from "@/lib/auditLog";
import { useRole } from "@/lib/roleContext";
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Video, Phone, Home } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { type AppointmentType } from "@/lib/mockData";
import { useAppointments } from "@/hooks/useBook";
import { ScopeBadge } from "@/components/shared/ScopeBadge";
import { cn } from "@/lib/utils";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameDay, isSameMonth, addMonths, parseISO, isToday,
} from "date-fns";

const typeColors: Record<AppointmentType, string> = {
  Enrollment: "bg-navy-700 text-white border-navy-700",
  Review: "bg-accent/15 text-accent border-accent/30",
  Renewal: "bg-success/15 text-success border-success/30",
  Consultation: "bg-warning/15 text-warning border-warning/30",
};

const locationIcons: Record<string, React.ElementType> = {
  "Office": MapPin,
  "Phone": Phone,
  "Zoom": Video,
  "Home Visit": Home,
};

export default function CalendarPage() {
  const { user } = useRole();
  useEffect(() => { logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "viewed_calendar", category: "system", entity: "Calendar", severity: "info" }); }, [user]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const scopedAppts = useAppointments();

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const dayAppointments = (date: Date) =>
    scopedAppts.filter(a => isSameDay(parseISO(a.date), date));

  const selectedDayAppts = dayAppointments(selectedDate);

  const stats = {
    total: scopedAppts.length,
    confirmed: scopedAppts.filter(a => a.status === "Confirmed").length,
    pending: scopedAppts.filter(a => a.status === "Pending").length,
    completed: scopedAppts.filter(a => a.status === "Completed").length,
  };

  return (
    <div className="space-y-6">
<PageHeader title="Calendar & Appointments" description="Book and manage client meetings and reviews">
        <ScopeBadge />
        <Button variant="outline" size="sm">Today</Button>
        <Button size="sm"><Plus className="mr-1.5 h-4 w-4" /> New Appointment</Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Appointments", value: stats.total, color: "text-navy-700" },
          { label: "Confirmed", value: stats.confirmed, color: "text-success" },
          { label: "Pending", value: stats.pending, color: "text-warning" },
          { label: "Completed", value: stats.completed, color: "text-muted-foreground" },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={cn("font-display text-2xl font-bold", s.color)}>{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display">{format(currentMonth, "MMMM yyyy")}</CardTitle>
              <CardDescription>Click a day to view appointments</CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
              ))}
            </div>
            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
              {days.map(day => {
                const appts = dayAppointments(day);
                const inMonth = isSameMonth(day, currentMonth);
                const selected = isSameDay(day, selectedDate);
                const today = isToday(day);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "relative flex flex-col items-center justify-center aspect-square rounded-lg border text-sm transition-colors",
                      selected ? "border-accent bg-accent/10 ring-1 ring-accent" : "border-border hover:border-accent/40 hover:bg-muted/40",
                      !inMonth && "opacity-30",
                      today && !selected && "border-accent/50 bg-accent/5"
                    )}
                  >
                    <span className={cn("font-medium", today && "text-accent")}>{format(day, "d")}</span>
                    {appts.length > 0 && (
                      <div className="flex gap-0.5 mt-1">
                        {appts.slice(0, 3).map(a => (
                          <span key={a.id} className={cn("h-1.5 w-1.5 rounded-full", typeColors[a.type].split(" ")[0])} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Day detail panel */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">
              {isToday(selectedDate) ? "Today" : format(selectedDate, "EEEE")}
            </CardTitle>
            <CardDescription>{format(selectedDate, "MMMM d, yyyy")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedDayAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No appointments scheduled</p>
                <Button variant="outline" size="sm" className="mt-3">
                  <Plus className="mr-1.5 h-4 w-4" /> Schedule one
                </Button>
              </div>
            ) : (
              selectedDayAppts.map(apt => {
                const LocIcon = locationIcons[apt.location] || MapPin;
                return (
                  <div key={apt.id} className="rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("rounded-md border px-2 py-0.5 text-xs font-medium", typeColors[apt.type])}>
                          {apt.type}
                        </span>
                        <StatusBadge status={apt.status} />
                      </div>
                    </div>
                    <p className="font-medium text-sm">{apt.client}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{apt.agent}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {apt.time} · {apt.duration}min</span>
                      <span className="flex items-center gap-1"><LocIcon className="h-3.5 w-3.5" /> {apt.location}</span>
                    </div>
                    {apt.notes && <p className="text-xs text-muted-foreground mt-2 italic">{apt.notes}</p>}
                  </div>
                );
              })
            )}

            {/* Legend */}
            <div className="pt-3 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Appointment Types</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(typeColors).map(([type, cls]) => (
                  <Badge key={type} variant="outline" className={cn("text-xs", cls)}>{type}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
