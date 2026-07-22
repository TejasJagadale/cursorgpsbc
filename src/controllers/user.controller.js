// controllers/user.controller.js
import { User } from '../models/User.js';
import { createCrudController } from '../utils/createCrudController.js';
import { hashPassword } from '../utils/password.js';
import { notificationService } from '../services/notification.service.js';
import { EntityStatus } from '../constants/enums.js';
import mongoose from 'mongoose';

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
    
    // Handle EMPLOYEE creation
    if (body.role === 'EMPLOYEE') {
      console.log('Creating EMPLOYEE');
      
      // If dealerId is 'ADMIN', we need to handle this specially
      if (body.dealerId === 'ADMIN') {
        console.log('EMPLOYEE assigned to ADMIN');
        // For ADMIN, we don't set a dealerId - it's a system employee
        body.dealerId = null;
      } else if (body.dealerId && mongoose.Types.ObjectId.isValid(body.dealerId)) {
        // Valid ObjectId, keep as is
        console.log('EMPLOYEE assigned to dealer:', body.dealerId);
      } else if (req.user && req.user.role === 'DEALER') {
        // If current user is a DEALER, set their ID as dealerId
        body.dealerId = req.user._id;
        console.log('EMPLOYEE assigned to current dealer:', body.dealerId);
      } else if (req.user && req.user.dealerId) {
        // If current user has a dealerId, use that
        body.dealerId = req.user.dealerId;
        console.log('EMPLOYEE assigned to user\'s dealer:', body.dealerId);
      } else {
        console.log('WARNING: No valid dealerId found for EMPLOYEE');
        // Set to null and let backend handle it or throw validation error
        body.dealerId = null;
      }
      
      // Set status to ACTIVE for employees (unless specified otherwise)
      if (!body.status) {
        body.status = EntityStatus.ACTIVE;
      }
    }
    
    // Handle SUB_USER creation (existing code)
    if (req.user && body.role === 'SUB_USER') {
      console.log('Creating SUB_USER - setting up approval workflow');
      
      body.referredByUserId = req.user._id;
      
      if (!body.parentId) {
        body.parentId = req.user._id;
      }
      
      if (!body.dealerId && req.user.dealerId) {
        body.dealerId = req.user.dealerId;
        console.log('Set dealerId from parent user:', body.dealerId);
      } else if (!body.dealerId) {
        const parentUser = await User.findById(req.user._id).select('dealerId');
        if (parentUser && parentUser.dealerId) {
          body.dealerId = parentUser.dealerId;
          console.log('Set dealerId from parent user lookup:', body.dealerId);
        } else {
          console.log('WARNING: No dealerId found for parent user');
        }
      }
      
      body.status = EntityStatus.PENDING;
      body.approvalStatus = 'PENDING';
      
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
    
    // Handle SUB_USER notifications (existing code)
    if (document.role === 'SUB_USER') {
      console.log('Processing SUB_USER notification');
      
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
      
      let dealerId = document.dealerId;
      
      if (!dealerId && parentUser.dealerId) {
        dealerId = parentUser.dealerId;
        console.log('Got dealerId from parent user:', dealerId);
      }
      
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
      }
    } else {
      console.log('Not a SUB_USER, skipping notification');
    }
    console.log('=== AFTER CREATE HOOK END ===');
  },
});