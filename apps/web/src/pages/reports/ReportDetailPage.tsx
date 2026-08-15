import { useState, type ComponentType } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { getReportByKey } from "./report-registry";
import {
  PatientVisitHistoryReport,
  MedicalRecordsSummaryReportView,
  VaccinationComplianceReportView,
  DoctorPerformanceReportView,
} from "./components/ClinicalReports";
import {
  RevenueReportView,
  OutstandingBalancesReportView,
  ServiceSalesReportView,
  TaxSummaryReportView,
} from "./components/FinancialReports";
import {
  StockLevelsReportView,
  InventoryUsageReportView,
  ExpiringItemsReportView,
} from "./components/InventoryReports";
import {
  AppointmentStatsReportView,
  DemographicsReportView,
  ServiceUtilizationReportView,
} from "./components/OperationalReports";

// ── Date presets ─────────────────────────────────────────────────────────────

const TODAY = new Date();
const fmt = (d: Date) => format(d, "yyyy-MM-dd");

const PRESETS = [
  { label: "Last 7 days", start: fmt(subDays(TODAY, 6)), end: fmt(TODAY) },
  { label: "Last 30 days", start: fmt(subDays(TODAY, 29)), end: fmt(TODAY) },
  { label: "This month", start: fmt(startOfMonth(TODAY)), end: fmt(endOfMonth(TODAY)) },
  {
    label: "Last month",
    start: fmt(startOfMonth(subDays(startOfMonth(TODAY), 1))),
    end: fmt(endOfMonth(subDays(startOfMonth(TODAY), 1))),
  },
];

// ── Content registry ─────────────────────────────────────────────────────────

interface ContentProps {
  start: string;
  end: string;
  days: number;
}

const CONTENT: Record<string, ComponentType<ContentProps>> = {
  "patient-visit-history": PatientVisitHistoryReport,
  "medical-records-summary": MedicalRecordsSummaryReportView,
  "vaccination-compliance": VaccinationComplianceReportView,
  "doctor-performance": DoctorPerformanceReportView,
  revenue: RevenueReportView,
  "outstanding-balances": OutstandingBalancesReportView,
  "service-sales": ServiceSalesReportView,
  "tax-summary": TaxSummaryReportView,
  "stock-levels": StockLevelsReportView,
  "inventory-usage": InventoryUsageReportView,
  "expiring-items": ExpiringItemsReportView,
  "appointment-stats": AppointmentStatsReportView,
  demographics: DemographicsReportView,
  "service-utilization": ServiceUtilizationReportView,
};

// ── Page ──────────────────────────────────────────────────────────────────────

export function ReportDetailPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const report = getReportByKey(key);

  const [preset, setPreset] = useState(1);
  const [startDate, setStartDate] = useState(PRESETS[1].start);
  const [endDate, setEndDate] = useState(PRESETS[1].end);
  const [days, setDays] = useState(30);

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">Report not found.</p>
        <Button variant="link" onClick={() => navigate("/reports")}>
          Back to Reports
        </Button>
      </div>
    );
  }

  function applyPreset(idx: number) {
    setPreset(idx);
    setStartDate(PRESETS[idx].start);
    setEndDate(PRESETS[idx].end);
  }

  const Content = CONTENT[report.key];
  const Icon = report.icon;

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 print:hidden"
        onClick={() => navigate("/reports")}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Reports
      </Button>

      <div className="flex items-start justify-between gap-4 flex-wrap print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Icon className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{report.title}</h1>
            <p className="text-sm text-muted-foreground">{report.description}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1" />
          Print
        </Button>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">{report.title}</h1>
        {report.filterType === "range" && (
          <p className="text-sm text-muted-foreground">
            {startDate} to {endDate}
          </p>
        )}
        {report.filterType === "days" && (
          <p className="text-sm text-muted-foreground">Within next {days} days</p>
        )}
      </div>

      {report.filterType === "range" && (
        <Card className="print:hidden">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p, i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant={preset === i ? "default" : "outline"}
                    onClick={() => applyPreset(i)}
                    className="text-xs"
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">From</Label>
                  <Input
                    type="date"
                    className="h-8 text-sm"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPreset(-1);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To</Label>
                  <Input
                    type="date"
                    className="h-8 text-sm"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPreset(-1);
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {report.filterType === "days" && (
        <Card className="print:hidden">
          <CardContent className="p-4 flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Within next (days)</Label>
              <Input
                type="number"
                min={1}
                max={365}
                className="h-8 text-sm w-32"
                value={days}
                onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {Content && <Content start={startDate} end={endDate} days={days} />}
    </div>
  );
}
