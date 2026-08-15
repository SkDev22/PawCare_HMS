import { prisma } from '../../lib/prisma';
import { PERMISSIONS, PermissionKey } from '@pawcare/shared';

export type SearchCategoryKey =
  | 'owners'
  | 'pets'
  | 'appointments'
  | 'medical_records'
  | 'staff'
  | 'invoices'
  | 'inventory'
  | 'lab_orders'
  | 'ward';

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export interface SearchGroup {
  key: SearchCategoryKey;
  label: string;
  items: SearchResultItem[];
}

function contains(q: string) {
  return { contains: q, mode: 'insensitive' as const };
}

async function searchOwners(clinicId: string, q: string, limit: number): Promise<SearchGroup> {
  const owners = await prisma.owner.findMany({
    where: {
      clinic_id: clinicId,
      deleted_at: null,
      OR: [
        { first_name: contains(q) },
        { last_name: contains(q) },
        { email: contains(q) },
        { phone: contains(q) },
      ],
    },
    orderBy: { created_at: 'desc' },
    take: limit,
  });

  return {
    key: 'owners',
    label: 'Owners',
    items: owners.map((o) => ({
      id: o.id,
      title: `${o.first_name} ${o.last_name}`,
      subtitle: o.phone,
      href: `/owners/${o.id}`,
    })),
  };
}

async function searchPets(clinicId: string, q: string, limit: number): Promise<SearchGroup> {
  const pets = await prisma.pet.findMany({
    where: {
      deleted_at: null,
      owner: { clinic_id: clinicId, deleted_at: null },
      OR: [{ name: contains(q) }, { breed: contains(q) }, { color: contains(q) }],
    },
    include: { owner: { select: { first_name: true, last_name: true } } },
    orderBy: { created_at: 'desc' },
    take: limit,
  });

  return {
    key: 'pets',
    label: 'Patients',
    items: pets.map((p) => ({
      id: p.id,
      title: p.name,
      subtitle: `${p.breed ?? p.species} · ${p.owner.first_name} ${p.owner.last_name}`,
      href: `/patients/${p.id}`,
    })),
  };
}

async function searchAppointments(clinicId: string, q: string, limit: number): Promise<SearchGroup> {
  const appointments = await prisma.appointment.findMany({
    where: {
      clinic_id: clinicId,
      OR: [
        { reason: contains(q) },
        { pet: { name: contains(q) } },
        { pet: { owner: { first_name: contains(q) } } },
        { pet: { owner: { last_name: contains(q) } } },
      ],
    },
    include: { pet: { select: { name: true } } },
    orderBy: { start_at: 'desc' },
    take: limit,
  });

  return {
    key: 'appointments',
    label: 'Appointments',
    items: appointments.map((a) => ({
      id: a.id,
      title: `${a.pet.name} — ${a.type.replaceAll('_', ' ')}`,
      subtitle: `${a.status} · ${new Date(a.start_at).toLocaleDateString()}`,
      href: `/appointments/${a.id}`,
    })),
  };
}

async function searchMedicalRecords(clinicId: string, q: string, limit: number): Promise<SearchGroup> {
  const records = await prisma.medicalRecord.findMany({
    where: {
      pet: { owner: { clinic_id: clinicId } },
      OR: [{ chief_complaint: contains(q) }, { pet: { name: contains(q) } }],
    },
    include: { pet: { select: { name: true } } },
    orderBy: { visit_date: 'desc' },
    take: limit,
  });

  return {
    key: 'medical_records',
    label: 'Medical Records',
    items: records.map((r) => ({
      id: r.id,
      title: r.pet.name,
      subtitle: r.chief_complaint ?? new Date(r.visit_date).toLocaleDateString(),
      href: `/emr/${r.id}`,
    })),
  };
}

async function searchStaff(clinicId: string, q: string, limit: number): Promise<SearchGroup> {
  const staff = await prisma.staffUser.findMany({
    where: {
      clinic_id: clinicId,
      deleted_at: null,
      OR: [
        { first_name: contains(q) },
        { last_name: contains(q) },
        { email: contains(q) },
        { specialization: contains(q) },
      ],
    },
    orderBy: { created_at: 'desc' },
    take: limit,
  });

  return {
    key: 'staff',
    label: 'Staff',
    items: staff.map((s) => ({
      id: s.id,
      title: `${s.first_name} ${s.last_name}`,
      subtitle: s.role.replaceAll('_', ' '),
      href: `/staff/${s.id}`,
    })),
  };
}

