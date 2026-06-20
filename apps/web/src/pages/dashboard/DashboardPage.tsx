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
} from 'lucide-react';
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
  Legend,
} from 'recharts';
import { useAuthStore } from '@/stores/auth.store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

// ── Sample data ─────────────────────────────────────────────────────────────
const MONTHLY_VISITS = [
  { month: 'Jan', visits: 142 },
  { month: 'Feb', visits: 168 },
  { month: 'Mar', visits: 195 },
  { month: 'Apr', visits: 178 },
  { month: 'May', visits: 220 },
  { month: 'Jun', visits: 248 },
];

const SPECIES_DATA = [
  { name: 'Dogs', value: 48, color: '#6366f1' },
  { name: 'Cats', value: 31, color: '#8b5cf6' },
  { name: 'Birds', value: 9, color: '#a78bfa' },
  { name: 'Rabbits', value: 7, color: '#c4b5fd' },
  { name: 'Other', value: 5, color: '#ddd6fe' },
];

const RECENT_APPOINTMENTS = [
  { id: '1', pet: 'Rex', species: 'Dog', owner: 'James Wilson', type: 'Wellness Exam', time: '09:00', status: 'completed' },
  { id: '2', pet: 'Luna', species: 'Cat', owner: 'Sarah Chen', type: 'Vaccination', time: '10:30', status: 'in_progress' },
  { id: '3', pet: 'Buddy', species: 'Dog', owner: 'Mike Johnson', type: 'Dental Cleaning', time: '11:00', status: 'scheduled' },
  { id: '4', pet: 'Mango', species: 'Bird', owner: 'Emily Rodriguez', type: 'Sick Visit', time: '13:30', status: 'scheduled' },
  { id: '5', pet: 'Whiskers', species: 'Cat', owner: 'David Park', type: 'Follow-up', time: '14:00', status: 'scheduled' },
];

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  completed:    { label: 'Completed',   variant: 'secondary' },
  in_progress:  { label: 'In Progress', variant: 'default'   },
  scheduled:    { label: 'Scheduled',   variant: 'outline'   },
  cancelled:    { label: 'Cancelled',   variant: 'destructive' },
};

const WARD_UNITS = [
  { id: 'K-01', pet: 'Max', species: 'Dog', since: '2 days', status: 'stable' },
  { id: 'K-02', pet: 'Bella', species: 'Cat', since: '1 day', status: 'monitoring' },
  { id: 'K-03', pet: 'Charlie', species: 'Dog', since: '4 hours', status: 'critical' },
];

// ── Stat cards ───────────────────────────────────────────────────────────────
const STATS = [
  {
    label: "Today's Appointments",
    value: '12',
    sub: '8 completed · 4 remaining',
    trend: '+3 vs yesterday',
    up: true,
    icon: CalendarDays,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950',
  },
  {
    label: 'Active Patients',
    value: '347',
    sub: '23 registered this month',
    trend: '+6.8% vs last month',
    up: true,
    icon: PawPrint,
    color: 'text-brand-600',
    bg: 'bg-brand-50 dark:bg-brand-950',
  },
  {
    label: 'Monthly Revenue',
    value: '$18,420',
    sub: '14 outstanding invoices',
    trend: '+12.3% vs last month',
    up: true,
    icon: Receipt,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950',
  },
  {
    label: 'Ward Occupancy',
    value: '3 / 12',
    sub: '9 kennels available',
    trend: '-2 from yesterday',
    up: false,
    icon: BedDouble,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950',
  },
];

// ── Component ────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Good {getGreeting()}, {user?.first_name ?? 'there'}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Here's what's happening at PawCare today.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map(({ label, value, sub, trend, up, icon: Icon, color, bg }) => (
          <Card key={label} className="gap-3">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-sm font-medium">{label}</CardDescription>
              <div className={`flex size-9 items-center justify-center rounded-lg ${bg} ${color}`}>
                <Icon className="size-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{sub}</p>
              <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${up ? 'text-emerald-600' : 'text-rose-500'}`}>
                {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {trend}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Visit trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Monthly Patient Visits</CardTitle>
            <CardDescription>Total clinic visits over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={MONTHLY_VISITS} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="visitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v) => [`${v} visits`, 'Visits']}
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
          </CardContent>
        </Card>

        {/* Species distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Patient Species</CardTitle>
            <CardDescription>Distribution of active patients</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie
                  data={SPECIES_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {SPECIES_DATA.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v}%`, '']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {SPECIES_DATA.map(({ name, value, color }) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
                  <span className="text-xs text-muted-foreground flex-1">{name}</span>
                  <span className="text-xs font-medium">{value}%</span>
                </div>
              ))}
            </div>
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
              <CardDescription>12 total · 8 completed</CardDescription>
            </div>
            <Progress value={67} className="w-24" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {RECENT_APPOINTMENTS.map((appt) => {
                const cfg = STATUS_CONFIG[appt.status];
                return (
                  <div key={appt.id} className="flex items-center gap-3 px-6 py-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950 shrink-0">
                      <PawPrint className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-none">{appt.pet}</p>
                      <p className="text-muted-foreground truncate text-xs mt-0.5">
                        {appt.owner} · {appt.type}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {appt.time}
                      </div>
                      <Badge variant={cfg.variant} className="text-xs py-0">
                        {cfg.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
            <Separator />
            <div className="px-6 py-3">
              <button className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
                View all appointments <ArrowRight className="size-3" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Ward + alerts */}
        <div className="flex flex-col gap-4">
          {/* Ward status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ward Status</CardTitle>
              <CardDescription>3 of 12 kennels occupied</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {WARD_UNITS.map((unit) => (
                <div key={unit.id} className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg border bg-muted shrink-0">
                    <BedDouble className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-none">{unit.id} · {unit.pet}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{unit.species} · {unit.since}</p>
                  </div>
                  <span
                    className={`text-xs font-medium capitalize ${
                      unit.status === 'critical'
                        ? 'text-rose-500'
                        : unit.status === 'monitoring'
                        ? 'text-amber-500'
                        : 'text-emerald-600'
                    }`}
                  >
                    {unit.status}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex items-start gap-3">
                <Package className="size-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium leading-none">Low stock</p>
                  <p className="text-muted-foreground text-xs mt-0.5">Amoxicillin 250mg: 3 units left</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <FlaskConical className="size-4 text-brand-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium leading-none">Lab results ready</p>
                  <p className="text-muted-foreground text-xs mt-0.5">Luna's CBC panel — review pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
