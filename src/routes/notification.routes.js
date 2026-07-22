// routes/notification.routes.js
import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/:id/read', notificationController.markAsRead);
router.patch('/:subUserId/approve', notificationController.approveSubUser);
router.patch('/:subUserId/reject', notificationController.rejectSubUser);

export default router;