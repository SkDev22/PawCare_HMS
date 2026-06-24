import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, BellOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { useNotifications, useMarkRead, useMarkAllRead } from '../../hooks/use-notifications';

// ── Type → display label ──────────────────────────────────────────────────────

function notifTitle(type: string): string {
  const map: Record<string, string> = {
    lab_result_abnormal:    'Abnormal Lab Result',
    appointment_reminder:   'Appointment Reminder',
    vaccine_due:            'Vaccine Due',
    invoice_overdue:        'Invoice Overdue',
    low_stock:              'Low Stock Alert',
    system:                 'System Notification',
  };
  return map[type] ?? type.replace(/_/g, ' ');
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading } = useNotifications({
    unread_only: unreadOnly,
    limit: 50,
  });
  const markRead    = useMarkRead();
  const markAllRead = useMarkAllRead();

  const notifications = data?.items ?? [];
  const unreadCount   = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUnreadOnly(!unreadOnly)}
          >
            {unreadOnly ? 'Show All' : 'Unread Only'}
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            {isLoading ? 'Loading...' : `${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-md" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <BellOff className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground mt-1">
                {unreadOnly ? 'No unread notifications.' : "You're all caught up!"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => {
                const isUnread = !notif.read_at;
                return (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 px-4 py-4 transition-colors ${
                      isUnread ? 'bg-muted/30' : ''
                    }`}
                  >
                    <div className="mt-1 shrink-0">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        isUnread ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <Bell className={`h-4 w-4 ${isUnread ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{notifTitle(notif.type)}</p>
                          {isUnread && (
                            <span className="size-2 rounded-full bg-primary shrink-0 mt-1" />
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0 capitalize">
                          {notif.channel}
                        </Badge>
                      </div>
                      {notif.subject && (
                        <p className="text-sm font-medium text-muted-foreground mt-0.5">{notif.subject}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                        </p>
                        {isUnread && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => markRead.mutate(notif.id)}
                            disabled={markRead.isPending}
                          >
                            Mark read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
