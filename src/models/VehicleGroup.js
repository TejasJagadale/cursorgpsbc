import mongoose from 'mongoose';
import { EntityStatus } from '../constants/enums.js';

const vehicleGroupSchema = new mongoose.Schema(
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
    groupName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
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
    collection: 'vehicle_groups',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

vehicleGroupSchema.index({ dealerId: 1, ownerUserId: 1 });
vehicleGroupSchema.index({ dealerId: 1, groupName: 1 });

export const VehicleGroup = mongoose.model('VehicleGroup', vehicleGroupSchema);
