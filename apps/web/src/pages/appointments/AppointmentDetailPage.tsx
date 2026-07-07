import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, CalendarDays, Clock, PawPrint, User, MapPin,
  Stethoscope, FileText, Receipt, AlertTriangle, CheckCircle2,
  UserCheck, Play, XCircle, UserX, Pencil,
} from 'lucide-react';
import { useAppointment, useUpdateAppointmentStatus } from '@/hooks/use-appointments';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AppointmentForm } from './components/AppointmentForm';
import type { AppointmentStatus, AppointmentType } from '@/types/appointments';

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<AppointmentType, string> = {
  WELLNESS_EXAM: 'Wellness Exam',
  VACCINATION:   'Vaccination',
  SICK_VISIT:    'Sick Visit',
  SURGERY:       'Surgery',
  DENTAL:        'Dental Cleaning',
  FOLLOW_UP:     'Follow-up',
  EMERGENCY:     'Emergency',
  GROOMING:      'Grooming',
  LAB_ONLY:      'Lab Only',
};

const TYPE_COLOR: Record<AppointmentType, string> = {
  WELLNESS_EXAM: 'bg-blue-100   text-blue-800   border-blue-200   dark:bg-blue-950   dark:text-blue-300',
  VACCINATION:   'bg-green-100  text-green-800  border-green-200  dark:bg-green-950  dark:text-green-300',
  SICK_VISIT:    'bg-amber-100  text-amber-800  border-amber-200  dark:bg-amber-950  dark:text-amber-300',
  SURGERY:       'bg-red-100    text-red-800    border-red-200    dark:bg-red-950    dark:text-red-300',
  DENTAL:        'bg-cyan-100   text-cyan-800   border-cyan-200   dark:bg-cyan-950   dark:text-cyan-300',
  FOLLOW_UP:     'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300',
  EMERGENCY:     'bg-rose-100   text-rose-800   border-rose-200   dark:bg-rose-950   dark:text-rose-300',
  GROOMING:      'bg-pink-100   text-pink-800   border-pink-200   dark:bg-pink-950   dark:text-pink-300',
  LAB_ONLY:      'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300',
};

const STATUS_VARIANT: Record<AppointmentStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  SCHEDULED:   'outline',
  CONFIRMED:   'default',
  CHECKED_IN:  'default',
  IN_PROGRESS: 'default',
  COMPLETED:   'secondary',
  CANCELLED:   'destructive',
  NO_SHOW:     'destructive',
};

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED:   'Scheduled',
  CONFIRMED:   'Confirmed',
  CHECKED_IN:  'Checked In',
  IN_PROGRESS: 'In Progress',
  COMPLETED:   'Completed',
  CANCELLED:   'Cancelled',
  NO_SHOW:     'No Show',
};

