import { useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart3, DollarSign, Calendar, Package, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  useRevenueReport,
  useAppointmentsReport,
  useInventoryUsageReport,
  useOutstandingBalances,
} from '../../hooks/use-reports';

// ── Date helpers ──────────────────────────────────────────────────────────────

const TODAY   = new Date();
const fmt     = (d: Date) => format(d, 'yyyy-MM-dd');

const PRESETS = [
  { label: 'Last 7 days',   start: fmt(subDays(TODAY, 6)),     end: fmt(TODAY) },
  { label: 'Last 30 days',  start: fmt(subDays(TODAY, 29)),    end: fmt(TODAY) },
  { label: 'This month',    start: fmt(startOfMonth(TODAY)),   end: fmt(endOfMonth(TODAY)) },
  { label: 'Last month',    start: fmt(startOfMonth(subDays(startOfMonth(TODAY), 1))),
                             end: fmt(endOfMonth(subDays(startOfMonth(TODAY), 1))) },
];

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#14b8a6'];

// ── Revenue Tab ───────────────────────────────────────────────────────────────

function RevenueTab({ start, end }: { start: string; end: string }) {
  const { data, isLoading } = useRevenueReport(start, end);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  const methodData = Object.entries(data.byMethod).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-3xl font-bold mt-1">${data.totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <p className="text-3xl font-bold mt-1 text-orange-600">${data.totalOutstanding.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {data.dailySeries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Daily Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.dailySeries}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => format(new Date(v), 'MMM d')} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Revenue']} />
                <Bar dataKey="amount" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {methodData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue by Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={methodData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {methodData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {data.dailySeries.length === 0 && methodData.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <DollarSign className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No revenue data for this period</p>
        </div>
      )}
    </div>
  );
}

// ── Appointments Tab ──────────────────────────────────────────────────────────

function AppointmentsTab({ start, end }: { start: string; end: string }) {
  const { data, isLoading } = useAppointmentsReport(start, end);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  const statusData = Object.entries(data.byStatus).map(([name, value]) => ({ name, value }));
  const typeData   = Object.entries(data.byType).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{data.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-green-600">{data.byStatus['COMPLETED'] ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">No-Show Rate</p>
            <p className="text-2xl font-bold text-orange-600">{data.noShowRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Cancellation Rate</p>
            <p className="text-2xl font-bold text-red-600">{data.cancellationRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {data.dailySeries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Daily Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.dailySeries}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => format(new Date(v), 'MMM d')} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#22c55e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {typeData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">By Appointment Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {typeData.sort((a, b) => b.value - a.value).map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground capitalize text-xs">{d.name.toLowerCase()}</span>
                    <Badge variant="secondary" className="text-xs">{d.value}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {statusData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">By Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {statusData.sort((a, b) => b.value - a.value).map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground capitalize text-xs">
                      {d.name.replace(/_/g, ' ').toLowerCase()}
                    </span>
                    <Badge variant="secondary" className="text-xs">{d.value}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {data.total === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No appointments in this period</p>
        </div>
      )}
    </div>
  );
}

// ── Inventory Usage Tab ───────────────────────────────────────────────────────

function InventoryTab({ start, end }: { start: string; end: string }) {
  const { data, isLoading } = useInventoryUsageReport(start, end);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Card className="flex-1">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Dispenses</p>
            <p className="text-2xl font-bold">{data.totalTransactions}</p>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Unique Items Used</p>
            <p className="text-2xl font-bold">{data.items.length}</p>
          </CardContent>
        </Card>
      </div>

      {data.items.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Items Dispensed</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, data.items.slice(0, 10).length * 36)}>
              <BarChart
                data={data.items.slice(0, 10).map((i) => ({ name: i.name, qty: i.totalDispensed, unit: i.unit }))}
                layout="vertical"
              >
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v, _n, p) => [`${v} ${p.payload.unit}`, 'Dispensed']} />
                <Bar dataKey="qty" fill="#f59e0b" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <Package className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No inventory dispensed in this period</p>
        </div>
      )}
    </div>
  );
}

// ── Outstanding Balances Tab ──────────────────────────────────────────────────

function BalancesTab() {
  const { data, isLoading } = useOutstandingBalances();

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Outstanding</p>
            <p className="text-2xl font-bold text-orange-600">${data.totalOutstanding.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Current (0–0d)</p>
            <p className="text-xl font-bold">${data.buckets.current.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">1–30 Days</p>
            <p className="text-xl font-bold text-yellow-600">${data.buckets.days30.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">31–60 Days</p>
            <p className="text-xl font-bold text-orange-600">${data.buckets.days60.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {data.buckets.days90plus > 0 && (
        <Card className="border-red-300 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700">90+ Day Overdue: ${data.buckets.days90plus.toFixed(2)}</p>
              <p className="text-xs text-red-600">
                {data.items.filter((i) => i.daysOverdue > 90).length} invoice(s) seriously overdue
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {data.items.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Invoices ({data.items.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Client</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Status</th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-3">Total</th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-3">Balance</th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-3">Days Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((inv) => (
                    <tr key={inv.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{inv.owner.first_name} {inv.owner.last_name}</p>
                        {inv.owner.email && <p className="text-xs text-muted-foreground">{inv.owner.email}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={inv.status === 'OVERDUE' ? 'destructive' : 'secondary'} className="text-xs">
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">${Number(inv.total).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">
                        ${inv.balance.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {inv.daysOverdue > 0 ? (
                          <span className={inv.daysOverdue > 90 ? 'text-red-600 font-medium' : inv.daysOverdue > 30 ? 'text-orange-600' : ''}>
                            {inv.daysOverdue}d
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">Current</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <BarChart3 className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No outstanding balances</p>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type ReportTab = 'revenue' | 'appointments' | 'inventory' | 'balances';

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('revenue');
  const [preset, setPreset]       = useState(0);
  const [startDate, setStartDate] = useState(PRESETS[1].start);
  const [endDate, setEndDate]     = useState(PRESETS[1].end);

  function applyPreset(idx: number) {
    setPreset(idx);
    setStartDate(PRESETS[idx].start);
    setEndDate(PRESETS[idx].end);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground">Financial, clinical, and operational insights</p>
      </div>

      {/* Date range controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p, i) => (
                <Button
                  key={i}
                  size="sm"
                  variant={preset === i ? 'default' : 'outline'}
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
                  onChange={(e) => { setStartDate(e.target.value); setPreset(-1); }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPreset(-1); }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportTab)}>
        <TabsList>
          <TabsTrigger value="revenue" className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" />Revenue
          </TabsTrigger>
          <TabsTrigger value="appointments" className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />Appointments
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-1">
            <Package className="h-3.5 w-3.5" />Inventory
          </TabsTrigger>
          <TabsTrigger value="balances" className="flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />Outstanding
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tab content */}
      {activeTab === 'revenue'      && <RevenueTab      start={startDate} end={endDate} />}
      {activeTab === 'appointments' && <AppointmentsTab start={startDate} end={endDate} />}
      {activeTab === 'inventory'    && <InventoryTab    start={startDate} end={endDate} />}
      {activeTab === 'balances'     && <BalancesTab />}
    </div>
  );
}
