// routes/subUser.routes.js
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { subUserController } from '../controllers/subUser.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get sub-users with access (role-based)
router.get('/with-access', subUserController.getSubUsersWithAccess);

// Get approved sub-users
router.get('/approved', subUserController.getApprovedSubUsers);

// Get pending sub-users
router.get('/pending', subUserController.getPendingSubUsers);

// Get sub-users for dropdown
router.get('/for-dropdown', subUserController.getSubUsersForDropdown);

// Get access status for a specific sub-user
router.get('/:id/access-status', subUserController.getSubUserAccessStatus);

export default router;