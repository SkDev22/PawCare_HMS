import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  ChevronLeft, AlertTriangle, Stethoscope, Pill, Activity,
  Trash2, Plus, ExternalLink, Receipt, Search, X, Package, Printer,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '../../components/ui/form';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  useMedicalRecord,
  useUpsertSoapNote,
  useUpsertVitals,
  useAddDiagnosis,
  useRemoveDiagnosis,
  useAddPrescription,
  useDeactivatePrescription,
  useCharges,
  useAddCharge,
  useRemoveCharge,
} from '../../hooks/use-emr';
import { useInventoryItems } from '../../hooks/use-inventory';
import { useServices } from '../../hooks/use-billing';
import { useDebounce } from '../../hooks/use-debounce';
import type { MedicalRecord, Diagnosis, Prescription, Charge } from '../../types/emr';

// ── SOAP Note Tab ──────────────────────────────────────────────────────────────

const SoapSchema = z.object({
  subjective:  z.string().max(5000).default(''),
  objective:   z.string().max(5000).default(''),
  assessment:  z.string().max(5000).default(''),
  plan:        z.string().max(5000).default(''),
});

function SoapNoteTab({ record }: { record: MedicalRecord }) {
  const upsert = useUpsertSoapNote(record.id);
  const form = useForm<z.infer<typeof SoapSchema>>({
    resolver: zodResolver(SoapSchema),
    defaultValues: {
      subjective:  record.soap_note?.subjective  ?? '',
      objective:   record.soap_note?.objective   ?? '',
      assessment:  record.soap_note?.assessment  ?? '',
      plan:        record.soap_note?.plan        ?? '',
    },
  });

  const onSubmit = (values: z.infer<typeof SoapSchema>) => {
    upsert.mutate(values);
  };

  return (
    <div className="space-y-4">
      {record.soap_note && (
        <div className="text-xs text-muted-foreground">
          Last updated by Dr. {record.soap_note.vet.first_name} {record.soap_note.vet.last_name}
          {' · '}{format(new Date(record.soap_note.updated_at), 'PPp')}
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {(['subjective', 'objective', 'assessment', 'plan'] as const).map((field) => (
            <FormField
              key={field}
              control={form.control}
              name={field}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel className="capitalize font-semibold">{field}</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      className="resize-none"
                      placeholder={
                        field === 'subjective'  ? "Owner's report and history..." :
                        field === 'objective'   ? 'Physical examination findings...' :
                        field === 'assessment'  ? 'Clinical impression and diagnoses...' :
                        'Treatment plan and follow-up...'
                      }
                      {...f}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <div className="flex justify-end">
            <Button type="submit" disabled={upsert.isPending}>
              {upsert.isPending ? 'Saving...' : 'Save SOAP Note'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// ── Vitals Tab ─────────────────────────────────────────────────────────────────

const VitalsSchema = z.object({
  weight_kg:            z.coerce.number().positive().optional(),
  temperature_c:        z.coerce.number().positive().optional(),
  heart_rate_bpm:       z.coerce.number().int().positive().optional(),
  respiratory_rate:     z.coerce.number().int().positive().optional(),
  blood_pressure:       z.string().max(20).optional(),
  body_condition_score: z.coerce.number().int().min(1).max(9).optional(),
});

function VitalsTab({ record }: { record: MedicalRecord }) {
  const upsert = useUpsertVitals(record.id);
  const v = record.vitals;

  const form = useForm<z.infer<typeof VitalsSchema>>({
    resolver: zodResolver(VitalsSchema),
    defaultValues: {
      weight_kg:            v?.weight_kg    ? parseFloat(v.weight_kg)    : undefined,
      temperature_c:        v?.temperature_c ? parseFloat(v.temperature_c) : undefined,
      heart_rate_bpm:       v?.heart_rate_bpm       ?? undefined,
      respiratory_rate:     v?.respiratory_rate     ?? undefined,
      blood_pressure:       v?.blood_pressure       ?? '',
      body_condition_score: v?.body_condition_score ?? undefined,
    },
  });

  const onSubmit = (values: z.infer<typeof VitalsSchema>) => {
    upsert.mutate({
      ...(values.weight_kg            !== undefined ? { weight_kg: values.weight_kg }                       : {}),
      ...(values.temperature_c        !== undefined ? { temperature_c: values.temperature_c }               : {}),
      ...(values.heart_rate_bpm       !== undefined ? { heart_rate_bpm: values.heart_rate_bpm }             : {}),
      ...(values.respiratory_rate     !== undefined ? { respiratory_rate: values.respiratory_rate }         : {}),
      ...(values.blood_pressure       ? { blood_pressure: values.blood_pressure }                           : {}),
      ...(values.body_condition_score !== undefined ? { body_condition_score: values.body_condition_score } : {}),
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="weight_kg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight (kg)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 4.5"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="temperature_c"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Temperature (°C)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 38.5"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="heart_rate_bpm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Heart Rate (bpm)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g. 80"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="respiratory_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Respiratory Rate (breaths/min)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g. 20"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="blood_pressure"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Blood Pressure</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 120/80" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="body_condition_score"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Body Condition Score (1–9)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={9}
                    placeholder="e.g. 5"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {v && (
          <p className="text-xs text-muted-foreground">
            Last recorded {format(new Date(v.recorded_at), 'PPp')}
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={upsert.isPending}>
            {upsert.isPending ? 'Saving...' : 'Save Vitals'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ── Diagnoses Tab ──────────────────────────────────────────────────────────────

const DiagnosisSchema = z.object({
  name:       z.string().min(1, 'Diagnosis name is required').max(500),
  code:       z.string().max(50).optional(),
  is_primary: z.boolean().default(false),
  notes:      z.string().max(1000).optional(),
});

function AddDiagnosisDialog({
  recordId,
  open,
  onOpenChange,
}: {
  recordId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const addDx = useAddDiagnosis(recordId);
  const form = useForm<z.infer<typeof DiagnosisSchema>>({
    resolver: zodResolver(DiagnosisSchema),
    defaultValues: { name: '', code: '', is_primary: false, notes: '' },
  });

  const onSubmit = (values: z.infer<typeof DiagnosisSchema>) => {
    addDx.mutate(
      {
        name:       values.name,
        is_primary: values.is_primary,
        ...(values.code  ? { code:  values.code  } : {}),
        ...(values.notes ? { notes: values.notes } : {}),
      },
      { onSuccess: () => { form.reset(); onOpenChange(false); } },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Diagnosis</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diagnosis Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Otitis externa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="ICD-10 or VeNom code" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_primary"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-border"
                    />
                  </FormControl>
                  <FormLabel className="mb-0">Primary diagnosis</FormLabel>
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addDx.isPending}>
                {addDx.isPending ? 'Adding...' : 'Add Diagnosis'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DiagnosesTab({ record }: { record: MedicalRecord }) {
  const [addOpen, setAddOpen] = useState(false);
  const removeDx = useRemoveDiagnosis(record.id);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Diagnosis
        </Button>
      </div>

      {record.diagnoses.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          No diagnoses recorded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {record.diagnoses.map((dx: Diagnosis) => (
            <div
              key={dx.id}
              className="flex items-start justify-between p-3 rounded-md border border-border bg-card"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{dx.name}</span>
                  {dx.is_primary && <Badge variant="default" className="text-xs">Primary</Badge>}
                  {dx.code && (
                    <Badge variant="outline" className="text-xs font-mono">{dx.code}</Badge>
                  )}
                </div>
                {dx.notes && (
                  <p className="text-xs text-muted-foreground">{dx.notes}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {format(new Date(dx.created_at), 'MMM d, yyyy')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive print:hidden"
                onClick={() => removeDx.mutate(dx.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <AddDiagnosisDialog
        recordId={record.id}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </div>
  );
}

// ── Prescriptions Tab ──────────────────────────────────────────────────────────

const PrescriptionSchema = z.object({
  drug_name:         z.string().min(1, 'Drug name is required').max(200),
  dosage:            z.string().min(1, 'Dosage is required').max(200),
  frequency:         z.string().min(1, 'Frequency is required').max(200),
  duration_days:     z.coerce.number().int().positive().optional(),
  quantity:          z.coerce.number().int().positive().optional(),
  refills_remaining: z.coerce.number().int().min(0).default(0),
  instructions:      z.string().max(1000).optional(),
  expires_at:        z.string().optional(),
});

function AddPrescriptionDialog({
  recordId,
  open,
  onOpenChange,
}: {
  recordId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const addRx = useAddPrescription(recordId);
  const [addedCount, setAddedCount] = useState(0);
  const [fulfillment, setFulfillment] = useState<'clinic' | 'pharmacy'>('pharmacy');
  const [selectedItem, setSelectedItem] = useState<{ id: string; name: string; selling_price: string } | null>(null);
  const defaultValues = {
    drug_name: '', dosage: '', frequency: '',
    refills_remaining: 0, instructions: '', expires_at: '',
  };
  const form = useForm<z.infer<typeof PrescriptionSchema>>({
    resolver: zodResolver(PrescriptionSchema),
    defaultValues,
  });

  const resetFulfillment = () => { setFulfillment('pharmacy'); setSelectedItem(null); };
  const quantity = form.watch('quantity');
  const canSubmit = fulfillment === 'pharmacy' || (!!selectedItem && !!quantity && quantity > 0);

  const onSubmit = (values: z.infer<typeof PrescriptionSchema>) => {
    addRx.mutate(
      {
        drug_name:         values.drug_name,
        dosage:            values.dosage,
        frequency:         values.frequency,
        refills_remaining: values.refills_remaining,
        ...(values.duration_days !== undefined ? { duration_days: values.duration_days } : {}),
        ...(values.quantity      !== undefined ? { quantity:      values.quantity }      : {}),
        ...(values.instructions  ? { instructions: values.instructions }                 : {}),
        ...(values.expires_at    ? { expires_at:   values.expires_at }                   : {}),
        ...(fulfillment === 'clinic' && selectedItem ? { item_id: selectedItem.id } : {}),
      },
      { onSuccess: () => { form.reset(defaultValues); resetFulfillment(); setAddedCount((n) => n + 1); } },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => { onOpenChange(v); if (!v) { form.reset(defaultValues); resetFulfillment(); setAddedCount(0); } }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Prescription</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="drug_name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Drug Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Amoxicillin" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dosage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dosage</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 250mg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Twice daily" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g. 7"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g. 14"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="refills_remaining"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Refills</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expires_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expires (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Fulfilled by</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={fulfillment === 'clinic' ? 'default' : 'outline'}
                  onClick={() => setFulfillment('clinic')}
                >
                  Clinic stock
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={fulfillment === 'pharmacy' ? 'default' : 'outline'}
                  onClick={() => { setFulfillment('pharmacy'); setSelectedItem(null); }}
                >
                  Owner fills at pharmacy
                </Button>
              </div>
            </div>

            {fulfillment === 'clinic' && (
              <div className="space-y-2 rounded-md border border-border p-3 bg-muted/30">
                <label className="text-xs font-medium text-muted-foreground block">Match to inventory item</label>
                {selectedItem ? (
                  <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm">
                    <Package className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{selectedItem.name}</span>
                    <button type="button" onClick={() => setSelectedItem(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <ItemSearch onSelect={setSelectedItem} />
                )}
                {selectedItem && (
                  <p className="text-xs text-muted-foreground">
                    Will bill ${(Number(selectedItem.selling_price) * (quantity || 0)).toFixed(2)} and deduct {quantity || 0} from stock.
                  </p>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructions (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} className="resize-none" placeholder="Patient/owner instructions..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center justify-between gap-2">
              {addedCount > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {addedCount} added — keep adding or close when done.
                </p>
              ) : <span />}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {addedCount > 0 ? 'Done' : 'Cancel'}
                </Button>
                <Button type="submit" disabled={addRx.isPending || !canSubmit}>
                  {addRx.isPending ? 'Adding...' : 'Add Prescription'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function PrescriptionsTab({ record }: { record: MedicalRecord }) {
  const [addOpen, setAddOpen] = useState(false);
  const deactivate = useDeactivatePrescription(record.id);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Prescription
        </Button>
      </div>

      {record.prescriptions.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          No active prescriptions.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Drug</TableHead>
              <TableHead>Dosage / Frequency</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Refills</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {record.prescriptions.map((rx: Prescription) => (
              <TableRow key={rx.id}>
                <TableCell>
                  <div className="font-medium text-sm">{rx.drug_name}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {rx.charge ? (
                      <Badge variant="success" className="text-xs">Clinic · ${rx.charge.total}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Pharmacy</Badge>
                    )}
                  </div>
                  {rx.instructions && (
                    <div className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                      {rx.instructions}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {rx.dosage} · {rx.frequency}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {rx.duration_days ? `${rx.duration_days}d` : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={rx.refills_remaining > 0 ? 'info' : 'secondary'} className="text-xs">
                    {rx.refills_remaining} left
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {rx.expires_at ? format(new Date(rx.expires_at), 'MMM d, yyyy') : '—'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive print:hidden"
                    onClick={() => deactivate.mutate(rx.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AddPrescriptionDialog
        recordId={record.id}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </div>
  );
}

// ── Charges Tab (billable drugs / equipment / services used this visit) ───────

function ItemSearch({ onSelect }: { onSelect: (item: { id: string; name: string; selling_price: string }) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 250);
  const { data } = useInventoryItems(debouncedQuery ? { search: debouncedQuery, limit: 8 } : undefined);
  const results = (data?.items ?? []).filter((i) => i.selling_price !== null);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
      <Input
        className="pl-8"
        placeholder="Search drugs, equipment, supplies…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-52 overflow-y-auto">
          {!results.length ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              {debouncedQuery ? 'No priced items found.' : 'Type to search the inventory catalog.'}
            </p>
          ) : (
            results.map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={() => { onSelect({ id: item.id, name: item.name, selling_price: item.selling_price! }); setQuery(''); setOpen(false); }}
                className="w-full flex items-center justify-between gap-2.5 px-3 py-2.5 text-left hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="size-3.5 text-primary shrink-0" />
                  <span className="text-sm truncate">{item.name}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">${item.selling_price} / {item.unit}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function AddChargeDialog({
  recordId,
  open,
  onOpenChange,
}: {
  recordId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const addCharge = useAddCharge(recordId);
  const { data: services = [] } = useServices();
  const [mode, setMode] = useState<'item' | 'service'>('item');
  const [selectedItem, setSelectedItem] = useState<{ id: string; name: string; selling_price: string } | null>(null);
  const [serviceId, setServiceId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addedCount, setAddedCount] = useState(0);

  const resetSelection = () => { setSelectedItem(null); setServiceId(''); setQuantity(1); };
  const resetAll = () => { resetSelection(); setMode('item'); setAddedCount(0); };

  const canSubmit = mode === 'item' ? !!selectedItem : !!serviceId;
  const selectedService = services.find((s) => s.id === serviceId);
  const unitPrice = mode === 'item' ? selectedItem?.selling_price : selectedService?.price;

  const onSubmit = () => {
    addCharge.mutate(
      {
        quantity,
        ...(mode === 'item' ? { item_id: selectedItem!.id } : { service_id: serviceId }),
      },
      { onSuccess: () => { resetSelection(); setAddedCount((n) => n + 1); } },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetAll(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Charge</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === 'item' ? 'default' : 'outline'}
              onClick={() => setMode('item')}
            >
              Drug / Equipment
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === 'service' ? 'default' : 'outline'}
              onClick={() => setMode('service')}
            >
              Service
            </Button>
          </div>

          {mode === 'item' ? (
            selectedItem ? (
              <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm">
                <Package className="size-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate">{selectedItem.name}</span>
                <button type="button" onClick={() => setSelectedItem(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <ItemSearch onSelect={setSelectedItem} />
            )
          ) : (
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a service…" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} — ${s.price}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div>
            <label className="text-sm font-medium mb-1.5 block">Quantity</label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>

          {unitPrice && (
            <p className="text-sm text-muted-foreground">
              Total: <span className="font-medium text-foreground">${(Number(unitPrice) * quantity).toFixed(2)}</span>
            </p>
          )}

          <div className="flex items-center justify-between gap-2">
            {addedCount > 0 ? (
              <p className="text-xs text-muted-foreground">
                {addedCount} item{addedCount > 1 ? 's' : ''} added — keep adding or close when done.
              </p>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {addedCount > 0 ? 'Done' : 'Cancel'}
              </Button>
              <Button type="button" disabled={!canSubmit || addCharge.isPending} onClick={onSubmit}>
                {addCharge.isPending ? 'Adding…' : 'Add Charge'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChargesTab({ record }: { record: MedicalRecord }) {
  const [addOpen, setAddOpen] = useState(false);
  const { data: charges = [], isLoading } = useCharges(record.id);
  const removeCharge = useRemoveCharge(record.id);

  const total = charges.reduce((sum, c) => sum + Number(c.total), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Drugs, equipment, and services used this visit — synced to the invoice automatically.
        </p>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Charge
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : charges.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          No charges added yet.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Total</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {charges.map((c: Charge) => (
              <TableRow key={c.id}>
                <TableCell className="text-sm font-medium">{c.description}</TableCell>
                <TableCell className="text-sm">{c.quantity}</TableCell>
                <TableCell className="text-sm">${c.unit_price}</TableCell>
                <TableCell className="text-sm font-medium">${c.total}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive print:hidden"
                    onClick={() => removeCharge.mutate(c.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={3} className="text-sm font-semibold text-right">Total</TableCell>
              <TableCell className="text-sm font-semibold">${total.toFixed(2)}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      )}

      <AddChargeDialog
        recordId={record.id}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </div>
  );
}

// ── Pet Info Sidebar ───────────────────────────────────────────────────────────

const SPECIES_LABEL: Record<string, string> = {
  DOG: 'Dog', CAT: 'Cat', BIRD: 'Bird', RABBIT: 'Rabbit',
  REPTILE: 'Reptile', SMALL_MAMMAL: 'Small Mammal', OTHER: 'Other',
};

const SEVERITY_VARIANT: Record<string, 'destructive' | 'warning' | 'secondary'> = {
  severe: 'destructive',
  moderate: 'warning',
};

function PetInfoCard({ record }: { record: MedicalRecord }) {
  const pet = record.pet;
  const { owner } = pet;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-muted-foreground" />
          Patient
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-x-6 text-sm divide-y sm:divide-y-0 sm:divide-x divide-border">
          <div className="sm:pr-6">
            <Link
              to={`/patients/${pet.id}`}
              className="font-semibold hover:underline text-base"
            >
              {pet.name}
            </Link>
            <div className="text-muted-foreground text-xs mt-0.5">
              {SPECIES_LABEL[pet.species] ?? pet.species}
              {pet.breed ? ` · ${pet.breed}` : ''}
            </div>
            {pet.date_of_birth && (
              <div className="text-xs text-muted-foreground mt-1">
                DOB: {format(new Date(pet.date_of_birth), 'MMM d, yyyy')}
              </div>
            )}
            {pet.sex && (
              <div className="text-xs text-muted-foreground">Sex: {pet.sex}</div>
            )}
          </div>

          <div className="pt-4 sm:pt-0 sm:pl-6 sm:pr-6">
            <p className="text-xs font-medium text-muted-foreground mb-1">Owner</p>
            <Link
              to={`/owners/${owner.id}`}
              className="font-medium hover:underline"
            >
              {owner.first_name} {owner.last_name}
            </Link>
            <div className="text-xs text-muted-foreground mt-0.5">{owner.phone}</div>
            {owner.email && (
              <div className="text-xs text-muted-foreground">{owner.email}</div>
            )}
          </div>

          {pet.allergies.length > 0 && (
            <div className="pt-4 sm:pt-0 sm:pl-6 sm:flex-1 sm:min-w-[180px]">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Allergies
              </div>
              <div className="flex flex-wrap gap-1.5">
                {pet.allergies.map((a) => (
                  <Badge
                    key={a.id}
                    variant={SEVERITY_VARIANT[a.severity ?? ''] ?? 'secondary'}
                    className="text-xs"
                  >
                    {a.allergen} · {a.severity ?? 'unknown'}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RecordMetaCard({ record }: { record: MedicalRecord }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Visit Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <div>
            <span className="text-muted-foreground text-xs block">Date</span>
            <span className="text-xs font-medium">
              {format(new Date(record.visit_date), 'PPP')}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs block">Veterinarian</span>
            <span className="text-xs font-medium">
              Dr. {record.vet.first_name} {record.vet.last_name}
            </span>
          </div>
          {record.appointment && (
            <div>
              <span className="text-muted-foreground text-xs block">Appointment</span>
              <Link
                to={`/appointments/${record.appointment.id}`}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                {record.appointment.type.replace('_', ' ')}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}
          {record._count.attachments > 0 && (
            <div>
              <span className="text-muted-foreground text-xs block">Attachments</span>
              <span className="text-xs">{record._count.attachments}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-32 w-full rounded-lg lg:col-span-2" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  );
}

export function EmrDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: record, isLoading } = useMedicalRecord(id);

  if (isLoading) return <DetailSkeleton />;

  if (!record) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Medical record not found.</p>
        <Button variant="link" onClick={() => navigate('/emr')}>
          Back to records
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="mt-0.5 print:hidden"
          onClick={() => navigate('/emr')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">
            {record.pet.name} — Medical Record
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(record.visit_date), 'PPPP')} ·{' '}
            Dr. {record.vet.first_name} {record.vet.last_name}
            {record.vet.specialization ? ` (${record.vet.specialization})` : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1" />
          Print
        </Button>
      </div>

      {/* Chief Complaint */}
      {record.chief_complaint && (
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Chief Complaint
            </p>
            <p className="text-sm">{record.chief_complaint}</p>
          </CardContent>
        </Card>
      )}

      {/* Patient details — top row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PetInfoCard record={record} />
        </div>
        <RecordMetaCard record={record} />
      </div>

      {/* Medical record content — full width */}
      <Tabs defaultValue="soap">
        <TabsList className="w-full justify-start print:hidden">
          <TabsTrigger value="soap" className="flex items-center gap-1.5">
            <FileTextIcon className="h-3.5 w-3.5" />
            SOAP Note
          </TabsTrigger>
          <TabsTrigger value="vitals" className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Vitals
          </TabsTrigger>
          <TabsTrigger value="diagnoses" className="flex items-center gap-1.5">
            <Stethoscope className="h-3.5 w-3.5" />
            Diagnoses ({record.diagnoses.length})
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="flex items-center gap-1.5">
            <Pill className="h-3.5 w-3.5" />
            Rx ({record.prescriptions.length})
          </TabsTrigger>
          <TabsTrigger value="charges" className="flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            Charges
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="soap">
            <Card>
              <CardContent className="pt-5">
                <SoapNoteTab record={record} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vitals">
            <Card>
              <CardContent className="pt-5">
                <VitalsTab record={record} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diagnoses">
            <Card>
              <CardContent className="pt-5">
                <DiagnosesTab record={record} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prescriptions">
            <Card>
              <CardContent className="pt-5">
                <PrescriptionsTab record={record} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="charges">
            <Card>
              <CardContent className="pt-5">
                <ChargesTab record={record} />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}
