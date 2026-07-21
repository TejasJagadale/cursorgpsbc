import mongoose from 'mongoose';
import { EntityStatus } from '../constants/enums.js';

const licenseSchema = new mongoose.Schema(
  {
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LicensePackage',
      required: true,
    },
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(EntityStatus),
      default: EntityStatus.ACTIVE,
    },
    activatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    activatedAt: {
      type: Date,
      required: true,
    },
  },
  {
    collection: 'licenses',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

licenseSchema.index({ dealerId: 1, userId: 1 });
licenseSchema.index({ packageId: 1 });
licenseSchema.index({ expiryDate: 1, status: 1 });

export const License = mongoose.model('License', licenseSchema);
