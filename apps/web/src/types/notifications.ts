export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export type Notification = {
  id:           string;
  owner_id:     string | null;
  staff_id:     string | null;
  type:         string;
  channel:      string;
  subject:      string | null;
  body:         string;
  status:       NotificationStatus;
  scheduled_at: string | null;
  sent_at:      string | null;
  read_at:      string | null;
  error_msg:    string | null;
  created_at:   string;
};

export type PaginatedNotifications = {
  items:      Notification[];
  nextCursor: string | null;
  hasMore:    boolean;
};

export type UnreadCount = {
  count: number;
};
