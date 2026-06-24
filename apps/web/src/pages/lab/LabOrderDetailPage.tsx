import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ArrowLeft, Plus, FlaskConical, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';
import { Skeleton } from '../../components/ui/skeleton';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '../../components/ui/form';
import { useLabOrder, useUpdateLabOrderStatus, useAddLabResults } from '../../hooks/use-lab';
import type { LabStatus, LabResult } from '../../types/lab';

// ── Status helpers ──────────────────────────────────────────────────────────

const STATUS_BADGE: Record<LabStatus, 'secondary' | 'warning' | 'info' | 'success' | 'destructive'> = {
  PENDING:          'secondary',
  SAMPLE_COLLECTED: 'warning',
  IN_PROGRESS:      'info',
  COMPLETED:        'success',
  CANCELLED:        'destructive',
};

const STATUS_LABEL: Record<LabStatus, string> = {
  PENDING:          'Pending',
  SAMPLE_COLLECTED: 'Sample Collected',
  IN_PROGRESS:      'In Progress',
  COMPLETED:        'Completed',
  CANCELLED:        'Cancelled',
};

const ALLOWED_TRANSITIONS: Partial<Record<LabStatus, LabStatus[]>> = {
  PENDING:          ['SAMPLE_COLLECTED', 'CANCELLED'],
  SAMPLE_COLLECTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS:      ['COMPLETED', 'CANCELLED'],
};

const TRANSITION_LABELS: Partial<Record<LabStatus, string>> = {
  SAMPLE_COLLECTED: 'Mark Sample Collected',
  IN_PROGRESS:      'Mark In Progress',
  COMPLETED:        'Mark Complete',
  CANCELLED:        'Cancel Order',
};

// ── Add results form ─────────────────────────────────────────────────────────

const ResultRowSchema = z.object({
  test_name:     z.string().min(1, 'Required'),
  value:         z.string().min(1, 'Required'),
  unit:          z.string().default(''),
  reference_min: z.string().default(''),
  reference_max: z.string().default(''),
  is_abnormal:   z.boolean().default(false),
});

const AddResultsSchema = z.object({
  rows: z.array(ResultRowSchema).min(1),
});

type ResultRow = z.infer<typeof ResultRowSchema>;

const EMPTY_ROW: ResultRow = {
  test_name: '', value: '', unit: '',
  reference_min: '', reference_max: '', is_abnormal: false,
};

