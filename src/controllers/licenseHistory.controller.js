import { LicenseHistory } from '../models/LicenseHistory.js';
import { createCrudController } from '../utils/createCrudController.js';

export const licenseHistoryController = createCrudController(LicenseHistory, {
  populate: ['licenseId', 'vehicleId', 'deviceId', 'assignedBy'],
  filterableFields: ['licenseId', 'vehicleId', 'deviceId'],
});
