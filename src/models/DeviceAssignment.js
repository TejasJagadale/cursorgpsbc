import mongoose from 'mongoose';

const deviceAssignmentSchema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    assignedFrom: {
      type: Date,
      required: true,
    },
    assignedTo: {
      type: Date,
      default: null,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    remarks: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'device_assignments',
    timestamps: false,
  }
);

deviceAssignmentSchema.index({ deviceId: 1, assignedTo: 1 });
deviceAssignmentSchema.index({ vehicleId: 1, assignedTo: 1 });

export const DeviceAssignment = mongoose.model('DeviceAssignment', deviceAssignmentSchema);
