import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ArrowLeft, Plus, Trash2, CreditCard, Printer } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Separator } from '../../components/ui/separator';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '../../components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  useInvoice, useServices, useAddLineItem, useRemoveLineItem,
  useRecordPayment, useUpdateInvoiceStatus,
} from '../../hooks/use-billing';
import { formatCurrency } from '../../lib/currency';
import type { InvoiceStatus, PaymentMethod, LineItem, Service } from '../../types/billing';

// ── Status helpers ──────────────────────────────────────────────────────────

const STATUS_BADGE: Record<InvoiceStatus, 'secondary' | 'info' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  DRAFT:          'secondary',
  SENT:           'info',
  PAID:           'success',
  PARTIALLY_PAID: 'warning',
  OVERDUE:        'destructive',
  CANCELLED:      'secondary',
  REFUNDED:       'outline',
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  DRAFT:          'Draft',
  SENT:           'Sent',
  PAID:           'Paid',
  PARTIALLY_PAID: 'Partial',
  OVERDUE:        'Overdue',
  CANCELLED:      'Cancelled',
  REFUNDED:       'Refunded',
};

const ALLOWED_TRANSITIONS: Partial<Record<InvoiceStatus, InvoiceStatus[]>> = {
  DRAFT:          ['SENT', 'CANCELLED'],
  SENT:           ['PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'],
  PARTIALLY_PAID: ['PAID', 'OVERDUE', 'CANCELLED'],
  OVERDUE:        ['PAID', 'CANCELLED'],
  PAID:           ['REFUNDED'],
};

const TRANSITION_LABELS: Partial<Record<InvoiceStatus, string>> = {
  SENT:           'Mark as Sent',
  PAID:           'Mark as Paid',
  PARTIALLY_PAID: 'Mark Partial',
  OVERDUE:        'Mark Overdue',
  CANCELLED:      'Cancel Invoice',
  REFUNDED:       'Issue Refund',
};

// ── Schemas ─────────────────────────────────────────────────────────────────

const AddLineItemSchema = z.object({
  service_id:  z.string().default(''),
  description: z.string().min(1, 'Description is required').max(500),
  quantity:    z.coerce.number().int().positive().default(1),
  unit_price:  z.coerce.number().min(0, 'Price must be non-negative'),
});

const RecordPaymentSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  method: z.enum(['cash', 'card', 'insurance', 'bank_transfer']),
  notes:  z.string().default(''),
});

// ── Sub-components ───────────────────────────────────────────────────────────

