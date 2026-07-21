import { resourceAccessController } from '../controllers/resourceAccess.controller.js';
import { createCrudRoutes } from './createCrudRoutes.js';

export default createCrudRoutes(resourceAccessController);
