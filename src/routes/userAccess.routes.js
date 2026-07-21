import { userAccessController } from '../controllers/userAccess.controller.js';
import { createCrudRoutes } from './createCrudRoutes.js';

export default createCrudRoutes(userAccessController);