function AddLineItemDialog({
  invoiceId,
  open,
  onOpenChange,
}: { invoiceId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: services = [] } = useServices();
  const addLineItem = useAddLineItem(invoiceId);

  const form = useForm<z.infer<typeof AddLineItemSchema>>({
    resolver: zodResolver(AddLineItemSchema),
    defaultValues: { service_id: '', description: '', quantity: 1, unit_price: 0 },
  });

  function handleServiceChange(serviceId: string, allServices: Service[]) {
    const svc = allServices.find((s) => s.id === serviceId);
    if (svc) {
      form.setValue('description', svc.name);
      form.setValue('unit_price', parseFloat(svc.price));
    }
    form.setValue('service_id', serviceId);
  }

  function onSubmit(values: z.infer<typeof AddLineItemSchema>) {
    addLineItem.mutate(
      {
        ...(values.service_id ? { service_id: values.service_id } : {}),
        description: values.description,
        quantity:    values.quantity,
        unit_price:  values.unit_price,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          form.reset({ service_id: '', description: '', quantity: 1, unit_price: 0 });
        },
      },
    );
  }

  const qty   = form.watch('quantity');
  const price = form.watch('unit_price');
  const total = (qty || 0) * (price || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Line Item</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Service picker */}
            <FormItem>
              <FormLabel>Service (optional)</FormLabel>
              <Select onValueChange={(v) => handleServiceChange(v, services)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a service..." />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {formatCurrency(s.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Input placeholder="Service or item description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qty</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" step="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Price (LKR)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {total > 0 && (
              <p className="text-sm text-muted-foreground text-right">
                Line total: <span className="font-medium text-foreground">{formatCurrency(total)}</span>
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addLineItem.isPending}>
                {addLineItem.isPending ? 'Adding...' : 'Add Item'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function RecordPaymentDialog({
  invoiceId,
  balanceDue,
  open,
  onOpenChange,
}: { invoiceId: string; balanceDue: number; open: boolean; onOpenChange: (v: boolean) => void }) {
  const recordPayment = useRecordPayment(invoiceId);

  const form = useForm<z.infer<typeof RecordPaymentSchema>>({
    resolver: zodResolver(RecordPaymentSchema),
    defaultValues: { amount: Math.max(0, balanceDue), method: 'cash', notes: '' },
  });

  function onSubmit(values: z.infer<typeof RecordPaymentSchema>) {
    recordPayment.mutate(
      {
        amount: values.amount,
        method: values.method as PaymentMethod,
        ...(values.notes ? { notes: values.notes } : {}),
      },
      { onSuccess: () => { onOpenChange(false); form.reset(); } },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Balance due: <span className="font-semibold text-foreground">{formatCurrency(balanceDue)}</span>
            </p>

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (LKR) *</FormLabel>
                  <FormControl>
                    <Input type="number" min="0.01" step="0.01" max={balanceDue > 0 ? balanceDue : undefined} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Optional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={recordPayment.isPending}>
                {recordPayment.isPending ? 'Recording...' : 'Record Payment'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: invoice, isLoading } = useInvoice(id);
  const updateStatus = useUpdateInvoiceStatus(id!);
  const removeLineItem = useRemoveLineItem(id!);

  const [addLineOpen,  setAddLineOpen]  = useState(false);
  const [paymentOpen,  setPaymentOpen]  = useState(false);
  const [removeTarget, setRemoveTarget] = useState<LineItem | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">Invoice not found.</p>
        <Button variant="link" onClick={() => navigate('/billing')}>Back to Billing</Button>
      </div>
    );
  }

  const subtotal  = parseFloat(invoice.subtotal);
  const tax       = parseFloat(invoice.tax_amount);
  const discount  = parseFloat(invoice.discount_amount);
  const total     = parseFloat(invoice.total);
  const paid      = parseFloat(invoice.paid_amount);
  const balance   = total - paid;

  const canEdit = invoice.status === 'DRAFT';
  const nextStatuses = ALLOWED_TRANSITIONS[invoice.status] ?? [];

  const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    cash:          'Cash',
    card:          'Card',
    insurance:     'Insurance',
    bank_transfer: 'Bank Transfer',
  };

  return (
    <div className="space-y-6">
      {/* Print-only letterhead */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold">PawCare HMS</h1>
        <p className="text-sm">Invoice #{invoice.id.slice(0, 8).toUpperCase()} · {STATUS_LABEL[invoice.status]}</p>
        <p className="text-sm text-muted-foreground">
          Issued {format(new Date(invoice.created_at), 'MMM d, yyyy')}
        </p>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate('/billing')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Billing
        </Button>
        <span className="text-muted-foreground">/</span>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold font-mono">
            #{invoice.id.slice(0, 8).toUpperCase()}
          </h1>
          <Badge variant={STATUS_BADGE[invoice.status]}>
            {STATUS_LABEL[invoice.status]}
          </Badge>
        </div>
        <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
          Created {format(new Date(invoice.created_at), 'MMM d, yyyy')}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:grid-cols-1">
        {/* Left — line items + payments */}
        <div className="lg:col-span-2 space-y-6">

          {/* Line items */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Line Items</CardTitle>
                {canEdit && (
                  <Button size="sm" variant="outline" className="print:hidden" onClick={() => setAddLineOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {invoice.line_items.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                  No line items yet. {canEdit && 'Add services or items above.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right w-20">Qty</TableHead>
                        <TableHead className="text-right w-28">Unit Price</TableHead>
                        <TableHead className="text-right w-28">Total</TableHead>
                        {canEdit && <TableHead className="w-10 print:hidden" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.line_items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="text-sm">{item.description}</div>
                            {item.service && (
                              <div className="text-xs text-muted-foreground capitalize">
                                {item.service.category}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(item.unit_price)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {formatCurrency(item.total)}
                          </TableCell>
                          {canEdit && (
                            <TableCell className="print:hidden">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => setRemoveTarget(item)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payments history */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Payments</CardTitle>
                {balance > 0.001 && invoice.status !== 'CANCELLED' && invoice.status !== 'REFUNDED' && (
                  <Button size="sm" className="print:hidden" onClick={() => setPaymentOpen(true)}>
                    <CreditCard className="h-4 w-4 mr-1" />
                    Record Payment
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {invoice.payments.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No payments recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(p.received_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-sm capitalize">
                            {PAYMENT_METHOD_LABELS[p.method]}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {p.notes ?? '—'}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium text-emerald-600">
                            {formatCurrency(p.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right — summary + actions + client */}
        <div className="space-y-4">

          {/* Financial summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>−{formatCurrency(discount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Paid</span>
                <span>{formatCurrency(paid)}</span>
              </div>
              <div className={`flex justify-between font-bold ${balance > 0.001 ? 'text-destructive' : 'text-emerald-600'}`}>
                <span>Balance Due</span>
                <span>{formatCurrency(balance)}</span>
              </div>
              {invoice.due_date && (
                <p className="text-xs text-muted-foreground pt-1">
                  Due {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Status actions */}
          {nextStatuses.length > 0 && (
            <Card className="print:hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {nextStatuses.map((s) => (
                  <Button
                    key={s}
                    variant={s === 'CANCELLED' || s === 'REFUNDED' ? 'outline' : 'default'}
                    size="sm"
                    className="w-full"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate(s)}
                  >
                    {TRANSITION_LABELS[s] ?? s}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Client info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">
                {invoice.owner.first_name} {invoice.owner.last_name}
              </p>
              {invoice.owner.email && (
                <p className="text-muted-foreground">{invoice.owner.email}</p>
              )}
              <p className="text-muted-foreground">{invoice.owner.phone}</p>
              {invoice.owner.address && (
                <p className="text-muted-foreground text-xs mt-1">{invoice.owner.address}</p>
              )}
            </CardContent>
          </Card>

          {/* Linked appointment */}
          {invoice.appointment && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Appointment</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="capitalize">{invoice.appointment.type.replace(/_/g, ' ').toLowerCase()}</p>
                <p className="text-muted-foreground">
                  {format(new Date(invoice.appointment.start_at), 'MMM d, yyyy h:mm a')}
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto text-xs print:hidden"
                  onClick={() => navigate(`/appointments/${invoice.appointment!.id}`)}
                >
                  View appointment →
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <AddLineItemDialog
        invoiceId={id!}
        open={addLineOpen}
        onOpenChange={setAddLineOpen}
      />

      <RecordPaymentDialog
        invoiceId={id!}
        balanceDue={balance}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
      />

      {/* Remove line item confirmation */}
      <Dialog open={!!removeTarget} onOpenChange={(open: boolean) => { if (!open) setRemoveTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove line item?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            "{removeTarget?.description}" will be removed and the invoice total will update.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={removeLineItem.isPending}
              onClick={() => {
                if (removeTarget) {
                  removeLineItem.mutate(removeTarget.id, { onSuccess: () => setRemoveTarget(null) });
                }
              }}
            >
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