async function searchInvoices(clinicId: string, q: string, limit: number): Promise<SearchGroup> {
  const invoices = await prisma.invoice.findMany({
    where: {
      clinic_id: clinicId,
      OR: [
        { notes: contains(q) },
        { owner: { first_name: contains(q) } },
        { owner: { last_name: contains(q) } },
      ],
    },
    include: { owner: { select: { first_name: true, last_name: true } } },
    orderBy: { created_at: 'desc' },
    take: limit,
  });

  return {
    key: 'invoices',
    label: 'Invoices',
    items: invoices.map((i) => ({
      id: i.id,
      title: `Invoice — ${i.owner.first_name} ${i.owner.last_name}`,
      subtitle: `${i.status} · ${i.total}`,
      href: `/billing/${i.id}`,
    })),
  };
}

async function searchInventory(clinicId: string, q: string, limit: number): Promise<SearchGroup> {
  const items = await prisma.inventoryItem.findMany({
    where: {
      clinic_id: clinicId,
      is_active: true,
      OR: [{ name: contains(q) }, { sku: contains(q) }, { supplier_name: contains(q) }],
    },
    orderBy: { created_at: 'desc' },
    take: limit,
  });

  return {
    key: 'inventory',
    label: 'Inventory',
    items: items.map((i) => ({
      id: i.id,
      title: i.name,
      subtitle: `${i.category.replaceAll('_', ' ')}${i.sku ? ` · ${i.sku}` : ''}`,
      href: `/inventory/${i.id}`,
    })),
  };
}

async function searchLabOrders(clinicId: string, q: string, limit: number): Promise<SearchGroup> {
  const orders = await prisma.labOrder.findMany({
    where: {
      pet: { owner: { clinic_id: clinicId } },
      OR: [
        { panel_name: contains(q) },
        { external_lab_name: contains(q) },
        { pet: { name: contains(q) } },
      ],
    },
    include: { pet: { select: { name: true } } },
    orderBy: { ordered_at: 'desc' },
    take: limit,
  });

  return {
    key: 'lab_orders',
    label: 'Lab Orders',
    items: orders.map((o) => ({
      id: o.id,
      title: o.panel_name,
      subtitle: `${o.pet.name} · ${o.status.replaceAll('_', ' ')}`,
      href: `/lab/${o.id}`,
    })),
  };
}

async function searchWard(clinicId: string, q: string, limit: number): Promise<SearchGroup> {
  const hospitalizations = await prisma.hospitalization.findMany({
    where: {
      kennel: { room: { clinic_id: clinicId } },
      OR: [
        { reason: contains(q) },
        { pet: { name: contains(q) } },
        { kennel: { label: contains(q) } },
      ],
    },
    include: { pet: { select: { name: true } }, kennel: { select: { label: true } } },
    orderBy: { admitted_at: 'desc' },
    take: limit,
  });

  return {
    key: 'ward',
    label: 'Ward',
    items: hospitalizations.map((h) => ({
      id: h.id,
      title: h.pet.name,
      subtitle: `${h.kennel.label} · ${h.reason}`,
      href: `/ward/${h.id}`,
    })),
  };
}

const CATEGORY_PERMISSIONS: Record<SearchCategoryKey, PermissionKey> = {
  owners: 'PATIENT_READ',
  pets: 'PATIENT_READ',
  appointments: 'APPOINTMENT_READ',
  medical_records: 'MEDICAL_RECORD_READ',
  staff: 'STAFF_READ',
  invoices: 'INVOICE_READ',
  inventory: 'INVENTORY_READ',
  lab_orders: 'LAB_ORDER_WRITE',
  ward: 'WARD_READ',
};

const CATEGORY_FINDERS: Record<
  SearchCategoryKey,
  (clinicId: string, q: string, limit: number) => Promise<SearchGroup>
> = {
  owners: searchOwners,
  pets: searchPets,
  appointments: searchAppointments,
  medical_records: searchMedicalRecords,
  staff: searchStaff,
  invoices: searchInvoices,
  inventory: searchInventory,
  lab_orders: searchLabOrders,
  ward: searchWard,
};

// A search hit can span records the caller's role isn't allowed to read (e.g. a
// receptionist searching should never see staff records), so each category is
// gated individually against the same permission the corresponding list
// endpoint enforces, rather than a single blanket authorize() on the route.
export async function globalSearch(
  clinicId: string,
  role: string,
  q: string,
  limit: number,
): Promise<SearchGroup[]> {
  const allowedCategories = (Object.keys(CATEGORY_PERMISSIONS) as SearchCategoryKey[]).filter((key) =>
    (PERMISSIONS[CATEGORY_PERMISSIONS[key]] as readonly string[]).includes(role),
  );

  const groups = await Promise.all(
    allowedCategories.map((key) => CATEGORY_FINDERS[key](clinicId, q, limit)),
  );

  return groups.filter((g) => g.items.length > 0);
}
