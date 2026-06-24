import { Router, IRouter } from 'express';
import { authRouter } from '../../modules/auth/auth.routes';
import { patientsRouter } from '../../modules/patients/patients.routes';
import { appointmentsRouter } from '../../modules/appointments/appointments.routes';
import { emrRouter } from '../../modules/emr/emr.routes';
import { billingRouter } from '../../modules/billing/billing.routes';
import { staffRouter } from '../../modules/staff/staff.routes';

export const apiRouter: IRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/', patientsRouter);
apiRouter.use('/appointments', appointmentsRouter);
apiRouter.use('/medical-records', emrRouter);
apiRouter.use('/billing', billingRouter);
apiRouter.use('/staff', staffRouter);

// Modules will be registered here as they are implemented:
// apiRouter.use('/medical-records',  medicalRecordsRouter); — done above
// apiRouter.use('/inventory',        inventoryRouter);
// apiRouter.use('/invoices',         invoicesRouter);
// apiRouter.use('/staff',            staffRouter);
// apiRouter.use('/lab-orders',       labOrdersRouter);
// apiRouter.use('/hospitalizations', hospitalizationsRouter);
// apiRouter.use('/ward',             wardRouter);
// apiRouter.use('/reports',          reportsRouter);
// apiRouter.use('/portal',           portalRouter);
