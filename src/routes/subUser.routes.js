// routes/subUser.routes.js
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { subUserController } from '../controllers/subUser.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get approved sub-users for a user
router.get('/approved', subUserController.getApprovedSubUsers);

// Get pending sub-users for a user
router.get('/pending', subUserController.getPendingSubUsers);

// Get all sub-users with their access status
router.get('/with-access', subUserController.getSubUsersWithAccess);

// Get a specific sub-user with access status
router.get('/:id/access-status', subUserController.getSubUserAccessStatus);

export default router;