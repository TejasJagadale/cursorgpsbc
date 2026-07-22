// services/notification.service.js
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { EntityStatus } from '../constants/enums.js';

class NotificationService {
  async createNotification(notificationData) {
    try {
      const notification = await Notification.create(notificationData);
      console.log('Notification created:', notification);
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async getNotificationsForUser(userId, filters = {}) {
    const query = { recipientId: userId };
    
    if (filters.isRead !== undefined) {
      query.isRead = filters.isRead;
    }
    
    if (filters.type) {
      query.type = filters.type;
    }
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit || 50)
      .skip(filters.skip || 0)
      .populate('recipientId', 'name username');
    
    const total = await Notification.countDocuments(query);
    
    return { notifications, total };
  }

  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: userId },
      { isRead: true, readAt: new Date(), status: 'READ' },
      { new: true }
    );
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    return notification;
  }

  async getUnreadCount(userId) {
    return await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
    });
  }

  async approveSubUser(subUserId, approverId) {
    const subUser = await User.findById(subUserId);
    
    if (!subUser || subUser.role !== 'SUB_USER') {
      throw new Error('Invalid sub-user');
    }
    
    // Update sub-user status
    subUser.status = EntityStatus.ACTIVE;
    subUser.approvalStatus = 'APPROVED';
    subUser.approvedBy = approverId;
    subUser.approvedAt = new Date();
    subUser.canLogin = true;
    
    await subUser.save();
    
    // Mark all pending notifications for this sub-user as ACTIONED
    await Notification.updateMany(
      {
        'data.subUserId': subUserId,
        type: 'SUB_USER_APPROVAL_REQUEST',
        status: 'PENDING',
      },
      { status: 'ACTIONED' }
    );
    
    // Notify the parent user (who created the sub-user)
    if (subUser.parentId) {
      const parentUser = await User.findById(subUser.parentId);
      if (parentUser) {
        await this.createNotification({
          recipientId: subUser.parentId,
          type: 'SUB_USER_APPROVED',
          title: 'Sub-User Approved ✅',
          message: `Your sub-user "${subUser.name}" has been approved by the dealer and can now access the system.`,
          data: {
            subUserId: subUser._id,
            subUserName: subUser.name,
            approvedBy: approverId,
          },
          priority: 'MEDIUM',
        });
      }
    }
    
    return subUser;
  }

  async rejectSubUser(subUserId, approverId) {
    const subUser = await User.findById(subUserId);
    
    if (!subUser || subUser.role !== 'SUB_USER') {
      throw new Error('Invalid sub-user');
    }
    
    // Update sub-user status
    subUser.status = EntityStatus.INACTIVE;
    subUser.approvalStatus = 'REJECTED';
    subUser.approvedBy = approverId;
    subUser.approvedAt = new Date();
    subUser.canLogin = false;
    
    await subUser.save();
    
    // Mark all pending notifications for this sub-user as ACTIONED
    await Notification.updateMany(
      {
        'data.subUserId': subUserId,
        type: 'SUB_USER_APPROVAL_REQUEST',
        status: 'PENDING',
      },
      { status: 'ACTIONED' }
    );
    
    // Notify the parent user
    if (subUser.parentId) {
      const parentUser = await User.findById(subUser.parentId);
      if (parentUser) {
        await this.createNotification({
          recipientId: subUser.parentId,
          type: 'SUB_USER_REJECTED',
          title: 'Sub-User Rejected ❌',
          message: `Your sub-user "${subUser.name}" has been rejected by the dealer. Please contact the dealer for more information.`,
          data: {
            subUserId: subUser._id,
            subUserName: subUser.name,
            rejectedBy: approverId,
          },
          priority: 'MEDIUM',
        });
      }
    }
    
    return subUser;
  }
}

export const notificationService = new NotificationService();