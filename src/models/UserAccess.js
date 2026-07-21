import mongoose from 'mongoose';
import { EntityStatus } from '../constants/enums.js';

const userAccessPermissionsSchema = new mongoose.Schema(
  {
    dashboard: { type: Boolean, default: true },
    liveTracking: { type: Boolean, default: true },
    playback: { type: Boolean, default: true },
    reports: { type: Boolean, default: true },
    alerts: { type: Boolean, default: true },
    settings: { type: Boolean, default: false },
  },
  { _id: false }
);

const userAccessSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sharedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    permissions: {
      type: userAccessPermissionsSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: Object.values(EntityStatus),
      default: EntityStatus.ACTIVE,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    collection: 'user_access',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

userAccessSchema.index({ dealerId: 1, ownerUserId: 1, sharedUserId: 1 }, { unique: true });
userAccessSchema.index({ sharedUserId: 1, status: 1 });

export const UserAccess = mongoose.model('UserAccess', userAccessSchema);
