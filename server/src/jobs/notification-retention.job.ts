import { logger } from '../lib/logger';
import { purgeOldReadNotifications } from '../modules/notifications/notifications.service';

// Keeps the notifications table bounded. Only ever deletes notifications the
// recipient already read — unread ones are left alone indefinitely, since an
// old unread alert usually means something was never actually handled.
export async function runNotificationRetention(): Promise<void> {
  const { deleted } = await purgeOldReadNotifications();
  if (deleted > 0) {
    logger.info('Purged old read notifications', { deleted });
  }
}
