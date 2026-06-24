import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/auth.store';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { OwnersPage } from './pages/patients/OwnersPage';
import { OwnerDetailPage } from './pages/patients/OwnerDetailPage';
import { PetsPage } from './pages/patients/PetsPage';
import { PetDetailPage } from './pages/patients/PetDetailPage';
import { AppointmentsPage } from './pages/appointments/AppointmentsPage';
import { AppointmentDetailPage } from './pages/appointments/AppointmentDetailPage';
import { EmrPage } from './pages/emr/EmrPage';
import { EmrDetailPage } from './pages/emr/EmrDetailPage';
import { BillingPage } from './pages/billing/BillingPage';
import { InvoiceDetailPage } from './pages/billing/InvoiceDetailPage';
import { StaffPage } from './pages/staff/StaffPage';
import { StaffDetailPage } from './pages/staff/StaffDetailPage';

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

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <DashboardLayout>{children}</DashboardLayout>
    </RequireAuth>
  );
}

export function App() {
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

          <Route path="/dashboard" element={<AuthLayout><DashboardPage /></AuthLayout>} />

          {/* Patient Management */}
          <Route path="/owners"     element={<AuthLayout><OwnersPage /></AuthLayout>} />
          <Route path="/owners/:id" element={<AuthLayout><OwnerDetailPage /></AuthLayout>} />
          <Route path="/patients"   element={<AuthLayout><PetsPage /></AuthLayout>} />
          <Route path="/patients/:id" element={<AuthLayout><PetDetailPage /></AuthLayout>} />

          {/* Appointments */}
          <Route path="/appointments"     element={<AuthLayout><AppointmentsPage /></AuthLayout>} />
          <Route path="/appointments/:id" element={<AuthLayout><AppointmentDetailPage /></AuthLayout>} />

          {/* Medical Records (EMR) */}
          <Route path="/emr"     element={<AuthLayout><EmrPage /></AuthLayout>} />
          <Route path="/emr/:id" element={<AuthLayout><EmrDetailPage /></AuthLayout>} />

          {/* Billing & Invoicing */}
          <Route path="/billing"     element={<AuthLayout><BillingPage /></AuthLayout>} />
          <Route path="/billing/:id" element={<AuthLayout><InvoiceDetailPage /></AuthLayout>} />

          {/* Staff Management */}
          <Route path="/staff"     element={<AuthLayout><StaffPage /></AuthLayout>} />
          <Route path="/staff/:id" element={<AuthLayout><StaffDetailPage /></AuthLayout>} />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
