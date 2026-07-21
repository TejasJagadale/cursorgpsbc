import { vehicleController } from '../controllers/vehicle.controller.js';
import { createCrudRoutes } from './createCrudRoutes.js';

export default createCrudRoutes(vehicleController);
