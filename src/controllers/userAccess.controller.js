import { UserAccess } from '../models/UserAccess.js';
import { createCrudController } from '../utils/createCrudController.js';

export const userAccessController = createCrudController(UserAccess, {
  populate: ['dealerId', 'ownerUserId', 'sharedUserId', 'createdBy'],
  filterableFields: ['dealerId', 'ownerUserId', 'sharedUserId', 'status'],
});
