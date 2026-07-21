import { userController } from '../controllers/user.controller.js';
import { createCrudRoutes } from './createCrudRoutes.js';

export default createCrudRoutes(userController);
