import { DeviceAssignment } from '../models/DeviceAssignment.js';
import { createCrudController } from '../utils/createCrudController.js';

export const deviceAssignmentController = createCrudController(DeviceAssignment, {
  populate: ['deviceId', 'vehicleId', 'assignedBy'],
  filterableFields: ['deviceId', 'vehicleId'],
});
