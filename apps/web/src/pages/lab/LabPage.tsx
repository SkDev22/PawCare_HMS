import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, FlaskConical, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '../../components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Skeleton } from '../../components/ui/skeleton';
import { useLabOrders, useCreateLabOrder } from '../../hooks/use-lab';
import { usePets } from '../../hooks/use-pets';
import { useDebounce } from '../../hooks/use-debounce';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '../../components/ui/form';
import { Textarea } from '../../components/ui/textarea';
import type { LabStatus, LabOrder } from '../../types/lab';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_TABS: Array<{ label: string; value: LabStatus | 'ALL' }> = [
  { label: 'All',         value: 'ALL' },
  { label: 'Pending',     value: 'PENDING' },
  { label: 'Collected',   value: 'SAMPLE_COLLECTED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed',   value: 'COMPLETED' },
  { label: 'Cancelled',   value: 'CANCELLED' },
];

const STATUS_BADGE: Record<LabStatus, 'secondary' | 'warning' | 'info' | 'success' | 'destructive'> = {
  PENDING:          'secondary',
  SAMPLE_COLLECTED: 'warning',
  IN_PROGRESS:      'info',
  COMPLETED:        'success',
  CANCELLED:        'destructive',
};

const STATUS_LABEL: Record<LabStatus, string> = {
  PENDING:          'Pending',
  SAMPLE_COLLECTED: 'Collected',
  IN_PROGRESS:      'In Progress',
  COMPLETED:        'Completed',
  CANCELLED:        'Cancelled',
};

// ── Create order form ─────────────────────────────────────────────────────────

const CreateSchema = z.object({
  panel_name:        z.string().min(1, 'Panel name is required').max(200),
  pet_id:            z.string().uuid('Select a valid patient'),
  is_external:       z.boolean().default(false),
  external_lab_name: z.string().default(''),
  notes:             z.string().default(''),
});

function CreateLabOrderForm({
  onSuccess,
  onCancel,
}: { onSuccess: (order: LabOrder) => void; onCancel: () => void }) {
  const [petSearch, setPetSearch] = useState('');
  const [selectedPetName, setSelectedPetName] = useState('');
  const debouncedPetSearch = useDebounce(petSearch, 300);

  const { data: petsData } = usePets({ search: debouncedPetSearch, limit: 8 });
  const createOrder = useCreateLabOrder();
  const pets = petsData?.items ?? [];

  const form = useForm<z.infer<typeof CreateSchema>>({
    resolver: zodResolver(CreateSchema),
    defaultValues: {
      panel_name: '', pet_id: '', is_external: false,
      external_lab_name: '', notes: '',
    },
  });

  const isExternal = form.watch('is_external');
  const petId      = form.watch('pet_id');

  function onSubmit(values: z.infer<typeof CreateSchema>) {
    createOrder.mutate(
      {
        pet_id:     values.pet_id,
        panel_name: values.panel_name,
        ...(values.is_external                    ? { is_external:       true }                          : {}),
        ...(values.is_external && values.external_lab_name ? { external_lab_name: values.external_lab_name } : {}),
        ...(values.notes ? { notes: values.notes } : {}),
      },
      { onSuccess },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Patient search */}
        <div className="space-y-1">
          <FormLabel>Patient *</FormLabel>
          {petId && selectedPetName ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm">
                {selectedPetName}
              </div>
              <Button type="button" variant="ghost" size="sm"
                onClick={() => { form.setValue('pet_id', ''); setSelectedPetName(''); }}>
                Change
              </Button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patient by name..."
                  className="pl-9"
                  value={petSearch}
                  onChange={(e) => setPetSearch(e.target.value)}
                />
              </div>
              {form.formState.errors.pet_id && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.pet_id.message}</p>
              )}
              {petSearch.length > 1 && pets.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                  {pets.map((p) => (
                    <button key={p.id} type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 first:rounded-t-md last:rounded-b-md"
                      onClick={() => {
                        form.setValue('pet_id', p.id, { shouldValidate: true });
                        setSelectedPetName(`${p.name} (${p.owner?.last_name ?? ''})`);
                        setPetSearch('');
                      }}>
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs capitalize">{p.species.toLowerCase()}</span>
                      {p.owner && <span className="text-muted-foreground ml-2 text-xs">— {p.owner.last_name}</span>}
                    </button>
                  ))}
                </div>
              )}
              {petSearch.length > 1 && pets.length === 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
                  No patients found
                </div>
              )}
            </div>
          )}
        </div>

        <FormField control={form.control} name="panel_name" render={({ field }) => (
          <FormItem>
            <FormLabel>Panel / Test Name *</FormLabel>
            <FormControl>
              <Input placeholder="e.g. CBC, Thyroid Panel, Urinalysis" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* External lab toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => form.setValue('is_external', !isExternal)}
            className={`w-10 h-6 rounded-full transition-colors shrink-0 ${
              isExternal ? 'bg-primary' : 'bg-muted border border-input'
            }`}
          >
            <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-auto ${
              isExternal ? 'translate-x-2' : '-translate-x-2'
            }`} />
          </button>
          <span className="text-sm">External lab</span>
        </div>

        {isExternal && (
          <FormField control={form.control} name="external_lab_name" render={({ field }) => (
            <FormItem>
              <FormLabel>External Lab Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. IDEXX, Antech" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Textarea placeholder="Clinical context, special instructions..." rows={2} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={createOrder.isPending}>
            {createOrder.isPending ? 'Creating...' : 'Create Order'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-md" />
      ))}
    </div>
  );
}

export function LabPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<LabStatus | 'ALL'>('ALL');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useLabOrders({
    ...(tab !== 'ALL' ? { status: tab } : {}),
  });

  const orders = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Laboratory</h1>
          <p className="text-sm text-muted-foreground">Manage lab orders and test results</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Lab Order
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Lab Order</DialogTitle>
            </DialogHeader>
            <CreateLabOrderForm
              onSuccess={(order) => { setCreateOpen(false); navigate(`/lab/${order.id}`); }}
              onCancel={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as LabStatus | 'ALL')}>
        <TabsList className="flex-wrap h-auto gap-1">
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs">{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            {isLoading ? 'Loading...' : `${orders.length} order${orders.length !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FlaskConical className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No lab orders found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {tab !== 'ALL' ? 'Try a different status filter.' : 'Create a new lab order to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Panel</TableHead>
                    <TableHead>Ordered By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Results</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/lab/${order.id}`)}
                    >
                      <TableCell>
                        <div className="font-medium text-sm">{order.pet.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {order.pet.species.toLowerCase()} — {order.pet.owner.last_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{order.panel_name}</div>
                        {order.is_external && order.external_lab_name && (
                          <div className="text-xs text-muted-foreground">
                            External: {order.external_lab_name}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        Dr. {order.vet.last_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE[order.status]} className="text-xs">
                          {STATUS_LABEL[order.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(order.ordered_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {order._count.results}
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
  );
}
