import { Router } from 'express';
import { authRouter } from '../../modules/auth/auth.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);

// Modules will be registered here as they are implemented:
// apiRouter.use('/owners',           ownersRouter);
// apiRouter.use('/pets',             petsRouter);
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
