// controllers/subUser.controller.js
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { UserAccess } from '../models/UserAccess.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

export const subUserController = {
  // Get sub-users based on role
  getSubUsersWithAccess: asyncHandler(async (req, res) => {
    const { ownerUserId, status, dealerId } = req.query;
    const user = req.user;
    
    let filter = {};

    // Role-based filtering
    if (user.role === 'USER') {
      // USER can only see their own sub-users
      if (ownerUserId && ownerUserId !== user._id.toString()) {
        throw ApiError.forbidden('You can only access your own sub-users');
      }
      filter.ownerUserId = user._id;
    } else if (user.role === 'DEALER') {
      // DEALER can see sub-users for their dealer
      if (dealerId) {
        filter.dealerId = dealerId;
      } else if (user.dealerId) {
        filter.dealerId = user.dealerId;
      } else {
        throw ApiError.badRequest('Dealer ID is required');
      }
    } else if (user.role === 'ADMIN') {
      // ADMIN can see all
      if (ownerUserId) {
        filter.ownerUserId = ownerUserId;
      }
      if (dealerId) {
        filter.dealerId = dealerId;
      }
    }

    // Add status filter if provided
    if (status) {
      filter.status = status;
    }

    const accessRecords = await UserAccess.find(filter)
      .populate('sharedUserId')
      .populate('ownerUserId')
      .populate('dealerId');

    // Build response
    const result = accessRecords.map(record => ({
      accessRecordId: record._id,
      status: record.status,
      permissions: record.permissions,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      subUser: record.sharedUserId,
      owner: record.ownerUserId,
      dealer: record.dealerId
    }));

    res.json(ApiResponse.success(result, 'Sub-users retrieved successfully'));
  }),

  // Get approved sub-users for dropdown (lightweight)
  getSubUsersForDropdown: asyncHandler(async (req, res) => {
    const { ownerUserId } = req.query;
    const user = req.user;
    
    let filter = { status: 'ACTIVE' };

    // Role-based filtering
    if (user.role === 'USER') {
      filter.ownerUserId = user._id;
    } else if (user.role === 'DEALER') {
      filter.dealerId = user.dealerId;
    } else if (user.role === 'ADMIN' && ownerUserId) {
      filter.ownerUserId = ownerUserId;
    }

    const accessRecords = await UserAccess.find(filter)
      .populate('sharedUserId', 'username name email _id');

    const subUsers = accessRecords
      .map(record => record.sharedUserId)
      .filter(user => user !== null && user !== undefined)
      .map(user => ({
        _id: user._id,
        username: user.username,
        name: user.name,
        email: user.email
      }));

    res.json(ApiResponse.success(subUsers, 'Sub-users for dropdown retrieved successfully'));
  }),

  // Get pending sub-users
  getPendingSubUsers: asyncHandler(async (req, res) => {
    const { ownerUserId } = req.query;
    const user = req.user;
    
    let filter = { status: 'PENDING' };

    if (user.role === 'USER') {
      filter.ownerUserId = user._id;
    } else if (user.role === 'DEALER') {
      filter.dealerId = user.dealerId;
    } else if (user.role === 'ADMIN' && ownerUserId) {
      filter.ownerUserId = ownerUserId;
    }

    const accessRecords = await UserAccess.find(filter)
      .populate('sharedUserId')
      .populate('ownerUserId');

    const result = accessRecords.map(record => ({
      ...record.sharedUserId.toObject(),
      accessStatus: record.status,
      accessRecordId: record._id,
      owner: record.ownerUserId
    }));

    res.json(ApiResponse.success(result, 'Pending sub-users retrieved successfully'));
  }),

  // Get approved sub-users
  getApprovedSubUsers: asyncHandler(async (req, res) => {
    const { ownerUserId } = req.query;
    const user = req.user;
    
    let filter = { status: 'ACTIVE' };

    if (user.role === 'USER') {
      filter.ownerUserId = user._id;
    } else if (user.role === 'DEALER') {
      filter.dealerId = user.dealerId;
    } else if (user.role === 'ADMIN' && ownerUserId) {
      filter.ownerUserId = ownerUserId;
    }

    const accessRecords = await UserAccess.find(filter)
      .populate('sharedUserId')
      .populate('ownerUserId');

    const result = accessRecords.map(record => ({
      ...record.sharedUserId.toObject(),
      accessStatus: record.status,
      accessRecordId: record._id,
      owner: record.ownerUserId
    }));

    res.json(ApiResponse.success(result, 'Approved sub-users retrieved successfully'));
  }),
};