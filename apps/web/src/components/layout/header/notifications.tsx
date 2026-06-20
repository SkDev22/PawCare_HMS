import { BellIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const SAMPLE_NOTIFICATIONS = [
  {
    id: '1',
    title: 'Appointment reminder',
    body: 'Rex (Golden Retriever) — wellness exam at 10:00 AM',
    time: '5 min ago',
    unread: true,
  },
  {
    id: '2',
    title: 'Low stock alert',
    body: 'Amoxicillin 250mg: 3 units remaining (below reorder threshold)',
    time: '1 hr ago',
    unread: true,
  },
  {
    id: '3',
    title: 'Lab results ready',
    body: 'CBC panel for Luna (Domestic Shorthair) is complete',
    time: '2 hr ago',
    unread: false,
  },
];

export function Notifications() {
  const unreadCount = SAMPLE_NOTIFICATIONS.filter((n) => n.unread).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8">
          <BellIcon className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex size-2 rounded-full bg-destructive" />
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} new
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SAMPLE_NOTIFICATIONS.map((n) => (
          <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 py-3">
            <div className="flex w-full items-center gap-2">
              <span className="text-sm font-medium leading-none">{n.title}</span>
              {n.unread && (
                <span className="ml-auto size-2 shrink-0 rounded-full bg-brand-500" />
              )}
            </div>
            <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">{n.body}</p>
            <span className="text-muted-foreground text-xs">{n.time}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center text-xs font-medium">
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
