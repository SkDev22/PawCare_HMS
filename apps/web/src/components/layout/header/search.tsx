import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchIcon, CalendarDays, PawPrint, Users, FileText, LayoutDashboard } from 'lucide-react';
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

const PAGES = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Appointments', href: '/appointments', icon: CalendarDays },
  { title: 'Owners', href: '/owners', icon: Users },
  { title: 'Pets / Patients', href: '/patients', icon: PawPrint },
  { title: 'Medical Records', href: '/emr', icon: FileText },
];

export function SearchCommand() {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();

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

  const run = (href: string) => {
    setOpen(false);
    navigate(href);
  };

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

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages, patients, appointments..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {PAGES.map(({ title, href, icon: Icon }) => (
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
        </CommandList>
      </CommandDialog>
    </>
  );
}
