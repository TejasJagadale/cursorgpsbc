// controllers/vehicleGroup.controller.js
import { VehicleGroup } from '../models/VehicleGroup.js';
import { ResourceAccess } from '../models/ResourceAccess.js';
import { createCrudController } from '../utils/createCrudController.js';
import mongoose from 'mongoose';

// Custom afterCreate hook to create resource access records
const afterCreate = async (document, req) => {
  try {
    // Get sub-user access IDs from the request body
    const { subUserAccessIds } = req.body;
    
    if (subUserAccessIds && Array.isArray(subUserAccessIds) && subUserAccessIds.length > 0) {
      console.log('Creating resource access records for sub-users:', subUserAccessIds);
      
      // Create resource access records for each sub-user
      const accessPromises = subUserAccessIds.map(async (subUserId) => {
        // Check if resource access already exists
        const existingAccess = await ResourceAccess.findOne({
          dealerId: document.dealerId,
          ownerUserId: document.ownerUserId,
          sharedUserId: subUserId,
          resourceType: 'VEHICLE_GROUP',
          resourceId: document._id
        });
        
        if (!existingAccess) {
          // Create new resource access record
          return ResourceAccess.create({
            dealerId: document.dealerId,
            ownerUserId: document.ownerUserId,
            sharedUserId: subUserId,
            resourceType: 'VEHICLE_GROUP',
            resourceId: document._id,
            permissions: {
              tracking: true,
              playback: true,
              reports: true,
              history: true,
              commands: false
            },
            status: 'ACTIVE',
            createdBy: req.user._id
          });
        }
        return null;
      });
      
      await Promise.all(accessPromises.filter(p => p !== null));
      console.log('Resource access records created successfully');
    }
  } catch (error) {
    console.error('Error creating resource access records:', error);
    // Don't throw error - we want the vehicle group to still be created
  }
};

export const vehicleGroupController = createCrudController(VehicleGroup, {
  populate: ['dealerId', 'ownerUserId', 'createdBy'],
  searchableFields: ['groupName', 'description'],
  filterableFields: ['dealerId', 'ownerUserId', 'status'],
  ownerScopes: {
    DEALER: 'dealerId',
    USER: 'ownerUserId',
  },
  afterCreate, // Add the afterCreate hook
});

// Add custom method to get vehicle group with resource access
export const getVehicleGroupWithAccess = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the vehicle group
    const group = await VehicleGroup.findById(id)
      .populate('dealerId')
      .populate('ownerUserId')
      .populate('createdBy');
      
    if (!group) {
      return res.status(404).json({ success: false, message: 'Vehicle group not found' });
    }
    
    // Get resource access records for this group
    const accessRecords = await ResourceAccess.find({
      resourceType: 'VEHICLE_GROUP',
      resourceId: group._id
    }).populate('sharedUserId');
    
    // Get vehicle group members
    const VehicleGroupMember = mongoose.model('VehicleGroupMember');
    const members = await VehicleGroupMember.find({ groupId: group._id })
      .populate('vehicleId');
    
    res.json({
      success: true,
      data: {
        ...group.toObject(),
        subUserAccess: accessRecords.map(record => ({
          _id: record._id,
          subUserId: record.sharedUserId,
          status: record.status,
          permissions: record.permissions
        })),
        vehicles: members.map(member => member.vehicleId)
      }
    });
  } catch (error) {
    console.error('Error fetching vehicle group with access:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Custom method to update vehicle group with resource access
export const updateVehicleGroupWithAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const { subUserAccessIds, vehicleIds, ...updateData } = req.body;
    
    // Update the vehicle group
    const group = await VehicleGroup.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });
    
    if (!group) {
      return res.status(404).json({ success: false, message: 'Vehicle group not found' });
    }
    
    // Update resource access if subUserAccessIds provided
    if (subUserAccessIds && Array.isArray(subUserAccessIds)) {
      // Get existing access records
      const existingAccess = await ResourceAccess.find({
        resourceType: 'VEHICLE_GROUP',
        resourceId: group._id
      });
      
      const existingSubUserIds = existingAccess.map(access => 
        access.sharedUserId.toString()
      );
      
      // Find sub-users to add (in new list but not in existing)
      const toAdd = subUserAccessIds.filter(id => !existingSubUserIds.includes(id));
      
      // Find sub-users to remove (in existing but not in new list)
      const toRemove = existingAccess.filter(access => 
        !subUserAccessIds.includes(access.sharedUserId.toString())
      );
      
      // Add new access records
      const addPromises = toAdd.map(async (subUserId) => {
        return ResourceAccess.create({
          dealerId: group.dealerId,
          ownerUserId: group.ownerUserId,
          sharedUserId: subUserId,
          resourceType: 'VEHICLE_GROUP',
          resourceId: group._id,
          permissions: {
            tracking: true,
            playback: true,
            reports: true,
            history: true,
            commands: false
          },
          status: 'ACTIVE',
          createdBy: req.user._id
        });
      });
      
      await Promise.all(addPromises);
      
      // Remove old access records
      const removePromises = toRemove.map(access => access.deleteOne());
      await Promise.all(removePromises);
    }
    
    // Update vehicle members if vehicleIds provided
    if (vehicleIds && Array.isArray(vehicleIds)) {
      const VehicleGroupMember = mongoose.model('VehicleGroupMember');
      
      // Remove all existing members
      await VehicleGroupMember.deleteMany({ groupId: group._id });
      
      // Add new members
      const memberPromises = vehicleIds.map(vehicleId => {
        return VehicleGroupMember.create({
          groupId: group._id,
          vehicleId: vehicleId,
          createdBy: req.user._id
        });
      });
      
      await Promise.all(memberPromises);
    }
    
    // Fetch updated group with all relations
    const updatedGroup = await VehicleGroup.findById(group._id)
      .populate('dealerId')
      .populate('ownerUserId')
      .populate('createdBy');
    
    const accessRecords = await ResourceAccess.find({
      resourceType: 'VEHICLE_GROUP',
      resourceId: group._id
    }).populate('sharedUserId');
    
    const VehicleGroupMember = mongoose.model('VehicleGroupMember');
    const members = await VehicleGroupMember.find({ groupId: group._id })
      .populate('vehicleId');
    
    res.json({
      success: true,
      data: {
        ...updatedGroup.toObject(),
        subUserAccess: accessRecords.map(record => ({
          _id: record._id,
          subUserId: record.sharedUserId,
          status: record.status,
          permissions: record.permissions
        })),
        vehicles: members.map(member => member.vehicleId)
      },
      message: 'Updated successfully'
    });
  } catch (error) {
    console.error('Error updating vehicle group with access:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};