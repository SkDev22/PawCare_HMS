import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Pencil, UserX, Calendar } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useStaffMember, useDeactivateStaff, useUpsertSchedule } from '../../hooks/use-staff';
import { StaffForm } from './components/StaffForm';
import type { StaffRole, StaffScheduleEntry } from '../../types/staff';

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<StaffRole, string> = {
  ADMIN:          'Admin',
  VETERINARIAN:   'Veterinarian',
  NURSE:          'Nurse',
  RECEPTIONIST:   'Receptionist',
  LAB_TECHNICIAN: 'Lab Technician',
};

const ROLE_BADGE: Record<StaffRole, 'destructive' | 'default' | 'secondary' | 'info' | 'outline'> = {
  ADMIN:          'destructive',
  VETERINARIAN:   'default',
  NURSE:          'info',
  RECEPTIONIST:   'secondary',
  LAB_TECHNICIAN: 'outline',
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Schedule editor ───────────────────────────────────────────────────────────

type DayRow = {
  day_of_week: number;
  is_active:   boolean;
  start_time:  string;
  end_time:    string;
};

function buildRows(schedules: StaffScheduleEntry[]): DayRow[] {
  return [1, 2, 3, 4, 5, 6, 0].map((day) => {
    const existing = schedules.find((s) => s.day_of_week === day);
    return {
      day_of_week: day,
      is_active:   existing?.is_active ?? false,
      start_time:  existing?.start_time ?? '09:00',
      end_time:    existing?.end_time   ?? '17:00',
    };
  });
}

function ScheduleEditor({
  staffId,
  schedules,
}: { staffId: string; schedules: StaffScheduleEntry[] }) {
  const [rows, setRows] = useState<DayRow[]>(() => buildRows(schedules));
  const upsertSchedule = useUpsertSchedule(staffId);

  function toggleDay(idx: number) {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, is_active: !r.is_active } : r)),
    );
  }

  function setTime(idx: number, field: 'start_time' | 'end_time', value: string) {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    );
  }

  function handleSave() {
    upsertSchedule.mutate(rows.filter((r) => r.is_active));
  }

  const dirty = JSON.stringify(rows) !== JSON.stringify(buildRows(schedules));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Weekly Schedule
          </CardTitle>
          <Button
            size="sm"
            disabled={!dirty || upsertSchedule.isPending}
            onClick={handleSave}
          >
            {upsertSchedule.isPending ? 'Saving...' : 'Save Schedule'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div key={row.day_of_week} className="flex items-center gap-3">
              {/* Day toggle */}
              <button
                type="button"
                onClick={() => toggleDay(idx)}
                className={`w-10 h-6 rounded-full transition-colors shrink-0 ${
                  row.is_active
                    ? 'bg-primary'
                    : 'bg-muted border border-input'
                }`}
                aria-label={`Toggle ${DAY_NAMES[row.day_of_week]}`}
              >
                <span
                  className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-auto ${
                    row.is_active ? 'translate-x-2' : '-translate-x-2'
                  }`}
                />
              </button>

              {/* Day name */}
              <span
                className={`w-10 text-sm font-medium shrink-0 ${
                  row.is_active ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {DAY_SHORT[row.day_of_week]}
              </span>

              {/* Time inputs */}
              {row.is_active ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="time"
                    value={row.start_time}
                    onChange={(e) => setTime(idx, 'start_time', e.target.value)}
                    className="w-32 text-sm"
                  />
                  <span className="text-muted-foreground text-sm">to</span>
                  <Input
                    type="time"
                    value={row.end_time}
                    onChange={(e) => setTime(idx, 'end_time', e.target.value)}
                    className="w-32 text-sm"
                  />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground italic">Off</span>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Toggle days and set working hours. Click Save Schedule to apply.
        </p>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function StaffDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: member, isLoading } = useStaffMember(id);
  const deactivate = useDeactivateStaff();

  const [editOpen,       setEditOpen]       = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-lg" />
          <div className="lg:col-span-2">
            <Skeleton className="h-72 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">Staff member not found.</p>
        <Button variant="link" onClick={() => navigate('/staff')}>Back to Staff</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/staff')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Staff
        </Button>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-lg font-semibold">
          {member.first_name} {member.last_name}
        </h1>
        <Badge variant={ROLE_BADGE[member.role]} className="text-xs">
          {ROLE_LABEL[member.role]}
        </Badge>
        {!member.is_active && (
          <Badge variant="secondary" className="text-xs">Inactive</Badge>
        )}
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
          {member.is_active && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={() => setDeactivateOpen(true)}
            >
              <UserX className="h-4 w-4 mr-1" />
              Deactivate
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — profile info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Full Name</Label>
                <p className="font-medium mt-0.5">{member.first_name} {member.last_name}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="mt-0.5">{member.email}</p>
              </div>
              {member.phone && (
                <div>
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <p className="mt-0.5">{member.phone}</p>
                </div>
              )}
              {member.specialization && (
                <div>
                  <Label className="text-xs text-muted-foreground">Specialization</Label>
                  <p className="mt-0.5">{member.specialization}</p>
                </div>
              )}
              {member.license_number && (
                <div>
                  <Label className="text-xs text-muted-foreground">License #</Label>
                  <p className="mt-0.5 font-mono text-xs">{member.license_number}</p>
                </div>
              )}
              <Separator />
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-muted/50 rounded-md p-2">
                  <p className="text-lg font-semibold">{member._count.appointments}</p>
                  <p className="text-xs text-muted-foreground">Appointments</p>
                </div>
                <div className="bg-muted/50 rounded-md p-2">
                  <p className="text-lg font-semibold">{member._count.medical_records}</p>
                  <p className="text-xs text-muted-foreground">Records</p>
                </div>
              </div>
              <Separator />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Joined {format(new Date(member.created_at), 'MMM d, yyyy')}</p>
                <p>
                  Last login:{' '}
                  {member.last_login_at
                    ? format(new Date(member.last_login_at), 'MMM d, yyyy h:mm a')
                    : 'Never'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right — schedule */}
        <div className="lg:col-span-2">
          <ScheduleEditor staffId={member.id} schedules={member.schedules} />
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          <StaffForm
            member={member}
            onSuccess={() => setEditOpen(false)}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Deactivate confirmation dialog */}
      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Deactivate Staff Member?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {member.first_name} {member.last_name} will lose access to the system immediately.
            Their historical records will be preserved. This cannot be undone from the UI.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeactivateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deactivate.isPending}
              onClick={() =>
                deactivate.mutate(member.id, {
                  onSuccess: () => navigate('/staff'),
                })
              }
            >
              {deactivate.isPending ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
