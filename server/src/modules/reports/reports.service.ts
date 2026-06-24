import { prisma } from '../../lib/prisma';

// ── Revenue ──────────────────────────────────────────────────────────────────

export async function getRevenueReport(clinicId: string, startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end   = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Payments grouped by date
  const payments = await prisma.payment.findMany({
    where: {
      received_at: { gte: start, lte: end },
      invoice:     { clinic_id: clinicId },
    },
    select: {
      amount:      true,
      method:      true,
      received_at: true,
    },
    orderBy: { received_at: 'asc' },
  });

  // Aggregate by day
  const byDay = new Map<string, number>();
  let totalRevenue = 0;

  for (const p of payments) {
    const day = p.received_at.toISOString().split('T')[0];
    const amt = Number(p.amount);
    byDay.set(day, (byDay.get(day) ?? 0) + amt);
    totalRevenue += amt;
  }

  const dailySeries = [...byDay.entries()].map(([date, amount]) => ({ date, amount }));

  // By payment method
  const byMethod: Record<string, number> = {};
  for (const p of payments) {
    byMethod[p.method] = (byMethod[p.method] ?? 0) + Number(p.amount);
  }

  // Outstanding invoices
  const outstanding = await prisma.invoice.findMany({
    where: {
      clinic_id: clinicId,
      status: { notIn: ['PAID', 'CANCELLED', 'REFUNDED'] },
    },
    select: { total: true, paid_amount: true, status: true },
  });

  const totalOutstanding = outstanding.reduce(
    (sum, inv) => sum + Math.max(0, Number(inv.total) - Number(inv.paid_amount)),
    0,
  );

  return { totalRevenue, totalOutstanding, dailySeries, byMethod };
}

// ── Appointments ──────────────────────────────────────────────────────────────

export async function getAppointmentsReport(clinicId: string, startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end   = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const appointments = await prisma.appointment.findMany({
    where: {
      clinic_id: clinicId,
      start_at:  { gte: start, lte: end },
    },
    select: { status: true, type: true, start_at: true },
  });

  const total    = appointments.length;
  const byStatus: Record<string, number> = {};
  const byType:   Record<string, number> = {};
  const byDay     = new Map<string, number>();

  for (const a of appointments) {
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    byType[a.type]     = (byType[a.type] ?? 0) + 1;
    const day = a.start_at.toISOString().split('T')[0];
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  const noShowRate      = total > 0 ? ((byStatus['NO_SHOW'] ?? 0) / total) * 100 : 0;
  const cancellationRate = total > 0 ? ((byStatus['CANCELLED'] ?? 0) / total) * 100 : 0;
  const dailySeries = [...byDay.entries()].map(([date, count]) => ({ date, count }));

  return { total, byStatus, byType, noShowRate, cancellationRate, dailySeries };
}

// ── Inventory Usage ───────────────────────────────────────────────────────────

export async function getInventoryUsageReport(clinicId: string, startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end   = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const transactions = await prisma.inventoryTransaction.findMany({
    where: {
      created_at: { gte: start, lte: end },
      type:       'dispensed',
      item:       { clinic_id: clinicId },
    },
    include: {
      item: { select: { id: true, name: true, category: true, unit: true } },
    },
    orderBy: { created_at: 'asc' },
  });

  // Aggregate dispensed quantities by item
  const byItem = new Map<string, { name: string; category: string; unit: string; totalDispensed: number }>();
  for (const t of transactions) {
    const key = t.item.id;
    const existing = byItem.get(key);
    if (existing) {
      existing.totalDispensed += Math.abs(t.quantity);
    } else {
      byItem.set(key, {
        name:            t.item.name,
        category:        t.item.category,
        unit:            t.item.unit,
        totalDispensed:  Math.abs(t.quantity),
      });
    }
  }

  const items = [...byItem.entries()]
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.totalDispensed - a.totalDispensed);

  return { items, totalTransactions: transactions.length };
}

// ── Outstanding Balances ──────────────────────────────────────────────────────

export async function getOutstandingBalances(clinicId: string) {
  const invoices = await prisma.invoice.findMany({
    where: {
      clinic_id: clinicId,
      status:    { notIn: ['PAID', 'CANCELLED', 'REFUNDED'] },
    },
    select: {
      id:          true,
      status:      true,
      total:       true,
      paid_amount: true,
      due_date:    true,
      created_at:  true,
      owner:       { select: { id: true, first_name: true, last_name: true, email: true } },
    },
    orderBy: { due_date: 'asc' },
  });

  const now = new Date();

  const buckets = { current: 0, days30: 0, days60: 0, days90plus: 0 };
  const items = invoices.map((inv) => {
    const balance = Math.max(0, Number(inv.total) - Number(inv.paid_amount));
    const daysOverdue = inv.due_date
      ? Math.max(0, Math.floor((now.getTime() - inv.due_date.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    if (daysOverdue === 0)       buckets.current   += balance;
    else if (daysOverdue <= 30)  buckets.days30    += balance;
    else if (daysOverdue <= 60)  buckets.days60    += balance;
    else                         buckets.days90plus += balance;

    return { ...inv, balance, daysOverdue };
  });

  const totalOutstanding = items.reduce((sum, i) => sum + i.balance, 0);
  return { items, buckets, totalOutstanding };
}
