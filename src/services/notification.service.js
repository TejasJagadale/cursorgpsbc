// services/notification.service.js
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';

class NotificationService {
    async createNotification(notificationData) {
        try {
            const notification = await Notification.create(notificationData);

            // In a real app, you might also:
            // 1. Send email
            // 2. Send push notification
            // 3. Send SMS
            // 4. Emit socket event for real-time updates

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

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(filters.limit || 50)
            .skip(filters.skip || 0);

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

    async handleSubUserApproval(subUserId, approverId, action) {
        const subUser = await User.findById(subUserId);

        if (!subUser || subUser.role !== 'SUB_USER') {
            throw new Error('Invalid sub-user');
        }

        if (action === 'APPROVE') {
            subUser.status = 'ACTIVE';
            subUser.approvalStatus = 'APPROVED';
            subUser.approvedBy = approverId;
            subUser.approvedAt = new Date();
            subUser.canLogin = true;

            await subUser.save();

            // Notify the parent user (who created the sub-user)
            if (subUser.parentId) {
                await this.createNotification({
                    recipientId: subUser.parentId,
                    type: 'SUB_USER_APPROVED',
                    title: 'Sub-User Approved',
                    message: `Your sub-user ${subUser.name} has been approved by the dealer.`,
                    data: {
                        subUserId: subUser._id,
                        subUserName: subUser.name,
                        approvedBy: approverId,
                    },
                    priority: 'MEDIUM',
                });
            }

            return subUser;
        } else if (action === 'REJECT') {
            subUser.status = 'INACTIVE';
            subUser.approvalStatus = 'REJECTED';
            subUser.approvedBy = approverId;
            subUser.approvedAt = new Date();
            subUser.canLogin = false;

            await subUser.save();

            // Notify the parent user
            if (subUser.parentId) {
                await this.createNotification({
                    recipientId: subUser.parentId,
                    type: 'SUB_USER_REJECTED',
                    title: 'Sub-User Rejected',
                    message: `Your sub-user ${subUser.name} has been rejected by the dealer.`,
                    data: {
                        subUserId: subUser._id,
                        subUserName: subUser.name,
                        rejectedBy: approverId,
                    },
                    priority: 'MEDIUM',
                });
            }

            return subUser;
        }

        throw new Error('Invalid action. Use APPROVE or REJECT');
    }
}

export const notificationService = new NotificationService();