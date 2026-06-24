import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Package, TrendingDown, TrendingUp, MinusCircle, XCircle, Plus } from 'lucide-react';
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
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useInventoryItem, useLogTransaction, useUpdateInventoryItem } from '../../hooks/use-inventory';
import type { TransactionType } from '../../types/inventory';

// ── Transaction type display ──────────────────────────────────────────────────

const TX_ICONS: Record<TransactionType, React.ComponentType<{ className?: string }>> = {
  purchase:   TrendingUp,
  dispensed:  TrendingDown,
  adjustment: MinusCircle,
  expired:    XCircle,
};

const TX_COLORS: Record<TransactionType, string> = {
  purchase:   'text-green-600',
  dispensed:  'text-red-600',
  adjustment: 'text-blue-600',
  expired:    'text-orange-600',
};

const TX_LABEL: Record<TransactionType, string> = {
  purchase:   'Purchase',
  dispensed:  'Dispensed',
  adjustment: 'Adjustment',
  expired:    'Expired',
};

// ── Log transaction dialog ────────────────────────────────────────────────────

const TxSchema = z.object({
  type:         z.enum(['purchase', 'dispensed', 'adjustment', 'expired']),
  quantity:     z.coerce.number().int().refine((n) => n !== 0, 'Cannot be zero'),
  reference_id: z.string().max(200).default(''),
  notes:        z.string().max(500).default(''),
});

function LogTransactionDialog({
  itemId,
  unit,
  open,
  onOpenChange,
}: { itemId: string; unit: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const logTx = useLogTransaction(itemId);

  const form = useForm<z.infer<typeof TxSchema>>({
    resolver:      zodResolver(TxSchema),
    defaultValues: { type: 'purchase', quantity: 1, reference_id: '', notes: '' },
  });

  const txType = form.watch('type');
  const isOut  = txType === 'dispensed' || txType === 'expired';

  function onSubmit(values: z.infer<typeof TxSchema>) {
    const qty = isOut ? -Math.abs(values.quantity) : Math.abs(values.quantity);
    logTx.mutate(
      {
        type:     values.type as TransactionType,
        quantity: qty,
        ...(values.reference_id ? { reference_id: values.reference_id } : {}),
        ...(values.notes ? { notes: values.notes } : {}),
      },
      { onSuccess: () => { onOpenChange(false); form.reset(); } },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Transaction</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>Type *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="purchase">Purchase (stock in)</SelectItem>
                    <SelectItem value="dispensed">Dispensed (stock out)</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                    <SelectItem value="expired">Expired (write-off)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="quantity" render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity ({unit}) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Enter amount"
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  {isOut ? 'Will be subtracted from stock' : 'Will be added to stock'}
                </p>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="reference_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Reference (PO #, Prescription ID)</FormLabel>
                <FormControl><Input placeholder="Optional" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea placeholder="Optional notes..." rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={logTx.isPending}>
                {logTx.isPending ? 'Saving...' : 'Log Transaction'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function InventoryDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [txOpen, setTxOpen] = useState(false);

  const { data: item, isLoading } = useInventoryItem(id);
  const updateItem = useUpdateInventoryItem(id ?? '');

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Item not found.</p>
        <Button variant="link" onClick={() => navigate('/inventory')}>Back to Inventory</Button>
      </div>
    );
  }

  const isLowStock = item.quantity_on_hand <= item.reorder_threshold;
  const expiringSoon =
    item.expiry_date &&
    new Date(item.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/inventory')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold">{item.name}</h1>
            {item.is_controlled && <Badge variant="destructive" className="text-xs">Controlled</Badge>}
            {!item.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {item.category.replace(/_/g, ' ')} · {item.unit}
            {item.sku ? ` · SKU: ${item.sku}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {item.is_active && (
            <Button onClick={() => setTxOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Log Transaction
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              updateItem.mutate({ is_active: !item.is_active })
            }
          >
            {item.is_active ? 'Deactivate' : 'Reactivate'}
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className={isLowStock ? 'border-orange-300' : ''}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Qty on Hand</p>
            <p className={`text-2xl font-bold ${isLowStock ? 'text-orange-600' : ''}`}>
              {item.quantity_on_hand}
            </p>
            <p className="text-xs text-muted-foreground">{item.unit}</p>
            {isLowStock && <p className="text-xs text-orange-600 mt-1">Below reorder threshold</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Reorder At</p>
            <p className="text-2xl font-bold">{item.reorder_threshold}</p>
            <p className="text-xs text-muted-foreground">{item.unit}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Unit Cost</p>
            <p className="text-2xl font-bold">${Number(item.unit_cost).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className={expiringSoon ? 'border-orange-300' : ''}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Expiry Date</p>
            {item.expiry_date ? (
              <>
                <p className={`text-sm font-bold mt-1 ${expiringSoon ? 'text-orange-600' : ''}`}>
                  {format(new Date(item.expiry_date), 'MMM d, yyyy')}
                </p>
                {expiringSoon && <p className="text-xs text-orange-600 mt-1">Expiring soon</p>}
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details + Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: item details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" /> Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {item.supplier_name && (
              <div>
                <p className="text-xs text-muted-foreground">Supplier</p>
                <p>{item.supplier_name}</p>
                {item.supplier_sku && <p className="text-xs text-muted-foreground">SKU: {item.supplier_sku}</p>}
              </div>
            )}
            {item.location && (
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p>{item.location}</p>
              </div>
            )}
            {item.selling_price && (
              <div>
                <p className="text-xs text-muted-foreground">Selling Price</p>
                <p>${Number(item.selling_price).toFixed(2)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Added</p>
              <p>{format(new Date(item.created_at), 'MMM d, yyyy')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Right: transaction history */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Recent Transactions ({item.transactions.length})
              </CardTitle>
              {item.is_active && (
                <Button size="sm" variant="outline" onClick={() => setTxOpen(true)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Log
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {item.transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Package className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No transactions yet</p>
                </div>
              ) : (
                <div className="divide-y max-h-[480px] overflow-y-auto">
                  {item.transactions.map((tx) => {
                    const Icon  = TX_ICONS[tx.type as TransactionType] ?? MinusCircle;
                    const color = TX_COLORS[tx.type as TransactionType] ?? '';
                    const isOut = tx.quantity < 0;

                    return (
                      <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                        <div className={`shrink-0 ${color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{TX_LABEL[tx.type as TransactionType]}</span>
                            {tx.reference_id && (
                              <span className="text-xs text-muted-foreground">#{tx.reference_id}</span>
                            )}
                          </div>
                          {tx.notes && <p className="text-xs text-muted-foreground">{tx.notes}</p>}
                          {tx.performed_by_staff && (
                            <p className="text-xs text-muted-foreground">
                              By {tx.performed_by_staff.first_name} {tx.performed_by_staff.last_name}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(tx.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                        <div className={`text-sm font-semibold shrink-0 ${color}`}>
                          {isOut ? '' : '+'}{tx.quantity} {item.unit}
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

      {id && (
        <LogTransactionDialog
          itemId={id}
          unit={item.unit}
          open={txOpen}
          onOpenChange={setTxOpen}
        />
      )}
    </div>
  );
}
