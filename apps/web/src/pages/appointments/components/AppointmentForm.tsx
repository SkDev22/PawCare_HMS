import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, PawPrint, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { useCreateAppointment, useUpdateAppointment, useVets, useRooms } from '@/hooks/use-appointments';
import { usePets } from '@/hooks/use-pets';
import { useDebounce } from '@/hooks/use-debounce';
import type { Appointment } from '@/types/appointments';
import type { Pet } from '@/types/patients'; // used in PetSearch dropdown results

// ─── Constants ────────────────────────────────────────────────────────────────

const APPOINTMENT_TYPES = [
  { value: 'WELLNESS_EXAM', label: 'Wellness Exam' },
  { value: 'VACCINATION',   label: 'Vaccination' },
  { value: 'SICK_VISIT',    label: 'Sick Visit' },
  { value: 'SURGERY',       label: 'Surgery' },
  { value: 'DENTAL',        label: 'Dental Cleaning' },
  { value: 'FOLLOW_UP',     label: 'Follow-up' },
  { value: 'EMERGENCY',     label: 'Emergency' },
  { value: 'GROOMING',      label: 'Grooming' },
  { value: 'LAB_ONLY',      label: 'Lab Only' },
] as const;

const DURATIONS = [
  { value: '15',  label: '15 min' },
  { value: '30',  label: '30 min' },
  { value: '45',  label: '45 min' },
  { value: '60',  label: '1 hour' },
  { value: '90',  label: '1.5 hours' },
  { value: '120', label: '2 hours' },
  { value: '180', label: '3 hours' },
] as const;

const SPECIES_LABELS: Record<string, string> = {
  DOG: 'Dog', CAT: 'Cat', BIRD: 'Bird', RABBIT: 'Rabbit',
  REPTILE: 'Reptile', SMALL_MAMMAL: 'Small mammal', OTHER: 'Other',
};

// ─── Local form schema (date + time + duration instead of start_at/end_at) ───

const FormSchema = z.object({
  pet_id:           z.string().uuid('Please select a patient'),
  vet_id:           z.string().uuid('Please select a veterinarian'),
  room_id:          z.string().optional(),
  type:             z.enum([
    'WELLNESS_EXAM', 'VACCINATION', 'SICK_VISIT', 'SURGERY',
    'DENTAL', 'FOLLOW_UP', 'EMERGENCY', 'GROOMING', 'LAB_ONLY',
  ]),
  date:             z.string().min(1, 'Date is required'),
  start_time:       z.string().min(1, 'Start time is required'),
  duration_minutes: z.string().min(1, 'Duration is required'),
  reason:           z.string().max(1000).optional(),
  notes:            z.string().max(2000).optional(),
  is_walk_in:       z.boolean().default(false),
});

type FormValues = z.infer<typeof FormSchema>;

// ─── Pet search combobox ──────────────────────────────────────────────────────

interface PetSearchProps {
  value: string;
  onChange: (id: string) => void;
  defaultPet?: {
    id:      string;
    name:    string;
    species: string;
    owner?:  { first_name: string; last_name: string } | null;
  };
}

