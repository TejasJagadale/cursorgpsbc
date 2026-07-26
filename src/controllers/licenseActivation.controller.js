// controllers/licenseActivation.controller.js
import mongoose from 'mongoose';
import { License } from '../models/License.js';
import { LicensePackage } from '../models/LicensePackage.js';
import { Device } from '../models/Device.js';
import { Vehicle } from '../models/Vehicle.js';
import { DeviceAssignment } from '../models/DeviceAssignment.js';
import { LicenseHistory } from '../models/LicenseHistory.js';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js'; // <-- ADD THIS IMPORT
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Duration unit -> the Date setter to bump when computing expiry
const DURATION_UNIT_HANDLERS = {
  DAY: (date, value) => date.setDate(date.getDate() + value),
  MONTH: (date, value) => date.setMonth(date.getMonth() + value),
  YEAR: (date, value) => date.setFullYear(date.getFullYear() + value),
};

// Helper function to generate order number
async function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const prefix = `ORD-${year}${month}${day}`;
  
  const lastOrder = await Order.findOne({
    orderNumber: { $regex: `^${prefix}` }
  }).sort({ orderNumber: -1 });
  
  let sequence = 1;
  if (lastOrder) {
    const lastSeq = parseInt(lastOrder.orderNumber.slice(-4));
    sequence = lastSeq + 1;
  }
  
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

