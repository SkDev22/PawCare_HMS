import { CalendarDays, PawPrint, Receipt, Package } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';

interface StatCard {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
}

const STAT_CARDS: StatCard[] = [
  {
    label: "Today's Appointments",
    value: '—',
    sub: 'No data yet',
    icon: <CalendarDays className="w-6 h-6" />,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    label: 'Active Patients',
    value: '—',
    sub: 'No data yet',
    icon: <PawPrint className="w-6 h-6" />,
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    label: 'Outstanding Invoices',
    value: '—',
    sub: 'No data yet',
    icon: <Receipt className="w-6 h-6" />,
    color: 'bg-amber-50 text-amber-600',
  },
  {
    label: 'Low Stock Alerts',
    value: '—',
    sub: 'No data yet',
    icon: <Package className="w-6 h-6" />,
    color: 'bg-red-50 text-red-600',
  },
];

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Good {getGreeting()}, {user?.first_name ?? 'there'} 👋
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Here's what's happening at PawCare today.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {STAT_CARDS.map(({ label, value, sub, icon, color }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-600">{label}</span>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                {icon}
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Placeholder for upcoming features */}
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
        <PawPrint className="w-10 h-10 text-brand-300 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-slate-700">More modules coming soon</h2>
        <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
          Appointments, EMR, billing, inventory, and more will appear here as they are
          implemented.
        </p>
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
