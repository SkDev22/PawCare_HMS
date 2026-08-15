import type { LucideIcon } from "lucide-react";
import {
  Stethoscope,
  FileText,
  Syringe,
  UserCog,
  DollarSign,
  Receipt,
  ShoppingBag,
  Calculator,
  Package,
  TrendingDown,
  AlertTriangle,
  CalendarDays,
  Users,
  BarChart3,
} from "lucide-react";

export type ReportFilterType = "range" | "days" | "none" | "patient";

export interface ReportDef {
  key: string;
  title: string;
  description: string;
  category: string;
  icon: LucideIcon;
  filterType: ReportFilterType;
}

export const REPORT_CATEGORIES = [
  "Clinical & Medical Reports",
  "Financial Reports",
  "Inventory & Supply Chain Reports",
  "Operational Reports",
] as const;

export const REPORTS: ReportDef[] = [
  // ── Clinical & Medical ──────────────────────────────────────────────────
  {
    key: "patient-visit-history",
    title: "Patient Visit History",
    description:
      "Complete treatment timeline for a single patient — useful for follow-ups and continuity of care.",
    category: REPORT_CATEGORIES[0],
    icon: Stethoscope,
    filterType: "patient",
  },
  {
    key: "medical-records-summary",
    title: "Medical Records Summary",
    description:
      "Diagnoses and treatments over a date range — track disease patterns and recurring issues.",
    category: REPORT_CATEGORIES[0],
    icon: FileText,
    filterType: "range",
  },
  {
    key: "vaccination-compliance",
    title: "Vaccination Due/Compliance",
    description:
      "Which pets are due or overdue for vaccines — for proactive client outreach.",
    category: REPORT_CATEGORIES[0],
    icon: Syringe,
    filterType: "days",
  },
  {
    key: "doctor-performance",
    title: "Doctor Performance",
    description:
      "Patients seen, records authored, and revenue generated per veterinarian.",
    category: REPORT_CATEGORIES[0],
    icon: UserCog,
    filterType: "range",
  },

  // ── Financial ─────────────────────────────────────────────────────────
  {
    key: "revenue",
    title: "Revenue Report",
    description: "Income over a date range, broken down by payment method.",
    category: REPORT_CATEGORIES[1],
    icon: DollarSign,
    filterType: "range",
  },
  {
    key: "outstanding-balances",
    title: "Outstanding Payments (AR)",
    description: "Unpaid and partially paid invoices, aged by days overdue.",
    category: REPORT_CATEGORIES[1],
    icon: Receipt,
    filterType: "none",
  },
  {
    key: "service-sales",
    title: "Service/Item Sales",
    description: "Which services and items generate the most revenue.",
    category: REPORT_CATEGORIES[1],
    icon: ShoppingBag,
    filterType: "range",
  },
  {
    key: "tax-summary",
    title: "Tax/Financial Summary",
    description:
      "Subtotal, tax, discounts, and totals over a range — for accounting purposes.",
    category: REPORT_CATEGORIES[1],
    icon: Calculator,
    filterType: "range",
  },

  // ── Inventory & Supply Chain ─────────────────────────────────────────────
  {
    key: "stock-levels",
    title: "Stock Level Report",
    description: "Current inventory vs. reorder points — flags what needs restocking.",
    category: REPORT_CATEGORIES[2],
    icon: Package,
    filterType: "none",
  },
  {
    key: "inventory-usage",
    title: "Inventory Usage",
    description: "What's being consumed fastest — helps forecast demand.",
    category: REPORT_CATEGORIES[2],
    icon: TrendingDown,
    filterType: "range",
  },
  {
    key: "expiring-items",
    title: "Expiring Items",
    description: "Medicines and supplies nearing or past their expiry date.",
    category: REPORT_CATEGORIES[2],
    icon: AlertTriangle,
    filterType: "days",
  },

  // ── Operational ───────────────────────────────────────────────────────
  {
    key: "appointment-stats",
    title: "Appointment Statistics",
    description: "No-show and cancellation rates, volume by type and status.",
    category: REPORT_CATEGORIES[3],
    icon: CalendarDays,
    filterType: "range",
  },
  {
    key: "demographics",
    title: "Patient/Owner Demographics",
    description: "New vs. returning patients, species mix, portal adoption.",
    category: REPORT_CATEGORIES[3],
    icon: Users,
    filterType: "range",
  },
  {
    key: "service-utilization",
    title: "Service Utilization",
    description: "Which services are used most and least often, by visit count.",
    category: REPORT_CATEGORIES[3],
    icon: BarChart3,
    filterType: "range",
  },
];

export function getReportByKey(key: string | undefined): ReportDef | undefined {
  return REPORTS.find((r) => r.key === key);
}
