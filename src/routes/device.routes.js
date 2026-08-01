// import { deviceController } from '../controllers/device.controller.js';
// import { createCrudRoutes } from './createCrudRoutes.js';

// export default createCrudRoutes(deviceController);
// routes/device.routes.js
import { deviceController } from '../controllers/device.controller.js';
import { createCrudRoutes } from './createCrudRoutes.js';

const router = createCrudRoutes(deviceController);

// Add custom routes
router.get('/user', deviceController.getUserDevices);

export default router;