import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceQueryInput,
  AddLineItemInput,
  RecordPaymentInput,
  CreateServiceInput,
  InvoiceStatusType,
} from '@pawcare/shared';

// ── Helpers ────────────────────────────────────────────────────────────────────

const { Decimal } = Prisma;
type Decimal = Prisma.Decimal;

const MODIFIABLE_STATUSES = ['DRAFT', 'SENT'] as const;

async function assertInvoice(id: string, clinicId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, clinic_id: clinicId },
    select: {
      id: true,
      status: true,
      subtotal: true,
      tax_amount: true,
      discount_amount: true,
      total: true,
      paid_amount: true,
    },
  });
  if (!invoice) throw new AppError('NOT_FOUND', 'Invoice not found', 404);
  return invoice;
}

export function clampZero(d: Decimal) {
  return d.isNegative() ? new Decimal(0) : d;
}

const invoiceListIncludes = {
  owner: {
    select: { id: true, first_name: true, last_name: true, email: true, phone: true },
  },
  _count: { select: { line_items: true, payments: true } },
} as const;

const invoiceFullIncludes = {
  owner: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
      address: true,
    },
  },
  appointment: {
    select: { id: true, type: true, status: true, start_at: true },
  },
  line_items: {
    orderBy: { created_at: 'asc' as const },
    include: {
      service: { select: { id: true, name: true, category: true } },
    },
  },
  payments: {
    orderBy: { received_at: 'desc' as const },
  },
} as const;

// ── Invoices ───────────────────────────────────────────────────────────────────

export async function listInvoices(clinicId: string, query: InvoiceQueryInput) {
  const { status, owner_id, search, date_from, date_to, cursor, limit } = query;

  const invoices = await prisma.invoice.findMany({
    where: {
      clinic_id: clinicId,
      ...(status   ? { status }   : {}),
      ...(owner_id ? { owner_id } : {}),
      ...(search
        ? {
            OR: [
              { owner: { first_name: { contains: search, mode: 'insensitive' as const } } },
              { owner: { last_name:  { contains: search, mode: 'insensitive' as const } } },
              { appointment: { pet: { name: { contains: search, mode: 'insensitive' as const } } } },
            ],
          }
        : {}),
      ...((date_from ?? date_to)
        ? {
            created_at: {
              ...(date_from ? { gte: new Date(`${date_from}T00:00:00.000Z`) } : {}),
              ...(date_to   ? { lte: new Date(`${date_to}T23:59:59.999Z`)   } : {}),
            },
          }
        : {}),
    },
    include: invoiceListIncludes,
    orderBy: { created_at: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = invoices.length > limit;
  const items   = hasMore ? invoices.slice(0, limit) : invoices;
  return {
    items,
    nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    hasMore,
  };
}

export async function getInvoice(id: string, clinicId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, clinic_id: clinicId },
    include: invoiceFullIncludes,
  });
  if (!invoice) throw new AppError('NOT_FOUND', 'Invoice not found', 404);
  return invoice;
}

export async function createInvoice(clinicId: string, data: CreateInvoiceInput) {
  const owner = await prisma.owner.findFirst({
    where: { id: data.owner_id, clinic_id: clinicId, deleted_at: null },
    select: { id: true },
  });
  if (!owner) throw new AppError('NOT_FOUND', 'Owner not found in this clinic', 404);

  if (data.appointment_id) {
    const appt = await prisma.appointment.findFirst({
      where: { id: data.appointment_id, clinic_id: clinicId },
      select: { id: true, invoice: { select: { id: true } } },
    });
    if (!appt) throw new AppError('NOT_FOUND', 'Appointment not found', 404);
    if (appt.invoice) {
      throw new AppError('CONFLICT', 'An invoice already exists for this appointment', 409);
    }
  }

  const tax      = new Decimal(data.tax_amount);
  const discount = new Decimal(data.discount_amount);
  const total    = clampZero(tax.minus(discount));

  return prisma.invoice.create({
    data: {
      clinic_id:       clinicId,
      owner_id:        data.owner_id,
      subtotal:        new Decimal(0),
      tax_amount:      tax,
      discount_amount: discount,
      total,
      paid_amount:     new Decimal(0),
      notes:           data.notes ?? null,
      due_date:        data.due_date ? new Date(data.due_date) : null,
      ...(data.appointment_id ? { appointment_id: data.appointment_id } : {}),
    },
    include: invoiceFullIncludes,
  });
}

export async function updateInvoice(id: string, clinicId: string, data: UpdateInvoiceInput) {
  const invoice = await assertInvoice(id, clinicId);
  if (invoice.status !== 'DRAFT') {
    throw new AppError('BAD_REQUEST', 'Only DRAFT invoices can be edited', 400);
  }

  const newTax      = data.tax_amount      !== undefined ? new Decimal(data.tax_amount)      : invoice.tax_amount;
  const newDiscount = data.discount_amount !== undefined ? new Decimal(data.discount_amount) : invoice.discount_amount;
  const newTotal    = clampZero(invoice.subtotal.plus(newTax).minus(newDiscount));

  return prisma.invoice.update({
    where: { id },
    data: {
      ...(data.notes           !== undefined ? { notes: data.notes }                   : {}),
      ...(data.due_date        !== undefined ? { due_date: data.due_date ? new Date(data.due_date) : null } : {}),
      ...(data.tax_amount      !== undefined ? { tax_amount: newTax }                  : {}),
      ...(data.discount_amount !== undefined ? { discount_amount: newDiscount }        : {}),
      total: newTotal,
    },
    include: invoiceFullIncludes,
  });
}

