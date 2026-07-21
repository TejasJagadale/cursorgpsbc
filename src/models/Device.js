import mongoose from 'mongoose';
import { DeviceStatus } from '../constants/enums.js';

const deviceSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    licenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'License',
      default: null,
    },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    imei: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    serialNumber: {
      type: String,
      default: '',
      trim: true,
    },
    deviceModel: { type: String, default: '' },
    manufacturer: { type: String, default: '' },
    protocol: { type: String, default: '' }, // e.g. TCP, UDP
    port: { type: Number, default: null },
    firmwareVersion: { type: String, default: '' },
    simModel: { type: String, default: '' },
    simNumber: { type: String, default: '' },
    simImei: { type: String, default: '' },
    simProvider: { type: String, default: '' },
    status: {
      type: String,
      enum: Object.values(DeviceStatus),
      default: DeviceStatus.PENDING,
    },
    installedAt: {
      type: Date,
      default: null,
    },
    lastHeartbeatAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    collection: 'devices',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

deviceSchema.index({ dealerId: 1, status: 1 });
deviceSchema.index({ ownerUserId: 1 });
deviceSchema.index({ licenseId: 1 }, { sparse: true });
deviceSchema.index({ serialNumber: 1 }, { sparse: true });

export const Device = mongoose.model('Device', deviceSchema);



// import mongoose from 'mongoose';
// import { DeviceStatus } from '../constants/enums.js';

// const deviceSchema = new mongoose.Schema(
//   {
//     dealerId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },
//     licenseId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'License',
//       default: null,
//     },
//     ownerUserId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },
//     imei: {
//       type: String,
//       required: true,
//       unique: true,
//       trim: true,
//     },
//     serialNumber: {
//       type: String,
//       default: '',
//       trim: true,
//     },
//     deviceModel: { type: String, default: '' },
//     manufacturer: { type: String, default: '' },
//     protocol: { type: String, default: '' },
//     firmwareVersion: { type: String, default: '' },
//     simNumber: { type: String, default: '' },
//     simImei: { type: String, default: '' },
//     simProvider: { type: String, default: '' },
//     status: {
//       type: String,
//       enum: Object.values(DeviceStatus),
//       default: DeviceStatus.PENDING,
//     },
//     installedAt: {
//       type: Date,
//       default: null,
//     },
//     lastHeartbeatAt: {
//       type: Date,
//       default: null,
//     },
//     createdBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },
//   },
//   {
//     collection: 'devices',
//     timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
//   }
// );

// deviceSchema.index({ dealerId: 1, status: 1 });
// deviceSchema.index({ ownerUserId: 1 });
// deviceSchema.index({ licenseId: 1 }, { sparse: true });
// deviceSchema.index({ serialNumber: 1 }, { sparse: true });

// export const Device = mongoose.model('Device', deviceSchema);
