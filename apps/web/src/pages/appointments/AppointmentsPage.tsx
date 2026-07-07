import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  List,
  Clock,
  PawPrint,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import {
  useCalendarView,
  useUpdateAppointmentStatus,
} from "@/hooks/use-appointments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AppointmentForm } from "./components/AppointmentForm";
import type {
  Appointment,
  AppointmentStatus,
  AppointmentType,
} from "@/types/appointments";

// ─── Constants ────────────────────────────────────────────────────────────────

const GRID_START = 8;
const GRID_END = 20;
const HOUR_PX = 64;
const GRID_H = (GRID_END - GRID_START) * HOUR_PX;
const HOURS = Array.from(
  { length: GRID_END - GRID_START },
  (_, i) => i + GRID_START,
);

const TYPE_LABEL: Record<AppointmentType, string> = {
  WELLNESS_EXAM: "Wellness Exam",
  VACCINATION: "Vaccination",
  SICK_VISIT: "Sick Visit",
  SURGERY: "Surgery",
  DENTAL: "Dental",
  FOLLOW_UP: "Follow-up",
  EMERGENCY: "Emergency",
  GROOMING: "Grooming",
  LAB_ONLY: "Lab Only",
};

const TYPE_COLOR: Record<AppointmentType, string> = {
  WELLNESS_EXAM:
    "bg-blue-100   border-blue-300   text-blue-800   dark:bg-blue-950   dark:border-blue-700   dark:text-blue-300",
  VACCINATION:
    "bg-green-100  border-green-300  text-green-800  dark:bg-green-950  dark:border-green-700  dark:text-green-300",
  SICK_VISIT:
    "bg-amber-100  border-amber-300  text-amber-800  dark:bg-amber-950  dark:border-amber-700  dark:text-amber-300",
  SURGERY:
    "bg-red-100    border-red-300    text-red-800    dark:bg-red-950    dark:border-red-700    dark:text-red-300",
  DENTAL:
    "bg-cyan-100   border-cyan-300   text-cyan-800   dark:bg-cyan-950   dark:border-cyan-700   dark:text-cyan-300",
  FOLLOW_UP:
    "bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-950 dark:border-purple-700 dark:text-purple-300",
  EMERGENCY:
    "bg-rose-100   border-rose-300   text-rose-800   dark:bg-rose-950   dark:border-rose-700   dark:text-rose-300",
  GROOMING:
    "bg-pink-100   border-pink-300   text-pink-800   dark:bg-pink-950   dark:border-pink-700   dark:text-pink-300",
  LAB_ONLY:
    "bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-950 dark:border-orange-700 dark:text-orange-300",
};