function PetSearch({ value, onChange, defaultPet }: PetSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>(
    defaultPet ? `${defaultPet.name} — ${defaultPet.owner?.first_name ?? ''} ${defaultPet.owner?.last_name ?? ''}`.trim() : '',
  );

  const debouncedQuery = useDebounce(query, 250);
  const { data } = usePets(
    debouncedQuery ? { search: debouncedQuery, limit: 8 } : undefined,
  );

  function select(pet: Pet) {
    onChange(pet.id);
    setSelected(`${pet.name} — ${pet.owner?.first_name ?? ''} ${pet.owner?.last_name ?? ''} · ${SPECIES_LABELS[pet.species] ?? pet.species}`);
    setQuery('');
    setOpen(false);
  }

  function clear() {
    onChange('');
    setSelected('');
    setQuery('');
  }

  return (
    <div className="relative">
      {value && selected ? (
        <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm">
          <PawPrint className="size-3.5 text-muted-foreground shrink-0" />
          <span className="flex-1 truncate">{selected}</span>
          <button type="button" onClick={clear} className="text-muted-foreground hover:text-foreground">
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search patient by name…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
        </div>
      )}

      {open && !value && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-52 overflow-y-auto">
          {!data?.items.length ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              {debouncedQuery ? 'No patients found.' : 'Type a name to search.'}
            </p>
          ) : (
            data.items.map((pet) => (
              <button
                key={pet.id}
                type="button"
                onMouseDown={() => select(pet)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-accent transition-colors"
              >
                <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 shrink-0">
                  <PawPrint className="size-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-none">{pet.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {SPECIES_LABELS[pet.species] ?? pet.species}
                    {pet.owner ? ` · ${pet.owner.first_name} ${pet.owner.last_name}` : ''}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

interface Props {
  open:        boolean;
  onClose:     () => void;
  editAppt?:   Appointment;
  defaultDate?: string;
}

export function AppointmentForm({ open, onClose, editAppt, defaultDate }: Props) {
  const isEdit = !!editAppt;
  const { data: vets = [] }  = useVets();
  const { data: rooms = [] } = useRooms();

  const todayStr = defaultDate ?? new Date().toISOString().slice(0, 10);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      pet_id:           '',
      vet_id:           '',
      room_id:          '',
      type:             'WELLNESS_EXAM',
      date:             todayStr,
      start_time:       '09:00',
      duration_minutes: '30',
      reason:           '',
      notes:            '',
      is_walk_in:       false,
    },
  });

  useEffect(() => {
    if (editAppt) {
      const start = new Date(editAppt.start_at);
      const end   = new Date(editAppt.end_at);
      const durationMins = Math.round((end.getTime() - start.getTime()) / 60000);

      form.reset({
        pet_id:           editAppt.pet_id,
        vet_id:           editAppt.vet_id,
        room_id:          editAppt.room_id ?? '',
        type:             editAppt.type,
        date:             start.toISOString().slice(0, 10),
        start_time:       start.toTimeString().slice(0, 5),
        duration_minutes: String(durationMins),
        reason:           editAppt.reason ?? '',
        notes:            editAppt.notes ?? '',
        is_walk_in:       editAppt.is_walk_in,
      });
    } else {
      form.reset({
        pet_id: '', vet_id: '', room_id: '',
        type: 'WELLNESS_EXAM', date: todayStr, start_time: '09:00',
        duration_minutes: '30', reason: '', notes: '', is_walk_in: false,
      });
    }
  }, [editAppt, open, form, todayStr]);

  const create = useCreateAppointment();
  const update = useUpdateAppointment(editAppt?.id ?? '');

  const onSubmit = async (values: FormValues) => {
    const startAt = new Date(`${values.date}T${values.start_time}:00`);
    const endAt   = new Date(startAt.getTime() + Number(values.duration_minutes) * 60_000);

    const payload = {
      pet_id:     values.pet_id,
      vet_id:     values.vet_id,
      type:       values.type,
      start_at:   startAt.toISOString(),
      end_at:     endAt.toISOString(),
      is_walk_in: values.is_walk_in,
      ...(values.room_id ? { room_id: values.room_id } : {}),
      ...(values.reason  ? { reason: values.reason }   : {}),
      ...(values.notes   ? { notes: values.notes }     : {}),
    };

    try {
      if (isEdit) {
        await update.mutateAsync(payload);
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch {
      // surfaced via toast in hook
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Appointment' : 'New Appointment'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update appointment details. Changing time checks for vet conflicts.'
              : 'Schedule a new appointment. All times are in your local timezone.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Patient */}
            <FormField
              control={form.control}
              name="pet_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient *</FormLabel>
                  <FormControl>
                    {editAppt ? (
                      <PetSearch
                        value={field.value}
                        onChange={field.onChange}
                        defaultPet={{
                          id:      editAppt.pet_id,
                          name:    editAppt.pet.name,
                          species: editAppt.pet.species,
                          owner:   editAppt.pet.owner,
                        }}
                      />
                    ) : (
                      <PetSearch value={field.value} onChange={field.onChange} />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Vet */}
            <FormField
              control={form.control}
              name="vet_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Veterinarian *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a vet…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vets.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          Dr. {v.first_name} {v.last_name}
                          {v.specialization ? ` · ${v.specialization}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Appointment type *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {APPOINTMENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date / Time / Duration */}
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start time *</FormLabel>
                    <FormControl>
                      <Input type="time" step="900" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DURATIONS.map((d) => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Room */}
            {rooms.length > 0 && (
              <FormField
                control={form.control}
                name="room_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room</FormLabel>
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="No room assigned" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">No room</SelectItem>
                        {rooms.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name} <span className="text-muted-foreground">· {r.type}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Walk-in badge */}
            <FormField
              control={form.control}
              name="is_walk_in"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <input
                      id="walk-in"
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-input"
                    />
                    <label htmlFor="walk-in" className="text-sm font-medium leading-none">
                      Walk-in appointment
                    </label>
                    {field.value && (
                      <Badge variant="secondary" className="text-xs">Walk-in</Badge>
                    )}
                  </div>
                </FormItem>
              )}
            />

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for visit</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Chief complaint or reason for the appointment…"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes for the clinic team…"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Schedule appointment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
