import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, PawPrint, MoreHorizontal, Eye } from 'lucide-react';
import { usePets } from '@/hooks/use-pets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { speciesIcon, speciesBadgeVariant, calcAge } from '@/lib/patient-utils';
import type { Species, PetStatus } from '@/types/patients';
import { useAuthStore } from '@/stores/auth.store';
import { hasPermission } from '@/lib/permissions';

const SPECIES_OPTIONS: { label: string; value: Species }[] = [
  { label: 'Dog',          value: 'DOG' },
  { label: 'Cat',          value: 'CAT' },
  { label: 'Bird',         value: 'BIRD' },
  { label: 'Rabbit',       value: 'RABBIT' },
  { label: 'Reptile',      value: 'REPTILE' },
  { label: 'Small mammal', value: 'SMALL_MAMMAL' },
  { label: 'Other',        value: 'OTHER' },
];

export function PetsPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = hasPermission(role, 'PATIENT_WRITE');
  const [speciesFilter, setSpeciesFilter] = useState<string>('');
  const [statusFilter, setStatusFilter]   = useState<string>('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = usePets({
    species: speciesFilter as Species || undefined,
    status:  statusFilter as PetStatus || undefined,
  });

  const filtered = search
    ? data?.items.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.breed ?? '').toLowerCase().includes(search.toLowerCase()) ||
        `${p.owner?.first_name} ${p.owner?.last_name}`.toLowerCase().includes(search.toLowerCase()),
      )
    : data?.items;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Patients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All registered pets</p>
        </div>
        {canWrite && (
          <Button onClick={() => navigate('/owners')}>
            <Plus className="w-4 h-4" />
            Add via owner
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 w-64"
            placeholder="Search by name, breed, owner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All species" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All species</SelectItem>
            {SPECIES_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="TRANSFERRED">Transferred</SelectItem>
            <SelectItem value="DECEASED">Deceased</SelectItem>
          </SelectContent>
        </Select>

        {(speciesFilter || statusFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSpeciesFilter(''); setStatusFilter(''); }}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Species / Breed</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[52px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-24" /></div></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell />
                </TableRow>
              ))}

            {!isLoading && filtered?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                  <PawPrint className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No patients found</p>
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              filtered?.map((pet) => (
                <TableRow
                  key={pet.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/patients/${pet.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-sm bg-accent">
                          {speciesIcon(pet.species)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{pet.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {pet.owner ? `${pet.owner.first_name} ${pet.owner.last_name}` : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {calcAge(pet.date_of_birth)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={speciesBadgeVariant(pet.status)}>
                      {pet.status}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/patients/${pet.id}`)}>
                          <Eye className="w-4 h-4 mr-2" /> View record
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