const SPECIES_LABEL: Record<string, string> = {
  DOG: 'Dog', CAT: 'Cat', BIRD: 'Bird', RABBIT: 'Rabbit',
  REPTILE: 'Reptile', SMALL_MAMMAL: 'Small mammal', OTHER: 'Other',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateLong(isoStr: string) {
  return new Date(isoStr).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatTime(isoStr: string) {
  return new Date(isoStr).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function durationLabel(startIso: string, endIso: string) {
  const mins = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

// ─── Cancel dialog ────────────────────────────────────────────────────────────

interface CancelDialogProps {
  open:    boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}

function CancelDialog({ open, onClose, onConfirm, isPending }: CancelDialogProps) {
  const [reason, setReason] = useState('');

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel appointment</DialogTitle>
          <DialogDescription>
            Please provide a reason for cancellation. This will be recorded in the appointment history.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="e.g. Owner requested cancellation, vet unavailable…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Keep appointment</Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || isPending}
            onClick={() => onConfirm(reason.trim())}
          >
            {isPending ? 'Cancelling…' : 'Confirm cancellation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Status action buttons ────────────────────────────────────────────────────

interface ActionBarProps {
  status:    AppointmentStatus;
  apptId:    string;
}

function StatusActionBar({ status, apptId }: ActionBarProps) {
  const [showCancel, setShowCancel] = useState(false);
  const updateStatus = useUpdateAppointmentStatus(apptId);

  function act(nextStatus: AppointmentStatus, cancelReason?: string) {
    updateStatus.mutate({ status: nextStatus, ...(cancelReason ? { cancel_reason: cancelReason } : {}) });
  }

  const isBusy = updateStatus.isPending;

  if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(status)) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'SCHEDULED' && (
        <>
          <Button size="sm" onClick={() => act('CONFIRMED')} disabled={isBusy}>
            <CheckCircle2 className="size-3.5" />
            Confirm
          </Button>
          <Button size="sm" variant="outline" onClick={() => act('CHECKED_IN')} disabled={isBusy}>
            <UserCheck className="size-3.5" />
            Check in
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowCancel(true)} disabled={isBusy}>
            <XCircle className="size-3.5" />
            Cancel
          </Button>
        </>
      )}

      {status === 'CONFIRMED' && (
        <>
          <Button size="sm" onClick={() => act('CHECKED_IN')} disabled={isBusy}>
            <UserCheck className="size-3.5" />
            Check in
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowCancel(true)} disabled={isBusy}>
            <XCircle className="size-3.5" />
            Cancel
          </Button>
        </>
      )}

      {status === 'CHECKED_IN' && (
        <>
          <Button size="sm" onClick={() => act('IN_PROGRESS')} disabled={isBusy}>
            <Play className="size-3.5" />
            Start visit
          </Button>
          <Button size="sm" variant="outline" onClick={() => act('NO_SHOW')} disabled={isBusy}>
            <UserX className="size-3.5" />
            No show
          </Button>
        </>
      )}

      {status === 'IN_PROGRESS' && (
        <Button size="sm" onClick={() => act('COMPLETED')} disabled={isBusy}>
          <CheckCircle2 className="size-3.5" />
          Complete visit
        </Button>
      )}

      <CancelDialog
        open={showCancel}
        onClose={() => setShowCancel(false)}
        isPending={isBusy}
        onConfirm={(reason) => {
          act('CANCELLED', reason);
          setShowCancel(false);
        }}
      />
    </div>
  );
}

// ─── Status timeline ──────────────────────────────────────────────────────────

const WORKFLOW: AppointmentStatus[] = [
  'SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED',
];

function StatusTimeline({ current }: { current: AppointmentStatus }) {
  const isCancelled = current === 'CANCELLED' || current === 'NO_SHOW';
  const idx = WORKFLOW.indexOf(current);

  return (
    <div className="flex items-center gap-0">
      {WORKFLOW.map((step, i) => {
        const isDone    = !isCancelled && i <= idx;
        const isCurrent = !isCancelled && i === idx;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`size-2.5 rounded-full border-2 transition-colors ${
                  isDone
                    ? isCurrent
                      ? 'bg-primary border-primary'
                      : 'bg-primary/60 border-primary/60'
                    : 'bg-muted border-muted-foreground/30'
                }`}
              />
              <span className={`text-xs whitespace-nowrap ${isCurrent ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                {STATUS_LABEL[step]}
              </span>
            </div>
            {i < WORKFLOW.length - 1 && (
              <div
                className={`h-0.5 w-8 mb-4 mx-0.5 ${i < idx && !isCancelled ? 'bg-primary/60' : 'bg-muted'}`}
              />
            )}
          </div>
        );
      })}
      {isCancelled && (
        <div className="ml-4 flex items-center gap-1.5 text-destructive text-sm font-medium">
          <XCircle className="size-4" />
          {STATUS_LABEL[current]}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showEdit, setShowEdit] = useState(false);

  const { data: appt, isLoading, isError } = useAppointment(id);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !appt) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <AlertTriangle className="size-10 mb-3 text-destructive opacity-60" />
        <p className="font-medium">Appointment not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/appointments')}>
          Back to appointments
        </Button>
      </div>
    );
  }

  const isClosed = ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appt.status);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Back link + header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={() => navigate('/appointments')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Appointments
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">
              {appt.pet.name} — {TYPE_LABEL[appt.type]}
            </h1>
            <Badge variant={STATUS_VARIANT[appt.status]}>{STATUS_LABEL[appt.status]}</Badge>
            {appt.is_walk_in && <Badge variant="outline">Walk-in</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDateLong(appt.start_at)} · {formatTime(appt.start_at)}–{formatTime(appt.end_at)} ({durationLabel(appt.start_at, appt.end_at)})
          </p>
        </div>

        {!isClosed && (
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
            <Pencil className="size-3.5" />
            Edit
          </Button>
        )}
      </div>

      {/* Status timeline */}
      <div className="overflow-x-auto pb-1">
        <StatusTimeline current={appt.status} />
      </div>

      {/* Status actions */}
      <StatusActionBar status={appt.status} apptId={appt.id} />

      {/* Cancellation reason */}
      {appt.status === 'CANCELLED' && appt.cancel_reason && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <XCircle className="size-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-destructive">Cancellation reason</p>
            <p className="text-muted-foreground mt-0.5">{appt.cancel_reason}</p>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

        {/* Patient card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <PawPrint className="size-4 text-primary" /> Patient
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div>
              <Link
                to={`/patients/${appt.pet.id}`}
                className="text-base font-semibold hover:text-primary transition-colors"
              >
                {appt.pet.name}
              </Link>
              <p className="text-sm text-muted-foreground">
                {SPECIES_LABEL[appt.pet.species] ?? appt.pet.species}
                {appt.pet.breed ? ` · ${appt.pet.breed}` : ''}
              </p>
            </div>
            {appt.pet.allergies && appt.pet.allergies.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Known allergies</p>
                <div className="flex flex-wrap gap-1.5">
                  {appt.pet.allergies.map((a) => (
                    <Badge key={a.id} variant="destructive" className="text-xs">
                      {a.allergen}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Owner</p>
              <Link
                to={`/owners/${appt.pet.owner.id}`}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                {appt.pet.owner.first_name} {appt.pet.owner.last_name}
              </Link>
              <p className="text-sm text-muted-foreground">{appt.pet.owner.phone}</p>
              {appt.pet.owner.email && (
                <p className="text-sm text-muted-foreground">{appt.pet.owner.email}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Appointment info card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" /> Appointment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="size-4 shrink-0" />
              <span>
                {formatTime(appt.start_at)} – {formatTime(appt.end_at)}
                <span className="ml-1.5 text-xs">({durationLabel(appt.start_at, appt.end_at)})</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="size-4 shrink-0" />
              <span>{formatDateLong(appt.start_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Stethoscope className="size-4 text-muted-foreground shrink-0" />
              <Link
                to={`/staff/${appt.vet.id}`}
                className="font-medium hover:text-primary transition-colors"
              >
                Dr. {appt.vet.first_name} {appt.vet.last_name}
              </Link>
              {appt.vet.specialization && (
                <span className="text-muted-foreground text-xs">· {appt.vet.specialization}</span>
              )}
            </div>
            {appt.room && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-4 shrink-0" />
                <span>{appt.room.name} <span className="text-xs">({appt.room.type})</span></span>
              </div>
            )}
            <Separator />
            <div>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${TYPE_COLOR[appt.type]}`}>
                {TYPE_LABEL[appt.type]}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Reason */}
        {appt.reason && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="size-4 text-primary" /> Reason for Visit
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground leading-relaxed">{appt.reason}</p>
            </CardContent>
          </Card>
        )}

        {/* Internal notes */}
        {appt.notes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="size-4 text-primary" /> Internal Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{appt.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Linked records */}
      {(appt.medical_record || appt.invoice) && (
        <div className="flex flex-wrap gap-3">
          {appt.medical_record && (
            <Link to={`/emr/${appt.medical_record.id}`}>
              <Button variant="outline" size="sm">
                <FileText className="size-3.5" />
                View medical record
              </Button>
            </Link>
          )}
          {appt.invoice && (
            <Link to={`/billing/${appt.invoice.id}`}>
              <Button variant="outline" size="sm">
                <Receipt className="size-3.5" />
                View invoice · {appt.invoice.status}
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Edit form */}
      {showEdit && (
        <AppointmentForm
          open={showEdit}
          onClose={() => setShowEdit(false)}
          editAppt={appt}
        />
      )}
    </div>
  );
}
