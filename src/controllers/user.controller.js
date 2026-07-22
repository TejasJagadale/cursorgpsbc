// controllers/user.controller.js - Updated with debug logs
import { User } from '../models/User.js';
import { createCrudController } from '../utils/createCrudController.js';
import { hashPassword } from '../utils/password.js';
import { notificationService } from '../services/notification.service.js';
import { EntityStatus } from '../constants/enums.js';

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
    console.log('=== TRANSFORM CREATE START ===');
    console.log('Body before transform:', JSON.stringify(body, null, 2));
    console.log('User from req:', req.user ? {
      _id: req.user._id,
      role: req.user.role,
      name: req.user.name,
      dealerId: req.user.dealerId
    } : 'No user');
    
    // Hash password if provided
    if (body.password) {
      body.password = await hashPassword(body.password);
    }
    
    // If the current user is creating a sub-user
    if (req.user && body.role === 'SUB_USER') {
      console.log('Creating SUB_USER - setting up approval workflow');
      
      // Set the referring user
      body.referredByUserId = req.user._id;
      
      // Set parentId to the current user
      if (!body.parentId) {
        body.parentId = req.user._id;
      }
      
      // Set dealerId from the parent user's dealer
      if (!body.dealerId && req.user.dealerId) {
        body.dealerId = req.user.dealerId;
        console.log('Set dealerId from parent user:', body.dealerId);
      } else if (!body.dealerId) {
        // If the parent user doesn't have a dealerId, try to find it
        const parentUser = await User.findById(req.user._id).select('dealerId');
        if (parentUser && parentUser.dealerId) {
          body.dealerId = parentUser.dealerId;
          console.log('Set dealerId from parent user lookup:', body.dealerId);
        } else {
          console.log('WARNING: No dealerId found for parent user');
        }
      }
      
      // Force status to PENDING for approval workflow
      body.status = EntityStatus.PENDING;
      body.approvalStatus = 'PENDING';
      
      // Store the parent user for notification
      body._notificationData = {
        parentUser: req.user,
      };
      
      console.log('SUB_USER setup complete:', {
        referredByUserId: body.referredByUserId,
        parentId: body.parentId,
        dealerId: body.dealerId,
        status: body.status,
        approvalStatus: body.approvalStatus
      });
    }
    
    // Set createdBy to the current user
    if (req.user) {
      body.createdBy = req.user._id;
    }
    
    console.log('Body after transform:', JSON.stringify(body, null, 2));
    console.log('=== TRANSFORM CREATE END ===');
    return body;
  },
  transformUpdate: async (body, req) => {
    if (body.password) {
      body.password = await hashPassword(body.password);
    }
    return body;
  },
  afterCreate: async (document, req) => {
    console.log('=== AFTER CREATE HOOK START ===');
    console.log('Document created:', {
      _id: document._id,
      role: document.role,
      name: document.name,
      dealerId: document.dealerId,
      parentId: document.parentId,
      referredByUserId: document.referredByUserId,
      status: document.status,
      approvalStatus: document.approvalStatus
    });
    
    // If a sub-user was created, send notification to the dealer
    if (document.role === 'SUB_USER') {
      console.log('Processing SUB_USER notification');
      
      // Get the parent user from the document
      const parentUser = await User.findById(document.parentId).select('name role dealerId');
      console.log('Parent user found:', parentUser ? {
        _id: parentUser._id,
        name: parentUser.name,
        role: parentUser.role,
        dealerId: parentUser.dealerId
      } : 'No parent user found');
      
      if (!parentUser) {
        console.log('ERROR: Parent user not found for sub-user');
        return;
      }
      
      // Find the dealer
      let dealerId = document.dealerId;
      
      // If no dealerId on sub-user, try to get it from parent
      if (!dealerId && parentUser.dealerId) {
        dealerId = parentUser.dealerId;
        console.log('Got dealerId from parent user:', dealerId);
      }
      
      // If parent is DEALER, use their ID directly
      if (parentUser.role === 'DEALER') {
        dealerId = parentUser._id;
        console.log('Parent is DEALER, using their ID:', dealerId);
      }
      
      console.log('Final dealerId for notification:', dealerId);
      
      if (dealerId) {
        try {
          const notification = await notificationService.createNotification({
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
          console.log('✅ Notification created successfully:', {
            notificationId: notification._id,
            recipientId: notification.recipientId,
            type: notification.type
          });
        } catch (error) {
          console.error('❌ Error creating notification:', error);
        }
      } else {
        console.log('❌ WARNING: No dealerId found to send notification');
        console.log('Document dealerId:', document.dealerId);
        console.log('Parent user dealerId:', parentUser.dealerId);
      }
    } else {
      console.log('Not a SUB_USER, skipping notification');
    }
    console.log('=== AFTER CREATE HOOK END ===');
  },
});