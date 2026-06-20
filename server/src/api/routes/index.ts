import { Router, IRouter } from 'express';
import { authRouter } from '../../modules/auth/auth.routes';
import { patientsRouter } from '../../modules/patients/patients.routes';

export const apiRouter: IRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/', patientsRouter);

// Modules will be registered here as they are implemented:
// apiRouter.use('/appointments',     appointmentsRouter);
// apiRouter.use('/appointments',     appointmentsRouter);
// apiRouter.use('/medical-records',  medicalRecordsRouter);
// apiRouter.use('/inventory',        inventoryRouter);
// apiRouter.use('/invoices',         invoicesRouter);
// apiRouter.use('/staff',            staffRouter);
// apiRouter.use('/lab-orders',       labOrdersRouter);
// apiRouter.use('/hospitalizations', hospitalizationsRouter);
// apiRouter.use('/ward',             wardRouter);
// apiRouter.use('/reports',          reportsRouter);
// apiRouter.use('/portal',           portalRouter);
