// controllers/notification.controller.js (or wherever approveSubUser/rejectSubUser live)
import {
    approveSubUser,
    rejectSubUser,
    getNotifications,
    markAsRead,
} from '../controllers/notification.controller.js';
import { User } from '../models/User.js';
import { UserAccess } from '../models/UserAccess.js';
import { Notification } from '../models/Notification.js'; // adjust path/name to your actual model

export const approveSubUser = async (req, res, next) => {
  try {
    const { subUserId } = req.params; // or req.body, matching your existing route

    const subUser = await User.findById(subUserId);
    if (!subUser) {
      return res.status(404).json({ success: false, message: 'Sub-user not found' });
    }

    subUser.status = 'ACTIVE';
    subUser.approvalStatus = 'APPROVED';
    subUser.approvedBy = req.user._id;
    subUser.approvedAt = new Date();
    subUser.isActive = true;
    await subUser.save();

    // Keep User Access in sync: activate existing record, or create one
    // if none exists (defensive — the create-time seed should normally
    // have made this already).
    const existingAccess = await UserAccess.findOne({
      ownerUserId: subUser.ownerUserId || subUser.parentId,
      sharedUserId: subUser._id,
    });

    if (existingAccess) {
      existingAccess.status = 'ACTIVE';
      await existingAccess.save();
    } else {
      await UserAccess.create({
        dealerId: subUser.dealerId,
        ownerUserId: subUser.ownerUserId || subUser.parentId,
        sharedUserId: subUser._id,
        permissions: {
          dashboard: true,
          liveTracking: true,
          playback: true,
          reports: true,
          alerts: true,
          settings: false,
        },
        status: 'ACTIVE',
        createdBy: req.user._id,
      });
    }

    // Mark the related notification(s) as read/processed
    await Notification.updateMany(
      { 'data.subUserId': subUserId, type: 'SUB_USER_APPROVAL_REQUEST' },
      { $set: { status: 'APPROVED', isRead: true } }
    );

    res.json({ success: true, data: subUser });
  } catch (err) {
    next(err);
  }
};

export const rejectSubUser = async (req, res, next) => {
  try {
    const { subUserId } = req.params;

    const subUser = await User.findById(subUserId);
    if (!subUser) {
      return res.status(404).json({ success: false, message: 'Sub-user not found' });
    }

    subUser.status = 'INACTIVE';
    subUser.approvalStatus = 'REJECTED';
    subUser.approvedBy = null;
    subUser.approvedAt = null;
    subUser.isActive = false;
    await subUser.save();

    // A rejected sub-user shouldn't retain a User Access row at all —
    // mirrors the "toggle off removes everything" behavior in
    // SubUserAccessPanel.
    await UserAccess.deleteOne({
      ownerUserId: subUser.ownerUserId || subUser.parentId,
      sharedUserId: subUser._id,
    });

    await Notification.updateMany(
      { 'data.subUserId': subUserId, type: 'SUB_USER_APPROVAL_REQUEST' },
      { $set: { status: 'REJECTED', isRead: true } }
    );

    res.json({ success: true, data: subUser });
  } catch (err) {
    next(err);
  }
};