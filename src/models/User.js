// models/User.js
import mongoose from 'mongoose';
import {
  UserRole,
  EmploymentType,
  Occupation,
  EntityStatus,
  OnboardingType,
} from '../constants/enums.js';

const addressSchema = new mongoose.Schema(
  {
    addressLine1: { type: String, default: '' },
    addressLine2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    pincode: { type: String, default: '' },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
      required: true,
    },
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    employmentType: {
      type: String,
      enum: Object.values(EmploymentType),
    },
    occupation: {
      type: String,
      enum: Object.values(Occupation),
    },
    designation: { type: String, default: '' },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    canLogin: {
      type: Boolean,
      default: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    address: {
      type: addressSchema,
      default: () => ({}),
    },
    referredByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(EntityStatus),
      default: EntityStatus.PENDING, // Changed from ACTIVE to PENDING for sub-users
    },
    onboardingType: {
      type: String,
      enum: Object.values(OnboardingType),
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // New fields for approval workflow
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    approvalStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
  },
  {
    collection: 'users',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

// Indexes for better query performance
userSchema.index({ dealerId: 1, role: 1 });
userSchema.index({ parentId: 1 });
userSchema.index({ referredByUserId: 1 });
userSchema.index({ email: 1 }, { sparse: true });
userSchema.index({ phoneNumber: 1 }, { sparse: true });
userSchema.index({ approvalStatus: 1 });

// Virtual for checking if user can access dashboard
userSchema.virtual('canAccessDashboard').get(function() {
  if (this.role === 'SUB_USER') {
    return this.approvalStatus === 'APPROVED' && this.status === 'ACTIVE';
  }
  return this.status === 'ACTIVE';
});

export const User = mongoose.model('User', userSchema);