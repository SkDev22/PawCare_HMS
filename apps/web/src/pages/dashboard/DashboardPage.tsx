import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  CalendarDays,
  PawPrint,
  Receipt,
  BedDouble,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  FlaskConical,
  Package,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useAuthStore } from "@/stores/auth.store";
import { useDashboardSummary } from "@/hooks/use-dashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  COMPLETED: { label: "Completed", variant: "secondary" },
  IN_PROGRESS: { label: "In Progress", variant: "default" },
  CHECKED_IN: { label: "Checked In", variant: "default" },
  CONFIRMED: { label: "Confirmed", variant: "outline" },
  SCHEDULED: { label: "Scheduled", variant: "outline" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
  NO_SHOW: { label: "No Show", variant: "destructive" },
};

const SPECIES_COLORS: Record<string, string> = {
  DOG: "#6366f1",
  CAT: "#8b5cf6",
  BIRD: "#a78bfa",
  RABBIT: "#c4b5fd",
  REPTILE: "#ddd6fe",
  SMALL_MAMMAL: "#e9d5ff",
  OTHER: "#f3e8ff",
};

const SPECIES_LABELS: Record<string, string> = {
  DOG: "Dogs",
  CAT: "Cats",
  BIRD: "Birds",
  RABBIT: "Rabbits",
  REPTILE: "Reptiles",
  SMALL_MAMMAL: "Small Mammals",
  OTHER: "Other",
};

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  WELLNESS_EXAM: "Wellness Exam",
  VACCINATION: "Vaccination",
  SICK_VISIT: "Sick Visit",
  SURGERY: "Surgery",
  DENTAL: "Dental Cleaning",
  FOLLOW_UP: "Follow-up",
  EMERGENCY: "Emergency",
  GROOMING: "Grooming",
  LAB_ONLY: "Lab Only",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Component ────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError } = useDashboardSummary();

  const stats = data
    ? [
        {
          label: "Today's Appointments",
          value: String(data.stats.todayAppointments.total),
          sub: `${data.stats.todayAppointments.completed} completed · ${data.stats.todayAppointments.remaining} remaining`,
          trend: `${data.stats.todayAppointments.trend >= 0 ? "+" : ""}${data.stats.todayAppointments.trend} vs yesterday`,
          up: data.stats.todayAppointments.trend >= 0,
          icon: CalendarDays,
          color: "text-blue-600",
          bg: "bg-blue-50 dark:bg-blue-950",
          // cardBg: "bg-violet-50 dark:bg-violet-950/40",
          // cardBg: "bg-black dark:bg-white",
          cardBg: "bg-gray-100 dark:bg-gray-800",
          textColor: "text-black dark:text-white",
        },
        {
          label: "Active Patients",
          value: String(data.stats.activePatients.total),
          sub: `${data.stats.activePatients.newThisMonth} registered this month`,
          trend: `${data.stats.activePatients.trend >= 0 ? "+" : ""}${data.stats.activePatients.trend.toFixed(1)}% vs last month`,
          up: data.stats.activePatients.trend >= 0,
          icon: PawPrint,
          color: "text-brand-600",
          bg: "bg-brand-50 dark:bg-brand-950",
          // cardBg: "bg-brand-50 dark:bg-brand-950/40",
        },
        {
          label: "Monthly Revenue",
          value: formatCurrency(data.stats.monthlyRevenue.amount),
          sub: `${data.stats.monthlyRevenue.outstandingInvoicesCount} outstanding invoices`,
          trend: `${data.stats.monthlyRevenue.trend >= 0 ? "+" : ""}${data.stats.monthlyRevenue.trend.toFixed(1)}% vs last month`,
          up: data.stats.monthlyRevenue.trend >= 0,
          icon: Receipt,
          color: "text-emerald-600",
          bg: "bg-emerald-50 dark:bg-emerald-950",
          // cardBg: "bg-emerald-50 dark:bg-emerald-950/40",
          // cardBg: "bg-black dark:bg-white",
          cardBg: "bg-gray-100 dark:bg-gray-800",
          textColor: "text-black dark:text-white",
        },
        {
          label: "Ward Occupancy",
          value: `${data.stats.wardOccupancy.occupied} / ${data.stats.wardOccupancy.total}`,
          sub: `${data.stats.wardOccupancy.total - data.stats.wardOccupancy.occupied} kennels available`,
          trend: `${data.stats.wardOccupancy.trend >= 0 ? "+" : ""}${data.stats.wardOccupancy.trend} from yesterday`,
          up: data.stats.wardOccupancy.trend >= 0,
          icon: BedDouble,
          color: "text-amber-600",
          bg: "bg-amber-50 dark:bg-amber-950",
          // cardBg: "bg-amber-50 dark:bg-amber-950/40",
        },
      ]
    : [];

  const completedPct =
    data && data.stats.todayAppointments.total > 0
      ? Math.round(
          (data.stats.todayAppointments.completed /
            data.stats.todayAppointments.total) *
            100,
        )
      : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Good {getGreeting()}, {user?.first_name ?? "there"}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Here's what's happening at PawCare today.
        </p>
      </div>

      {isError && (
        <Card>
          <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <AlertCircle className="size-4 text-rose-500" />
            Couldn't load dashboard data. Try refreshing the page.
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))
          : stats.map(
              ({
                label,
                value,
                sub,
                trend,
                up,
                icon: Icon,
                color,
                bg,
                cardBg,
                textColor,
              }) => (
                <Card key={label} className={`gap-3 ${cardBg} ${textColor}`}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardDescription
                      className={`text-sm font-medium ${textColor}`}
                    >
                      {label}
                    </CardDescription>
                    <div
                      className={`flex size-9 items-center justify-center rounded-lg ${bg} ${color}`}
                    >
                      <Icon className="size-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-2xl font-bold">{value}</p>
                    <p
                      className={`text-muted-foreground text-xs mt-0.5 ${textColor}`}
                    >
                      {sub}
                    </p>
                    <div
                      className={`mt-2 flex items-center gap-1 text-xs font-medium ${up ? "text-emerald-600" : "text-rose-500"}`}
                    >
                      {up ? (
                        <TrendingUp className="size-3" />
                      ) : (
                        <TrendingDown className="size-3" />
                      )}
                      {trend}
                    </div>
                  </CardContent>
                </Card>
              ),
            )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Visit trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Monthly Patient Visits</CardTitle>
            <CardDescription>
              Completed clinic visits over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart
                  data={data?.monthlyVisits ?? []}
                  margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="visitGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v) => [`${v} visits`, "Visits"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="visits"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#visitGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Species distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Patient Species</CardTitle>
            <CardDescription>Distribution of active patients</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {isLoading ? (
              <Skeleton className="h-[140px] w-full rounded-lg" />
            ) : data && data.speciesDistribution.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={data.speciesDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {data.speciesDistribution.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={SPECIES_COLORS[entry.name] ?? "#a1a1aa"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => [`${v}%`, ""]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {data.speciesDistribution.map(({ name, value }) => (
                    <div key={name} className="flex items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{
                          background: SPECIES_COLORS[name] ?? "#a1a1aa",
                        }}
                      />
                      <span className="text-xs text-muted-foreground flex-1">
                        {SPECIES_LABELS[name] ?? name}
                      </span>
                      <span className="text-xs font-medium">{value}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm py-8 text-center">
                No active patients yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Today's appointments */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Today's Appointments</CardTitle>
              <CardDescription>
                {data
                  ? `${data.stats.todayAppointments.total} total · ${data.stats.todayAppointments.completed} completed`
                  : " "}
              </CardDescription>
            </div>
            <Progress value={completedPct} className="w-24" />
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 px-6 py-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : data && data.todaysAppointments.length > 0 ? (
              <div className="divide-y">
                {data.todaysAppointments.map((appt) => {
                  const cfg = STATUS_CONFIG[appt.status] ?? {
                    label: appt.status,
                    variant: "outline" as const,
                  };
                  return (
                    <div
                      key={appt.id}
                      className="flex items-center gap-3 px-6 py-3"
                    >
                      <div className="flex size-8 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950 shrink-0">
                        <PawPrint className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-none">
                          {appt.pet.name}
                        </p>
                        <p className="text-muted-foreground truncate text-xs mt-0.5">
                          {appt.pet.owner.first_name} {appt.pet.owner.last_name}{" "}
                          · {APPOINTMENT_TYPE_LABELS[appt.type] ?? appt.type}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {formatTime(appt.start_at)}
                        </div>
                        <Badge variant={cfg.variant} className="text-xs py-0">
                          {cfg.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm py-8 text-center">
                No appointments scheduled for today
              </p>
            )}
            <Separator />
            <div className="px-6 py-3">
              <Link
                to="/appointments"
                className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
              >
                View all appointments <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Ward + alerts */}
        <div className="flex flex-col gap-4">
          {/* Ward status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ward Status</CardTitle>
              <CardDescription>
                {data
                  ? `${data.stats.wardOccupancy.occupied} of ${data.stats.wardOccupancy.total} kennels occupied`
                  : " "}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))
              ) : data && data.wardStatus.length > 0 ? (
                data.wardStatus.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg border bg-muted shrink-0">
                      <BedDouble className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-none">
                        {entry.kennel.label} · {entry.pet.name}
                      </p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {SPECIES_LABELS[entry.pet.species] ?? entry.pet.species}{" "}
                        · admitted{" "}
                        {formatDistanceToNow(new Date(entry.admitted_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  No pets currently admitted
                </p>
              )}
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : data &&
                (data.alerts.lowStock.length > 0 ||
                  data.alerts.abnormalLabResults.length > 0) ? (
                <>
                  {data.alerts.lowStock.map((item, i) => (
                    <div key={item.id}>
                      {i > 0 && <Separator className="mb-3" />}
                      <div className="flex items-start gap-3">
                        <Package className="size-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium leading-none">
                            Low stock
                          </p>
                          <p className="text-muted-foreground text-xs mt-0.5">
                            {item.name}: {item.quantity_on_hand} {item.unit}{" "}
                            left
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {data.alerts.abnormalLabResults.map((result, i) => (
                    <div key={result.id}>
                      {(i > 0 || data.alerts.lowStock.length > 0) && (
                        <Separator className="mb-3" />
                      )}
                      <div className="flex items-start gap-3">
                        <FlaskConical className="size-4 text-brand-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium leading-none">
                            Abnormal result
                          </p>
                          <p className="text-muted-foreground text-xs mt-0.5">
                            {result.lab_order.pet.name}'s {result.test_name} —{" "}
                            {result.value}
                            {result.unit ?? ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  No alerts
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
