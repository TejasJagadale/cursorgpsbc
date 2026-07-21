import { User } from '../models/User.js';
import { createCrudController } from '../utils/createCrudController.js';
import { hashPassword } from '../utils/password.js';

export const userController = createCrudController(User, {
  select: '-password',
  populate: ['dealerId', 'parentId', 'referredByUserId', 'createdBy'],
  searchableFields: ['name', 'username', 'email', 'phoneNumber'],
  filterableFields: ['role', 'dealerId', 'status', 'occupation'],
  transformCreate: async (body) => {
    if (body.password) {
      body.password = await hashPassword(body.password);
    }
    return body;
  },
  transformUpdate: async (body) => {
    if (body.password) {
      body.password = await hashPassword(body.password);
    }
    return body;
  },
});
