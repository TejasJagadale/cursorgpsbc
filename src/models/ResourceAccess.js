import mongoose from 'mongoose';
import { EntityStatus, ResourceType } from '../constants/enums.js';

const resourceAccessPermissionsSchema = new mongoose.Schema(
  {
    tracking: { type: Boolean, default: true },
    playback: { type: Boolean, default: true },
    reports: { type: Boolean, default: true },
    history: { type: Boolean, default: true },
    commands: { type: Boolean, default: false },
  },
  { _id: false }
);

const resourceAccessSchema = new mongoose.Schema(
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
    resourceType: {
      type: String,
      enum: Object.values(ResourceType),
      required: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    permissions: {
      type: resourceAccessPermissionsSchema,
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
    collection: 'resource_access',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

resourceAccessSchema.index({ dealerId: 1, sharedUserId: 1, resourceType: 1 });
resourceAccessSchema.index({ ownerUserId: 1, sharedUserId: 1 });
resourceAccessSchema.index(
  { sharedUserId: 1, resourceType: 1, resourceId: 1 },
  { sparse: true }
);

export const ResourceAccess = mongoose.model('ResourceAccess', resourceAccessSchema);
