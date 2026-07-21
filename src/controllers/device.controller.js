import { Device } from '../models/Device.js';
import { createCrudController } from '../utils/createCrudController.js';

export const deviceController = createCrudController(Device, {
  populate: ['dealerId', 'licenseId', 'ownerUserId', 'createdBy'],
  searchableFields: ['imei', 'serialNumber', 'simNumber', 'deviceModel'],
  filterableFields: ['dealerId', 'ownerUserId', 'status', 'licenseId'],
  ownerScopes: {
    DEALER: 'dealerId',
    USER: 'ownerUserId',
  },
});