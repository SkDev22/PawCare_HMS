import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, BellOff, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../components/ui/pagination";
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  useDeleteReadNotifications,
} from "../../hooks/use-notifications";

const PAGE_SIZE = 30;

// ── Type → display label ──────────────────────────────────────────────────────

function notifTitle(type: string): string {
  const map: Record<string, string> = {
    lab_result_abnormal: "Abnormal Lab Result",
    appointment_reminder: "Appointment Reminder",
    vaccine_due: "Vaccine Due",
    invoice_overdue: "Invoice Overdue",
    low_stock: "Low Stock Alert",
    system: "System Notification",
  };
  return map[type] ?? type.replace(/_/g, " ");
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  // Cursor-based pagination: cursorHistory[i] is the cursor that fetches page
  // i+2 (page 1 has no cursor). pageIndex is 0-based.
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
    setCursorHistory([]);
  }, [unreadOnly]);

  const currentCursor = pageIndex === 0 ? undefined : cursorHistory[pageIndex - 1];

  const { data, isLoading, isFetching } = useNotifications({
    unread_only: unreadOnly,
    ...(currentCursor ? { cursor: currentCursor } : {}),
    limit: PAGE_SIZE,
  });
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const deleteRead = useDeleteReadNotifications();

  const notifications = data?.items ?? [];
  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const hasReadNotifications = notifications.some((n) => n.read_at);

  const goToNextPage = () => {
    if (!data?.hasMore || !data.nextCursor) return;
    setCursorHistory((prev) => {
      const next = [...prev];
      next[pageIndex] = data.nextCursor as string;
      return next;
    });
    setPageIndex((p) => p + 1);
  };

  const goToPreviousPage = () => setPageIndex((p) => Math.max(0, p - 1));

  return (
    <div className="space-y-2 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUnreadOnly(!unreadOnly)}
          >
            {unreadOnly ? "Show All" : "Unread Only"}
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
          {hasReadNotifications && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setClearOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Read
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            {isLoading
              ? "Loading..."
              : `${notifications.length} notification${notifications.length !== 1 ? "s" : ""}`}
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
                {unreadOnly
                  ? "No unread notifications."
                  : "You're all caught up!"}
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
                      isUnread ? "bg-muted/30" : ""
                    }`}
                  >
                    <div className="mt-1 shrink-0">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          isUnread ? "bg-primary/10" : "bg-muted"
                        }`}
                      >
                        <Bell
                          className={`h-4 w-4 ${isUnread ? "text-primary" : "text-muted-foreground"}`}
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">
                            {notifTitle(notif.type)}
                          </p>
                          {isUnread && (
                            <span className="size-2 rounded-full bg-primary shrink-0 mt-1" />
                          )}
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-xs shrink-0 capitalize"
                        >
                          {notif.channel}
                        </Badge>
                      </div>
                      {notif.subject && (
                        <p className="text-sm font-medium text-muted-foreground mt-0.5">
                          {notif.subject}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.body}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notif.created_at), {
                            addSuffix: true,
                          })}
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

      {/* Pagination */}
      {(pageIndex > 0 || (!isLoading && notifications.length > 0)) && (
        <Pagination className="justify-end pt-2">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={goToPreviousPage}
                aria-disabled={pageIndex === 0}
                className={
                  pageIndex === 0
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink isActive>{pageIndex + 1}</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={goToNextPage}
                aria-disabled={!data?.hasMore || isFetching}
                className={
                  !data?.hasMore || isFetching
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Clear read confirmation */}
      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Clear read notifications?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently deletes every notification you've already read.
            Unread notifications are not affected.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setClearOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteRead.isPending}
              onClick={() =>
                deleteRead.mutate(undefined, {
                  onSuccess: () => setClearOpen(false),
                })
              }
            >
              {deleteRead.isPending ? "Clearing..." : "Clear Read"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
