import { prisma } from '../lib/prisma';
import { getDashboardSummary } from '../modules/dashboard/dashboard.service';
import { notifyRole } from '../modules/notifications/notifications.service';

// Morning summary for ADMIN staff, once per clinic per day.
export async function runDailyDigest(): Promise<void> {
  const clinics = await prisma.clinic.findMany({
    where:  { is_active: true },
    select: { id: true, plan: true, extra_features: true },
  });
  const todayStr = new Date().toISOString().slice(0, 10);

  for (const clinic of clinics) {
    // The digest is an internal ADMIN-only summary, not a plan-gated
    // dashboard tile — always uses the real counts regardless of plan.
    const summary = await getDashboardSummary(clinic.id, clinic.plan, clinic.extra_features);

    const parts = [
      `${summary.stats.todayAppointments.completed}/${summary.stats.todayAppointments.total} appointments completed today.`,
      `${summary.stats.wardOccupancy.occupied}/${summary.stats.wardOccupancy.total} kennels occupied.`,
      summary.alerts.lowStock.length > 0
        ? `${summary.alerts.lowStock.length} item(s) low on stock.`
        : null,
      summary.alerts.abnormalLabResults.length > 0
        ? `${summary.alerts.abnormalLabResults.length} abnormal lab result(s) pending review.`
        : null,
    ].filter((p): p is string => p !== null);

    await notifyRole(prisma, clinic.id, ['ADMIN'], {
      type:         'daily_digest',
      subject:      'Daily Summary',
      body:         parts.join(' '),
      reference_id: `${clinic.id}:${todayStr}`,
    });
  }
}
