// import { licenseController } from '../controllers/license.controller.js';
// import { createCrudRoutes } from './createCrudRoutes.js';

// export default createCrudRoutes(licenseController);


import { Router } from 'express';
import { licenseController } from '../controllers/license.controller.js';
import { activateLicense } from '../controllers/licenseActivation.controller.js';
import { createCrudRoutes } from './createCrudRoutes.js';

const router = Router();

// Custom action first so it doesn't collide with the CRUD /:id route
router.post('/activate', activateLicense);

// Existing generic CRUD routes (list, get by id, create, update, delete)
router.use('/', createCrudRoutes(licenseController));

export default router;