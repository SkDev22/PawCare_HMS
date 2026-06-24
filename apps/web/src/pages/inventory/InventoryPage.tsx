import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Package, Plus, Search, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '../../components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '../../components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useInventoryItems, useInventoryAlerts, useCreateInventoryItem } from '../../hooks/use-inventory';
import { useDebounce } from '../../hooks/use-debounce';
import type { ItemCategory, InventoryItem } from '../../types/inventory';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: Array<{ value: ItemCategory | 'ALL'; label: string }> = [
  { value: 'ALL',              label: 'All' },
  { value: 'MEDICATION',       label: 'Medication' },
  { value: 'VACCINE',          label: 'Vaccine' },
  { value: 'SURGICAL_SUPPLY',  label: 'Surgical' },
  { value: 'DIAGNOSTIC_SUPPLY', label: 'Diagnostic' },
  { value: 'FOOD',             label: 'Food' },
  { value: 'EQUIPMENT',        label: 'Equipment' },
  { value: 'OTHER',            label: 'Other' },
];

const CATEGORY_LABEL: Record<ItemCategory, string> = {
  MEDICATION:        'Medication',
  VACCINE:           'Vaccine',
  SURGICAL_SUPPLY:   'Surgical',
  DIAGNOSTIC_SUPPLY: 'Diagnostic',
  FOOD:              'Food',
  EQUIPMENT:         'Equipment',
  OTHER:             'Other',
};

// ── Create form ───────────────────────────────────────────────────────────────

const CreateSchema = z.object({
  name:              z.string().min(1, 'Name is required').max(200),
  category:          z.enum(['MEDICATION','VACCINE','SURGICAL_SUPPLY','DIAGNOSTIC_SUPPLY','FOOD','EQUIPMENT','OTHER']),
  unit:              z.string().min(1, 'Unit is required').max(50),
  unit_cost:         z.coerce.number().min(0),
  reorder_threshold: z.coerce.number().int().min(0).default(10),
  sku:               z.string().max(100).default(''),
  supplier_name:     z.string().max(200).default(''),
  location:          z.string().max(200).default(''),
  is_controlled:     z.boolean().default(false),
});

