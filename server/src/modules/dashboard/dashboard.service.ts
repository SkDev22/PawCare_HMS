import { prisma } from '../../lib/prisma';
import { getRevenueReport } from '../reports/reports.service';
import { getAlerts } from '../inventory/inventory.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dayBounds(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);
  return { start, end };
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function monthRange(d: Date) {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return { start, end };
}

function pctTrend(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

const dashboardAppointmentIncludes = {
  pet: {
    select: {
      id: true,
      name: true,
      species: true,
      owner: { select: { id: true, first_name: true, last_name: true } },
    },
  },
} as const;

// ─── Stats ────────────────────────────────────────────────────────────────────

async function getTodayAppointmentsStat(clinicId: string, today: Date, yesterday: Date) {
  const [completed, total, yesterdayTotal] = await Promise.all([
    prisma.appointment.count({
      where: {
        clinic_id: clinicId,
        status: 'COMPLETED',
        start_at: { gte: dayBounds(toDateStr(today)).start, lte: dayBounds(toDateStr(today)).end },
      },
    }),
    prisma.appointment.count({
      where: {
        clinic_id: clinicId,
        start_at: { gte: dayBounds(toDateStr(today)).start, lte: dayBounds(toDateStr(today)).end },
      },
    }),
    prisma.appointment.count({
      where: {
        clinic_id: clinicId,
        start_at: { gte: dayBounds(toDateStr(yesterday)).start, lte: dayBounds(toDateStr(yesterday)).end },
      },
    }),
  ]);

  return {
    total,
    completed,
    remaining: total - completed,
    trend: total - yesterdayTotal,
  };
}

async function getActivePatientsStat(clinicId: string, today: Date) {
  const { start: thisMonthStart } = monthRange(today);
  const lastMonthDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
  const { start: lastMonthStart, end: lastMonthEnd } = monthRange(lastMonthDate);

  const [total, newThisMonth, newLastMonth] = await Promise.all([
    prisma.pet.count({ where: { deleted_at: null, status: 'ACTIVE', owner: { clinic_id: clinicId } } }),
    prisma.pet.count({
      where: {
        deleted_at: null,
        status: 'ACTIVE',
        owner: { clinic_id: clinicId },
        created_at: { gte: thisMonthStart },
      },
    }),
    prisma.pet.count({
      where: {
        deleted_at: null,
        owner: { clinic_id: clinicId },
        created_at: { gte: lastMonthStart, lte: lastMonthEnd },
      },
    }),
  ]);

  return { total, newThisMonth, trend: pctTrend(newThisMonth, newLastMonth) };
}

async function getMonthlyRevenueStat(clinicId: string, today: Date) {
  const { start: thisMonthStart } = monthRange(today);
  const lastMonthDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
  const { start: lastMonthStart, end: lastMonthEnd } = monthRange(lastMonthDate);

  const [current, previous, outstandingCount] = await Promise.all([
    getRevenueReport(clinicId, toDateStr(thisMonthStart), toDateStr(today)),
    getRevenueReport(clinicId, toDateStr(lastMonthStart), toDateStr(lastMonthEnd)),
    prisma.invoice.count({
      where: { clinic_id: clinicId, status: { notIn: ['PAID', 'CANCELLED', 'REFUNDED'] } },
    }),
  ]);

  return {
    amount: current.totalRevenue,
    outstandingInvoicesCount: outstandingCount,
    trend: pctTrend(current.totalRevenue, previous.totalRevenue),
  };
}

async function getWardOccupancyStat(clinicId: string, yesterday: Date) {
  const yesterdayEnd = dayBounds(toDateStr(yesterday)).end;

  const [total, occupied, occupiedYesterday] = await Promise.all([
    prisma.kennelUnit.count({ where: { room: { clinic_id: clinicId } } }),
    prisma.kennelUnit.count({ where: { room: { clinic_id: clinicId }, is_occupied: true } }),
    prisma.hospitalization.count({
      where: {
        kennel: { room: { clinic_id: clinicId } },
        admitted_at: { lte: yesterdayEnd },
        OR: [{ discharged_at: null }, { discharged_at: { gt: yesterdayEnd } }],
      },
    }),
  ]);

  return { occupied, total, trend: occupied - occupiedYesterday };
}

// ─── Monthly visits (6-month trend) ───────────────────────────────────────────

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function getMonthlyVisits(clinicId: string, today: Date) {
  const rangeStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1));

  const appointments = await prisma.appointment.findMany({
    where: {
      clinic_id: clinicId,
      status: 'COMPLETED',
      start_at: { gte: rangeStart },
    },
    select: { start_at: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    buckets.set(`${d.getUTCFullYear()}-${d.getUTCMonth()}`, 0);
  }
  for (const a of appointments) {
    const key = `${a.start_at.getUTCFullYear()}-${a.start_at.getUTCMonth()}`;
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return [...buckets.entries()].map(([key, visits]) => {
    const month = Number(key.split('-')[1]);
    return { month: MONTH_LABELS[month], visits };
  });
}

// ─── Species distribution ─────────────────────────────────────────────────────

async function getSpeciesDistribution(clinicId: string) {
  const groups = await prisma.pet.groupBy({
    by: ['species'],
    where: { deleted_at: null, status: 'ACTIVE', owner: { clinic_id: clinicId } },
    _count: true,
  });

  const total = groups.reduce((sum, g) => sum + g._count, 0);
  if (total === 0) return [];

  return groups
    .map((g) => ({ name: g.species, value: Math.round((g._count / total) * 100) }))
    .sort((a, b) => b.value - a.value);
}

// ─── Today's appointments list ────────────────────────────────────────────────

async function getTodaysAppointmentsList(clinicId: string, today: Date) {
  const { start, end } = dayBounds(toDateStr(today));

  return prisma.appointment.findMany({
    where: { clinic_id: clinicId, start_at: { gte: start, lte: end } },
    include: dashboardAppointmentIncludes,
    orderBy: { start_at: 'asc' },
    take: 8,
  });
}

// ─── Ward status list ─────────────────────────────────────────────────────────

async function getWardStatusList(clinicId: string) {
  return prisma.hospitalization.findMany({
    where: { discharged_at: null, kennel: { room: { clinic_id: clinicId } } },
    include: {
      pet: { select: { id: true, name: true, species: true } },
      kennel: { select: { id: true, label: true } },
    },
    orderBy: { admitted_at: 'desc' },
    take: 5,
  });
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

async function getAbnormalLabResults(clinicId: string) {
  return prisma.labResult.findMany({
    where: { is_abnormal: true, lab_order: { pet: { owner: { clinic_id: clinicId } } } },
    include: { lab_order: { include: { pet: { select: { id: true, name: true } } } } },
    orderBy: { recorded_at: 'desc' },
    take: 3,
  });
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export async function getDashboardSummary(clinicId: string, date?: string) {
  const today = date ? new Date(`${date}T00:00:00.000Z`) : new Date(`${toDateStr(new Date())}T00:00:00.000Z`);
  const yesterday = addDays(today, -1);

  const [
    todayAppointments,
    activePatients,
    monthlyRevenue,
    wardOccupancy,
    monthlyVisits,
    speciesDistribution,
    todaysAppointments,
    wardStatus,
    inventoryAlerts,
    abnormalLabResults,
  ] = await Promise.all([
    getTodayAppointmentsStat(clinicId, today, yesterday),
    getActivePatientsStat(clinicId, today),
    getMonthlyRevenueStat(clinicId, today),
    getWardOccupancyStat(clinicId, yesterday),
    getMonthlyVisits(clinicId, today),
    getSpeciesDistribution(clinicId),
    getTodaysAppointmentsList(clinicId, today),
    getWardStatusList(clinicId),
    getAlerts(clinicId),
    getAbnormalLabResults(clinicId),
  ]);

  return {
    stats: { todayAppointments, activePatients, monthlyRevenue, wardOccupancy },
    monthlyVisits,
    speciesDistribution,
    todaysAppointments,
    wardStatus,
    alerts: {
      lowStock: inventoryAlerts.low_stock.slice(0, 3),
      abnormalLabResults,
    },
  };
}
