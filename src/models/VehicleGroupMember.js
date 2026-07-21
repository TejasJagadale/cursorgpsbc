import mongoose from 'mongoose';

const vehicleGroupMemberSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VehicleGroup',
      required: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'vehicle_group_members',
    timestamps: false,
  }
);

vehicleGroupMemberSchema.index({ groupId: 1, vehicleId: 1 }, { unique: true });
vehicleGroupMemberSchema.index({ vehicleId: 1 });

export const VehicleGroupMember = mongoose.model(
  'VehicleGroupMember',
  vehicleGroupMemberSchema
);
