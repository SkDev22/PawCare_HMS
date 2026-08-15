import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SearchIcon,
  CalendarDays,
  PawPrint,
  Users,
  FileText,
  LayoutDashboard,
  UserCog,
  Receipt,
  Package,
  FlaskConical,
  BedDouble,
  ListChecks,
  Settings,
  User,
  Bell,
  ClipboardList,
  BarChart3,
  Loader2,
} from 'lucide-react';
import type { PermissionKey } from '@pawcare/shared';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useDebounce } from '@/hooks/use-debounce';
import { useGlobalSearch } from '@/hooks/use-global-search';
import { useAuthStore } from '@/stores/auth.store';
import { hasPermission } from '@/lib/permissions';

const DEFAULT_PAGES_HREFS = new Set(['/dashboard', '/appointments', '/owners', '/patients', '/emr']);

// Every navigable page/module, so typing a module name like "Ward" or
// "Settings" always resolves instantly — this is a plain client-side array,
// no network round trip, so it never contributes to search latency.
const ALL_PAGES: Array<{
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: PermissionKey;
}> = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'DASHBOARD_READ' },
  { title: 'Appointments', href: '/appointments', icon: CalendarDays, permission: 'APPOINTMENT_READ' },
  { title: 'Appointment Queue', href: '/appointments/queue', icon: ListChecks, permission: 'APPOINTMENT_READ' },
  { title: 'Owners', href: '/owners', icon: Users, permission: 'PATIENT_READ' },
  { title: 'Pets / Patients', href: '/patients', icon: PawPrint, permission: 'PATIENT_READ' },
  { title: 'Register Patient', href: '/patients/register', icon: PawPrint, permission: 'PATIENT_WRITE' },
  { title: 'Medical Records', href: '/emr', icon: FileText, permission: 'MEDICAL_RECORD_READ' },
  { title: 'Medical History', href: '/emr/history', icon: ClipboardList, permission: 'MEDICAL_RECORD_READ' },
  { title: 'Billing', href: '/billing', icon: Receipt, permission: 'INVOICE_READ' },
  { title: 'Staff', href: '/staff', icon: UserCog, permission: 'STAFF_READ' },
  { title: 'Laboratory', href: '/lab', icon: FlaskConical, permission: 'LAB_ORDER_WRITE' },
  { title: 'Ward', href: '/ward', icon: BedDouble, permission: 'WARD_READ' },
  { title: 'Inventory', href: '/inventory', icon: Package, permission: 'INVENTORY_READ' },
  { title: 'Reports', href: '/reports', icon: BarChart3, permission: 'REPORT_READ' },
  { title: 'Notifications', href: '/notifications', icon: Bell },
  { title: 'Settings', href: '/settings', icon: Settings },
  { title: 'Profile', href: '/profile', icon: User },
];

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  owners: Users,
  pets: PawPrint,
  appointments: CalendarDays,
  medical_records: FileText,
  staff: UserCog,
  invoices: Receipt,
  inventory: Package,
  lab_orders: FlaskConical,
  ward: BedDouble,
};

const MIN_QUERY_LENGTH = 2;

export function SearchCommand() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  // A slightly longer debounce than a typical input trades a little responsiveness
  // for fewer round trips to the database — see the "why is search slow" note below.
  const debouncedQuery = useDebounce(query, 300);
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);

  const trimmed = query.trim();
  const isSearching = trimmed.length > 0;

  const pageMatches = React.useMemo(() => {
    if (!isSearching) return [];
    const q = trimmed.toLowerCase();
    return ALL_PAGES.filter(
      (p) => (!p.permission || hasPermission(role, p.permission)) && p.title.toLowerCase().includes(q),
    );
  }, [isSearching, trimmed, role]);

  // Data search only fires past MIN_QUERY_LENGTH and once the debounce settles —
  // a single keystroke would otherwise fan out to every permitted category.
  const dataQuery = debouncedQuery.trim().length >= MIN_QUERY_LENGTH ? debouncedQuery.trim() : '';
  const { data, isFetching } = useGlobalSearch(dataQuery);
  const groups = data?.groups ?? [];

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  React.useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const run = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  const showDataLoading = isSearching && trimmed.length >= MIN_QUERY_LENGTH && isFetching && groups.length === 0;
  const showNoResults =
    isSearching &&
    pageMatches.length === 0 &&
    groups.length === 0 &&
    !(trimmed.length >= MIN_QUERY_LENGTH && isFetching);

  return (
    <>
      <Button
        variant="outline"
        className="text-muted-foreground relative h-8 w-full justify-start rounded-lg bg-muted/50 px-3 text-sm font-normal shadow-none sm:w-52 md:w-64"
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="mr-2 size-4" />
        Search&hellip;
        <kbd className="bg-muted pointer-events-none ml-auto hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium select-none sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search anything — pages, owners, patients, appointments, staff, invoices..."
        />
        <CommandList>
          {!isSearching && (
            <>
              <CommandGroup heading="Navigation">
                {ALL_PAGES.filter((p) => DEFAULT_PAGES_HREFS.has(p.href)).map(({ title, href, icon: Icon }) => (
                  <CommandItem key={href} onSelect={() => run(href)}>
                    <Icon className="mr-2 size-4" />
                    {title}
                    <CommandShortcut>Go</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Quick Actions">
                <CommandItem onSelect={() => run('/owners')}>
                  <Users className="mr-2 size-4" />
                  Add New Owner
                </CommandItem>
                <CommandItem onSelect={() => run('/patients')}>
                  <PawPrint className="mr-2 size-4" />
                  Add New Patient
                </CommandItem>
              </CommandGroup>
            </>
          )}

          {isSearching && pageMatches.length > 0 && (
            <CommandGroup heading="Pages">
              {pageMatches.map(({ title, href, icon: Icon }) => (
                <CommandItem key={href} value={href} onSelect={() => run(href)}>
                  <Icon className="mr-2 size-4" />
                  {title}
                  <CommandShortcut>Go</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {showDataLoading && (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Searching&hellip;
            </div>
          )}

          {showNoResults && <CommandEmpty>No results found for "{trimmed}".</CommandEmpty>}

          {isSearching &&
            groups.map((group) => {
              const Icon = CATEGORY_ICONS[group.key] ?? FileText;
              return (
                <React.Fragment key={group.key}>
                  <CommandSeparator />
                  <CommandGroup heading={group.label}>
                    {group.items.map((item) => (
                      <CommandItem key={item.id} value={item.id} onSelect={() => run(item.href)}>
                        <Icon className="mr-2 size-4" />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate">{item.title}</span>
                          <span className="text-muted-foreground truncate text-xs">{item.subtitle}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </React.Fragment>
              );
            })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
