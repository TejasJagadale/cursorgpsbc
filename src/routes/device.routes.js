import { deviceController } from '../controllers/device.controller.js';
import { createCrudRoutes } from './createCrudRoutes.js';

export default createCrudRoutes(deviceController);