// Helper function to generate license key
function generateLicenseKey() {
  const prefix = 'LCS';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * POST /api/v1/licenses/activate
 */
export const activateLicense = asyncHandler(async (req, res) => {
  console.log('=== LICENSE ACTIVATION START ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('User:', req.user ? {
    _id: req.user._id,
    role: req.user.role,
    name: req.user.name
  } : 'No user');

  const { 
    dealerId: bodyDealerId, 
    packageId, 
    sim, 
    device, 
    vehicle, 
    ownerUserId, 
    subUserId,
    paymentMode = 'ONLINE',
    transactionReference = '',
    notes = ''
  } = req.body;

  // ---- basic payload validation -------------------------------------------------
  const missing = [];
  if (!bodyDealerId) missing.push('dealerId');
  if (!packageId) missing.push('packageId');
  if (!ownerUserId) missing.push('ownerUserId');
  if (!device?.imei) missing.push('device.imei');
  if (!device?.model) missing.push('device.model');
  if (!device?.protocol) missing.push('device.protocol');
  if (!device?.port) missing.push('device.port');
  if (!sim?.model) missing.push('sim.model');
  if (!sim?.imei) missing.push('sim.imei');
  if (!sim?.number) missing.push('sim.number');
  if (!vehicle?.number) missing.push('vehicle.number');
  if (!vehicle?.body) missing.push('vehicle.body');
  if (!vehicle?.make) missing.push('vehicle.make');
  if (!vehicle?.model) missing.push('vehicle.model');

  if (missing.length > 0) {
    throw ApiError.badRequest(`Missing required field(s): ${missing.join(', ')}`);
  }

  const dealerId = bodyDealerId;
  const activatedBy = req.user._id;

  // Validate payment mode
  const validPaymentModes = ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'OTHER'];
  if (!validPaymentModes.includes(paymentMode)) {
    throw ApiError.badRequest(`Invalid payment mode. Must be one of: ${validPaymentModes.join(', ')}`);
  }

  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      // 1. Lock & validate the license package has an available seat
      const licensePackage = await LicensePackage.findById(packageId).session(session);

      if (!licensePackage) {
        throw ApiError.notFound('License package not found');
      }

      if (licensePackage.usedLicenseCount >= licensePackage.licenseCount) {
        throw ApiError.badRequest('No available licenses left in this package');
      }

      // 2. Check if owner user exists and belongs to the dealer
      const owner = await User.findById(ownerUserId).session(session);
      if (!owner) {
        throw ApiError.notFound('Owner user not found');
      }
      
      // Check if owner belongs to the dealer
      const ownerDealerId = typeof owner.dealerId === 'object' ? owner.dealerId?._id : owner.dealerId;
      if (ownerDealerId?.toString() !== dealerId.toString()) {
        throw ApiError.badRequest('Owner user does not belong to this dealer');
      }

      // 3. If subUserId is provided, validate it
      let subUser = null;
      if (subUserId) {
        subUser = await User.findById(subUserId).session(session);
        if (!subUser) {
          throw ApiError.notFound('Sub-user not found');
        }
        
        // Check if sub-user belongs to the owner
        const subParentId = typeof subUser.parentId === 'object' ? subUser.parentId?._id : subUser.parentId;
        if (subParentId?.toString() !== ownerUserId.toString()) {
          throw ApiError.badRequest('Sub-user does not belong to this owner');
        }
      }

      // 4. Create the device
      const [deviceDoc] = await Device.create(
        [
          {
            dealerId,
            ownerUserId,
            imei: device.imei,
            deviceModel: device.model,
            protocol: device.protocol,
            port: Number(device.port),
            simModel: sim.model,
            simImei: sim.imei,
            simNumber: sim.number,
            status: 'ACTIVE',
            createdBy: activatedBy,
          },
        ],
        { session }
      );

      // 5. Create the vehicle
      const [vehicleDoc] = await Vehicle.create(
        [
          {
            dealerId,
            ownerUserId,
            deviceId: deviceDoc._id,
            vehicleNumber: vehicle.number,
            vehicleBody: vehicle.body,
            make: vehicle.make,
            model: vehicle.model,
            chassisNumber: vehicle.chassisNumber ?? '',
            engineNumber: vehicle.engineNumber ?? '',
            color: vehicle.color ?? '',
            customAttributes: Array.isArray(vehicle.customAttributes)
              ? vehicle.customAttributes.filter((a) => a.key)
              : [],
            status: 'ACTIVE',
          },
        ],
        { session }
      );

      // 6. Work out the license validity window from the package's own duration
      const startDate = new Date();
      const expiryDate = new Date(startDate);
      const durationValue = licensePackage.duration?.value ?? 12;
      const durationUnit = licensePackage.duration?.unit ?? 'MONTH';
      const applyDuration = DURATION_UNIT_HANDLERS[durationUnit] ?? DURATION_UNIT_HANDLERS.MONTH;
      applyDuration(expiryDate, durationValue);

      // 7. Generate license key
      const licenseKey = generateLicenseKey();

      // 8. Create the license with payment fields
      const [licenseDoc] = await License.create(
        [
          {
            packageId: licensePackage._id,
            dealerId,
            userId: subUserId || ownerUserId,
            licenseKey,
            startDate,
            expiryDate,
            activatedBy,
            activatedAt: startDate,
            status: 'ACTIVE',
            paymentMode: paymentMode,
            transactionReference: transactionReference || '',
            orderNotes: notes || '',
            paymentStatus: 'COMPLETED',
            orderStatus: 'COMPLETED',
            orderDate: new Date(),
          },
        ],
        { session }
      );

      // 9. Link the device back to the license
      deviceDoc.licenseId = licenseDoc._id;
      await deviceDoc.save({ session });

      // 10. Assign the device to the vehicle
      await DeviceAssignment.create(
        [
          {
            deviceId: deviceDoc._id,
            vehicleId: vehicleDoc._id,
            assignedFrom: startDate,
            assignedTo: expiryDate,
            assignedBy: activatedBy,
            status: 'ACTIVE',
          },
        ],
        { session }
      );

      // 11. Record the license history entry
      await LicenseHistory.create(
        [
          {
            licenseId: licenseDoc._id,
            vehicleId: vehicleDoc._id,
            deviceId: deviceDoc._id,
            assignedFrom: startDate,
            assignedTo: expiryDate,
            assignedBy: activatedBy,
            status: 'ACTIVE',
          },
        ],
        { session }
      );

      // 12. Consume one seat from the package
      licensePackage.usedLicenseCount += 1;
      await licensePackage.save({ session });

      // 13. Generate order number and create order
      const orderNumber = await generateOrderNumber();
      
      // Update license with order number
      licenseDoc.orderNumber = orderNumber;
      await licenseDoc.save({ session });

      // Create order record
      const [orderDoc] = await Order.create(
        [
          {
            dealerId: dealerId,
            userId: subUserId || ownerUserId,
            orderType: 'USER_ACTIVATION',
            licenseId: licenseDoc._id,
            packageId: packageId,
            amount: licensePackage.price || 0,
            paymentMode: paymentMode || 'ONLINE',
            transactionReference: transactionReference || '',
            paymentStatus: 'COMPLETED',
            orderStatus: 'COMPLETED',
            description: `User Activation: ${licensePackage.packageName} - ${licensePackage.packageCode}`,
            notes: notes || 'License activation for user',
            createdBy: activatedBy,
            orderNumber: orderNumber,
            status: 'ACTIVE',
          },
        ],
        { session }
      );

      // 14. Populate the result with all related data
      const populatedLicense = await License.findById(licenseDoc._id)
        .populate('dealerId userId packageId activatedBy')
        .session(session);

      const populatedDevice = await Device.findById(deviceDoc._id)
        .populate('dealerId ownerUserId licenseId')
        .session(session);

      const populatedVehicle = await Vehicle.findById(vehicleDoc._id)
        .populate('dealerId ownerUserId deviceId')
        .session(session);

      const populatedOrder = await Order.findById(orderDoc._id)
        .populate('dealerId userId createdBy')
        .session(session);

      result = {
        license: populatedLicense,
        device: populatedDevice,
        vehicle: populatedVehicle,
        order: populatedOrder,
        package: {
          licenseCount: licensePackage.licenseCount,
          usedLicenseCount: licensePackage.usedLicenseCount,
          availableLicenses: licensePackage.licenseCount - licensePackage.usedLicenseCount,
          packageName: licensePackage.packageName,
          packageCode: licensePackage.packageCode,
        },
      };
    });

    console.log('=== LICENSE ACTIVATION SUCCESS ===');
    console.log('License ID:', result.license._id);
    console.log('Order #:', result.order.orderNumber);

    res.status(201).json(ApiResponse.success(result, 'License activated successfully'));
  } catch (error) {
    console.error('License activation error:', error);
    throw error;
  } finally {
    session.endSession();
  }
});