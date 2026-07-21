import { licenseController } from '../controllers/license.controller.js';
import { createCrudRoutes } from './createCrudRoutes.js';

export default createCrudRoutes(licenseController);
