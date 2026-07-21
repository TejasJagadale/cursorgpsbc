import mongoose from 'mongoose';
import { EntityStatus } from '../constants/enums.js';

const customAttributeSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    value: { type: String, default: '', trim: true },
  },
  { _id: false }
);

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
    vehicleBody: { type: String, default: '' }, // e.g. Truck, Car, Bus, Van
    make: { type: String, default: '' },
    model: { type: String, default: '' },
    year: { type: String, default: '' },
    chassisNumber: { type: String, default: '' },
    engineNumber: { type: String, default: '' },
    color: { type: String, default: '' },
    // Free-form key/value pairs shown in the "Custom Attributes" panel
    // (fuel type, insurance no, insurance expiry, driver name, etc.)
    customAttributes: {
      type: [customAttributeSchema],
      default: [],
    },
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


// import mongoose from 'mongoose';
// import { EntityStatus } from '../constants/enums.js';

// const vehicleSchema = new mongoose.Schema(
//   {
//     dealerId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },
//     ownerUserId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },
//     deviceId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Device',
//       default: null,
//     },
//     vehicleNumber: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     make: { type: String, default: '' },
//     model: { type: String, default: '' },
//     year: { type: String, default: '' },
//     chassisNumber: { type: String, default: '' },
//     engineNumber: { type: String, default: '' },
//     color: { type: String, default: '' },
//     status: {
//       type: String,
//       enum: Object.values(EntityStatus),
//       default: EntityStatus.ACTIVE,
//     },
//   },
//   {
//     collection: 'vehicles',
//     timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
//   }
// );

// vehicleSchema.index({ dealerId: 1, vehicleNumber: 1 }, { unique: true });
// vehicleSchema.index({ ownerUserId: 1 });
// vehicleSchema.index({ deviceId: 1 }, { sparse: true });

// export const Vehicle = mongoose.model('Vehicle', vehicleSchema);
