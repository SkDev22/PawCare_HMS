import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, Search, FileText } from 'lucide-react';
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
import { Skeleton } from '../../components/ui/skeleton';
import { useMedicalRecords } from '../../hooks/use-emr';
import { MedicalRecordForm } from './components/MedicalRecordForm';

const SPECIES_LABEL: Record<string, string> = {
  DOG: 'Dog', CAT: 'Cat', BIRD: 'Bird', RABBIT: 'Rabbit',
  REPTILE: 'Reptile', SMALL_MAMMAL: 'Small Mammal', OTHER: 'Other',
};

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-md" />
      ))}
    </div>
  );
}

export function EmrPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useMedicalRecords({
    ...(search   ? { search }              : {}),
    ...(dateFrom ? { date_from: dateFrom } : {}),
    ...(dateTo   ? { date_to:   dateTo }   : {}),
  });

  const records = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Medical Records</h1>
          <p className="text-sm text-muted-foreground">
            Electronic medical records for all patients
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Record
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Medical Record</DialogTitle>
            </DialogHeader>
            <MedicalRecordForm
              onSuccess={(id) => { setCreateOpen(false); navigate(`/emr/${id}`); }}
              onCancel={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
                placeholder="From"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
                placeholder="To"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            {isLoading ? 'Loading...' : `${records.length} record${records.length !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton />
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No records found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search ? 'Try adjusting your search.' : 'Create a new medical record to get started.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visit Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Chief Complaint</TableHead>
                  <TableHead>Diagnoses</TableHead>
                  <TableHead>Veterinarian</TableHead>
                  <TableHead className="text-right">Rx / Labs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow
                    key={record.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/emr/${record.id}`)}
                  >
                    <TableCell className="whitespace-nowrap font-medium">
                      {format(new Date(record.visit_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{record.pet.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {SPECIES_LABEL[record.pet.species] ?? record.pet.species} ·{' '}
                        {record.pet.owner.first_name} {record.pet.owner.last_name}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {record.chief_complaint ?? '—'}
                    </TableCell>
                    <TableCell>
                      {record.diagnoses.length === 0 ? (
                        <span className="text-xs text-muted-foreground">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {record.diagnoses.slice(0, 2).map((dx) => (
                            <Badge
                              key={dx.id}
                              variant={dx.is_primary ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {dx.name}
                            </Badge>
                          ))}
                          {record.diagnoses.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{record.diagnoses.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      Dr. {record.vet.first_name} {record.vet.last_name}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {record._count.prescriptions > 0 && (
                        <span className="mr-2">{record._count.prescriptions} Rx</span>
                      )}
                      {record._count.lab_results > 0 && (
                        <span>{record._count.lab_results} lab</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
