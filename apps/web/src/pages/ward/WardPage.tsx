import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { BedDouble, Plus, Search, Settings2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
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
import { Textarea } from '../../components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useKennels, useHospitalizations, useAdmitPet, useCreateKennel, useUpdateKennelStatus,
} from '../../hooks/use-ward';
import { useRooms, useCreateRoom } from '../../hooks/use-appointments';
import { usePets } from '../../hooks/use-pets';
import { useDebounce } from '../../hooks/use-debounce';
import { useAuthStore } from '../../stores/auth.store';
import { hasPermission } from '../../lib/permissions';
import type { KennelUnit, KennelStatus } from '../../types/ward';

// ── Admit form ────────────────────────────────────────────────────────────────

const AdmitSchema = z.object({
  pet_id:               z.string().uuid('Select a patient'),
  kennel_id:            z.string().uuid('Select a kennel'),
  reason:               z.string().min(1, 'Reason is required').max(1000),
  estimated_stay_days:  z.coerce.number().int().positive().optional(),
});

function AdmitForm({
  kennel,
  onSuccess,
  onCancel,
}: { kennel?: KennelUnit | null; onSuccess: () => void; onCancel: () => void }) {
  const [petSearch, setPetSearch]       = useState('');
  const [selectedPetName, setSelectedPetName] = useState('');
  const [selectedKennel, setSelectedKennel]   = useState<KennelUnit | null>(kennel ?? null);
  const debouncedSearch = useDebounce(petSearch, 300);

  const { data: petsData }   = usePets({ search: debouncedSearch, limit: 8 });
  const { data: allKennels } = useKennels();
  const admitPet             = useAdmitPet();
  const pets                 = petsData?.items ?? [];
  const availableKennels     = (allKennels ?? []).filter((k) => k.status === 'AVAILABLE');

  const form = useForm<z.infer<typeof AdmitSchema>>({
    resolver: zodResolver(AdmitSchema),
    defaultValues: {
      pet_id:    '',
      kennel_id: kennel?.id ?? '',
      reason:    '',
    },
  });

  const petId    = form.watch('pet_id');
  const kennelId = form.watch('kennel_id');

  function onSubmit(values: z.infer<typeof AdmitSchema>) {
    admitPet.mutate(
      {
        pet_id:    values.pet_id,
        kennel_id: values.kennel_id,
        reason:    values.reason,
        ...(values.estimated_stay_days ? { estimated_stay_days: values.estimated_stay_days } : {}),
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patient..."
                className="pl-9"
                value={petSearch}
                onChange={(e) => setPetSearch(e.target.value)}
              />
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
                      <span className="text-muted-foreground ml-2 text-xs capitalize">
                        {p.species.toLowerCase()}
                      </span>
                      {p.owner && <span className="text-muted-foreground ml-2 text-xs">— {p.owner.last_name}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Kennel select */}
        <FormField control={form.control} name="kennel_id" render={({ field }) => (
          <FormItem>
            <FormLabel>Kennel *</FormLabel>
            {selectedKennel ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm">
                  {selectedKennel.label} — {selectedKennel.room.name} ({selectedKennel.size})
                </div>
                {!kennel && (
                  <Button type="button" variant="ghost" size="sm"
                    onClick={() => { setSelectedKennel(null); field.onChange(''); }}>
                    Change
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {availableKennels.length === 0 ? (
                  <p className="col-span-2 text-sm text-muted-foreground text-center py-4">No available kennels</p>
                ) : availableKennels.map((k) => (
                  <button key={k.id} type="button"
                    className={`rounded border px-3 py-2 text-left text-xs hover:bg-muted/50 ${kennelId === k.id ? 'border-primary bg-primary/5' : ''}`}
                    onClick={() => { setSelectedKennel(k); field.onChange(k.id); }}>
                    <div className="font-medium">{k.label}</div>
                    <div className="text-muted-foreground">{k.room.name} · {k.size}</div>
                  </button>
                ))}
              </div>
            )}
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="reason" render={({ field }) => (
          <FormItem>
            <FormLabel>Reason for Admission *</FormLabel>
            <FormControl>
              <Textarea placeholder="Clinical reason for admission..." rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="estimated_stay_days" render={({ field }) => (
          <FormItem>
            <FormLabel>Estimated Stay (days)</FormLabel>
            <FormControl>
              <Input type="number" min={1} placeholder="Optional" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={admitPet.isPending}>
            {admitPet.isPending ? 'Admitting...' : 'Admit Patient'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ── Kennel grid ───────────────────────────────────────────────────────────────

const SIZE_LABEL: Record<string, string> = { small: 'Small', medium: 'Medium', large: 'Large' };

const STATUS_META: Record<KennelStatus, {
  label:     string;
  badge:     'success' | 'warning' | 'info' | 'destructive';
  cardClass: string;
}> = {
  AVAILABLE:      { label: 'Available',      badge: 'success',     cardClass: 'hover:border-primary' },
  OCCUPIED:       { label: 'Occupied',       badge: 'warning',     cardClass: 'border-orange-300 bg-orange-50 dark:bg-orange-950/20' },
  CLEANING:       { label: 'Cleaning',       badge: 'info',        cardClass: 'border-blue-300 bg-blue-50 dark:bg-blue-950/20' },
  OUT_OF_SERVICE: { label: 'Out of Service', badge: 'destructive', cardClass: 'border-red-300 bg-red-50 dark:bg-red-950/20 opacity-80' },
};

function KennelCard({
  kennel,
  canWrite,
  onClick,
  onMarkAvailable,
  onMarkOutOfService,
}: {
  kennel:             KennelUnit;
  canWrite:           boolean;
  onClick:            () => void;
  onMarkAvailable:    () => void;
  onMarkOutOfService: () => void;
}) {
  const hosp      = kennel.active_hospitalization;
  const meta      = STATUS_META[kennel.status];
  const clickable = kennel.status === 'AVAILABLE' || kennel.status === 'OCCUPIED';

  return (
    <Card
      className={`transition-all hover:shadow-md ${meta.cardClass} ${clickable ? 'cursor-pointer' : ''}`}
      onClick={clickable ? onClick : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-semibold text-sm">{kennel.label}</p>
            <p className="text-xs text-muted-foreground">{kennel.room.name}</p>
          </div>
          <Badge variant={meta.badge} className="text-xs">{meta.label}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-2">{SIZE_LABEL[kennel.size] ?? kennel.size}</p>
        {hosp && (
          <div className="mt-2 pt-2 border-t space-y-0.5">
            <p className="text-sm font-medium">{hosp.pet.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{hosp.pet.species.toLowerCase()}</p>
            <p className="text-xs text-muted-foreground">
              Since {format(new Date(hosp.admitted_at), 'MMM d')}
            </p>
          </div>
        )}
        {canWrite && (kennel.status === 'CLEANING' || kennel.status === 'OUT_OF_SERVICE') && (
          <Button
            type="button" size="sm" variant="outline" className="w-full mt-3"
            onClick={(e) => { e.stopPropagation(); onMarkAvailable(); }}
          >
            Mark Available
          </Button>
        )}
        {canWrite && kennel.status === 'AVAILABLE' && (
          <Button
            type="button" size="sm" variant="ghost" className="w-full mt-3 text-xs text-muted-foreground"
            onClick={(e) => { e.stopPropagation(); onMarkOutOfService(); }}
          >
            Mark Out of Service
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Manage kennels (rooms + kennels setup) ──────────────────────────────────────

const AddRoomSchema = z.object({
  name: z.string().min(1, 'Room name is required').max(100),
});

const AddKennelSchema = z.object({
  room_id: z.string().uuid('Select a room'),
  label:   z.string().min(1, 'Label is required').max(50),
  size:    z.enum(['small', 'medium', 'large']),
  notes:   z.string().max(500).optional(),
});

function ManageKennelsDialog({
  open,
  onOpenChange,
}: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const role               = useAuthStore((s) => s.user?.role);
  const canManageRooms     = hasPermission(role, 'APPOINTMENT_WRITE');
  const canManageKennels   = hasPermission(role, 'WARD_WRITE');

  const { data: rooms }   = useRooms();
  const { data: kennels } = useKennels();
  const createRoom        = useCreateRoom();
  const createKennel      = useCreateKennel();
  const wardRooms         = (rooms ?? []).filter((r) => r.type === 'ward');

  const roomForm = useForm<z.infer<typeof AddRoomSchema>>({
    resolver: zodResolver(AddRoomSchema),
    defaultValues: { name: '' },
  });

  const kennelForm = useForm<z.infer<typeof AddKennelSchema>>({
    resolver: zodResolver(AddKennelSchema),
    defaultValues: { room_id: '', label: '', size: 'small', notes: '' },
  });

  function onCreateRoom(values: z.infer<typeof AddRoomSchema>) {
    createRoom.mutate({ name: values.name, type: 'ward' }, {
      onSuccess: () => roomForm.reset({ name: '' }),
    });
  }

  function onCreateKennel(values: z.infer<typeof AddKennelSchema>) {
    createKennel.mutate(
      {
        room_id: values.room_id,
        label:   values.label,
        size:    values.size,
        ...(values.notes ? { notes: values.notes } : {}),
      },
      { onSuccess: () => kennelForm.reset({ room_id: values.room_id, label: '', size: values.size, notes: '' }) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Kennels</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          {canManageRooms && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Add Ward Room</p>
              <Form {...roomForm}>
                <form onSubmit={roomForm.handleSubmit(onCreateRoom)} className="flex items-start gap-2">
                  <FormField control={roomForm.control} name="name" render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input placeholder="e.g. Ward C" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" size="sm" disabled={createRoom.isPending}>Add</Button>
                </form>
              </Form>
            </div>
          )}

          {canManageKennels && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Add Kennel</p>
              {wardRooms.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add a ward room first.</p>
              ) : (
                <Form {...kennelForm}>
                  <form onSubmit={kennelForm.handleSubmit(onCreateKennel)} className="space-y-2">
                    <FormField control={kennelForm.control} name="room_id" render={({ field }) => (
                      <FormItem>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select room" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {wardRooms.map((r) => (
                              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="flex gap-2">
                      <FormField control={kennelForm.control} name="label" render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder="Label e.g. K-07" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={kennelForm.control} name="size" render={({ field }) => (
                        <FormItem>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="small">Small</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="large">Large</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>
                    <Button type="submit" size="sm" disabled={createKennel.isPending}>
                      Add Kennel
                    </Button>
                  </form>
                </Form>
              )}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Existing Kennels ({(kennels ?? []).length})</p>
            <div className="max-h-40 overflow-y-auto border rounded-md divide-y">
              {(kennels ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground p-3">None yet.</p>
              ) : (kennels ?? []).map((k) => (
                <div key={k.id} className="flex justify-between px-3 py-2 text-xs">
                  <span>{k.label} · {k.room.name}</span>
                  <span className="text-muted-foreground">{STATUS_META[k.status].label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function WardPage() {
  const navigate = useNavigate();
  const role     = useAuthStore((s) => s.user?.role);
  const canWriteKennels = hasPermission(role, 'WARD_WRITE');

  const [tab, setTab]             = useState<'kennels' | 'list'>('kennels');
  const [admitOpen, setAdmitOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedKennel, setSelectedKennel] = useState<KennelUnit | null>(null);
  const [activeOnly, setActiveOnly] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | KennelStatus>('ALL');

  const { data: kennels, isLoading: kennelsLoading }   = useKennels();
  const { data: hospsData, isLoading: hospsLoading }   = useHospitalizations({
    active_only: activeOnly,
  });
  const updateKennelStatus = useUpdateKennelStatus();

  const allKennels      = kennels ?? [];
  const filteredKennels = statusFilter === 'ALL'
    ? allKennels
    : allKennels.filter((k) => k.status === statusFilter);

  const occupied  = allKennels.filter((k) => k.status === 'OCCUPIED').length;
  const available = allKennels.filter((k) => k.status === 'AVAILABLE').length;
  const cleaning  = allKennels.filter((k) => k.status === 'CLEANING').length;
  const hosps     = hospsData?.items ?? [];

  function handleKennelClick(kennel: KennelUnit) {
    if (kennel.status === 'OCCUPIED' && kennel.active_hospitalization) {
      navigate(`/ward/${kennel.active_hospitalization.id}`);
    } else if (kennel.status === 'AVAILABLE') {
      setSelectedKennel(kennel);
      setAdmitOpen(true);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ward & Hospitalization</h1>
          <p className="text-sm text-muted-foreground">Kennel occupancy and inpatient care</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setManageOpen(true)}>
            <Settings2 className="h-4 w-4 mr-2" />
            Manage Kennels
          </Button>
          <Dialog open={admitOpen} onOpenChange={(open: boolean) => {
            setAdmitOpen(open);
            if (!open) setSelectedKennel(null);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedKennel(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Admit Patient
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Admit Patient</DialogTitle>
              </DialogHeader>
              <AdmitForm
                kennel={selectedKennel}
                onSuccess={() => setAdmitOpen(false)}
                onCancel={() => setAdmitOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <ManageKennelsDialog open={manageOpen} onOpenChange={setManageOpen} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Kennels</p>
            <p className="text-2xl font-bold">{allKennels.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Available</p>
            <p className="text-2xl font-bold text-green-600">{available}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Occupied</p>
            <p className="text-2xl font-bold text-orange-600">{occupied}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Cleaning</p>
            <p className="text-2xl font-bold text-blue-600">{cleaning}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'kennels' | 'list')}>
          <TabsList>
            <TabsTrigger value="kennels">Kennel Grid</TabsTrigger>
            <TabsTrigger value="list">Hospitalization List</TabsTrigger>
          </TabsList>
        </Tabs>
        {tab === 'kennels' && (
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'ALL' | KennelStatus)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="AVAILABLE">Available</SelectItem>
              <SelectItem value="OCCUPIED">Occupied</SelectItem>
              <SelectItem value="CLEANING">Cleaning</SelectItem>
              <SelectItem value="OUT_OF_SERVICE">Out of Service</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Kennel Grid */}
      {tab === 'kennels' && (
        kennelsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-lg" />
            ))}
          </div>
        ) : allKennels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BedDouble className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No kennels configured</p>
            <p className="text-xs text-muted-foreground mt-1">Use "Manage Kennels" above to add ward rooms and kennels.</p>
          </div>
        ) : filteredKennels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BedDouble className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No kennels match this filter</p>
            <p className="text-xs text-muted-foreground mt-1">Try a different status filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredKennels.map((k) => (
              <KennelCard
                key={k.id}
                kennel={k}
                canWrite={canWriteKennels}
                onClick={() => handleKennelClick(k)}
                onMarkAvailable={() => updateKennelStatus.mutate({ id: k.id, status: 'AVAILABLE' })}
                onMarkOutOfService={() => updateKennelStatus.mutate({ id: k.id, status: 'OUT_OF_SERVICE' })}
              />
            ))}
          </div>
        )
      )}

      {/* Hospitalization List */}
      {tab === 'list' && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">
              {hospsLoading ? 'Loading...' : `${hosps.length} patient${hosps.length !== 1 ? 's' : ''}`}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveOnly(!activeOnly)}
            >
              {activeOnly ? 'Show All' : 'Active Only'}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {hospsLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-md" />
                ))}
              </div>
            ) : hosps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <BedDouble className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No hospitalized patients</p>
              </div>
            ) : (
              <div className="divide-y">
                {hosps.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/ward/${h.id}`)}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{h.pet.name}</p>
                        <span className="text-xs text-muted-foreground capitalize">
                          {h.pet.species.toLowerCase()}
                        </span>
                        {!h.discharged_at && (
                          <Badge variant="warning" className="text-xs">Inpatient</Badge>
                        )}
                        {h.discharged_at && (
                          <Badge variant="secondary" className="text-xs">Discharged</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {h.kennel.label} · {h.kennel.room.name} · {h.pet.owner.last_name}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-xs text-muted-foreground">
                        Admitted {format(new Date(h.admitted_at), 'MMM d, yyyy')}
                      </p>
                      {h.discharged_at && (
                        <p className="text-xs text-muted-foreground">
                          Discharged {format(new Date(h.discharged_at), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
