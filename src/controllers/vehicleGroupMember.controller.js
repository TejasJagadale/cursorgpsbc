import { VehicleGroupMember } from '../models/VehicleGroupMember.js';
import { createCrudController } from '../utils/createCrudController.js';

export const vehicleGroupMemberController = createCrudController(VehicleGroupMember, {
  populate: ['groupId', 'vehicleId'],
  filterableFields: ['groupId', 'vehicleId'],
});
