import { ResourceAccess } from '../models/ResourceAccess.js';
import { createCrudController } from '../utils/createCrudController.js';

export const resourceAccessController = createCrudController(ResourceAccess, {
  populate: ['dealerId', 'ownerUserId', 'sharedUserId', 'createdBy'],
  filterableFields: ['dealerId', 'ownerUserId', 'sharedUserId', 'resourceType', 'status'],
});
