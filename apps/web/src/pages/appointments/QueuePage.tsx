import { useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, Clock, PawPrint, Stethoscope, Play } from "lucide-react";
import { useQueue, useUpdateAppointmentStatus } from "@/hooks/use-appointments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentForm } from "./components/AppointmentForm";
import type { Appointment, AppointmentType } from "@/types/appointments";

const TYPE_LABEL: Record<AppointmentType, string> = {
  WELLNESS_EXAM: "Wellness Exam",
  VACCINATION: "Vaccination",
  SICK_VISIT: "Sick Visit",
  SURGERY: "Surgery",
  DENTAL: "Dental Cleaning",
  FOLLOW_UP: "Follow-up",
  EMERGENCY: "Emergency",
  GROOMING: "Grooming",
  LAB_ONLY: "Lab Only",
};

function formatTime(isoStr: string) {
  return new Date(isoStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function waitTime(checkedInAt: string | null) {
  if (!checkedInAt) return null;
  const mins = Math.max(
    0,
    Math.round((Date.now() - new Date(checkedInAt).getTime()) / 60_000),
  );
  return mins < 1 ? "just now" : `${mins} min`;
}

function QueueRow({ appt }: { appt: Appointment }) {
  const updateStatus = useUpdateAppointmentStatus(appt.id);
  const wait = waitTime(appt.checked_in_at);

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4 py-4">
        <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
          <PawPrint className="size-4 text-primary" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/appointments/${appt.id}`}
              className="font-medium hover:text-primary transition-colors"
            >
              {appt.pet.name}
            </Link>
            <Badge
              variant={appt.status === "IN_PROGRESS" ? "default" : "outline"}
              className="text-xs"
            >
              {appt.status === "IN_PROGRESS" ? "In Progress" : "Waiting"}
            </Badge>
            {appt.is_walk_in && (
              <Badge variant="secondary" className="text-xs">
                Walk-in
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {appt.pet.owner.first_name} {appt.pet.owner.last_name} ·{" "}
            {TYPE_LABEL[appt.type]}
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
          <Stethoscope className="size-3.5" />
          Dr. {appt.vet.last_name}
        </div>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0 w-28">
          <Clock className="size-3.5" />
          {wait ? `Waiting ${wait}` : formatTime(appt.start_at)}
        </div>

        {appt.status === "CHECKED_IN" && (
          <Button
            size="sm"
            onClick={() => updateStatus.mutate({ status: "IN_PROGRESS" })}
            disabled={updateStatus.isPending}
          >
            <Play className="size-3.5" />
            Start visit
          </Button>
        )}
        {appt.status === "IN_PROGRESS" && (
          <Link to={`/appointments/${appt.id}`}>
            <Button size="sm" variant="outline">
              Open
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export function QueuePage() {
  const today = new Date().toISOString().slice(0, 10);
  const { data: queue, isLoading } = useQueue(today);
  const [showRegister, setShowRegister] = useState(false);

  return (
    <div className="space-y-5 w-full mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Front Desk Queue
          </h1>
          <p className="text-sm text-muted-foreground">
            First-come, first-served — ordered by check-in time.
          </p>
        </div>
        <Button onClick={() => setShowRegister(true)}>
          <UserPlus className="size-4" />
          Register walk-in
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {!isLoading && (!queue || queue.length === 0) && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Clock className="size-10 mb-3 opacity-40" />
          <p>No patients waiting right now.</p>
        </div>
      )}

      <div className="space-y-3">
        {queue?.map((appt) => (
          <QueueRow key={appt.id} appt={appt} />
        ))}
      </div>

      {showRegister && (
        <AppointmentForm
          open={showRegister}
          onClose={() => setShowRegister(false)}
          defaultWalkIn
        />
      )}
    </div>
  );
}
