// controllers/subUser.controller.js
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { UserAccess } from '../models/UserAccess.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

export const subUserController = {
  // Get sub-users with access (role-based)
  getSubUsersWithAccess: asyncHandler(async (req, res) => {
        console.log('=== FETCHING SUB-USERS FROM USER_ACCESS ===');
    console.log('Query params:', req.query);
    console.log('User role:', req.user?.role);
    console.log('User ID:', req.user?._id);
    const { ownerUserId, status, dealerId } = req.query;
    const user = req.user;
    
    let filter = {};
console.log('Initial filter:', filter);
    // Role-based filtering
    if (user.role === 'USER') {
      // USER can only see their own sub-users
      if (ownerUserId && ownerUserId !== user._id.toString()) {
        throw ApiError.forbidden('You can only access your own sub-users');
      }
      filter.ownerUserId = user._id;
      console.log('USER filter applied - ownerUserId:', user._id);
    } else if (user.role === 'DEALER') {
      // DEALER can see sub-users for their dealer
      if (dealerId) {
        filter.dealerId = dealerId;
        console.log('DEALER filter applied - dealerId:', filter.dealerId);
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
       console.log('ADMIN filter applied:', filter);
    }

    // Add status filter if provided
    if (status) {
      filter.status = status;
      console.log('Status filter applied:', status);
    }

    const accessRecords = await UserAccess.find(filter)
      .populate('sharedUserId')
      .populate('ownerUserId')
      .populate('dealerId');

       console.log(`Found ${accessRecords.length} records in user_access table`);
    console.log('First record sample:', accessRecords[0] ? {
      _id: accessRecords[0]._id,
      ownerUserId: accessRecords[0].ownerUserId,
      sharedUserId: accessRecords[0].sharedUserId,
      status: accessRecords[0].status,
      dealerId: accessRecords[0].dealerId
    } : 'No records found');

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
     console.log('Returning result with', result.length, 'items');

    res.json(ApiResponse.success(result, 'Sub-users retrieved successfully'));
  }),

  // Get approved sub-users
  getApprovedSubUsers: asyncHandler(async (req, res) => {
    const { ownerUserId, dealerId } = req.query;
    const user = req.user;
    
    let filter = { status: 'ACTIVE' };

    if (user.role === 'USER') {
      filter.ownerUserId = user._id;
    } else if (user.role === 'DEALER') {
      filter.dealerId = user.dealerId || dealerId;
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

  // Get pending sub-users
  getPendingSubUsers: asyncHandler(async (req, res) => {
    const { ownerUserId, dealerId } = req.query;
    const user = req.user;
    
    let filter = { status: 'PENDING' };

    if (user.role === 'USER') {
      filter.ownerUserId = user._id;
    } else if (user.role === 'DEALER') {
      filter.dealerId = user.dealerId || dealerId;
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

  // Get sub-users for dropdown
  getSubUsersForDropdown: asyncHandler(async (req, res) => {
    const { ownerUserId, dealerId } = req.query;
    const user = req.user;
    
    let filter = { status: 'ACTIVE' };

    if (user.role === 'USER') {
      filter.ownerUserId = user._id;
    } else if (user.role === 'DEALER') {
      filter.dealerId = user.dealerId || dealerId;
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

  // Get access status for a specific sub-user
  getSubUserAccessStatus: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { ownerUserId } = req.query;
    const user = req.user;

    if (!ownerUserId && user.role === 'USER') {
      // If USER is asking, use their own ID
      const ownerId = user._id;
      const accessRecord = await UserAccess.findOne({
        ownerUserId: ownerId,
        sharedUserId: id
      }).populate('sharedUserId');

      if (!accessRecord) {
        return res.json(ApiResponse.success({
          hasAccess: false,
          status: null,
          message: 'No access record found'
        }));
      }

      const result = {
        hasAccess: accessRecord.status === 'ACTIVE',
        status: accessRecord.status,
        recordId: accessRecord._id,
        permissions: accessRecord.permissions,
        subUser: accessRecord.sharedUserId
      };

      return res.json(ApiResponse.success(result, 'Access status retrieved successfully'));
    }

    if (!ownerUserId) {
      throw ApiError.badRequest('ownerUserId is required');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid sub-user ID');
    }

    if (!mongoose.Types.ObjectId.isValid(ownerUserId)) {
      throw ApiError.badRequest('Invalid ownerUserId');
    }

    const accessRecord = await UserAccess.findOne({
      ownerUserId: ownerUserId,
      sharedUserId: id
    }).populate('sharedUserId');

    if (!accessRecord) {
      return res.json(ApiResponse.success({
        hasAccess: false,
        status: null,
        message: 'No access record found'
      }));
    }

    const result = {
      hasAccess: accessRecord.status === 'ACTIVE',
      status: accessRecord.status,
      recordId: accessRecord._id,
      permissions: accessRecord.permissions,
      subUser: accessRecord.sharedUserId
    };

    res.json(ApiResponse.success(result, 'Access status retrieved successfully'));
  }),
};