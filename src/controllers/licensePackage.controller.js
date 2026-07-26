// controllers/licensePackage.controller.js
import { LicensePackage } from '../models/LicensePackage.js';
import { Order } from '../models/Order.js';
import { createCrudController } from '../utils/createCrudController.js';
import mongoose from 'mongoose';

// Helper function to generate sequential order number
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

export const licensePackageController = createCrudController(LicensePackage, {
  populate: ['dealerId', 'createdBy'],
  searchableFields: ['packageCode', 'packageName', 'description'],
  filterableFields: ['dealerId', 'status'],
  ownerScopes: {
    DEALER: 'dealerId',
  },
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
      if (typeof body.dealerId === 'string') {
        if (mongoose.Types.ObjectId.isValid(body.dealerId)) {
          body.dealerId = new mongoose.Types.ObjectId(body.dealerId);
        } else {
          throw new Error('Invalid dealer ID format');
        }
      }
    }

    // If user is DEALER, force dealerId to their own ID
    if (req.user && req.user.role === 'DEALER') {
      body.dealerId = req.user._id;
      console.log('DEALER role - forced dealerId:', body.dealerId);
    }

    // ALWAYS set createdBy to current user
    if (req.user && req.user._id) {
      body.createdBy = req.user._id;
      console.log('Set createdBy to:', body.createdBy);
    } else {
      // Fallback: try to get from body
      if (!body.createdBy) {
        console.error('No createdBy found!');
        throw new Error('createdBy is required');
      }
    }

    // Ensure dealerId is set
    if (!body.dealerId) {
      throw new Error('dealerId is required');
    }

    // Store payment info in the body for afterCreate
    body._paymentInfo = {
      amount: body.price || 0,
      paymentMode: body.paymentMode || 'ONLINE',
      transactionReference: body.transactionReference || '',
      description: `License Package: ${body.packageName} (${body.packageCode})`,
    };

    console.log('Final body after transform:', JSON.stringify(body, null, 2));
    console.log('=== LICENSE PACKAGE TRANSFORM END ===');
    return body;
  },
  afterCreate: async (document, req) => {
    console.log('=== AFTER CREATE HOOK ===');
    console.log('Document:', document);
    console.log('Payment info:', req.body._paymentInfo);
    
    try {
      // Create order for the license package
      const orderData = {
        dealerId: document.dealerId,
        userId: req.user?._id || document.createdBy,
        orderType: 'LICENSE_PACKAGE',
        packageId: document._id,
        amount: document.price || 0,
        paymentMode: req.body.paymentMode || 'ONLINE',
        transactionReference: req.body.transactionReference || '',
        paymentStatus: 'COMPLETED',
        orderStatus: 'COMPLETED',
        description: `License Package: ${document.packageName} (${document.packageCode})`,
        notes: req.body.notes || '',
        createdBy: req.user?._id || document.createdBy || null,
      };
      
      // Generate order number
      const orderNumber = await generateOrderNumber();
      orderData.orderNumber = orderNumber;
      
      console.log('Creating order with data:', orderData);
      
      const order = await Order.create(orderData);
      console.log('Order created:', order._id);
      
      return order;
    } catch (error) {
      console.error('Error creating order for license package:', error);
      // Don't fail the package creation if order creation fails
      // Just log the error
    }
  },
});