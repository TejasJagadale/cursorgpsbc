// In userAccess.routes.js or a separate validation file
import { Router } from 'express';
import { userAccessController } from '../controllers/userAccess.controller.js';
import { createCrudRoutes } from './createCrudRoutes.js';
import mongoose from 'mongoose';

// Validation middleware for user access
const validateUserAccess = (req, res, next) => {
  const { dealerId, ownerUserId, sharedUserId, createdBy } = req.body;
  
  console.log('Validating User Access data:', req.body);
  
  const errors = [];
  
  if (!dealerId) errors.push('dealerId is required');
  if (!ownerUserId) errors.push('ownerUserId is required');
  if (!sharedUserId) errors.push('sharedUserId is required');
  if (!createdBy) errors.push('createdBy is required');
  
  if (dealerId && !mongoose.Types.ObjectId.isValid(dealerId)) {
    errors.push('dealerId is not a valid ObjectId');
  }
  if (ownerUserId && !mongoose.Types.ObjectId.isValid(ownerUserId)) {
    errors.push('ownerUserId is not a valid ObjectId');
  }
  if (sharedUserId && !mongoose.Types.ObjectId.isValid(sharedUserId)) {
    errors.push('sharedUserId is not a valid ObjectId');
  }
  if (createdBy && !mongoose.Types.ObjectId.isValid(createdBy)) {
    errors.push('createdBy is not a valid ObjectId');
  }
  
  if (errors.length > 0) {
    console.error('Validation errors:', errors);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors
    });
  }
  
  next();
};

// Apply validation to create route
const router = Router();
router.post('/', validateUserAccess, userAccessController.create);
router.get('/', userAccessController.getAll);
router.get('/:id', userAccessController.getById);
router.patch('/:id', userAccessController.update);
router.delete('/:id', userAccessController.remove);

export default router;