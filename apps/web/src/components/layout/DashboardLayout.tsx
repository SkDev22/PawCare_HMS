import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, PawPrint, FileText, Receipt,
  Package, Users, FlaskConical, BedDouble, BarChart3,
  LogOut, Menu, X, ChevronRight, ChevronLeft,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '../ui/tooltip';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',       href: '/dashboard',    icon: <LayoutDashboard className="w-5 h-5 shrink-0" /> },
  { label: 'Appointments',    href: '/appointments', icon: <CalendarDays className="w-5 h-5 shrink-0" /> },
  { label: 'Patients',        href: '/patients',     icon: <PawPrint className="w-5 h-5 shrink-0" /> },
  { label: 'Medical Records', href: '/emr',          icon: <FileText className="w-5 h-5 shrink-0" /> },
  { label: 'Billing',         href: '/billing',      icon: <Receipt className="w-5 h-5 shrink-0" /> },
  { label: 'Inventory',       href: '/inventory',    icon: <Package className="w-5 h-5 shrink-0" /> },
  { label: 'Staff',           href: '/staff',        icon: <Users className="w-5 h-5 shrink-0" /> },
  { label: 'Laboratory',      href: '/laboratory',   icon: <FlaskConical className="w-5 h-5 shrink-0" /> },
  { label: 'Ward',            href: '/ward',         icon: <BedDouble className="w-5 h-5 shrink-0" /> },
  { label: 'Reports',         href: '/reports',      icon: <BarChart3 className="w-5 h-5 shrink-0" /> },
];

interface Props {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAuth();
      navigate('/login', { replace: true });
    }
  };

  const userInitials = user
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : '??';

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-30 bg-white border-r border-slate-200',
            'transition-[width] duration-200 ease-in-out',
            'lg:relative lg:translate-x-0',
            collapsed ? 'w-16' : 'w-64',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {/* Collapse/expand toggle — desktop only, floats on the right border */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              'hidden lg:flex absolute -right-3 top-5 z-10',
              'w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm',
              'items-center justify-center',
              'text-slate-400 hover:text-slate-700 hover:border-slate-300',
              'transition-colors',
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <ChevronRight className="w-3 h-3" />
              : <ChevronLeft className="w-3 h-3" />
            }
          </button>

          {/* Inner wrapper — clips content during width animation */}
          <div className="absolute inset-0 flex flex-col overflow-hidden">
            {/* Logo */}
            <div className={cn(
              'h-16 flex items-center border-b border-slate-200 shrink-0',
              collapsed ? 'justify-center px-0' : 'gap-3 px-5',
            )}>
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
                <PawPrint className="w-4 h-4 text-white" />
              </div>
              {!collapsed && (
                <>
                  <span className="font-bold text-slate-900 text-lg whitespace-nowrap">
                    PawCare HMS
                  </span>
                  <button
                    className="ml-auto lg:hidden text-slate-400 hover:text-slate-600"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Navigation */}
            <nav className={cn('flex-1 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')}>
              <ul className="space-y-0.5">
                {NAV_ITEMS.map(({ label, href, icon }) => {
                  const link = (
                    <NavLink
                      to={href}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center rounded-lg text-sm font-medium transition-colors',
                          collapsed
                            ? 'justify-center p-2.5'
                            : 'gap-3 px-3 py-2.5 w-full group',
                          isActive
                            ? 'bg-brand-50 text-brand-700'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                        )
                      }
                    >
                      {icon}
                      {!collapsed && (
                        <>
                          <span className="flex-1 whitespace-nowrap">{label}</span>
                          <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                        </>
                      )}
                    </NavLink>
                  );

                  return (
                    <li key={href}>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{link}</TooltipTrigger>
                          <TooltipContent side="right">{label}</TooltipContent>
                        </Tooltip>
                      ) : link}
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* User section */}
            <div className={cn('border-t border-slate-200', collapsed ? 'p-2' : 'p-4')}>
              {collapsed ? (
                <div className="flex flex-col items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm cursor-default select-none">
                        {userInitials}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p className="font-medium">
                        {user ? `${user.first_name} ${user.last_name}` : '—'}
                      </p>
                      <p className="text-slate-400 capitalize text-xs mt-0.5">
                        {user?.role.toLowerCase().replace('_', ' ')}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleLogout}
                        className="p-2 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                        aria-label="Sign out"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Sign out</TooltipContent>
                  </Tooltip>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm shrink-0">
                      {userInitials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {user ? `${user.first_name} ${user.last_name}` : '—'}
                      </p>
                      <p className="text-xs text-slate-500 truncate capitalize">
                        {user?.role.toLowerCase().replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center px-5 gap-4 shrink-0">
            <button
              className="lg:hidden text-slate-400 hover:text-slate-600"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1" />
            <div className="text-sm text-slate-500">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
