import { Vehicle } from '../models/Vehicle.js';
import { createCrudController } from '../utils/createCrudController.js';

export const vehicleController = createCrudController(Vehicle, {
  populate: ['dealerId', 'ownerUserId', 'deviceId'],
  searchableFields: ['vehicleNumber', 'make', 'model', 'chassisNumber', 'engineNumber'],
  filterableFields: ['dealerId', 'ownerUserId', 'status'],
  ownerScopes: {
    DEALER: 'dealerId',
    USER: 'ownerUserId',
  },
});