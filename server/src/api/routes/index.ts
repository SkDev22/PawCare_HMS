import { Router, IRouter } from 'express';
import { authRouter } from '../../modules/auth/auth.routes';
import { patientsRouter } from '../../modules/patients/patients.routes';
import { appointmentsRouter } from '../../modules/appointments/appointments.routes';
import { emrRouter } from '../../modules/emr/emr.routes';
import { billingRouter } from '../../modules/billing/billing.routes';
import { staffRouter } from '../../modules/staff/staff.routes';
import { labRouter } from '../../modules/laboratory/lab.routes';
import { wardRouter } from '../../modules/ward/ward.routes';
import { inventoryRouter } from '../../modules/inventory/inventory.routes';
import { reportsRouter } from '../../modules/reports/reports.routes';
import { notificationsRouter } from '../../modules/notifications/notifications.routes';
import { dashboardRouter } from '../../modules/dashboard/dashboard.routes';

export const apiRouter: IRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/', patientsRouter);
apiRouter.use('/appointments', appointmentsRouter);
apiRouter.use('/medical-records', emrRouter);
apiRouter.use('/billing', billingRouter);
apiRouter.use('/staff', staffRouter);
apiRouter.use('/lab-orders', labRouter);
apiRouter.use('/ward', wardRouter);
apiRouter.use('/inventory', inventoryRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/notifications', notificationsRouter);
