// routes/index.js
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import subUserRoutes from './subUser.routes.js'; // Make sure this import exists
import licensePackageRoutes from './licensePackage.routes.js';
import licenseRoutes from './license.routes.js';
import licenseHistoryRoutes from './licenseHistory.routes.js';
import vehicleRoutes from './vehicle.routes.js';
import vehicleGroupRoutes from './vehicleGroup.routes.js';
import vehicleGroupMemberRoutes from './vehicleGroupMember.routes.js';
import userAccessRoutes from './userAccess.routes.js';
import resourceAccessRoutes from './resourceAccess.routes.js';
import deviceRoutes from './device.routes.js';
import deviceAssignmentRoutes from './deviceAssignment.routes.js';
import notificationRoutes from './notification.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'GPS Collection API is running',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);

router.use(authenticate);

router.use('/users', userRoutes);
router.use('/sub-users', subUserRoutes); // This line must exist
router.use('/notifications', notificationRoutes);
router.use('/license-packages', licensePackageRoutes);
router.use('/licenses', licenseRoutes);
router.use('/license-histories', licenseHistoryRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/vehicle-groups', vehicleGroupRoutes);
router.use('/vehicle-group-members', vehicleGroupMemberRoutes);
router.use('/user-access', userAccessRoutes);
router.use('/resource-access', resourceAccessRoutes);
router.use('/devices', deviceRoutes);
router.use('/device-assignments', deviceAssignmentRoutes);

export default router;