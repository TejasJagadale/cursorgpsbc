// import { deviceController } from '../controllers/device.controller.js';
// import { createCrudRoutes } from './createCrudRoutes.js';

// export default createCrudRoutes(deviceController);
// routes/device.routes.js
// routes/device.routes.js
import { Router } from 'express';
import { deviceController } from '../controllers/device.controller.js';
import { createCrudRoutes } from './createCrudRoutes.js';

// Create the router with CRUD routes
const router = createCrudRoutes(deviceController);

// Add custom routes after the CRUD routes
// IMPORTANT: This must be defined AFTER the CRUD routes to not conflict with /:id
router.get('/user', deviceController.getUserDevices);

export default router;