export type PosLineItem = {
  id: string;
  invoice_id: string;
  item_id: string | null;
  batch_id: string | null;
  description: string;
  quantity: number;
  unit_price: string;
  total: string;
  created_at: string;
  item: { id: string; name: string } | null;
};

export type PosSalePayment = {
  id: string;
  amount: string;
  method: string;
  amount_tendered: string | null;
  received_at: string;
};

export type PosSale = {
  id: string;
  clinic_id: string;
  owner_id: string | null;
  customer_name: string | null;
  channel: "RETAIL";
  invoice_number: string | null;
  status: string;
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  total: string;
  paid_amount: string;
  created_at: string;
  updated_at: string;
  owner: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string;
  } | null;
  line_items: PosLineItem[];
  payments: PosSalePayment[];
};

export type PaginatedPosSales = {
  items: PosSale[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type PosReturnLine = {
  line_item_id: string;
  quantity: number;
};

export type PosCartItem = {
  item_id: string;
  name: string;
  quantity: number;
  // Snapshot at add-time, for display only — the server resolves the
  // authoritative price from the active batch at checkout.
  unit_price: string;
};