function CreateItemForm({ onSuccess, onCancel }: { onSuccess: (item: InventoryItem) => void; onCancel: () => void }) {
  const create = useCreateInventoryItem();

  const form = useForm<z.infer<typeof CreateSchema>>({
    resolver:      zodResolver(CreateSchema),
    defaultValues: {
      name: '', category: 'MEDICATION', unit: '', unit_cost: 0,
      reorder_threshold: 10, sku: '', supplier_name: '', location: '', is_controlled: false,
    },
  });

  function onSubmit(values: z.infer<typeof CreateSchema>) {
    create.mutate(
      {
        name:              values.name,
        category:          values.category,
        unit:              values.unit,
        unit_cost:         values.unit_cost,
        reorder_threshold: values.reorder_threshold,
        ...(values.sku ? { sku: values.sku } : {}),
        ...(values.supplier_name ? { supplier_name: values.supplier_name } : {}),
        ...(values.location ? { location: values.location } : {}),
        is_controlled: values.is_controlled,
      },
      { onSuccess },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Name *</FormLabel>
              <FormControl><Input placeholder="e.g. Amoxicillin 250mg" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem>
              <FormLabel>Category *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CATEGORIES.filter((c) => c.value !== 'ALL').map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="unit" render={({ field }) => (
            <FormItem>
              <FormLabel>Unit *</FormLabel>
              <FormControl><Input placeholder="tablet, ml, box, each" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="unit_cost" render={({ field }) => (
            <FormItem>
              <FormLabel>Unit Cost *</FormLabel>
              <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="reorder_threshold" render={({ field }) => (
            <FormItem>
              <FormLabel>Reorder Threshold</FormLabel>
              <FormControl><Input type="number" min="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="sku" render={({ field }) => (
            <FormItem>
              <FormLabel>SKU</FormLabel>
              <FormControl><Input placeholder="Optional" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="supplier_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Supplier</FormLabel>
              <FormControl><Input placeholder="Optional" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="location" render={({ field }) => (
            <FormItem>
              <FormLabel>Location / Shelf</FormLabel>
              <FormControl><Input placeholder="e.g. Cabinet A, Shelf 2" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => form.setValue('is_controlled', !form.watch('is_controlled'))}
            className={`w-10 h-6 rounded-full transition-colors shrink-0 ${
              form.watch('is_controlled') ? 'bg-destructive' : 'bg-muted border border-input'
            }`}
          >
            <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-auto ${
              form.watch('is_controlled') ? 'translate-x-2' : '-translate-x-2'
            }`} />
          </button>
          <span className="text-sm">Controlled substance</span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating...' : 'Create Item'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ── Stock level badge ─────────────────────────────────────────────────────────

function StockBadge({ qty, threshold }: { qty: number; threshold: number }) {
  if (qty === 0)          return <Badge variant="destructive" className="text-xs">Out of Stock</Badge>;
  if (qty <= threshold)   return <Badge variant="warning" className="text-xs">Low Stock</Badge>;
  return <Badge variant="success" className="text-xs">In Stock</Badge>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function InventoryPage() {
  const navigate  = useNavigate();
  const [tab, setTab]           = useState<ItemCategory | 'ALL'>('ALL');
  const [search, setSearch]     = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const debouncedSearch         = useDebounce(search, 300);

  const { data, isLoading }     = useInventoryItems({
    ...(tab !== 'ALL' ? { category: tab } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  });
  const { data: alerts }        = useInventoryAlerts();

  const items = data?.items ?? [];

  const alertCount =
    (alerts?.low_stock.length ?? 0) + (alerts?.expiring_soon.length ?? 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inventory & Pharmacy</h1>
          <p className="text-sm text-muted-foreground">Manage drugs, supplies, and equipment</p>
        </div>
        <div className="flex gap-2">
          {alertCount > 0 && (
            <Button variant="outline" className="text-orange-600 border-orange-300" onClick={() => navigate('/inventory/alerts')}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              {alertCount} Alert{alertCount !== 1 ? 's' : ''}
            </Button>
          )}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Item</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
              <CreateItemForm
                onSuccess={(item) => { setCreateOpen(false); navigate(`/inventory/${item.id}`); }}
                onCancel={() => setCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search items..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Category tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as ItemCategory | 'ALL')}>
        <TabsList className="flex-wrap h-auto gap-1">
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c.value} value={c.value} className="text-xs">{c.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            {isLoading ? 'Loading...' : `${items.length} item${items.length !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-md" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Package className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No items found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {tab !== 'ALL' ? 'Try a different category.' : 'Add your first inventory item.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-muted-foreground px-6 py-3">Name</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Category</th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-3">Qty on Hand</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Status</th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-3">Unit Cost</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Expiry</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const expiringSoon =
                      item.expiry_date &&
                      new Date(item.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                    return (
                      <tr
                        key={item.id}
                        className="border-b cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/inventory/${item.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium">{item.name}</div>
                          {item.sku && <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>}
                          {item.is_controlled && (
                            <Badge variant="destructive" className="text-xs mt-1">Controlled</Badge>
                          )}
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {CATEGORY_LABEL[item.category]}
                        </td>
                        <td className="px-4 py-4 text-right font-mono">
                          {item.quantity_on_hand} <span className="text-muted-foreground text-xs">{item.unit}</span>
                        </td>
                        <td className="px-4 py-4">
                          <StockBadge qty={item.quantity_on_hand} threshold={item.reorder_threshold} />
                        </td>
                        <td className="px-4 py-4 text-right">
                          ${Number(item.unit_cost).toFixed(2)}
                        </td>
                        <td className="px-4 py-4">
                          {item.expiry_date ? (
                            <div className={`flex items-center gap-1 text-xs ${expiringSoon ? 'text-orange-600' : 'text-muted-foreground'}`}>
                              {expiringSoon && <Clock className="h-3 w-3" />}
                              {format(new Date(item.expiry_date), 'MMM d, yyyy')}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-muted-foreground text-xs">
                          {item.location ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
