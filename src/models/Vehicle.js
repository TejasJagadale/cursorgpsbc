import mongoose from 'mongoose';
import { EntityStatus } from '../constants/enums.js';

const vehicleSchema = new mongoose.Schema(
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
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      default: null,
    },
    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
    },
    make: { type: String, default: '' },
    model: { type: String, default: '' },
    year: { type: String, default: '' },
    chassisNumber: { type: String, default: '' },
    engineNumber: { type: String, default: '' },
    color: { type: String, default: '' },
    status: {
      type: String,
      enum: Object.values(EntityStatus),
      default: EntityStatus.ACTIVE,
    },
  },
  {
    collection: 'vehicles',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

vehicleSchema.index({ dealerId: 1, vehicleNumber: 1 }, { unique: true });
vehicleSchema.index({ ownerUserId: 1 });
vehicleSchema.index({ deviceId: 1 }, { sparse: true });

export const Vehicle = mongoose.model('Vehicle', vehicleSchema);
