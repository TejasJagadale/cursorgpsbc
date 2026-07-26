// controllers/order.controller.js
import { Order } from '../models/Order.js';
import { createCrudController } from '../utils/createCrudController.js';
import { ApiError } from '../utils/ApiError.js';

export const orderController = {
  // Get all orders with role-based filtering
  getAll: async (req, res, next) => {
    try {
      const { page = 1, limit = 10, ...filters } = req.query;
      const skip = (page - 1) * limit;
      
      // Build filter
      const filter = { ...filters };
      
      // Role-based filtering
      if (req.user.role === 'ADMIN') {
        // Admin sees all orders
        // No additional filter needed
      } else if (req.user.role === 'DEALER') {
        // Dealer sees orders for their dealership
        filter.dealerId = req.user._id;
      } else if (req.user.role === 'USER') {
        // User sees orders for their dealer and their own orders
        const dealerId = req.user.dealerId?._id || req.user.dealerId;
        if (dealerId) {
          filter.$or = [
            { dealerId: dealerId },
            { userId: req.user._id }
          ];
        } else {
          filter.userId = req.user._id;
        }
      } else if (req.user.role === 'SUB_USER') {
        // Sub-user sees orders for their dealer
        const dealerId = req.user.dealerId?._id || req.user.dealerId;
        if (dealerId) {
          filter.dealerId = dealerId;
        } else {
          // If no dealer, show empty
          return res.json({
            success: true,
            data: [],
            meta: { total: 0, page: 1, limit: 10 }
          });
        }
      }
      
      // Get orders
      const orders = await Order.find(filter)
        .populate('dealerId userId packageId licenseId createdBy')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      const total = await Order.countDocuments(filter);
      
      res.json({
        success: true,
        data: orders,
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
  },

  // Get single order with role-based access
  getById: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const order = await Order.findById(id)
        .populate('dealerId userId packageId licenseId createdBy');
      
      if (!order) {
        throw ApiError.notFound('Order not found');
      }
      
      // Check if user has access to this order
      const hasAccess = 
        req.user.role === 'ADMIN' ||
        order.dealerId._id.toString() === req.user._id.toString() ||
        order.userId?._id.toString() === req.user._id.toString() ||
        (req.user.dealerId && order.dealerId._id.toString() === req.user.dealerId.toString());
      
      if (!hasAccess) {
        throw ApiError.forbidden('You do not have access to this order');
      }
      
      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      next(error);
    }
  },

  // Create order
  create: async (req, res, next) => {
    try {
      const body = { ...req.body };
      
      // Set createdBy if not provided
      if (!body.createdBy && req.user) {
        body.createdBy = req.user._id;
      }
      
      // If user is DEALER, set dealerId
      if (req.user.role === 'DEALER' && !body.dealerId) {
        body.dealerId = req.user._id;
      }
      
      const order = await Order.create(body);
      
      const populatedOrder = await Order.findById(order._id)
        .populate('dealerId userId packageId licenseId createdBy');
      
      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: populatedOrder
      });
    } catch (error) {
      next(error);
    }
  },

  // Update order
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const body = { ...req.body };
      
      // Check if order exists
      const existing = await Order.findById(id);
      if (!existing) {
        throw ApiError.notFound('Order not found');
      }
      
      // Check access
      const hasAccess = 
        req.user.role === 'ADMIN' ||
        existing.dealerId.toString() === req.user._id.toString();
      
      if (!hasAccess) {
        throw ApiError.forbidden('You do not have access to update this order');
      }
      
      const order = await Order.findByIdAndUpdate(
        id,
        body,
        { new: true, runValidators: true }
      ).populate('dealerId userId packageId licenseId createdBy');
      
      res.json({
        success: true,
        message: 'Order updated successfully',
        data: order
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete order
  remove: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Check if order exists
      const existing = await Order.findById(id);
      if (!existing) {
        throw ApiError.notFound('Order not found');
      }
      
      // Only ADMIN can delete orders
      if (req.user.role !== 'ADMIN') {
        throw ApiError.forbidden('Only administrators can delete orders');
      }
      
      await Order.findByIdAndDelete(id);
      
      res.json({
        success: true,
        message: 'Order deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
};