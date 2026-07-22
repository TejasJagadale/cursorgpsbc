import { LicensePackage } from '../models/LicensePackage.js';
import { createCrudController } from '../utils/createCrudController.js';
import mongoose from 'mongoose';

export const licensePackageController = createCrudController(LicensePackage, {
  populate: ['dealerId', 'createdBy'],
  searchableFields: ['packageCode', 'packageName', 'description'],
  filterableFields: ['dealerId', 'status'],
  ownerScopes: {
    DEALER: 'dealerId',
  },
  // Add transformCreate to handle the dealerId properly
  transformCreate: async (body, req) => {
    console.log('=== LICENSE PACKAGE TRANSFORM CREATE ===');
    console.log('Original body:', JSON.stringify(body, null, 2));
    console.log('User:', req.user ? {
      _id: req.user._id,
      role: req.user.role,
      name: req.user.name
    } : 'No user');

    // Ensure dealerId is properly set
    if (body.dealerId) {
      // If dealerId is a string, convert to ObjectId
      if (typeof body.dealerId === 'string') {
        // Check if it's a valid ObjectId
        if (mongoose.Types.ObjectId.isValid(body.dealerId)) {
          body.dealerId = new mongoose.Types.ObjectId(body.dealerId);
          console.log('Converted dealerId to ObjectId:', body.dealerId);
        } else {
          console.log('Invalid dealerId format:', body.dealerId);
          // If invalid, try to find the dealer by username or name
          // Or set to null and let validation fail
          throw new Error('Invalid dealer ID format');
        }
      }
    }

    // If user is DEALER, force dealerId to their own ID
    if (req.user && req.user.role === 'DEALER') {
      body.dealerId = req.user._id;
      console.log('DEALER role - forced dealerId:', body.dealerId);
    }

    // Set createdBy to current user
    if (req.user) {
      body.createdBy = req.user._id;
    }

    // Ensure required fields are present
    if (!body.dealerId) {
      throw new Error('dealerId is required');
    }

    console.log('Final body after transform:', JSON.stringify(body, null, 2));
    console.log('=== LICENSE PACKAGE TRANSFORM END ===');
    return body;
  },
});