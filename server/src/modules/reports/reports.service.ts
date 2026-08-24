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

// ── Expiring Items ───────────────────────────────────────────────────────────

export async function getExpiringItems(clinicId: string, days: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  const batches = await prisma.stockBatch.findMany({
    where: {
      item: { clinic_id: clinicId, is_active: true },
      is_closed: false,
      quantity_remaining: { gt: 0 },
      expiry_date: { not: null, lte: cutoff },
    },
    include: {
      item: { select: { id: true, name: true, category: true, sku: true, unit: true, location: true } },
    },
    orderBy: { expiry_date: 'asc' },
  });

  const now = new Date();
  const rows = batches.map((b) => ({
    id:                b.id,
    item_id:           b.item.id,
    name:              b.item.name,
    category:          b.item.category,
    sku:               b.item.sku,
    unit:              b.item.unit,
    location:          b.item.location,
    batch_no:          b.batch_no,
    quantity_remaining: b.quantity_remaining,
    expiry_date:       b.expiry_date,
    isExpired:         b.expiry_date ? b.expiry_date < now : false,
  }));

  return { items: rows, expiredCount: rows.filter((r) => r.isExpired).length };
}

// ── Stock Levels ───────────────────────────────────────────────────────────────

export async function getStockLevels(clinicId: string) {
  const items = await prisma.inventoryItem.findMany({
    where: { clinic_id: clinicId, is_active: true },
    select: {
      id: true, name: true, category: true, sku: true, unit: true,
      quantity_on_hand: true, reorder_threshold: true, location: true,
      batches: {
        where: { is_closed: false, quantity_remaining: { gt: 0 } },
        select: { quantity_remaining: true, unit_cost: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const rows = items.map(({ batches, ...i }) => {
    const stockValue = batches.reduce((sum, b) => sum + Number(b.unit_cost) * b.quantity_remaining, 0);
    return {
      ...i,
      isLow: i.quantity_on_hand <= i.reorder_threshold,
      stockValue,
    };
  });

  return {
    items:           rows,
    lowStockCount:   rows.filter((r) => r.isLow).length,
    totalStockValue: rows.reduce((sum, r) => sum + r.stockValue, 0),
  };
}

// ── Vaccinations Due ────────────────────────────────────────────────────────────

export async function getVaccinationsDue(clinicId: string, days: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  const vaccinations = await prisma.vaccination.findMany({
    where: {
      pet: { deleted_at: null, owner: { clinic_id: clinicId, deleted_at: null } },
    },
    select: {
      id: true, vaccine_name: true, next_due_at: true, administered_at: true,
      pet: {
        select: {
          id: true, name: true, species: true,
          owner: { select: { id: true, first_name: true, last_name: true, phone: true } },
        },
      },
    },
    orderBy: { administered_at: 'desc' },
  });

  // Later doses supersede earlier ones — only the most recent record per
  // pet+vaccine reflects the pet's real due status.
  const latest = new Map<string, (typeof vaccinations)[number]>();
  for (const v of vaccinations) {
    const key = `${v.pet.id}:${v.vaccine_name}`;
    if (!latest.has(key)) latest.set(key, v);
  }

  const now = new Date();
  const items = [...latest.values()]
    .filter((v): v is typeof v & { next_due_at: Date } => v.next_due_at !== null && v.next_due_at <= cutoff)
    .map((v) => ({ ...v, isOverdue: v.next_due_at < now }))
    .sort((a, b) => a.next_due_at.getTime() - b.next_due_at.getTime());

  return { items, overdueCount: items.filter((i) => i.isOverdue).length };
}

// ── Service / Item Sales ────────────────────────────────────────────────────────

export async function getServiceSales(clinicId: string, startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end   = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const lineItems = await prisma.invoiceLineItem.findMany({
    where: {
      invoice: {
        clinic_id:  clinicId,
        status:     { not: 'CANCELLED' },
        created_at: { gte: start, lte: end },
      },
    },
    select: {
      description: true,
      quantity:    true,
      total:       true,
      service: { select: { id: true, name: true, category: true } },
      item:    { select: { id: true, name: true, category: true } },
    },
  });

  const byKey = new Map<
    string,
    { key: string; name: string; category: string; type: 'service' | 'item' | 'other'; quantity: number; revenue: number }
  >();

  for (const li of lineItems) {
    const key = li.service ? `service:${li.service.id}` : li.item ? `item:${li.item.id}` : `other:${li.description}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.quantity += li.quantity;
      existing.revenue  += Number(li.total);
    } else {
      byKey.set(key, {
        key,
        name:     li.service?.name ?? li.item?.name ?? li.description,
        category: li.service?.category ?? li.item?.category ?? 'Other',
        type:     li.service ? 'service' : li.item ? 'item' : 'other',
        quantity: li.quantity,
        revenue:  Number(li.total),
      });
    }
  }

  const items = [...byKey.values()].sort((a, b) => b.revenue - a.revenue);
  return { items, totalRevenue: items.reduce((sum, i) => sum + i.revenue, 0) };
}

// ── Medical Records Summary ─────────────────────────────────────────────────────

export async function getMedicalRecordsSummary(clinicId: string, startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end   = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const records = await prisma.medicalRecord.findMany({
    where: {
      visit_date: { gte: start, lte: end },
      pet: { owner: { clinic_id: clinicId } },
    },
    select: {
      id: true,
      diagnoses: { select: { name: true, is_primary: true } },
      _count:    { select: { prescriptions: true, lab_results: true } },
    },
  });

  const byDiagnosis = new Map<string, number>();
  let primaryDiagnosisCount = 0;
  for (const r of records) {
    for (const dx of r.diagnoses) {
      byDiagnosis.set(dx.name, (byDiagnosis.get(dx.name) ?? 0) + 1);
      if (dx.is_primary) primaryDiagnosisCount++;
    }
  }

  const diagnoses = [...byDiagnosis.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalRecords:         records.length,
    totalPrescriptions:   records.reduce((sum, r) => sum + r._count.prescriptions, 0),
    totalLabResults:      records.reduce((sum, r) => sum + r._count.lab_results, 0),
    primaryDiagnosisCount,
    diagnoses,
  };
}

// ── Doctor Performance ───────────────────────────────────────────────────────────

export async function getDoctorPerformance(clinicId: string, startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end   = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const vets = await prisma.staffUser.findMany({
    where: { clinic_id: clinicId, role: 'VETERINARIAN', deleted_at: null },
    select: { id: true, first_name: true, last_name: true },
  });

  const doctors = await Promise.all(
    vets.map(async (vet) => {
      const [appointmentsCompleted, medicalRecords, charges] = await Promise.all([
        prisma.appointment.count({
          where: { vet_id: vet.id, status: 'COMPLETED', start_at: { gte: start, lte: end } },
        }),
        prisma.medicalRecord.count({
          where: { vet_id: vet.id, visit_date: { gte: start, lte: end } },
        }),
        prisma.medicalRecordCharge.findMany({
          where: { medical_record: { vet_id: vet.id, visit_date: { gte: start, lte: end } } },
          select: { total: true },
        }),
      ]);

      return {
        id:   vet.id,
        name: `${vet.first_name} ${vet.last_name}`,
        appointmentsCompleted,
        medicalRecords,
        revenue: charges.reduce((sum, c) => sum + Number(c.total), 0),
      };
    }),
  );

  doctors.sort((a, b) => b.revenue - a.revenue);
  return { doctors };
}

// ── Patient / Owner Demographics ─────────────────────────────────────────────────

export async function getDemographics(clinicId: string, startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end   = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const [totalOwners, newOwners, totalPets, newPets, speciesGroups, portalEnabledCount, appointmentsInRange] =
    await Promise.all([
      prisma.owner.count({ where: { clinic_id: clinicId, deleted_at: null } }),
      prisma.owner.count({
        where: { clinic_id: clinicId, deleted_at: null, created_at: { gte: start, lte: end } },
      }),
      prisma.pet.count({ where: { deleted_at: null, owner: { clinic_id: clinicId, deleted_at: null } } }),
      prisma.pet.count({
        where: {
          deleted_at: null,
          owner:      { clinic_id: clinicId, deleted_at: null },
          created_at: { gte: start, lte: end },
        },
      }),
      prisma.pet.groupBy({
        by:    ['species'],
        where: { deleted_at: null, owner: { clinic_id: clinicId, deleted_at: null } },
        _count: { _all: true },
      }),
      prisma.owner.count({
        where: { clinic_id: clinicId, deleted_at: null, portal_enabled: true },
      }),
      prisma.appointment.findMany({
        where:    { clinic_id: clinicId, start_at: { gte: start, lte: end } },
        select:   { pet_id: true, pet: { select: { created_at: true } } },
        distinct: ['pet_id'],
      }),
    ]);

  const newPatientsSeen = appointmentsInRange.filter(
    (a) => a.pet.created_at >= start && a.pet.created_at <= end,
  ).length;

  const species = speciesGroups
    .map((g) => ({ species: g.species, count: g._count._all }))
    .sort((a, b) => b.count - a.count);

  return {
    totalOwners, newOwners, totalPets, newPets, portalEnabledCount, species,
    uniquePatientsSeen:    appointmentsInRange.length,
    newPatientsSeen,
    returningPatientsSeen: appointmentsInRange.length - newPatientsSeen,
  };
}

// ── Tax / Financial Summary ──────────────────────────────────────────────────────

export async function getTaxSummary(clinicId: string, startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end   = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const invoices = await prisma.invoice.findMany({
    where: {
      clinic_id:  clinicId,
      status:     { not: 'CANCELLED' },
      created_at: { gte: start, lte: end },
    },
    select: {
      subtotal: true, tax_amount: true, discount_amount: true, total: true, paid_amount: true,
    },
  });

  const totals = invoices.reduce(
    (acc, inv) => {
      acc.subtotal  += Number(inv.subtotal);
      acc.tax       += Number(inv.tax_amount);
      acc.discount  += Number(inv.discount_amount);
      acc.total     += Number(inv.total);
      acc.collected += Number(inv.paid_amount);
      return acc;
    },
    { subtotal: 0, tax: 0, discount: 0, total: 0, collected: 0 },
  );

  return { invoiceCount: invoices.length, ...totals };
}
