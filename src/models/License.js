// models/License.js
import mongoose from 'mongoose';
import { EntityStatus } from '../constants/enums.js';

const licenseSchema = new mongoose.Schema(
  {
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
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LicensePackage',
      required: true,
    },
    licenseKey: {
      type: String,
      unique: true,
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
      default: Date.now,
    },
    // Payment/Order fields
    orderNumber: {
      type: String,
      default: '',
    },
    paymentMode: {
      type: String,
      enum: ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'OTHER'],
      default: 'ONLINE',
    },
    transactionReference: {
      type: String,
      default: '',
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
      default: 'COMPLETED',
    },
    orderStatus: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'],
      default: 'COMPLETED',
    },
    orderNotes: {
      type: String,
      default: '',
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'licenses',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

licenseSchema.index({ dealerId: 1, userId: 1 });
licenseSchema.index({ licenseKey: 1 });
licenseSchema.index({ expiryDate: 1 });
licenseSchema.index({ orderNumber: 1 });

export const License = mongoose.model('License', licenseSchema);