function AddResultsDialog({
  orderId,
  open,
  onOpenChange,
}: { orderId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const addResults = useAddLabResults(orderId);

  const form = useForm<z.infer<typeof AddResultsSchema>>({
    resolver: zodResolver(AddResultsSchema),
    defaultValues: { rows: [{ ...EMPTY_ROW }] },
  });

  const rows = form.watch('rows');

  function addRow() {
    form.setValue('rows', [...rows, { ...EMPTY_ROW }]);
  }

  function removeRow(idx: number) {
    if (rows.length === 1) return;
    form.setValue('rows', rows.filter((_, i) => i !== idx));
  }

  function onSubmit(values: z.infer<typeof AddResultsSchema>) {
    addResults.mutate(
      values.rows.map((r) => ({
        test_name:   r.test_name,
        value:       r.value,
        is_abnormal: r.is_abnormal,
        ...(r.unit          ? { unit:          r.unit }          : {}),
        ...(r.reference_min ? { reference_min: r.reference_min } : {}),
        ...(r.reference_max ? { reference_max: r.reference_max } : {}),
      })),
      {
        onSuccess: () => {
          onOpenChange(false);
          form.reset({ rows: [{ ...EMPTY_ROW }] });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Test Results</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Column headers */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
              <span>Test Name *</span>
              <span>Value *</span>
              <span>Unit</span>
              <span>Ref Min</span>
              <span>Ref Max</span>
              <span className="text-center">Abnormal</span>
              <span />
            </div>

            {rows.map((_, idx) => (
              <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto_auto] gap-2 items-start">
                <FormField control={form.control} name={`rows.${idx}.test_name`} render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormControl><Input placeholder="e.g. WBC" {...field} /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />
                <FormField control={form.control} name={`rows.${idx}.value`} render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormControl><Input placeholder="7.2" {...field} /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />
                <FormField control={form.control} name={`rows.${idx}.unit`} render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormControl><Input placeholder="K/μL" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name={`rows.${idx}.reference_min`} render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormControl><Input placeholder="5.5" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name={`rows.${idx}.reference_max`} render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormControl><Input placeholder="18.5" {...field} /></FormControl>
                  </FormItem>
                )} />
                {/* Abnormal toggle */}
                <div className="flex items-center justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => form.setValue(`rows.${idx}.is_abnormal`, !rows[idx].is_abnormal)}
                    className={`w-9 h-5 rounded-full transition-colors ${
                      rows[idx].is_abnormal ? 'bg-destructive' : 'bg-muted border border-input'
                    }`}
                  >
                    <span className={`block h-3 w-3 rounded-full bg-white shadow transition-transform mx-auto ${
                      rows[idx].is_abnormal ? 'translate-x-2' : '-translate-x-2'
                    }`} />
                  </button>
                </div>
                <Button type="button" variant="ghost" size="sm"
                  className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                  disabled={rows.length === 1}
                  onClick={() => removeRow(idx)}>
                  ×
                </Button>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-3 w-3 mr-1" />
              Add Row
            </Button>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={addResults.isPending}>
                {addResults.isPending ? 'Saving...' : 'Save Results'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Result row component (with abnormal highlighting) ────────────────────────

function ResultTableRow({ result }: { result: LabResult }) {
  const refRange = result.reference_min || result.reference_max
    ? `${result.reference_min ?? '—'} – ${result.reference_max ?? '—'}`
    : '—';

  return (
    <TableRow className={result.is_abnormal ? 'bg-destructive/5' : undefined}>
      <TableCell className="text-sm font-medium">
        <div className="flex items-center gap-2">
          {result.is_abnormal && (
            <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
          )}
          {result.test_name}
        </div>
      </TableCell>
      <TableCell className={`text-sm font-semibold ${result.is_abnormal ? 'text-destructive' : ''}`}>
        {result.value}
        {result.unit && <span className="font-normal text-muted-foreground ml-1">{result.unit}</span>}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{refRange}</TableCell>
      <TableCell>
        {result.is_abnormal ? (
          <Badge variant="destructive" className="text-xs">Abnormal</Badge>
        ) : (
          <Badge variant="success" className="text-xs">Normal</Badge>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
        {format(new Date(result.recorded_at), 'MMM d, h:mm a')}
      </TableCell>
    </TableRow>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function LabOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading } = useLabOrder(id);
  const updateStatus = useUpdateLabOrderStatus(id!);

  const [addResultsOpen, setAddResultsOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-80 rounded-lg" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">Lab order not found.</p>
        <Button variant="link" onClick={() => navigate('/lab')}>Back to Lab</Button>
      </div>
    );
  }

  const nextStatuses = ALLOWED_TRANSITIONS[order.status] ?? [];
  const canAddResults = order.status !== 'COMPLETED' && order.status !== 'CANCELLED';
  const abnormalCount = order.results.filter((r) => r.is_abnormal).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate('/lab')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Lab
        </Button>
        <span className="text-muted-foreground">/</span>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-lg font-semibold">{order.panel_name}</h1>
          <Badge variant={STATUS_BADGE[order.status]}>{STATUS_LABEL[order.status]}</Badge>
          {order.is_external && (
            <Badge variant="outline" className="text-xs">External</Badge>
          )}
          {abnormalCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {abnormalCount} Abnormal
            </Badge>
          )}
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          Ordered {format(new Date(order.ordered_at), 'MMM d, yyyy')}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — results */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FlaskConical className="h-4 w-4" />
                  Test Results
                  {order.results.length > 0 && (
                    <span className="text-muted-foreground font-normal text-sm">
                      ({order.results.length})
                    </span>
                  )}
                </CardTitle>
                {canAddResults && (
                  <Button size="sm" onClick={() => setAddResultsOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Results
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {order.results.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                  No results recorded yet.
                  {canAddResults && ' Click "Add Results" to enter test values.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Test</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Reference Range</TableHead>
                        <TableHead>Flag</TableHead>
                        <TableHead>Recorded</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.results.map((result) => (
                        <ResultTableRow key={result.id} result={result} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right — order info + actions */}
        <div className="space-y-4">
          {/* Order info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Patient</Label>
                <p className="font-medium mt-0.5">{order.pet.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {order.pet.species.toLowerCase()}
                  {order.pet.breed ? ` — ${order.pet.breed}` : ''}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Owner</Label>
                <p className="mt-0.5">
                  {order.pet.owner.first_name} {order.pet.owner.last_name}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Ordered By</Label>
                <p className="mt-0.5">
                  Dr. {order.vet.first_name} {order.vet.last_name}
                </p>
              </div>
              {order.is_external && order.external_lab_name && (
                <div>
                  <Label className="text-xs text-muted-foreground">External Lab</Label>
                  <p className="mt-0.5">{order.external_lab_name}</p>
                </div>
              )}
              {order.notes && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <p className="mt-0.5 text-xs leading-relaxed">{order.notes}</p>
                  </div>
                </>
              )}
              {order.completed_at && (
                <>
                  <Separator />
                  <p className="text-xs text-muted-foreground">
                    Completed {format(new Date(order.completed_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Status actions */}
          {nextStatuses.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {nextStatuses.map((s) => (
                  <Button
                    key={s}
                    variant={s === 'CANCELLED' ? 'outline' : 'default'}
                    size="sm"
                    className={`w-full ${s === 'CANCELLED' ? 'text-destructive border-destructive/40 hover:bg-destructive/10' : ''}`}
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate(s)}
                  >
                    {TRANSITION_LABELS[s] ?? s}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Summary stats */}
          {order.results.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Result Summary</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-muted/50 rounded-md p-2">
                  <p className="text-lg font-semibold">{order.results.length}</p>
                  <p className="text-xs text-muted-foreground">Total Tests</p>
                </div>
                <div className={`rounded-md p-2 ${abnormalCount > 0 ? 'bg-destructive/10' : 'bg-muted/50'}`}>
                  <p className={`text-lg font-semibold ${abnormalCount > 0 ? 'text-destructive' : ''}`}>
                    {abnormalCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Abnormal</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AddResultsDialog
        orderId={id!}
        open={addResultsOpen}
        onOpenChange={setAddResultsOpen}
      />
    </div>
  );
}
