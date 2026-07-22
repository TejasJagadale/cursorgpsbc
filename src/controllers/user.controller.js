import { User } from '../models/User.js';
import { createCrudController } from '../utils/createCrudController.js';
import { hashPassword } from '../utils/password.js';

export const userController = createCrudController(User, {
  select: '-password',
  populate: ['dealerId', 'parentId', 'referredByUserId', 'createdBy'],
  searchableFields: ['name', 'username', 'email', 'phoneNumber'],
  filterableFields: ['role', 'dealerId', 'parentId', 'status', 'occupation'],
  // DEALER accounts are scoped to users where dealerId === themselves.
  // USER accounts are scoped to sub-users where parentId === themselves.
  // ADMIN is unrestricted (not listed here).
  ownerScopes: {
    DEALER: 'dealerId',
    USER: 'parentId',
  },
  transformCreate: async (body, req) => {
    // Hash password if provided
    if (body.password) {
      body.password = await hashPassword(body.password);
    }
    
    // If the current user is creating a sub-user (role: SUB_USER),
    // automatically set referredByUserId to the current user's ID
    if (req.user && body.role === 'SUB_USER') {
      body.referredByUserId = req.user._id;
      
      // Also set parentId to the current user if not already set
      if (!body.parentId) {
        body.parentId = req.user._id;
      }
    }
    
    // Set createdBy to the current user
    if (req.user) {
      body.createdBy = req.user._id;
    }
    
    return body;
  },
  transformUpdate: async (body, req) => {
    if (body.password) {
      body.password = await hashPassword(body.password);
    }
    return body;
  },
});