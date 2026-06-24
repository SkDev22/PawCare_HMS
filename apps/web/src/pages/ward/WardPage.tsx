import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { BedDouble, Plus, Search } from 'lucide-react';
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
import { Textarea } from '../../components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useKennels, useHospitalizations, useAdmitPet } from '../../hooks/use-ward';
import { usePets } from '../../hooks/use-pets';
import { useDebounce } from '../../hooks/use-debounce';
import type { KennelUnit } from '../../types/ward';

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
  const availableKennels     = (allKennels ?? []).filter((k) => !k.is_occupied);

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

function KennelCard({
  kennel,
  onClick,
}: { kennel: KennelUnit; onClick: () => void }) {
  const hosp = kennel.active_hospitalization;
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        kennel.is_occupied ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/20' : 'hover:border-primary'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-semibold text-sm">{kennel.label}</p>
            <p className="text-xs text-muted-foreground">{kennel.room.name}</p>
          </div>
          <Badge variant={kennel.is_occupied ? 'warning' : 'secondary'} className="text-xs">
            {kennel.is_occupied ? 'Occupied' : 'Available'}
          </Badge>
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
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function WardPage() {
  const navigate = useNavigate();
  const [tab, setTab]             = useState<'kennels' | 'list'>('kennels');
  const [admitOpen, setAdmitOpen] = useState(false);
  const [selectedKennel, setSelectedKennel] = useState<KennelUnit | null>(null);
  const [activeOnly, setActiveOnly] = useState(true);

  const { data: kennels, isLoading: kennelsLoading }   = useKennels();
  const { data: hospsData, isLoading: hospsLoading }   = useHospitalizations({
    active_only: activeOnly,
  });

  const occupied   = (kennels ?? []).filter((k) => k.is_occupied).length;
  const available  = (kennels ?? []).filter((k) => !k.is_occupied).length;
  const hosps      = hospsData?.items ?? [];

  function handleKennelClick(kennel: KennelUnit) {
    if (kennel.is_occupied && kennel.active_hospitalization) {
      navigate(`/ward/${kennel.active_hospitalization.id}`);
    } else {
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Kennels</p>
            <p className="text-2xl font-bold">{(kennels ?? []).length}</p>
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
            <p className="text-sm text-muted-foreground">Available</p>
            <p className="text-2xl font-bold text-green-600">{available}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'kennels' | 'list')}>
        <TabsList>
          <TabsTrigger value="kennels">Kennel Grid</TabsTrigger>
          <TabsTrigger value="list">Hospitalization List</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Kennel Grid */}
      {tab === 'kennels' && (
        kennelsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-lg" />
            ))}
          </div>
        ) : (kennels ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BedDouble className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No kennels configured</p>
            <p className="text-xs text-muted-foreground mt-1">Add ward rooms and kennels in Settings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {(kennels ?? []).map((k) => (
              <KennelCard key={k.id} kennel={k} onClick={() => handleKennelClick(k)} />
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
