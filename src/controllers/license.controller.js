import { License } from '../models/License.js';
import { createCrudController } from '../utils/createCrudController.js';

export const licenseController = createCrudController(License, {
  populate: ['packageId', 'dealerId', 'userId', 'activatedBy'],
  filterableFields: ['dealerId', 'userId', 'packageId', 'status'],
});
