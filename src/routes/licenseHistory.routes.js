import { licenseHistoryController } from '../controllers/licenseHistory.controller.js';
import { createCrudRoutes } from './createCrudRoutes.js';

export default createCrudRoutes(licenseHistoryController);
