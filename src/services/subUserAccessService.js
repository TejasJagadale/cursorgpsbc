import mongoose from 'mongoose';
import { User } from '../models/User.js'; // adjust path if your User model lives elsewhere
import { UserAccess } from '../models/UserAccess.js';
import { ResourceAccess } from '../models/ResourceAccess.js';
import { UserRole, EntityStatus, ResourceType } from '../constants/enums.js';

/**
 * "User A / User B create the same Sub User" flow from the diagram, adapted
 * to your actual schema (ResourceAccess carries ownerUserId/sharedUserId
 * directly, no separate userAccessId join):
 *
 *  1. Search for an existing user by phoneNumber/email *within this dealerId*.
 *  2. If not found, create the sub-user (role SUB_USER).
 *  3. Insert/reuse the UserAccess row (ownerUserId -> sharedUserId).
 *  4. Insert ResourceAccess rows for whichever vehicles/groups (or
 *     ALL_VEHICLES) the owner is sharing with this sub-user.
 *
 * Runs inside one Mongo transaction — requires MongoDB as a replica set
 * (default on Atlas; enable a single-node RS for local dev, or strip the
 * session/withTransaction calls, since every step below is already
 * idempotent via findOneAndUpdate + upsert on its own).
 *
 * @param {Object} params
 * @param {string} params.dealerId
 * @param {string} params.ownerUserId   - the Main User doing the sharing (Ravi/Suresh)
 * @param {Object} params.subUserInput  - { name, phoneNumber, email, password, status? }
 * @param {Array<{resourceType: 'VEHICLE'|'VEHICLE_GROUP'|'ALL_VEHICLES', resourceId?: string}>} [params.resources]
 * @param {string} [params.createdBy]   - defaults to ownerUserId
 */
export async function findOrCreateAndShareSubUser({
  dealerId,
  ownerUserId,
  subUserInput,
  resources = [],
  createdBy,
}) {
  if (!subUserInput?.phoneNumber && !subUserInput?.email) {
    const err = new Error('A phone number or email is required to identify the sub-user.');
    err.statusCode = 400;
    throw err;
  }

  const session = await mongoose.startSession();

  try {
    let sharedUser;
    let userAccess;
    const createdResourceAccess = [];

    await session.withTransaction(async () => {
      // 1. Search by phoneNumber/email *within this dealerId* — the same
      //    number can be a different sub-user under a different dealer.
      const lookupOr = [];
      if (subUserInput.phoneNumber) lookupOr.push({ phoneNumber: subUserInput.phoneNumber });
      if (subUserInput.email) lookupOr.push({ email: subUserInput.email });

      sharedUser = await User.findOne({ dealerId, $or: lookupOr }).session(session);

      // 2. Not found -> create it fresh as a SUB_USER under this dealer.
      //    Left at the schema's default status (PENDING, per your existing
      //    sub-user approval flow / DealerNotifications) unless the caller
      //    explicitly passes one.
      if (!sharedUser) {
        const created = await User.create(
          [
            {
              dealerId,
              role: UserRole.SUB_USER,
              name: subUserInput.name,
              phoneNumber: subUserInput.phoneNumber,
              email: subUserInput.email,
              password: subUserInput.password, // assumes hashing happens in a User pre-save hook
              ...(subUserInput.status ? { status: subUserInput.status } : {}),
            },
          ],
          { session }
        );
        sharedUser = created[0];
      }

      // 3. Insert or reuse the UserAccess row for (dealer, owner, sharedUser).
      //    Idempotent: sharing with the same pair twice just returns the
      //    existing row instead of erroring on the unique index.
      userAccess = await UserAccess.findOneAndUpdate(
        { dealerId, ownerUserId, sharedUserId: sharedUser._id },
        {
          $setOnInsert: {
            dealerId,
            ownerUserId,
            sharedUserId: sharedUser._id,
            status: EntityStatus.ACTIVE,
            createdBy: createdBy || ownerUserId,
          },
        },
        { new: true, upsert: true, session }
      );

      // 4. Insert ResourceAccess rows. resourceId is omitted/null for
      //    ALL_VEHICLES (per your schema's sparse index), required otherwise.
      for (const { resourceType, resourceId } of resources) {
        if (resourceType !== ResourceType.ALL_VEHICLES && !resourceId) {
          const err = new Error(`resourceId is required for resourceType "${resourceType}".`);
          err.statusCode = 400;
          throw err;
        }

        const matchFilter = {
          dealerId,
          ownerUserId,
          sharedUserId: sharedUser._id,
          resourceType,
          ...(resourceType === ResourceType.ALL_VEHICLES ? {} : { resourceId }),
        };

        const row = await ResourceAccess.findOneAndUpdate(
          matchFilter,
          {
            $setOnInsert: {
              ...matchFilter,
              status: EntityStatus.ACTIVE,
              createdBy: createdBy || ownerUserId,
            },
          },
          { new: true, upsert: true, session }
        );
        createdResourceAccess.push(row);
      }
    });

    return { sharedUser, userAccess, resourceAccess: createdResourceAccess };
  } finally {
    session.endSession();
  }
}

/**
 * Revoke one owner's share with a sub-user: deletes the UserAccess row and
 * every ResourceAccess row for that same (dealer, owner, sharedUser) triple.
 * Other owners' shares with the same sub-user are untouched. Use this
 * instead of the generic DELETE /user-access/:id when you need the cascade —
 * the generic CRUD delete has no knowledge of ResourceAccess.
 */
export async function revokeSubUserAccess({ dealerId, ownerUserId, sharedUserId }) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await ResourceAccess.deleteMany({ dealerId, ownerUserId, sharedUserId }).session(session);
      await UserAccess.findOneAndDelete({ dealerId, ownerUserId, sharedUserId }).session(session);
    });
  } finally {
    session.endSession();
  }
}

/**
 * Step 3 of the workflow ("Kumar Logs In"): every vehicle/group/ALL_VEHICLES
 * grant Kumar can see, grouped by which owner shared it with him. Since your
 * ResourceAccess already carries sharedUserId directly, this is a single
 * query rather than a join through UserAccess — UserAccess is only consulted
 * to confirm the grant is ACTIVE.
 */
export async function getAggregatedAccessForSharedUser({ sharedUserId, dealerId }) {
  const activeGrants = await UserAccess.find({
    sharedUserId,
    dealerId,
    status: EntityStatus.ACTIVE,
  })
    .populate('ownerUserId', 'name username phoneNumber email')
    .lean();

  if (activeGrants.length === 0) return [];

  const activeOwnerIds = activeGrants.map((g) => g.ownerUserId?._id).filter(Boolean);

  const resourceRows = await ResourceAccess.find({
    sharedUserId,
    dealerId,
    status: EntityStatus.ACTIVE,
    ownerUserId: { $in: activeOwnerIds },
  }).lean();

  const rowsByOwner = new Map();
  resourceRows.forEach((row) => {
    const key = String(row.ownerUserId);
    if (!rowsByOwner.has(key)) rowsByOwner.set(key, []);
    rowsByOwner.get(key).push(row);
  });

  return activeGrants.map((grant) => ({
    owner: grant.ownerUserId,
    resources: rowsByOwner.get(String(grant.ownerUserId?._id)) || [],
  }));
}