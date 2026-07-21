import mongoose from 'mongoose';
import { License } from '../models/License.js';
import { LicensePackage } from '../models/LicensePackage.js';
import { Device } from '../models/Device.js';
import { Vehicle } from '../models/Vehicle.js';
import { DeviceAssignment } from '../models/DeviceAssignment.js';
import { LicenseHistory } from '../models/LicenseHistory.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * POST /api/v1/licenses/activate
 *
 * Body shape expected from the "License Activation" screen:
 * {
 *   packageId: string,
 *   sim: { model, imei, number },
 *   device: { imei, model, protocol, port },
 *   vehicle: {
 *     number, body, make, model,
 *     customAttributes: [{ key, value }]
 *   },
 *   ownerUserId: string,
 *   subUserId?: string
 * }
 *
 * req.user is assumed to be populated by the `authenticate` middleware and to
 * expose `_id` (the logged-in dealer/admin activating the license) and
 * `dealerId` (the dealer this activation belongs to).
 */
export const activateLicense = asyncHandler(async (req, res) => {
  const { packageId, sim, device, vehicle, ownerUserId, subUserId } = req.body;

  // ---- basic payload validation -------------------------------------------------
  const missing = [];
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

  const dealerId = req.user.dealerId ?? req.user._id;
  const activatedBy = req.user._id;

  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      // 1. Lock & validate the license package has an available seat
      const licensePackage = await LicensePackage.findById(packageId).session(session);

      if (!licensePackage) {
        throw ApiError.notFound('License package not found');
      }

      if (licensePackage.usedLicenses >= licensePackage.totalLicenses) {
        throw ApiError.badRequest('No available licenses left in this package');
      }

      // 2. Create the device (SIM + device info together, one record)
      const [deviceDoc] = await Device.create(
        [
          {
            dealerId,
            ownerUserId,
            imei: device.imei,
            deviceModel: device.model,
            protocol: device.protocol,
            port: device.port,
            simModel: sim.model,
            simImei: sim.imei,
            simNumber: sim.number,
            createdBy: activatedBy,
          },
        ],
        { session }
      );

      // 3. Create the vehicle
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
          },
        ],
        { session }
      );

      // 4. Work out the license validity window from the package duration
      const startDate = new Date();
      const expiryDate = new Date(startDate);
      expiryDate.setMonth(expiryDate.getMonth() + (licensePackage.durationMonths ?? 12));

      // 5. Create the license
      const [licenseDoc] = await License.create(
        [
          {
            packageId: licensePackage._id,
            dealerId,
            userId: subUserId || ownerUserId,
            startDate,
            expiryDate,
            activatedBy,
            activatedAt: startDate,
          },
        ],
        { session }
      );

      // 6. Link the device back to the license
      deviceDoc.licenseId = licenseDoc._id;
      await deviceDoc.save({ session });

      // 7. Assign the device to the vehicle
      await DeviceAssignment.create(
        [
          {
            deviceId: deviceDoc._id,
            vehicleId: vehicleDoc._id,
            assignedFrom: startDate,
            assignedBy: activatedBy,
          },
        ],
        { session }
      );

      // 8. Record the license history entry
      await LicenseHistory.create(
        [
          {
            licenseId: licenseDoc._id,
            vehicleId: vehicleDoc._id,
            deviceId: deviceDoc._id,
            assignedFrom: startDate,
            assignedBy: activatedBy,
          },
        ],
        { session }
      );

      // 9. Consume one seat from the package
      licensePackage.usedLicenses += 1;
      await licensePackage.save({ session });

      result = {
        license: licenseDoc,
        device: deviceDoc,
        vehicle: vehicleDoc,
        package: {
          totalLicenses: licensePackage.totalLicenses,
          usedLicenses: licensePackage.usedLicenses,
          availableLicenses: licensePackage.totalLicenses - licensePackage.usedLicenses,
        },
      };
    });

    res.status(201).json(ApiResponse.success(result, 'License activated successfully'));
  } finally {
    session.endSession();
  }
});