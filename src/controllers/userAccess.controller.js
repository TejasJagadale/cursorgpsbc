import { UserAccess } from '../models/UserAccess.js';
import { createCrudController } from '../utils/createCrudController.js';

export const userAccessController = createCrudController(UserAccess, {
  populate: ['dealerId', 'ownerUserId', 'sharedUserId', 'createdBy'],
  filterableFields: ['dealerId', 'ownerUserId', 'sharedUserId', 'status'],
  // Add ownerScopes to control access based on role
  ownerScopes: {
    USER: 'ownerUserId',    // USER can only access their own user_access records
    DEALER: 'dealerId',     // DEALER can access records for their dealer
    ADMIN: null,            // ADMIN can access all
  },
});