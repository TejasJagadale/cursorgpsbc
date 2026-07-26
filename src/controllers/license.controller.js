// controllers/license.controller.js
import { License } from '../models/License.js';
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

// Custom getAll with order data
const getAllWithOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, ...filters } = req.query;
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = { ...filters };
    
    // Role-based filtering
    if (req.user?.role === 'DEALER') {
      filter.dealerId = req.user._id;
    } else if (req.user?.role === 'USER' || req.user?.role === 'SUB_USER') {
      const dealerId = req.user.dealerId?._id || req.user.dealerId;
      if (dealerId) {
        filter.dealerId = dealerId;
      }
      if (req.user?.role === 'USER') {
        filter.userId = req.user._id;
      }
    }
    
    // Get licenses
    const licenses = await License.find(filter)
      .populate('dealerId userId packageId activatedBy')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await License.countDocuments(filter);
    
    // Get orders for each license
    const licensesWithOrders = await Promise.all(
      licenses.map(async (license) => {
        const licenseObj = license.toObject();
        
        // Find order for this license
        const order = await Order.findOne({
          licenseId: license._id,
          orderType: 'USER_ACTIVATION'
        }).populate('createdBy');
        
        if (order) {
          licenseObj.order = order;
        }
        
        return licenseObj;
      })
    );
    
    res.json({
      success: true,
      data: licensesWithOrders,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Custom getById with order data
const getByIdWithOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const license = await License.findById(id)
      .populate('dealerId userId packageId activatedBy');
    
    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'License not found'
      });
    }
    
    const licenseObj = license.toObject();
    
    // Find order for this license
    const order = await Order.findOne({
      licenseId: license._id,
      orderType: 'USER_ACTIVATION'
    }).populate('createdBy');
    
    if (order) {
      licenseObj.order = order;
    }
    
    res.json({
      success: true,
      data: licenseObj
    });
  } catch (error) {
    next(error);
  }
};

export const licenseController = {
  // Use custom handlers
  getAll: getAllWithOrders,
  getById: getByIdWithOrder,
  
  // Use default CRUD for other operations
  create: createCrudController(License, {
    populate: ['dealerId', 'userId', 'packageId', 'activatedBy'],
    searchableFields: ['licenseKey'],
    filterableFields: ['dealerId', 'userId', 'packageId', 'status'],
    ownerScopes: {
      DEALER: 'dealerId',
      USER: 'dealerId',
    },
    transformCreate: async (body, req) => {
      // Set payment fields from request body
      body.paymentMode = body.paymentMode || 'ONLINE';
      body.transactionReference = body.transactionReference || '';
      body.orderNotes = body.notes || '';
      body.paymentStatus = 'COMPLETED';
      body.orderStatus = 'COMPLETED';
      body.orderDate = new Date();
      
      return body;
    },
    afterCreate: async (document, req) => {
      console.log('=== LICENSE AFTER CREATE HOOK ===');
      console.log('Document:', document);
      
      try {
        // Check if this is a user activation
        if (document.userId) {
          // Generate order number
          const orderNumber = await generateOrderNumber();
          
          // Update the license with order number
          await License.findByIdAndUpdate(document._id, {
            orderNumber: orderNumber
          });
          
          // Create order for user activation
          const orderData = {
            dealerId: document.dealerId,
            userId: document.userId,
            orderType: 'USER_ACTIVATION',
            licenseId: document._id,
            packageId: document.packageId,
            amount: 0,
            paymentMode: document.paymentMode || 'ONLINE',
            transactionReference: document.transactionReference || '',
            paymentStatus: 'COMPLETED',
            orderStatus: 'COMPLETED',
            description: `User Activation: License for user ${document.userId}`,
            notes: document.orderNotes || 'License activation for user',
            createdBy: req.user?._id || null,
            orderNumber: orderNumber,
          };
          
          // Get package price if available
          if (document.packageId) {
            const Package = mongoose.model('LicensePackage');
            const pkg = await Package.findById(document.packageId);
            if (pkg) {
              orderData.amount = pkg.price || 0;
              orderData.description = `User Activation: ${pkg.packageName} - ${pkg.packageCode}`;
            }
          }
          
          console.log('Creating order with data:', orderData);
          
          const order = await Order.create(orderData);
          console.log('Order created:', order._id);
          
          // Update the license with the order ID
          await License.findByIdAndUpdate(document._id, {
            orderId: order._id
          });
          
          return order;
        }
      } catch (error) {
        console.error('Error creating order for license activation:', error);
      }
    },
  }).create,
  
  // Use default update and delete
  update: createCrudController(License, {
    populate: ['dealerId', 'userId', 'packageId', 'activatedBy'],
  }).update,
  
  remove: createCrudController(License, {}).remove,
};