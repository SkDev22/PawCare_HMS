import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import type { PermissionKey, AuthUser } from '@pawcare/shared';
import { useAuthStore } from './stores/auth.store';
import { hasPermission } from './lib/permissions';
import { api } from './lib/api';
import { ForbiddenPage } from './components/ForbiddenPage';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { OwnersPage } from './pages/patients/OwnersPage';
import { OwnerDetailPage } from './pages/patients/OwnerDetailPage';
import { PetsPage } from './pages/patients/PetsPage';
import { PetDetailPage } from './pages/patients/PetDetailPage';
import { RegisterPage } from './pages/patients/RegisterPage';
import { AppointmentsPage } from './pages/appointments/AppointmentsPage';
import { AppointmentDetailPage } from './pages/appointments/AppointmentDetailPage';
import { QueuePage } from './pages/appointments/QueuePage';
import { EmrPage } from './pages/emr/EmrPage';
import { EmrDetailPage } from './pages/emr/EmrDetailPage';
import { MedicalHistoryPage } from './pages/emr/MedicalHistoryPage';
import { BillingPage } from './pages/billing/BillingPage';
import { InvoiceDetailPage } from './pages/billing/InvoiceDetailPage';
import { StaffPage } from './pages/staff/StaffPage';
import { StaffDetailPage } from './pages/staff/StaffDetailPage';
import { LabPage } from './pages/lab/LabPage';
import { LabOrderDetailPage } from './pages/lab/LabOrderDetailPage';
import { WardPage } from './pages/ward/WardPage';
import { HospitalizationDetailPage } from './pages/ward/HospitalizationDetailPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { InventoryNewPage } from './pages/inventory/InventoryNewPage';
import { InventoryEditPage } from './pages/inventory/InventoryEditPage';
import { InventoryDetailPage } from './pages/inventory/InventoryDetailPage';
import { InventoryAlertsPage } from './pages/inventory/InventoryAlertsPage';
import { GrnListPage } from './pages/inventory/grn/GrnListPage';
import { GrnFormPage } from './pages/inventory/grn/GrnFormPage';
import { GrnDetailPage } from './pages/inventory/grn/GrnDetailPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { ReportDetailPage } from './pages/reports/ReportDetailPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { ProfilePage } from './pages/profile/ProfilePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return accessToken ? <>{children}</> : <Navigate to="/login" replace />;
}

