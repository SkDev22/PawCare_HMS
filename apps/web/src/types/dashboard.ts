export type TodayAppointmentsStat = {
  total:     number;
  completed: number;
  remaining: number;
  trend:     number;
};

export type ActivePatientsStat = {
  total:        number;
  newThisMonth: number;
  trend:        number;
};

export type MonthlyRevenueStat = {
  amount:                  number;
  outstandingInvoicesCount: number;
  trend:                   number;
};

export type WardOccupancyStat = {
  occupied: number;
  total:    number;
  trend:    number;
};

export type DashboardStats = {
  todayAppointments: TodayAppointmentsStat;
  activePatients:    ActivePatientsStat;
  monthlyRevenue:    MonthlyRevenueStat;
  wardOccupancy:     WardOccupancyStat;
};

export type MonthlyVisit = { month: string; visits: number };

export type SpeciesDistributionEntry = { name: string; value: number };

export type DashboardAppointment = {
  id:       string;
  type:     string;
  status:   string;
  start_at: string;
  pet: {
    id:      string;
    name:    string;
    species: string;
    owner:   { id: string; first_name: string; last_name: string };
  };
};

export type DashboardWardEntry = {
  id:          string;
  reason:      string;
  admitted_at: string;
  pet:    { id: string; name: string; species: string };
  kennel: { id: string; label: string };
};

export type DashboardLowStockItem = {
  id:                string;
  name:              string;
  quantity_on_hand:  number;
  reorder_threshold: number;
  unit:              string;
};

export type DashboardAbnormalLabResult = {
  id:          string;
  test_name:   string;
  value:       string;
  unit:        string | null;
  recorded_at: string;
  lab_order: {
    id:  string;
    pet: { id: string; name: string };
  };
};

export type DashboardSummary = {
  stats:               DashboardStats;
  monthlyVisits:       MonthlyVisit[];
  speciesDistribution: SpeciesDistributionEntry[];
  todaysAppointments:  DashboardAppointment[];
  wardStatus:          DashboardWardEntry[];
  alerts: {
    lowStock:           DashboardLowStockItem[];
    abnormalLabResults: DashboardAbnormalLabResult[];
  };
};
