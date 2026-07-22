// controllers/notification.controller.js
import { notificationService } from '../services/notification.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from '../models/User.js';

export const notificationController = {
  getNotifications: asyncHandler(async (req, res) => {
    const { isRead, type, limit, skip } = req.query;
    
    const result = await notificationService.getNotificationsForUser(
      req.user._id,
      { isRead, type, limit, skip }
    );
    
    res.json(ApiResponse.success(result));
  }),
  
  getUnreadCount: asyncHandler(async (req, res) => {
    const count = await notificationService.getUnreadCount(req.user._id);
    res.json(ApiResponse.success({ unreadCount: count }));
  }),
  
  markAsRead: asyncHandler(async (req, res) => {
    const notification = await notificationService.markAsRead(
      req.params.id,
      req.user._id
    );
    res.json(ApiResponse.success(notification, 'Notification marked as read'));
  }),
  
  handleAction: asyncHandler(async (req, res) => {
    const { action, subUserId } = req.body;
    
    // Verify the user is a DEALER
    if (req.user.role !== 'DEALER') {
      throw new Error('Only dealers can approve sub-users');
    }
    
    const result = await notificationService.handleSubUserApproval(
      subUserId,
      req.user._id,
      action
    );
    
    res.json(ApiResponse.success(result, `Sub-user ${action.toLowerCase()}d successfully`));
  }),
};