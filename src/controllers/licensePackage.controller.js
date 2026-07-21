import { LicensePackage } from '../models/LicensePackage.js';
import { createCrudController } from '../utils/createCrudController.js';

export const licensePackageController = createCrudController(LicensePackage, {
  populate: ['dealerId', 'createdBy'],
  searchableFields: ['packageCode', 'packageName', 'description'],
  filterableFields: ['dealerId', 'status'],
});
