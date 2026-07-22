// models/Notification.js
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'SUB_USER_APPROVAL_REQUEST',
        'SUB_USER_APPROVED',
        'SUB_USER_REJECTED',
        'LICENSE_EXPIRY',
        'DEVICE_ALERT',
        'SYSTEM_ALERT',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM',
    },
    actionRequired: {
      type: Boolean,
      default: false,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['PENDING', 'READ', 'ACTIONED'],
      default: 'PENDING',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ status: 1, actionRequired: 1 });

export const Notification = mongoose.model('Notification', notificationSchema);