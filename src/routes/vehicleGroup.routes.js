// routes/vehicleGroup.routes.js
import { Router } from 'express';
import { 
  vehicleGroupController, 
  getVehicleGroupWithAccess, 
  updateVehicleGroupWithAccess 
} from '../controllers/vehicleGroup.controller.js';
import { createCrudRoutes } from './createCrudRoutes.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Apply authentication middleware
router.use(authenticate);

// Custom routes for vehicle group with access
router.get('/:id/with-access', getVehicleGroupWithAccess);
router.patch('/:id/with-access', updateVehicleGroupWithAccess);

// Standard CRUD routes
const crudRoutes = createCrudRoutes(vehicleGroupController);
router.use('/', crudRoutes);

export default router;