// ── Line Items ─────────────────────────────────────────────────────────────────

export async function addLineItem(invoiceId: string, clinicId: string, data: AddLineItemInput) {
  const invoice = await assertInvoice(invoiceId, clinicId);
  if (!(MODIFIABLE_STATUSES as readonly string[]).includes(invoice.status)) {
    throw new AppError('BAD_REQUEST', 'Cannot modify a finalized invoice', 400);
  }

  const itemTotal   = new Decimal(data.unit_price).times(data.quantity);
  const newSubtotal = invoice.subtotal.plus(itemTotal);
  const newTotal    = clampZero(newSubtotal.plus(invoice.tax_amount).minus(invoice.discount_amount));

  return prisma.$transaction(async (tx) => {
    const lineItem = await tx.invoiceLineItem.create({
      data: {
        invoice_id:  invoiceId,
        description: data.description,
        quantity:    data.quantity,
        unit_price:  new Decimal(data.unit_price),
        total:       itemTotal,
        ...(data.service_id ? { service_id: data.service_id } : {}),
      },
      include: {
        service: { select: { id: true, name: true, category: true } },
      },
    });

    await tx.invoice.update({
      where: { id: invoiceId },
      data: { subtotal: newSubtotal, total: newTotal },
    });

    return lineItem;
  });
}

export async function removeLineItem(invoiceId: string, lineId: string, clinicId: string) {
  const invoice = await assertInvoice(invoiceId, clinicId);
  if (!(MODIFIABLE_STATUSES as readonly string[]).includes(invoice.status)) {
    throw new AppError('BAD_REQUEST', 'Cannot modify a finalized invoice', 400);
  }

  const lineItem = await prisma.invoiceLineItem.findFirst({
    where: { id: lineId, invoice_id: invoiceId },
    select: { id: true, total: true },
  });
  if (!lineItem) throw new AppError('NOT_FOUND', 'Line item not found', 404);

  const newSubtotal = clampZero(invoice.subtotal.minus(lineItem.total));
  const newTotal    = clampZero(newSubtotal.plus(invoice.tax_amount).minus(invoice.discount_amount));

  await prisma.$transaction(async (tx) => {
    await tx.invoiceLineItem.delete({ where: { id: lineId } });
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { subtotal: newSubtotal, total: newTotal },
    });
  });
}

// ── Payments ───────────────────────────────────────────────────────────────────

export async function recordPayment(invoiceId: string, clinicId: string, data: RecordPaymentInput) {
  const invoice = await assertInvoice(invoiceId, clinicId);
  if (['CANCELLED', 'REFUNDED'].includes(invoice.status)) {
    throw new AppError(
      'BAD_REQUEST',
      'Cannot record payment on a cancelled or refunded invoice',
      400,
    );
  }

  const paymentAmount = new Decimal(data.amount);
  const newPaidAmount = invoice.paid_amount.plus(paymentAmount);

  let newStatus: InvoiceStatusType = invoice.status as InvoiceStatusType;
  if (newPaidAmount.gte(invoice.total)) {
    newStatus = 'PAID';
  } else if (newPaidAmount.gt(0)) {
    newStatus = 'PARTIALLY_PAID';
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        invoice_id: invoiceId,
        amount:     paymentAmount,
        method:     data.method,
        notes:      data.notes ?? null,
      },
    });

    await tx.invoice.update({
      where: { id: invoiceId },
      data: { paid_amount: newPaidAmount, status: newStatus },
    });

    return payment;
  });
}

// ── Status ─────────────────────────────────────────────────────────────────────

export async function updateStatus(id: string, clinicId: string, status: InvoiceStatusType) {
  const invoice = await assertInvoice(id, clinicId);

  const allowed: Partial<Record<string, string[]>> = {
    DRAFT:          ['SENT', 'CANCELLED'],
    SENT:           ['PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'],
    PARTIALLY_PAID: ['PAID', 'CANCELLED'],
    OVERDUE:        ['PAID', 'PARTIALLY_PAID', 'CANCELLED'],
    PAID:           ['REFUNDED'],
  };

  if (!allowed[invoice.status]?.includes(status)) {
    throw new AppError(
      'BAD_REQUEST',
      `Cannot transition from ${invoice.status} to ${status}`,
      400,
    );
  }

  return prisma.invoice.update({
    where: { id },
    data: { status },
    select: { id: true, status: true },
  });
}

// ── Services ───────────────────────────────────────────────────────────────────

export async function listServices(clinicId: string) {
  return prisma.service.findMany({
    where: { clinic_id: clinicId, is_active: true },
    select: {
      id: true,
      name: true,
      category: true,
      price: true,
      duration_minutes: true,
      is_taxable: true,
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
}

export async function createService(clinicId: string, data: CreateServiceInput) {
  return prisma.service.create({
    data: {
      clinic_id:  clinicId,
      name:       data.name,
      category:   data.category,
      price:      new Decimal(data.price),
      is_taxable: data.is_taxable,
      ...(data.duration_minutes !== undefined ? { duration_minutes: data.duration_minutes } : {}),
    },
  });
}
