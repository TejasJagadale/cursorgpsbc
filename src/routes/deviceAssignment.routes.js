import { deviceAssignmentController } from '../controllers/deviceAssignment.controller.js';
import { createCrudRoutes } from './createCrudRoutes.js';

export default createCrudRoutes(deviceAssignmentController);
