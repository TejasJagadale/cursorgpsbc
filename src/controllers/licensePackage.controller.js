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
  
  // Create with order creation
  create: async (req, res, next) => {
    try {
      console.log('=== LICENSE PACKAGE CREATE START ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('User:', req.user ? {
        _id: req.user._id,
        role: req.user.role,
        name: req.user.name
      } : 'No user');

      let body = { ...req.body };
      
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

      // Set createdBy to current user
      if (req.user && req.user._id) {
        body.createdBy = req.user._id;
        console.log('Set createdBy to:', body.createdBy);
      } else {
        if (!body.createdBy) {
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

      console.log('Creating license package with data:', JSON.stringify(body, null, 2));

      // Create the license package
      const document = await LicensePackage.create(body);
      console.log('License package created:', document._id);

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
        status: 'ACTIVE',
      };

      console.log('Creating order with data:', JSON.stringify(orderData, null, 2));

      const order = await Order.create(orderData);
      console.log('Order created:', order._id);

      // Update the package with the order ID
      await LicensePackage.findByIdAndUpdate(document._id, {
        orderId: order._id
      });

      // Populate the result
      const result = await LicensePackage.findById(document._id)
        .populate('dealerId createdBy');

      const populatedOrder = await Order.findById(order._id)
        .populate('createdBy');

      const responseData = result.toObject();
      responseData.order = populatedOrder;

      console.log('=== LICENSE PACKAGE CREATE SUCCESS ===');
      console.log('Package ID:', document._id);
      console.log('Order #:', order.orderNumber);

      res.status(201).json({
        success: true,
        message: 'License package created successfully',
        data: responseData
      });

    } catch (error) {
      console.error('Error creating license package:', error);
      next(error);
    }
  },
  
  // Update
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const body = { ...req.body };
      
      // If user is DEALER, ensure they can only update their own packages
      if (req.user && req.user.role === 'DEALER') {
        const existing = await LicensePackage.findById(id);
        if (!existing) {
          return res.status(404).json({
            success: false,
            message: 'License package not found'
          });
        }
        if (existing.dealerId.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'You can only update your own packages'
          });
        }
      }
      
      const document = await LicensePackage.findByIdAndUpdate(
        id,
        body,
        { new: true, runValidators: true }
      ).populate('dealerId createdBy');
      
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'License package not found'
        });
      }
      
      // Update the order if it exists
      const order = await Order.findOne({
        packageId: document._id,
        orderType: 'LICENSE_PACKAGE'
      });
      
      if (order) {
        order.amount = document.price || 0;
        order.description = `License Package: ${document.packageName} (${document.packageCode})`;
        order.paymentMode = document.paymentMode || 'ONLINE';
        order.transactionReference = document.transactionReference || '';
        order.notes = document.orderNotes || '';
        await order.save();
        
        const responseData = document.toObject();
        responseData.order = await Order.findById(order._id).populate('createdBy');
        
        return res.json({
          success: true,
          message: 'License package updated successfully',
          data: responseData
        });
      }
      
      res.json({
        success: true,
        message: 'License package updated successfully',
        data: document
      });
      
    } catch (error) {
      console.error('Error updating license package:', error);
      next(error);
    }
  },
  
  // Delete
  remove: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Check if package exists
      const existing = await LicensePackage.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'License package not found'
        });
      }
      
      // If user is DEALER, ensure they can only delete their own packages
      if (req.user && req.user.role === 'DEALER') {
        if (existing.dealerId.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'You can only delete your own packages'
          });
        }
      }
      
      // Delete the order as well
      await Order.findOneAndDelete({
        packageId: id,
        orderType: 'LICENSE_PACKAGE'
      });
      
      // Delete the package
      await LicensePackage.findByIdAndDelete(id);
      
      res.json({
        success: true,
        message: 'License package deleted successfully'
      });
      
    } catch (error) {
      console.error('Error deleting license package:', error);
      next(error);
    }
  },
};