// import { Device } from '../models/Device.js';
// import { createCrudController } from '../utils/createCrudController.js';

// export const deviceController = createCrudController(Device, {
//   populate: ['dealerId', 'licenseId', 'ownerUserId', 'createdBy'],
//   searchableFields: ['imei', 'serialNumber', 'simNumber', 'deviceModel'],
//   filterableFields: ['dealerId', 'ownerUserId', 'status', 'licenseId'],
//   ownerScopes: {
//     DEALER: 'dealerId',
//     USER: 'ownerUserId',
//   },
// });

// controllers/device.controller.js
import { Device } from '../models/Device.js';
import { createCrudController } from '../utils/createCrudController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

// Create the base CRUD controller
const baseController = createCrudController(Device, {
  populate: ['dealerId', 'licenseId', 'ownerUserId', 'createdBy'],
  searchableFields: ['imei', 'serialNumber', 'simNumber', 'deviceModel'],
  filterableFields: ['dealerId', 'ownerUserId', 'status', 'licenseId'],
  ownerScopes: {
    DEALER: 'dealerId',
    USER: 'ownerUserId',
    SUB_USER: 'ownerUserId', // Sub-users see devices of their parent user
  },
});

// Add custom method to get user's devices
const getUserDevices = asyncHandler(async (req, res) => {
  const user = req.user;
  console.log('Getting devices for user:', user._id, 'Role:', user.role);

  let filter = {};

  // Build filter based on user role
  switch (user.role) {
    case 'ADMIN':
      // Admin sees all devices
      filter = {};
      break;
      
    case 'DEALER':
      // Dealer sees devices assigned to their dealership
      filter = { dealerId: user._id };
      break;
      
    case 'USER':
      // Regular user sees devices they own
      filter = { ownerUserId: user._id };
      break;
      
    case 'SUB_USER':
      // Sub-user sees devices owned by their parent user
      if (user.parentId) {
        filter = { ownerUserId: user.parentId };
      } else {
        // If no parent, they see their own devices (fallback)
        filter = { ownerUserId: user._id };
      }
      break;
      
    default:
      // For any other role, show nothing (or own devices)
      filter = { ownerUserId: user._id };
  }

  console.log('Device filter:', filter);

  // Get devices with populated fields
  const devices = await Device.find(filter)
    .populate('dealerId', 'name username email companyName')
    .populate('ownerUserId', 'name username email')
    .populate('licenseId', 'packageName packageCode')
    .populate('createdBy', 'name username')
    .sort({ createdAt: -1 });

  console.log(`Found ${devices.length} devices for user ${user._id}`);

  // Transform devices to include vehicle information if available
  const transformedDevices = devices.map(device => {
    const deviceObj = device.toObject();
    
    // Add any additional computed fields
    return {
      ...deviceObj,
      // You might want to add location data here if available
      // This will be updated by the live tracking API
    };
  });

  res.json(ApiResponse.success({
    devices: transformedDevices,
    count: transformedDevices.length,
  }, 'User devices retrieved successfully'));
});

// Export extended controller
export const deviceController = {
  ...baseController,
  getUserDevices,
};