import mongoose from 'mongoose';
import { DurationUnit, EntityStatus } from '../constants/enums.js';

const durationSchema = new mongoose.Schema(
  {
    value: {
      type: Number,
      required: true,
      min: 1,
    },
    unit: {
      type: String,
      enum: Object.values(DurationUnit),
      required: true,
    },
  },
  { _id: false }
);

const licensePackageSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    packageCode: {
      type: String,
      required: true,
      trim: true,
    },
    packageName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    duration: {
      type: durationSchema,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    licenseCount: {
      type: Number,
      required: true,
      min: 0,
    },
    usedLicenseCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: [EntityStatus.ACTIVE, EntityStatus.INACTIVE],
      default: EntityStatus.ACTIVE,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    collection: 'license_packages',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

licensePackageSchema.index({ dealerId: 1, packageCode: 1 }, { unique: true });
licensePackageSchema.index({ dealerId: 1, status: 1 });

export const LicensePackage = mongoose.model('LicensePackage', licensePackageSchema);
