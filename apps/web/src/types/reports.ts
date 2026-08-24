export type DailyRevenue = { date: string; amount: number };

export type RevenueReport = {
  totalRevenue:     number;
  totalOutstanding: number;
  dailySeries:      DailyRevenue[];
  byMethod:         Record<string, number>;
};

export type DailyCount = { date: string; count: number };

export type AppointmentsReport = {
  total:             number;
  byStatus:          Record<string, number>;
  byType:            Record<string, number>;
  noShowRate:        number;
  cancellationRate:  number;
  dailySeries:       DailyCount[];
};

export type InventoryUsageItem = {
  id:             string;
  name:           string;
  category:       string;
  unit:           string;
  totalDispensed: number;
};

export type InventoryUsageReport = {
  items:             InventoryUsageItem[];
  totalTransactions: number;
};

export type OutstandingInvoice = {
  id:          string;
  status:      string;
  total:       string;
  paid_amount: string;
  due_date:    string | null;
  created_at:  string;
  balance:     number;
  daysOverdue: number;
  owner:       { id: string; first_name: string; last_name: string; email: string | null };
};

export type AgingBuckets = {
  current:   number;
  days30:    number;
  days60:    number;
  days90plus: number;
};

export type OutstandingBalancesReport = {
  items:            OutstandingInvoice[];
  buckets:          AgingBuckets;
  totalOutstanding: number;
};

// ── Expiring Items ───────────────────────────────────────────────────────────

export type ExpiringItem = {
  id:                 string;
  item_id:            string;
  name:               string;
  category:           string;
  sku:                string | null;
  unit:               string;
  location:           string | null;
  batch_no:           string | null;
  quantity_remaining: number;
  expiry_date:        string | null;
  isExpired:          boolean;
};

export type ExpiringItemsReport = {
  items:        ExpiringItem[];
  expiredCount: number;
};

// ── Stock Levels ───────────────────────────────────────────────────────────────

export type StockLevelItem = {
  id:                string;
  name:              string;
  category:          string;
  sku:               string | null;
  unit:              string;
  quantity_on_hand:  number;
  reorder_threshold: number;
  location:          string | null;
  isLow:             boolean;
  stockValue:        number;
};

export type StockLevelsReport = {
  items:           StockLevelItem[];
  lowStockCount:   number;
  totalStockValue: number;
};

// ── Vaccinations Due ────────────────────────────────────────────────────────────

export type VaccinationDueItem = {
  id:              string;
  vaccine_name:    string;
  next_due_at:     string;
  administered_at: string;
  isOverdue:       boolean;
  pet: {
    id:      string;
    name:    string;
    species: string;
    owner:   { id: string; first_name: string; last_name: string; phone: string };
  };
};

export type VaccinationsDueReport = {
  items:        VaccinationDueItem[];
  overdueCount: number;
};

// ── Service / Item Sales ────────────────────────────────────────────────────────

export type ServiceSaleItem = {
  key:      string;
  name:     string;
  category: string;
  type:     'service' | 'item' | 'other';
  quantity: number;
  revenue:  number;
};

export type ServiceSalesReport = {
  items:        ServiceSaleItem[];
  totalRevenue: number;
};

// ── Medical Records Summary ─────────────────────────────────────────────────────

export type DiagnosisFrequency = { name: string; count: number };

export type MedicalRecordsSummaryReport = {
  totalRecords:          number;
  totalPrescriptions:    number;
  totalLabResults:       number;
  primaryDiagnosisCount: number;
  diagnoses:             DiagnosisFrequency[];
};

// ── Doctor Performance ───────────────────────────────────────────────────────────

export type DoctorPerformanceRow = {
  id:                     string;
  name:                   string;
  appointmentsCompleted:  number;
  medicalRecords:         number;
  revenue:                number;
};

export type DoctorPerformanceReport = {
  doctors: DoctorPerformanceRow[];
};

// ── Patient / Owner Demographics ─────────────────────────────────────────────────

export type SpeciesCount = { species: string; count: number };

export type DemographicsReport = {
  totalOwners:           number;
  newOwners:             number;
  totalPets:              number;
  newPets:                number;
  portalEnabledCount:    number;
  species:               SpeciesCount[];
  uniquePatientsSeen:    number;
  newPatientsSeen:       number;
  returningPatientsSeen: number;
};

// ── Tax / Financial Summary ──────────────────────────────────────────────────────

export type TaxSummaryReport = {
  invoiceCount: number;
  subtotal:     number;
  tax:          number;
  discount:     number;
  total:        number;
  collected:    number;
};
