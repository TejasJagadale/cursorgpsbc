import mongoose from 'mongoose';

const licenseHistorySchema = new mongoose.Schema(
  {
    licenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'License',
      required: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
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
    collection: 'license_histories',
    timestamps: false,
  }
);

licenseHistorySchema.index({ licenseId: 1, assignedTo: 1 });
licenseHistorySchema.index({ vehicleId: 1 });
licenseHistorySchema.index({ deviceId: 1 });

export const LicenseHistory = mongoose.model('LicenseHistory', licenseHistorySchema);
