import { VehicleGroup } from '../models/VehicleGroup.js';
import { createCrudController } from '../utils/createCrudController.js';

export const vehicleGroupController = createCrudController(VehicleGroup, {
  populate: ['dealerId', 'ownerUserId', 'createdBy'],
  searchableFields: ['groupName', 'description'],
  filterableFields: ['dealerId', 'ownerUserId', 'status'],
});
