export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';
export type PaymentMethod = 'cash' | 'card' | 'insurance' | 'bank_transfer';

export type Service = {
  id: string;
  name: string;
  category: string;
  price: string;
  duration_minutes: number | null;
  is_taxable: boolean;
};

export type LineItem = {
  id: string;
  invoice_id: string;
  service_id: string | null;
  description: string;
  quantity: number;
  unit_price: string;
  total: string;
  created_at: string;
  service: { id: string; name: string; category: string } | null;
};

export type InvoicePayment = {
  id: string;
  invoice_id: string;
  amount: string;
  method: PaymentMethod;
  stripe_charge_id: string | null;
  received_at: string;
  notes: string | null;
};

export type InvoiceOwner = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string;
  address: string | null;
};

export type InvoiceListItem = {
  id: string;
  clinic_id: string;
  owner_id: string;
  status: InvoiceStatus;
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  total: string;
  paid_amount: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  owner: Pick<InvoiceOwner, 'id' | 'first_name' | 'last_name' | 'email' | 'phone'>;
  _count: { line_items: number; payments: number };
};

export type Invoice = {
  id: string;
  clinic_id: string;
  owner_id: string;
  appointment_id: string | null;
  status: InvoiceStatus;
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  total: string;
  paid_amount: string;
  due_date: string | null;
  notes: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
  owner: InvoiceOwner;
  appointment: { id: string; type: string; status: string; start_at: string } | null;
  line_items: LineItem[];
  payments: InvoicePayment[];
};

export type PaginatedInvoices = {
  items: InvoiceListItem[];
  nextCursor: string | null;
  hasMore: boolean;
};
