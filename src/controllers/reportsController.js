// backend/controllers/reportsController.js
//
// Aggregation endpoints that back the dashboard's charts:
//   GET /api/reports/license-summary   -> package/sold/used/available/expiring counts
//   GET /api/reports/license-trend     -> monthly sold vs used, for the line chart
//   GET /api/reports/vehicle-status    -> online / offline / inactive vehicle counts
//
// Assumptions (adjust to match your actual schema field names if they differ):
//   - LicensePackage: { dealerId, licenseCount, paymentStatus, orderStatus, createdAt }
//   - License:        { dealerId, userId, status, activatedAt, expiryDate, createdAt }
//   - Vehicle:        { dealerId, ownerUserId, deviceId, status }
//   - Device:         { dealerId, ownerUserId, status, lastHeartbeatAt }
//
// Swap in your real model imports below.
import mongoose from 'mongoose';
import LicensePackage from '../models/LicensePackage.js';
import License from '../models/License.js';
import Vehicle from '../models/Vehicle.js';
import Device from '../models/Device.js';

const { Types } = mongoose;

// Builds a Mongo match filter scoped by dealerId / ownerUserId when present,
// so the same endpoint works for ADMIN (no scope), DEALER (dealerId), and
// USER (ownerUserId) callers without three separate routes.
function buildScopeMatch(req, { dealerField = 'dealerId', ownerField = 'ownerUserId' } = {}) {
  const match = {};
  const { dealerId, ownerUserId } = req.query;

  if (dealerId && Types.ObjectId.isValid(dealerId)) {
    match[dealerField] = new Types.ObjectId(dealerId);
  }
  if (ownerUserId && Types.ObjectId.isValid(ownerUserId)) {
    match[ownerField] = new Types.ObjectId(ownerUserId);
  }
  return match;
}

// ---------------------------------------------------------------------------
// GET /api/reports/license-summary
// ---------------------------------------------------------------------------
export async function getLicenseSummary(req, res) {
  try {
    const packageMatch = buildScopeMatch(req);
    // Only count packages that were actually paid for as "sold" quota.
    const soldMatch = { ...packageMatch, paymentStatus: 'COMPLETED' };

    const [packageCount, soldAgg, usedCount, expiringCount] = await Promise.all([
      LicensePackage.countDocuments(packageMatch),
      LicensePackage.aggregate([
        { $match: soldMatch },
        { $group: { _id: null, total: { $sum: '$licenseCount' } } },
      ]),
      License.countDocuments({ ...packageMatch, status: 'ACTIVE' }),
      License.countDocuments({
        ...packageMatch,
        status: 'ACTIVE',
        expiryDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    const licenseSold = soldAgg[0]?.total || 0;
    const licenseUsed = usedCount;
    const licenseAvailable = Math.max(licenseSold - licenseUsed, 0);

    res.json({
      success: true,
      data: {
        packageCount,
        licenseSold,
        licenseUsed,
        licenseAvailable,
        expiringIn30Days: expiringCount,
      },
    });
  } catch (err) {
    console.error('getLicenseSummary error:', err);
    res.status(500).json({ success: false, message: 'Failed to load license summary' });
  }
}

// ---------------------------------------------------------------------------
// GET /api/reports/license-trend?months=6
// ---------------------------------------------------------------------------
export async function getLicenseTrend(req, res) {
  try {
    const months = Math.min(Math.max(parseInt(req.query.months, 10) || 6, 1), 24);
    const match = buildScopeMatch(req);

    const rangeStart = new Date();
    rangeStart.setMonth(rangeStart.getMonth() - (months - 1));
    rangeStart.setDate(1);
    rangeStart.setHours(0, 0, 0, 0);

    const [soldByMonth, usedByMonth] = await Promise.all([
      LicensePackage.aggregate([
        {
          $match: {
            ...match,
            paymentStatus: 'COMPLETED',
            createdAt: { $gte: rangeStart },
          },
        },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            total: { $sum: '$licenseCount' },
          },
        },
      ]),
      License.aggregate([
        {
          $match: {
            ...match,
            activatedAt: { $gte: rangeStart, $ne: null },
          },
        },
        {
          $group: {
            _id: { year: { $year: '$activatedAt' }, month: { $month: '$activatedAt' } },
            total: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Build the last `months` buckets (oldest -> newest) and fill in zeros
    // for any month with no activity, so the chart always has a full axis.
    const buckets = [];
    const cursor = new Date(rangeStart);
    for (let i = 0; i < months; i += 1) {
      buckets.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const soldMap = new Map(soldByMonth.map((b) => [`${b._id.year}-${b._id.month}`, b.total]));
    const usedMap = new Map(usedByMonth.map((b) => [`${b._id.year}-${b._id.month}`, b.total]));

    const labels = buckets.map((b) =>
      new Date(b.year, b.month - 1, 1).toLocaleDateString('en-US', { month: 'short' }) + ` '${String(b.year).slice(2)}`
    );
    const sold = buckets.map((b) => soldMap.get(`${b.year}-${b.month}`) || 0);
    const used = buckets.map((b) => usedMap.get(`${b.year}-${b.month}`) || 0);

    res.json({ success: true, data: { labels, sold, used } });
  } catch (err) {
    console.error('getLicenseTrend error:', err);
    res.status(500).json({ success: false, message: 'Failed to load license trend' });
  }
}

// ---------------------------------------------------------------------------
// GET /api/reports/vehicle-status
// ---------------------------------------------------------------------------
export async function getVehicleStatusSummary(req, res) {
  try {
    const match = buildScopeMatch(req);
    const ONLINE_WINDOW_MS = 15 * 60 * 1000; // heartbeat within last 15 minutes = online
    const onlineCutoff = new Date(Date.now() - ONLINE_WINDOW_MS);

    const results = await Vehicle.aggregate([
      { $match: match },
      {
        $lookup: {
          from: Device.collection.name,
          localField: 'deviceId',
          foreignField: '_id',
          as: 'device',
        },
      },
      { $unwind: { path: '$device', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          computedStatus: {
            $switch: {
              branches: [
                { case: { $eq: ['$device', null] }, then: 'inactive' },
                { case: { $eq: ['$device.status', 'INACTIVE'] }, then: 'inactive' },
                {
                  case: {
                    $and: [
                      { $ne: ['$device.lastHeartbeatAt', null] },
                      { $gte: ['$device.lastHeartbeatAt', onlineCutoff] },
                    ],
                  },
                  then: 'online',
                },
                { case: { $ne: ['$device.lastHeartbeatAt', null] }, then: 'offline' },
              ],
              default: 'inactive',
            },
          },
        },
      },
      { $group: { _id: '$computedStatus', count: { $sum: 1 } } },
    ]);

    const summary = { online: 0, offline: 0, inactive: 0 };
    results.forEach((r) => {
      if (summary[r._id] !== undefined) summary[r._id] = r.count;
    });
    summary.total = summary.online + summary.offline + summary.inactive;

    res.json({ success: true, data: summary });
  } catch (err) {
    console.error('getVehicleStatusSummary error:', err);
    res.status(500).json({ success: false, message: 'Failed to load vehicle status summary' });
  }
}