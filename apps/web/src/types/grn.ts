import type { StockBatch } from './inventory';

export type GrnLineItem = {
  id:               string;
  grn_id:           string;
  item_id:          string;
  batch_no:         string | null;
  quantity:         number;
  unit_cost:        string;
  selling_price:    string;
  discount_percent: string;
  expiry_date:      string | null;
  created_at:       string;
  item:             { id: string; name: string; unit: string };
  batch:            StockBatch | null;
};

export type GoodsReceivedNote = {
  id:                  string;
  clinic_id:           string;
  grn_number:          string;
  supplier_id:         string | null;
  supplier_name:       string;
  supplier_invoice_no: string | null;
  notes:               string | null;
  received_by:         string;
  received_at:         string;
  created_at:          string;
  received_by_staff:   { id: string; first_name: string; last_name: string };
};

export type GoodsReceivedNoteDetail = GoodsReceivedNote & {
  supplier: { id: string; name: string; phone: string | null; email: string | null } | null;
  items:    GrnLineItem[];
};

export type GoodsReceivedNoteListItem = GoodsReceivedNote & {
  _count: { items: number };
};

export type PaginatedGrns = {
  items:      GoodsReceivedNoteListItem[];
  nextCursor: string | null;
  hasMore:    boolean;
};

export type CreateGrnLineItemInput = {
  item_id:           string;
  batch_no?:         string;
  quantity:          number;
  unit_cost:         number;
  selling_price:     number;
  discount_percent?: number;
  expiry_date?:      string;
};

export type CreateGrnInput = {
  supplier_id?:         string;
  supplier_name:        string;
  supplier_invoice_no?: string;
  notes?:               string;
  items:                CreateGrnLineItemInput[];
};
