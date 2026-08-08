import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { BellIcon } from 'lucide-react';
import { toast } from 'sonner';
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
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead } from '@/hooks/use-notifications';
import { useAuthStore } from '@/stores/auth.store';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import type { Notification } from '@/types/notifications';

function notifTitle(type: string): string {
  const map: Record<string, string> = {
    lab_result_abnormal:           'Abnormal Lab Result',
    appointment_reminder:          'Appointment Reminder',
    appointment_created:           'New Appointment',
    appointment_reassigned:        'Appointment Assigned to You',
    appointment_checked_in:        'Patient Checked In',
    vaccine_due:                   'Vaccine Due',
    invoice_overdue:               'Invoice Overdue',
    payment_recorded:              'Payment Recorded',
    low_stock:                     'Low Stock Alert',
    controlled_substance_dispensed: 'Controlled Substance Dispensed',
    ward_admission:                'Patient Admitted',
    ward_discharge:                'Patient Discharged',
    schedule_changed:              'Schedule Updated',
    daily_digest:                  'Daily Summary',
    system:                        'System',
  };
  return map[type] ?? type.replace(/_/g, ' ');
}

export function Notifications() {
  const navigate    = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const connected    = useRef(false);

  const { data: countData } = useUnreadCount();
  const { data: notifData } = useNotifications({ limit: 8 });
  const markRead            = useMarkRead();
  const markAllRead         = useMarkAllRead();

  const unreadCount   = accessToken ? (countData?.count ?? 0) : 0;
  const notifications = notifData?.items ?? [];

  // Connect once on login, disconnect on logout — not on every token refresh.
  useEffect(() => {
    if (accessToken && !connected.current) {
      connected.current = true;
      const socket = connectSocket(accessToken);
      socket.on('notification:new', (notification: Notification) => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        toast(notification.subject ?? notification.body);
      });
    } else if (!accessToken && connected.current) {
      connected.current = false;
      disconnectSocket();
    }
  }, [accessToken, queryClient]);

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
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{unreadCount} new</Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={(e) => { e.preventDefault(); markAllRead.mutate(); }}
                disabled={markAllRead.isPending}
              >
                Mark all read
              </Button>
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          notifications.map((n) => {
            const isUnread = !n.read_at;
            return (
              <DropdownMenuItem
                key={n.id}
                className="flex flex-col items-start gap-1 py-3 cursor-pointer"
                onClick={() => { if (isUnread) markRead.mutate(n.id); }}
              >
                <div className="flex w-full items-center gap-2">
                  <span className="text-sm font-medium leading-none">{notifTitle(n.type)}</span>
                  {isUnread && (
                    <span className="ml-auto size-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
                {n.subject && (
                  <p className="text-xs text-muted-foreground font-medium">{n.subject}</p>
                )}
                <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">{n.body}</p>
                <span className="text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </span>
              </DropdownMenuItem>
            );
          })
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="justify-center text-xs font-medium"
          onClick={() => navigate('/notifications')}
        >
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
