// controllers/user.controller.js
import { User } from '../models/User.js';
import { createCrudController } from '../utils/createCrudController.js';
import { hashPassword } from '../utils/password.js';
import { notificationService } from '../services/notification.service.js';

export const userController = createCrudController(User, {
  select: '-password',
  populate: ['dealerId', 'parentId', 'referredByUserId', 'createdBy', 'approvedBy'],
  searchableFields: ['name', 'username', 'email', 'phoneNumber'],
  filterableFields: ['role', 'dealerId', 'parentId', 'status', 'occupation', 'approvalStatus'],
  ownerScopes: {
    DEALER: 'dealerId',
    USER: 'parentId',
  },
  transformCreate: async (body, req) => {
    // Hash password if provided
    if (body.password) {
      body.password = await hashPassword(body.password);
    }
    
    // If the current user is creating a sub-user
    if (req.user && body.role === 'SUB_USER') {
      // Set the referring user
      body.referredByUserId = req.user._id;
      
      // Set parentId to the current user
      if (!body.parentId) {
        body.parentId = req.user._id;
      }
      
      // Set dealerId from the parent user's dealer
      if (!body.dealerId && req.user.dealerId) {
        body.dealerId = req.user.dealerId;
      }
      
      // Set status to PENDING for approval
      body.status = 'PENDING';
      body.approvalStatus = 'PENDING';
      
      // Store the parent user's dealer for notification
      body._notificationData = {
        parentUser: req.user,
      };
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
  // Custom post-create hook for notifications
  afterCreate: async (document, req) => {
    // If a sub-user was created, send notification to the dealer
    if (document.role === 'SUB_USER' && document._notificationData) {
      const { parentUser } = document._notificationData;
      
      // Find the dealer
      let dealerId = parentUser.dealerId;
      
      // If parent is a USER, get their dealer
      if (!dealerId && parentUser.role === 'USER') {
        const parent = await User.findById(parentUser._id).select('dealerId');
        dealerId = parent?.dealerId;
      }
      
      // If parent is DEALER, use their ID directly
      if (parentUser.role === 'DEALER') {
        dealerId = parentUser._id;
      }
      
      if (dealerId) {
        await notificationService.createNotification({
          recipientId: dealerId,
          type: 'SUB_USER_APPROVAL_REQUEST',
          title: 'New Sub-User Approval Required',
          message: `${parentUser.name} has created a new sub-user (${document.name}) and needs your approval.`,
          data: {
            subUserId: document._id,
            subUserName: document.name,
            subUserUsername: document.username,
            createdBy: parentUser._id,
            createdByName: parentUser.name,
          },
          priority: 'HIGH',
          actionRequired: true,
        });
      }
    }
  },
});