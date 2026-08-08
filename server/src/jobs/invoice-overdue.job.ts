import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { getOutstandingBalances } from '../modules/reports/reports.service';
import { updateStatus as updateInvoiceStatus } from '../modules/billing/billing.service';
import { notifyRole } from '../modules/notifications/notifications.service';

// Daily check: alerts staff once per clinic per day about invoices that are
// now overdue. Also best-effort transitions SENT invoices past their due_date
// to OVERDUE (the only transition billing.service's state machine allows —
// PARTIALLY_PAID invoices are reported in the alert but left as-is).
export async function runInvoiceOverdueAlert(): Promise<void> {
  const clinics = await prisma.clinic.findMany({ where: { is_active: true }, select: { id: true } });
  const todayStr = new Date().toISOString().slice(0, 10);

  for (const clinic of clinics) {
    const { items } = await getOutstandingBalances(clinic.id);
    const overdue = items.filter((i) => i.daysOverdue > 0);
    if (overdue.length === 0) continue;

    for (const inv of overdue) {
      if (inv.status !== 'SENT') continue;
      try {
        await updateInvoiceStatus(inv.id, clinic.id, 'OVERDUE');
      } catch (err) {
        logger.error('Failed to transition invoice to OVERDUE', { invoiceId: inv.id, err });
      }
    }

    const totalOverdue = overdue.reduce((sum, i) => sum + i.balance, 0);
    await notifyRole(prisma, clinic.id, ['ADMIN', 'RECEPTIONIST'], {
      type:         'invoice_overdue',
      subject:      'Overdue Invoices',
      body:         `${overdue.length} invoice(s) are now overdue, totaling ${totalOverdue.toFixed(2)}.`,
      reference_id: `${clinic.id}:${todayStr}`,
    });
  }
}
