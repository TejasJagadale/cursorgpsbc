import { licensePackageController } from '../controllers/licensePackage.controller.js';
import { createCrudRoutes } from './createCrudRoutes.js';

export default createCrudRoutes(licensePackageController);