function RequireGuest({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return accessToken ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function FullScreenLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function AuthLayout({
  children,
  permission,
}: {
  children: React.ReactNode;
  permission?: PermissionKey;
}) {
  const role = useAuthStore((s) => s.user?.role);
  const allowed = !permission || hasPermission(role, permission);

  return (
    <RequireAuth>
      <DashboardLayout>{allowed ? children : <ForbiddenPage />}</DashboardLayout>
    </RequireAuth>
  );
}

// Silently restores the session from the HttpOnly refresh cookie on first
// load (page refresh, direct URL entry, etc.) before route guards decide
// whether to bounce to /login — otherwise every reload looks logged-out
// since the access token only ever lived in memory.
function useAuthBootstrap() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const finishBootstrap = useAuthStore((s) => s.finishBootstrap);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);

  useEffect(() => {
    let cancelled = false;

    api
      .post<{ accessToken: string; staff: AuthUser }>('/auth/refresh')
      .then((res) => {
        if (cancelled) return;
        setAuth(res.data.staff, res.data.accessToken);
      })
      .catch(() => {
        // No valid refresh cookie — user simply isn't logged in.
      })
      .finally(() => {
        if (!cancelled) finishBootstrap();
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isBootstrapping;
}

export function App() {
  const isBootstrapping = useAuthBootstrap();

  if (isBootstrapping) return <FullScreenLoader />;

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <RequireGuest>
                <LoginPage />
              </RequireGuest>
            }
          />

          <Route path="/dashboard" element={<AuthLayout permission="DASHBOARD_READ"><DashboardPage /></AuthLayout>} />

          {/* Patient Management */}
          <Route path="/owners"     element={<AuthLayout permission="PATIENT_READ"><OwnersPage /></AuthLayout>} />
          <Route path="/owners/:id" element={<AuthLayout permission="PATIENT_READ"><OwnerDetailPage /></AuthLayout>} />
          <Route path="/patients"   element={<AuthLayout permission="PATIENT_READ"><PetsPage /></AuthLayout>} />
          <Route path="/patients/register" element={<AuthLayout permission="PATIENT_WRITE"><RegisterPage /></AuthLayout>} />
          <Route path="/patients/:id" element={<AuthLayout permission="PATIENT_READ"><PetDetailPage /></AuthLayout>} />

          {/* Appointments */}
          <Route path="/appointments"       element={<AuthLayout permission="APPOINTMENT_READ"><AppointmentsPage /></AuthLayout>} />
          <Route path="/appointments/queue" element={<AuthLayout permission="APPOINTMENT_READ"><QueuePage /></AuthLayout>} />
          <Route path="/appointments/:id"   element={<AuthLayout permission="APPOINTMENT_READ"><AppointmentDetailPage /></AuthLayout>} />

          {/* Medical Records (EMR) */}
          <Route path="/emr"         element={<AuthLayout permission="MEDICAL_RECORD_READ"><EmrPage /></AuthLayout>} />
          <Route path="/emr/history" element={<AuthLayout permission="MEDICAL_RECORD_READ"><MedicalHistoryPage /></AuthLayout>} />
          <Route path="/emr/:id"     element={<AuthLayout permission="MEDICAL_RECORD_READ"><EmrDetailPage /></AuthLayout>} />

          {/* Billing & Invoicing */}
          <Route path="/billing"     element={<AuthLayout permission="INVOICE_READ"><BillingPage /></AuthLayout>} />
          <Route path="/billing/:id" element={<AuthLayout permission="INVOICE_READ"><InvoiceDetailPage /></AuthLayout>} />

          {/* Staff Management */}
          <Route path="/staff"     element={<AuthLayout permission="STAFF_READ"><StaffPage /></AuthLayout>} />
          <Route path="/staff/:id" element={<AuthLayout permission="STAFF_READ"><StaffDetailPage /></AuthLayout>} />

          {/* Laboratory */}
          <Route path="/lab"     element={<AuthLayout permission="LAB_ORDER_WRITE"><LabPage /></AuthLayout>} />
          <Route path="/lab/:id" element={<AuthLayout permission="LAB_ORDER_WRITE"><LabOrderDetailPage /></AuthLayout>} />

          {/* Ward & Hospitalization */}
          <Route path="/ward"     element={<AuthLayout permission="WARD_READ"><WardPage /></AuthLayout>} />
          <Route path="/ward/:id" element={<AuthLayout permission="WARD_READ"><HospitalizationDetailPage /></AuthLayout>} />

          {/* Inventory */}
          <Route path="/inventory"          element={<AuthLayout permission="INVENTORY_READ"><InventoryPage /></AuthLayout>} />
          <Route path="/inventory/new"      element={<AuthLayout permission="INVENTORY_WRITE"><InventoryNewPage /></AuthLayout>} />
          <Route path="/inventory/alerts"   element={<AuthLayout permission="INVENTORY_READ"><InventoryAlertsPage /></AuthLayout>} />
          <Route path="/inventory/grn"      element={<AuthLayout permission="INVENTORY_READ"><GrnListPage /></AuthLayout>} />
          <Route path="/inventory/grn/new"  element={<AuthLayout permission="INVENTORY_WRITE"><GrnFormPage /></AuthLayout>} />
          <Route path="/inventory/grn/:id"  element={<AuthLayout permission="INVENTORY_READ"><GrnDetailPage /></AuthLayout>} />
          <Route path="/inventory/:id"      element={<AuthLayout permission="INVENTORY_READ"><InventoryDetailPage /></AuthLayout>} />
          <Route path="/inventory/:id/edit" element={<AuthLayout permission="INVENTORY_WRITE"><InventoryEditPage /></AuthLayout>} />

          {/* Reports */}
          <Route path="/reports"      element={<AuthLayout permission="REPORT_READ"><ReportsPage /></AuthLayout>} />
          <Route path="/reports/:key" element={<AuthLayout permission="REPORT_READ"><ReportDetailPage /></AuthLayout>} />

          {/* Notifications */}
          <Route path="/notifications" element={<AuthLayout><NotificationsPage /></AuthLayout>} />

          {/* Settings & Profile — available to every authenticated role */}
          <Route path="/settings" element={<AuthLayout><SettingsPage /></AuthLayout>} />
          <Route path="/profile"  element={<AuthLayout><ProfilePage /></AuthLayout>} />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
