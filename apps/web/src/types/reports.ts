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
