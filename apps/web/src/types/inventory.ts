export type ItemCategory =
  | 'MEDICATION'
  | 'VACCINE'
  | 'SURGICAL_SUPPLY'
  | 'DIAGNOSTIC_SUPPLY'
  | 'FOOD'
  | 'EQUIPMENT'
  | 'OTHER';

export type TransactionType = 'purchase' | 'dispensed' | 'adjustment' | 'expired';

// Types a client may submit through POST /inventory/:id/transactions.
// 'purchase' rows only ever come from receiving a GRN.
export type LogTransactionType = 'dispensed' | 'adjustment' | 'expired';

export type InventoryTransaction = {
  id:                  string;
  item_id:             string;
  batch_id:            string | null;
  performed_by:        string;
  type:                TransactionType;
  quantity:            number;
  reference_id:        string | null;
  notes:               string | null;
  created_at:          string;
  performed_by_staff:  { id: string; first_name: string; last_name: string } | null;
};

export type StockBatch = {
  id:                  string;
  item_id:             string;
  grn_item_id:         string | null;
  batch_no:            string | null;
  quantity_received:   number;
  quantity_remaining:  number;
  unit_cost:           string;
  selling_price:       string;
  discount_percent:    string;
  expiry_date:         string | null;
  received_at:         string;
  is_closed:           boolean;
  created_at:          string;
  updated_at:          string;
};

export type InventoryItem = {
  id:                string;
  clinic_id:         string;
  name:              string;
  sku:               string | null;
  category:          ItemCategory;
  unit:              string;
  quantity_on_hand:  number;
  reorder_threshold: number;
  supplier_name:     string | null;
  supplier_sku:      string | null;
  location:          string | null;
  is_controlled:     boolean;
  is_active:         boolean;
  created_at:        string;
  updated_at:        string;
  // Computed from the oldest active stock batch (FIFO) — null when out of stock.
  current_price:     string | null;
  nearest_expiry:    string | null;
};

export type InventoryItemDetail = InventoryItem & {
  transactions: InventoryTransaction[];
};

export type PaginatedInventory = {
  items:      InventoryItem[];
  nextCursor: string | null;
  hasMore:    boolean;
};

export type PaginatedTransactions = {
  items:      InventoryTransaction[];
  nextCursor: string | null;
  hasMore:    boolean;
};

export type ExpiringBatch = StockBatch & {
  item: { id: string; name: string; unit: string };
};

export type InventoryAlerts = {
  low_stock:     InventoryItem[];
  expiring_soon: ExpiringBatch[];
};
