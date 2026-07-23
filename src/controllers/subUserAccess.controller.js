import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
    findOrCreateAndShareSubUser,
    revokeSubUserAccess,
    getAggregatedAccessForSharedUser,
} from '../services/subUserAccessService.js';

// POST /sub-user-access/share
//
// Body:
// {
//   "dealerId": "...",
//   "ownerUserId": "...",                 // the Main User doing the sharing
//   "subUser": {                          // identifies/creates the Sub User
//     "name": "Kumar", "phoneNumber": "9000000003", "email": "...", "password": "..."
//   },
//   "resources": [                        // omit resourceId when resourceType is ALL_VEHICLES
//     { "resourceType": "VEHICLE_GROUP", "resourceId": "..." },
//     { "resourceType": "VEHICLE", "resourceId": "..." }
//   ]
// }
//
// This should replace a plain POST /users call from the "Create Sub Users"
// screen — a plain create can't detect "this phone number already exists as
// Kumar under a different owner, reuse it" or wire up the sharing rows in
// the same transaction.
export const shareSubUser = asyncHandler(async (req, res) => {
    const { dealerId, ownerUserId, subUser, resources, createdBy } = req.body;

    if (!dealerId || !ownerUserId || !subUser) {
        throw ApiError.badRequest
            ? ApiError.badRequest('dealerId, ownerUserId, and subUser are required.')
            : Object.assign(new Error('dealerId, ownerUserId, and subUser are required.'), { statusCode: 400 });
    }

    const result = await findOrCreateAndShareSubUser({
        dealerId,
        ownerUserId,
        subUserInput: subUser,
        resources: resources || [],
        createdBy: createdBy || ownerUserId,
    });

    res.status(201).json(ApiResponse.success(result, 'Sub-user shared successfully'));
});

// DELETE /sub-user-access/revoke
// Body: { dealerId, ownerUserId, sharedUserId }
// Cascading revoke — use this instead of the generic DELETE /user-access/:id
// when you need ResourceAccess rows cleaned up too.
export const revokeShare = asyncHandler(async (req, res) => {
    const { dealerId, ownerUserId, sharedUserId } = req.body;

    if (!dealerId || !ownerUserId || !sharedUserId) {
        throw ApiError.badRequest
            ? ApiError.badRequest('dealerId, ownerUserId, and sharedUserId are required.')
            : Object.assign(new Error('dealerId, ownerUserId, and sharedUserId are required.'), { statusCode: 400 });
    }

    await revokeSubUserAccess({ dealerId, ownerUserId, sharedUserId });
    res.json(ApiResponse.success(null, 'Access revoked'));
});

// GET /sub-user-access/my-access
// Requires `authenticate` (already applied globally before this router is
// mounted — see routes/index.js). Returns everything the logged-in
// sub-user can see, grouped by owner.
export const getMySharedAccess = asyncHandler(async (req, res) => {
    const sharedUserId = req.user._id;
    const dealerId = req.user.dealerId;

    const grouped = await getAggregatedAccessForSharedUser({ sharedUserId, dealerId });
    res.json(ApiResponse.success(grouped));
});