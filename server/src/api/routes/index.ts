import { Router, IRouter } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorizeFeature } from '../../middleware/authorize-feature';
import { authRouter } from '../../modules/auth/auth.routes';
import { patientsRouter } from '../../modules/patients/patients.routes';
import { appointmentsRouter } from '../../modules/appointments/appointments.routes';
import { emrRouter } from '../../modules/emr/emr.routes';
import { billingRouter } from '../../modules/billing/billing.routes';
import { staffRouter } from '../../modules/staff/staff.routes';
import { clinicRouter } from '../../modules/clinic/clinic.routes';
import { labRouter } from '../../modules/laboratory/lab.routes';
import { wardRouter } from '../../modules/ward/ward.routes';
import { inventoryRouter } from '../../modules/inventory/inventory.routes';
import { grnRouter } from '../../modules/grn/grn.routes';
import { suppliersRouter } from '../../modules/suppliers/suppliers.routes';
import { reportsRouter } from '../../modules/reports/reports.routes';
import { notificationsRouter } from '../../modules/notifications/notifications.routes';
import { dashboardRouter } from '../../modules/dashboard/dashboard.routes';
import { searchRouter } from '../../modules/search/search.routes';
import { auditLogRouter } from '../../modules/audit-log/audit-log.routes';

export const apiRouter: IRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/search', searchRouter);
apiRouter.use('/', patientsRouter);
apiRouter.use('/appointments', appointmentsRouter);
apiRouter.use('/medical-records', emrRouter);
apiRouter.use('/billing', billingRouter);
apiRouter.use('/staff', staffRouter);
apiRouter.use('/audit-log', auditLogRouter);
apiRouter.use('/clinic', clinicRouter);
// These four modules differ by plan (ADR-04) — gate them once here rather
// than touching every route's own authenticate/authorize chain. authenticate
// runs again inside each router too (each route already calls it directly);
// that's redundant but harmless, and keeps this the only place plan-gating
// needs to be added or changed per module.
apiRouter.use('/lab-orders', authenticate, authorizeFeature('LABORATORY', { allowReadWithoutFeature: true }), labRouter);
apiRouter.use(
  '/ward',
  authenticate,
  authorizeFeature('WARD', {
    allowReadWithoutFeature: true,
    // Discharging a patient (which frees their kennel) and logging care during
    // their stay must stay reachable even after a downgrade — otherwise a pet
    // admitted while the clinic had WARD gets stranded with no way out.
    exemptPaths: [
      /^\/hospitalizations\/[^/]+\/discharge$/,
      /^\/hospitalizations\/[^/]+\/care-logs$/,
    ],
  }),
  wardRouter,
);
apiRouter.use('/inventory', authenticate, authorizeFeature('INVENTORY', { allowReadWithoutFeature: true }), inventoryRouter);
apiRouter.use('/grn', authenticate, authorizeFeature('INVENTORY', { allowReadWithoutFeature: true }), grnRouter);
apiRouter.use('/suppliers', authenticate, authorizeFeature('INVENTORY', { allowReadWithoutFeature: true }), suppliersRouter);
// Reports has no "old data" of its own — every endpoint is a live computed
// read over other tables, so unlike the modules above, letting GET through
// here would just remove the plan gate entirely. Stays hard-gated.
apiRouter.use('/reports', authenticate, authorizeFeature('REPORTS'), reportsRouter);
apiRouter.use('/notifications', notificationsRouter);
