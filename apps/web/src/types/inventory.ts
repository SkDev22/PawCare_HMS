export type ItemCategory =
  | 'MEDICATION'
  | 'VACCINE'
  | 'SURGICAL_SUPPLY'
  | 'DIAGNOSTIC_SUPPLY'
  | 'FOOD'
  | 'EQUIPMENT'
  | 'OTHER';

export type TransactionType = 'purchase' | 'dispensed' | 'adjustment' | 'expired';

export type InventoryTransaction = {
  id:                  string;
  item_id:             string;
  performed_by:        string;
  type:                TransactionType;
  quantity:            number;
  reference_id:        string | null;
  notes:               string | null;
  created_at:          string;
  performed_by_staff:  { id: string; first_name: string; last_name: string } | null;
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
  unit_cost:         string;
  selling_price:     string | null;
  supplier_name:     string | null;
  supplier_sku:      string | null;
  expiry_date:       string | null;
  location:          string | null;
  is_controlled:     boolean;
  is_active:         boolean;
  created_at:        string;
  updated_at:        string;
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

export type InventoryAlerts = {
  low_stock:     InventoryItem[];
  expiring_soon: InventoryItem[];
};