const STATUS_VARIANT: Record<
  AppointmentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  SCHEDULED: "outline",
  CONFIRMED: "default",
  CHECKED_IN: "default",
  IN_PROGRESS: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No show",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTime(isoStr: string) {
  return new Date(isoStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** Compute non-overlapping lanes for concurrent appointments */
function computeLanes(appointments: Appointment[]) {
  type Laned = { appt: Appointment; lane: number; totalLanes: number };
  const result: Laned[] = [];

  for (const appt of appointments) {
    const sA = new Date(appt.start_at).getTime();
    const eA = new Date(appt.end_at).getTime();

    const overlapping = result.filter(({ appt: other }) => {
      const sB = new Date(other.start_at).getTime();
      const eB = new Date(other.end_at).getTime();
      return sA < eB && eA > sB;
    });

    const usedLanes = new Set(overlapping.map((o) => o.lane));
    let lane = 0;
    while (usedLanes.has(lane)) lane++;

    result.push({ appt, lane, totalLanes: 1 });
  }

  // Fix totalLanes for each overlapping group
  for (let i = 0; i < result.length; i++) {
    const sA = new Date(result[i].appt.start_at).getTime();
    const eA = new Date(result[i].appt.end_at).getTime();
    const maxLane = result
      .filter(({ appt: other }) => {
        const sB = new Date(other.start_at).getTime();
        const eB = new Date(other.end_at).getTime();
        return sA < eB && eA > sB;
      })
      .reduce((m, { lane }) => Math.max(m, lane), 0);
    result[i].totalLanes = maxLane + 1;
  }

  return result;
}

// ─── Appointment block (calendar view) ───────────────────────────────────────

interface BlockProps {
  appt: Appointment;
  lane: number;
  totalLanes: number;
  onClick: () => void;
}

function AppointmentBlock({ appt, lane, totalLanes, onClick }: BlockProps) {
  const startAt = new Date(appt.start_at);
  const endAt = new Date(appt.end_at);
  const durationMs = endAt.getTime() - startAt.getTime();

  const topPx =
    (startAt.getHours() + startAt.getMinutes() / 60 - GRID_START) * HOUR_PX;
  const heightPx = Math.max((durationMs / 3_600_000) * HOUR_PX, 28);
  const widthPct = 100 / totalLanes;
  const leftPct = (lane / totalLanes) * 100;

  const colorClass = TYPE_COLOR[appt.type];
  const isTiny = heightPx < 44;

  return (
    <button
      onClick={onClick}
      style={{
        position: "absolute",
        top: `${topPx}px`,
        height: `${heightPx}px`,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
      }}
      className={`
        rounded border text-left px-2 py-1 overflow-hidden transition-opacity
        hover:opacity-90 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring
        ${colorClass}
      `}
    >
      <p className="text-xs font-semibold leading-tight truncate">
        {appt.pet.name}
      </p>
      {!isTiny && (
        <>
          <p className="text-xs leading-tight truncate opacity-80">
            {appt.pet.owner.first_name} {appt.pet.owner.last_name}
          </p>
          <p className="text-xs leading-tight truncate opacity-70">
            {TYPE_LABEL[appt.type]}
          </p>
        </>
      )}
    </button>
  );
}

// ─── Day Calendar grid ────────────────────────────────────────────────────────

interface CalendarGridProps {
  appointments: Appointment[];
  onClickAppt: (id: string) => void;
  selectedDate: string;
}

function CalendarGrid({
  appointments,
  onClickAppt,
  selectedDate,
}: CalendarGridProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const isToday = toDateStr(now) === selectedDate;
  const currentTopPx =
    (now.getHours() + now.getMinutes() / 60 - GRID_START) * HOUR_PX;
  const showNow =
    isToday && now.getHours() >= GRID_START && now.getHours() < GRID_END;

  const laned = computeLanes(appointments);

  return (
    <div className="relative overflow-y-auto" style={{ maxHeight: "72vh" }}>
      <div className="relative" style={{ height: `${GRID_H}px` }}>
        {/* Hour rows */}
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="absolute left-0 right-0 border-t border-border/60"
            style={{ top: `${(hour - GRID_START) * HOUR_PX}px` }}
          >
            <span className="absolute -top-2.5 left-0 w-14 text-right pr-3 text-xs text-muted-foreground select-none tabular-nums">
              {String(hour).padStart(2, "0")}:00
            </span>
          </div>
        ))}

        {/* 30-min half-hour rules */}
        {HOURS.map((hour) => (
          <div
            key={`${hour}-half`}
            className="absolute left-14 right-0 border-t border-border/30 border-dashed"
            style={{ top: `${(hour - GRID_START) * HOUR_PX + HOUR_PX / 2}px` }}
          />
        ))}

        {/* Current time indicator */}
        {showNow && (
          <div
            className="absolute left-14 right-0 z-20 pointer-events-none"
            style={{ top: `${currentTopPx}px` }}
          >
            <div className="relative">
              <div className="absolute -left-1.5 -top-1.5 size-3 rounded-full bg-red-500" />
              <div className="border-t-2 border-red-500" />
            </div>
          </div>
        )}

        {/* Appointment blocks */}
        <div className="absolute inset-0 left-16">
          {laned.map(({ appt, lane, totalLanes }) => (
            <AppointmentBlock
              key={appt.id}
              appt={appt}
              lane={lane}
              totalLanes={totalLanes}
              onClick={() => onClickAppt(appt.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

interface ListRowProps {
  appt: Appointment;
  onClickAppt: (id: string) => void;
}

function ListRow({ appt, onClickAppt }: ListRowProps) {
  const updateStatus = useUpdateAppointmentStatus(appt.id);
  const canCheckIn = appt.status === "SCHEDULED" || appt.status === "CONFIRMED";

  return (
    <TableRow className="cursor-pointer" onClick={() => onClickAppt(appt.id)}>
      <TableCell className="font-mono text-sm tabular-nums whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="size-3.5" />
          {formatTime(appt.start_at)} – {formatTime(appt.end_at)}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <PawPrint className="size-3.5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">{appt.pet.name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {appt.pet.species.toLowerCase()}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {appt.pet.owner.first_name} {appt.pet.owner.last_name}
      </TableCell>
      <TableCell>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${TYPE_COLOR[appt.type]}`}
        >
          {TYPE_LABEL[appt.type]}
        </span>
      </TableCell>
      <TableCell className="text-sm">Dr. {appt.vet.last_name}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {appt.room?.name ?? "—"}
      </TableCell>
      <TableCell>
        <Badge variant={STATUS_VARIANT[appt.status]}>
          {STATUS_LABEL[appt.status]}
        </Badge>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        {canCheckIn && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateStatus.mutate({ status: "CHECKED_IN" })}
            disabled={updateStatus.isPending}
          >
            <UserCheck className="size-3.5" />
            Check in
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function ListView({
  appointments,
  onClickAppt,
}: {
  appointments: Appointment[];
  onClickAppt: (id: string) => void;
}) {
  if (!appointments.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <CalendarDays className="size-12 mb-3 opacity-30" />
        <p className="font-medium">No appointments this day</p>
        <p className="text-sm mt-1">
          Schedule a new appointment or navigate to another date.
        </p>
      </div>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Vet</TableHead>
            <TableHead>Room</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((appt) => (
            <ListRow key={appt.id} appt={appt} onClickAppt={onClickAppt} />
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AppointmentsPage() {
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));
  const [view, setView] = useState<"calendar" | "list">("list");
  const [showForm, setShowForm] = useState(false);

  const {
    data: appointments = [],
    isLoading,
    isError,
  } = useCalendarView(selectedDate);

  const navigateDate = useCallback(
    (delta: number) => {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + delta);
      setSelectedDate(toDateStr(d));
    },
    [selectedDate],
  );

  const isToday = selectedDate === toDateStr(new Date());

  const totalCount = appointments.length;
  const completedCount = appointments.filter(
    (a) => a.status === "COMPLETED",
  ).length;
  const pendingCount = appointments.filter((a) =>
    ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"].includes(a.status),
  ).length;

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading
              ? "Loading…"
              : `${totalCount} total · ${completedCount} completed · ${pendingCount} pending`}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="size-4" />
          New appointment
        </Button>
      </div>

      {/* Date navigator + view toggle */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate(-1)}
          >
            <ChevronLeft className="size-4" />
          </Button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-background min-w-[220px] justify-center">
            <CalendarDays className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {formatDate(selectedDate)}
            </span>
            {isToday && (
              <Badge variant="secondary" className="text-xs py-0 px-1.5">
                Today
              </Badge>
            )}
          </div>

          <Button variant="outline" size="icon" onClick={() => navigateDate(1)}>
            <ChevronRight className="size-4" />
          </Button>

          {!isToday && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDate(toDateStr(new Date()))}
            >
              Today
            </Button>
          )}
        </div>

        <Tabs
          value={view}
          onValueChange={(v) => setView(v as "calendar" | "list")}
        >
          <TabsList>
            <TabsTrigger value="list" className="gap-1.5">
              <List className="size-3.5" /> List
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5">
              <CalendarDays className="size-3.5" /> Calendar
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Error state */}
      {isError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          Failed to load appointments. Please refresh.
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      )}

      {/* Content */}
      {!isLoading &&
        !isError &&
        (view === "calendar" ? (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <CalendarGrid
              appointments={appointments}
              onClickAppt={(id) => navigate(`/appointments/${id}`)}
              selectedDate={selectedDate}
            />
          </div>
        ) : (
          <ListView
            appointments={appointments}
            onClickAppt={(id) => navigate(`/appointments/${id}`)}
          />
        ))}

      {/* Empty state (calendar) */}
      {!isLoading &&
        !isError &&
        view === "calendar" &&
        appointments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <CalendarDays className="size-12 mb-3 opacity-30" />
            <p className="font-medium">No appointments this day</p>
            <p className="text-sm mt-1">
              Schedule a new appointment to get started.
            </p>
          </div>
        )}

      <AppointmentForm
        open={showForm}
        onClose={() => setShowForm(false)}
        defaultDate={selectedDate}
      />
    </div>
  );
}
