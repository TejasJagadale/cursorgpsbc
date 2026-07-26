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

// Custom getAll with order data
const getAllWithOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, ...filters } = req.query;
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = { ...filters };
    if (req.user?.role === 'DEALER') {
      filter.dealerId = req.user._id;
    }
    
    // Get license packages
    const packages = await LicensePackage.find(filter)
      .populate('dealerId createdBy')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await LicensePackage.countDocuments(filter);
    
    // Get orders for each package
    const packagesWithOrders = await Promise.all(
      packages.map(async (pkg) => {
        const pkgObj = pkg.toObject();
        
        // Find order for this package
        const order = await Order.findOne({
          packageId: pkg._id,
          orderType: 'LICENSE_PACKAGE'
        }).populate('createdBy');
        
        if (order) {
          pkgObj.order = order;
          // Also update the package with order data if not present
          if (!pkgObj.orderNumber) {
            pkgObj.orderNumber = order.orderNumber;
          }
          if (!pkgObj.paymentStatus) {
            pkgObj.paymentStatus = order.paymentStatus;
          }
        }
        
        return pkgObj;
      })
    );
    
    res.json({
      success: true,
      data: packagesWithOrders,
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
    
    const pkg = await LicensePackage.findById(id)
      .populate('dealerId createdBy');
    
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'License package not found'
      });
    }
    
    const pkgObj = pkg.toObject();
    
    // Find order for this package
    const order = await Order.findOne({
      packageId: pkg._id,
      orderType: 'LICENSE_PACKAGE'
    }).populate('createdBy');
    
    if (order) {
      pkgObj.order = order;
    }
    
    res.json({
      success: true,
      data: pkgObj
    });
  } catch (error) {
    next(error);
  }
};

export const licensePackageController = {
  // Use custom handlers
  getAll: getAllWithOrders,
  getById: getByIdWithOrder,
  
  // Use default CRUD for other operations
  create: createCrudController(LicensePackage, {
    populate: ['dealerId', 'createdBy'],
    searchableFields: ['packageCode', 'packageName', 'description'],
    filterableFields: ['dealerId', 'status'],
    ownerScopes: {
      DEALER: 'dealerId',
    },
    transformCreate: async (body, req) => {
      console.log('=== LICENSE PACKAGE TRANSFORM CREATE ===');
      console.log('Original body:', JSON.stringify(body, null, 2));

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

      if (req.user && req.user.role === 'DEALER') {
        body.dealerId = req.user._id;
        console.log('DEALER role - forced dealerId:', body.dealerId);
      }

      // ALWAYS set createdBy to current user
      if (req.user && req.user._id) {
        body.createdBy = req.user._id;
        console.log('Set createdBy to:', body.createdBy);
      } else {
        if (!body.createdBy) {
          console.error('No createdBy found!');
          throw new Error('createdBy is required');
        }
      }

      if (!body.dealerId) {
        throw new Error('dealerId is required');
      }

      // Set payment fields from request body
      body.paymentMode = body.paymentMode || 'ONLINE';
      body.transactionReference = body.transactionReference || '';
      body.orderNotes = body.notes || '';
      body.paymentStatus = 'COMPLETED';
      body.orderStatus = 'COMPLETED';
      body.orderDate = new Date();

      console.log('Final body after transform:', JSON.stringify(body, null, 2));
      return body;
    },
    afterCreate: async (document, req) => {
      console.log('=== AFTER CREATE HOOK ===');
      console.log('Document:', document);
      
      try {
        // Generate order number
        const orderNumber = await generateOrderNumber();
        
        // Update the license package with order number
        await LicensePackage.findByIdAndUpdate(document._id, {
          orderNumber: orderNumber
        });
        
        // Create order for the license package
        const orderData = {
          dealerId: document.dealerId,
          userId: req.user?._id || document.createdBy,
          orderType: 'LICENSE_PACKAGE',
          packageId: document._id,
          amount: document.price || 0,
          paymentMode: document.paymentMode || 'ONLINE',
          transactionReference: document.transactionReference || '',
          paymentStatus: 'COMPLETED',
          orderStatus: 'COMPLETED',
          description: `License Package: ${document.packageName} (${document.packageCode})`,
          notes: document.orderNotes || '',
          createdBy: req.user?._id || document.createdBy || null,
          orderNumber: orderNumber,
        };
        
        console.log('Creating order with data:', orderData);
        
        const order = await Order.create(orderData);
        console.log('Order created:', order._id);
        
        // Update the package with the order ID
        await LicensePackage.findByIdAndUpdate(document._id, {
          orderId: order._id
        });
        
        return order;
      } catch (error) {
        console.error('Error creating order for license package:', error);
      }
    },
  }).create,
  
  // Use default update and delete
  update: createCrudController(LicensePackage, {
    populate: ['dealerId', 'createdBy'],
  }).update,
  
  remove: createCrudController(LicensePackage, {}).remove,
};