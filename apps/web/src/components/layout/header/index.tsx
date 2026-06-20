import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { SearchCommand } from './search';
import { Notifications } from './notifications';
import { ThemeSwitch } from './theme-switch';

export function SiteHeader() {
  return (
    <header className="bg-background sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      <div className="flex flex-1 items-center gap-2">
        <SearchCommand />
      </div>

      <div className="flex items-center gap-1">
        <Notifications />
        <ThemeSwitch />
      </div>
    </header>
  );
}
