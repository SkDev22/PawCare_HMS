import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft, BedDouble, Clock, Stethoscope, CheckCircle2, AlertTriangle,
  Plus, Pill, Eye, Activity, Utensils,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '../../components/ui/form';
import { Textarea } from '../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useHospitalization, useDischarge, useAddCareLog } from '../../hooks/use-ward';

// ── Icon map ──────────────────────────────────────────────────────────────────

const LOG_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  feeding:     Utensils,
  medication:  Pill,
  vitals:      Activity,
  observation: Eye,
};

// ── Discharge Dialog ──────────────────────────────────────────────────────────

const DischargeSchema = z.object({
  discharge_notes: z.string().max(2000).default(''),
});

function DischargeDialog({
  hospId,
  open,
  onOpenChange,
}: { hospId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate  = useNavigate();
  const discharge = useDischarge(hospId);

  const form = useForm<z.infer<typeof DischargeSchema>>({
    resolver:      zodResolver(DischargeSchema),
    defaultValues: { discharge_notes: '' },
  });

  function onSubmit(values: z.infer<typeof DischargeSchema>) {
    discharge.mutate(
      { ...(values.discharge_notes ? { discharge_notes: values.discharge_notes } : {}) },
      { onSuccess: () => { onOpenChange(false); navigate('/ward'); } },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Discharge Patient</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This will mark the patient as discharged and free the kennel.
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="discharge_notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Discharge Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Care instructions, follow-up plan..." rows={4} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={discharge.isPending}>
                {discharge.isPending ? 'Discharging...' : 'Confirm Discharge'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Care Log Dialog ───────────────────────────────────────────────────────────

const CareLogSchema = z.object({
  type:  z.enum(['feeding', 'medication', 'vitals', 'observation']),
  notes: z.string().min(1, 'Notes are required').max(2000),
});

function AddCareLogDialog({
  hospId,
  open,
  onOpenChange,
}: { hospId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const addLog = useAddCareLog(hospId);
  const form   = useForm<z.infer<typeof CareLogSchema>>({
    resolver:      zodResolver(CareLogSchema),
    defaultValues: { type: 'observation', notes: '' },
  });

  function onSubmit(values: z.infer<typeof CareLogSchema>) {
    addLog.mutate(values, { onSuccess: () => { onOpenChange(false); form.reset(); } });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Care Log Entry</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>Type *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="feeding">Feeding</SelectItem>
                    <SelectItem value="medication">Medication</SelectItem>
                    <SelectItem value="vitals">Vitals Check</SelectItem>
                    <SelectItem value="observation">Observation</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes *</FormLabel>
                <FormControl>
                  <Textarea placeholder="Describe the care given or observations..." rows={4} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addLog.isPending}>
                {addLog.isPending ? 'Saving...' : 'Add Entry'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function HospitalizationDetailPage() {
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const [dischargeOpen, setDischargeOpen] = useState(false);
  const [careLogOpen, setCareLogOpen]     = useState(false);

  const { data: hosp, isLoading } = useHospitalization(id);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="col-span-2 h-48" />
        </div>
      </div>
    );
  }

  if (!hosp) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Hospitalization record not found.</p>
        <Button variant="link" onClick={() => navigate('/ward')}>Back to Ward</Button>
      </div>
    );
  }

  const isActive      = !hosp.discharged_at;
  const dayCount      = Math.ceil(
    (new Date(hosp.discharged_at ?? new Date()).getTime() - new Date(hosp.admitted_at).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/ward')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{hosp.pet.name}</h1>
            <Badge variant={isActive ? 'warning' : 'secondary'} className="text-xs">
              {isActive ? 'Inpatient' : 'Discharged'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground capitalize">
            {hosp.pet.species.toLowerCase()} · {hosp.kennel.label} · {hosp.kennel.room.name}
          </p>
        </div>
        {isActive && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCareLogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Care Log
            </Button>
            <Button variant="destructive" onClick={() => setDischargeOpen(true)}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Discharge
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Stethoscope className="h-4 w-4" /> Patient
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Name</p>
                <p className="font-medium">{hosp.pet.name}</p>
              </div>
              {hosp.pet.breed && (
                <div>
                  <p className="text-muted-foreground text-xs">Breed</p>
                  <p>{hosp.pet.breed}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground text-xs">Owner</p>
                <p>{hosp.pet.owner.first_name} {hosp.pet.owner.last_name}</p>
                {hosp.pet.owner.phone && (
                  <p className="text-muted-foreground text-xs">{hosp.pet.owner.phone}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BedDouble className="h-4 w-4" /> Admission
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Reason</p>
                <p>{hosp.reason}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Admitted</p>
                <p>{format(new Date(hosp.admitted_at), 'MMM d, yyyy h:mm a')}</p>
                <p className="text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(hosp.admitted_at), { addSuffix: true })}
                </p>
              </div>
              {hosp.estimated_stay_days && (
                <div>
                  <p className="text-muted-foreground text-xs">Estimated Stay</p>
                  <p>{hosp.estimated_stay_days} day{hosp.estimated_stay_days !== 1 ? 's' : ''}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground text-xs">Duration</p>
                <p className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {dayCount} day{dayCount !== 1 ? 's' : ''}
                </p>
              </div>
              {hosp.admitted_by_staff && (
                <div>
                  <p className="text-muted-foreground text-xs">Admitted By</p>
                  <p>Dr. {hosp.admitted_by_staff.last_name}</p>
                </div>
              )}
              {hosp.discharged_at && (
                <div className="pt-2 border-t">
                  <p className="text-muted-foreground text-xs">Discharged</p>
                  <p>{format(new Date(hosp.discharged_at), 'MMM d, yyyy h:mm a')}</p>
                  {hosp.discharge_notes && (
                    <div className="mt-1">
                      <p className="text-muted-foreground text-xs">Discharge Notes</p>
                      <p className="text-sm">{hosp.discharge_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Care Logs */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Care Log ({hosp.care_logs.length} entr{hosp.care_logs.length !== 1 ? 'ies' : 'y'})
              </CardTitle>
              {isActive && (
                <Button size="sm" variant="outline" onClick={() => setCareLogOpen(true)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {hosp.care_logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No care logs yet</p>
                  {isActive && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Log feeding, medication, vitals, or observations here.
                    </p>
                  )}
                </div>
              ) : (
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {hosp.care_logs.map((log) => {
                    const Icon = LOG_ICONS[log.type] ?? Activity;
                    return (
                      <div key={log.id} className="flex gap-3 px-4 py-3">
                        <div className="mt-0.5 shrink-0">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Badge variant="secondary" className="text-xs capitalize">
                              {log.type}
                            </Badge>
                            {log.performed_by_staff && (
                              <span className="text-xs text-muted-foreground">
                                {log.performed_by_staff.first_name} {log.performed_by_staff.last_name}
                              </span>
                            )}
                          </div>
                          <p className="text-sm">{log.notes}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(log.logged_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      {id && (
        <>
          <DischargeDialog
            hospId={id}
            open={dischargeOpen}
            onOpenChange={setDischargeOpen}
          />
          <AddCareLogDialog
            hospId={id}
            open={careLogOpen}
            onOpenChange={setCareLogOpen}
          />
        </>
      )}
    </div>
  );
}
