import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, Users, Search } from 'lucide-react';
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
import { useStaffList } from '../../hooks/use-staff';
import { useDebounce } from '../../hooks/use-debounce';
import { StaffForm } from './components/StaffForm';
import type { StaffRole, StaffMember } from '../../types/staff';

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_TABS: Array<{ label: string; value: StaffRole | 'ALL' }> = [
  { label: 'All',            value: 'ALL' },
  { label: 'Admins',         value: 'ADMIN' },
  { label: 'Veterinarians',  value: 'VETERINARIAN' },
  { label: 'Nurses',         value: 'NURSE' },
  { label: 'Receptionists',  value: 'RECEPTIONIST' },
  { label: 'Lab Tech',       value: 'LAB_TECHNICIAN' },
];

const ROLE_LABEL: Record<StaffRole, string> = {
  ADMIN:          'Admin',
  VETERINARIAN:   'Veterinarian',
  NURSE:          'Nurse',
  RECEPTIONIST:   'Receptionist',
  LAB_TECHNICIAN: 'Lab Tech',
};

const ROLE_BADGE: Record<StaffRole, 'destructive' | 'default' | 'secondary' | 'info' | 'outline'> = {
  ADMIN:          'destructive',
  VETERINARIAN:   'default',
  NURSE:          'info',
  RECEPTIONIST:   'secondary',
  LAB_TECHNICIAN: 'outline',
};

function TableSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-md" />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function StaffPage() {
  const navigate = useNavigate();
  const [roleTab,     setRoleTab]     = useState<StaffRole | 'ALL'>('ALL');
  const [search,      setSearch]      = useState('');
  const [createOpen,  setCreateOpen]  = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useStaffList({
    ...(roleTab !== 'ALL'  ? { role:      roleTab }        : {}),
    ...(debouncedSearch    ? { search:    debouncedSearch } : {}),
    ...(showInactive       ? {}                             : { is_active: true }),
  });

  const members = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Staff Management</h1>
          <p className="text-sm text-muted-foreground">Manage clinic staff and schedules</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Staff Member</DialogTitle>
            </DialogHeader>
            <StaffForm
              onSuccess={(member?: StaffMember) => {
                setCreateOpen(false);
                if (member) navigate(`/staff/${member.id}`);
              }}
              onCancel={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Role filter tabs */}
      <Tabs value={roleTab} onValueChange={(v) => setRoleTab(v as StaffRole | 'ALL')}>
        <TabsList className="flex-wrap h-auto gap-1">
          {ROLE_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search + active toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant={showInactive ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowInactive((v) => !v)}
        >
          {showInactive ? 'Showing All' : 'Show Inactive'}
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            {isLoading ? 'Loading...' : `${members.length} member${members.length !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No staff members found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search ? 'Try a different search term.' : 'Add your first staff member above.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Appointments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow
                      key={member.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/staff/${member.id}`)}
                    >
                      <TableCell>
                        <div className="font-medium text-sm">
                          {member.first_name} {member.last_name}
                        </div>
                        {member.phone && (
                          <div className="text-xs text-muted-foreground">{member.phone}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ROLE_BADGE[member.role]} className="text-xs">
                          {ROLE_LABEL[member.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {member.email}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {member.specialization ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.is_active ? 'success' : 'secondary'} className="text-xs">
                          {member.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {member.last_login_at
                          ? format(new Date(member.last_login_at), 'MMM d, yyyy')
                          : 'Never'}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {member._count.appointments}
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
