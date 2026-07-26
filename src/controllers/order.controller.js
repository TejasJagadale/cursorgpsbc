// controllers/order.controller.js
import { Order } from '../models/Order.js';
import { ApiError } from '../utils/ApiError.js';
import mongoose from 'mongoose';

export const orderController = {
  // Get all orders with role-based filtering
  getAll: async (req, res, next) => {
    try {
      const { page = 1, limit = 10, ...filters } = req.query;
      const skip = (page - 1) * limit;
      
      // Build filter
      const filter = { ...filters };
      
      console.log('User role:', req.user?.role);
      console.log('User ID:', req.user?._id);
      console.log('User dealerId:', req.user?.dealerId);
      
      // Role-based filtering - CRITICAL FIX
      if (req.user.role === 'ADMIN') {
        // Admin sees ALL orders - no filter needed
        console.log('ADMIN: Showing all orders');
      } 
      else if (req.user.role === 'DEALER') {
        // Dealer sees ONLY orders for their dealership
        filter.dealerId = req.user._id;
        console.log('DEALER: Filtering by dealerId:', req.user._id);
      } 
      else if (req.user.role === 'USER') {
        // User sees orders for their dealer AND their own orders
        const dealerId = typeof req.user.dealerId === 'object' 
          ? req.user.dealerId?._id 
          : req.user.dealerId;
        
        console.log('USER: DealerId from user:', dealerId);
        console.log('USER: User ID:', req.user._id);
        
        if (dealerId) {
          filter.$or = [
            { dealerId: dealerId },
            { userId: req.user._id }
          ];
          console.log('USER: Filtering by dealerId OR userId');
        } else {
          filter.userId = req.user._id;
          console.log('USER: Filtering by userId only');
        }
      } 
      else if (req.user.role === 'SUB_USER') {
        // Sub-user sees orders for their dealer
        const dealerId = typeof req.user.dealerId === 'object' 
          ? req.user.dealerId?._id 
          : req.user.dealerId;
        
        console.log('SUB_USER: DealerId from user:', dealerId);
        
        if (dealerId) {
          filter.dealerId = dealerId;
          console.log('SUB_USER: Filtering by dealerId');
        } else {
          // If no dealer, return empty
          console.log('SUB_USER: No dealerId found, returning empty');
          return res.json({
            success: true,
            data: [],
            meta: { 
              total: 0, 
              page: parseInt(page), 
              limit: parseInt(limit),
              pages: 0
            }
          });
        }
      }
      
      console.log('Final filter:', JSON.stringify(filter, null, 2));
      
      // Get orders with filter
      const orders = await Order.find(filter)
        .populate('dealerId userId packageId licenseId createdBy')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      const total = await Order.countDocuments(filter);
      
      console.log(`Found ${orders.length} orders for ${req.user.role}`);
      
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
      console.error('Error in orderController.getAll:', error);
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
      let hasAccess = false;
      
      if (req.user.role === 'ADMIN') {
        hasAccess = true;
      } else if (req.user.role === 'DEALER') {
        const dealerId = typeof order.dealerId === 'object' 
          ? order.dealerId?._id 
          : order.dealerId;
        hasAccess = dealerId?.toString() === req.user._id.toString();
      } else if (req.user.role === 'USER') {
        const dealerId = typeof order.dealerId === 'object' 
          ? order.dealerId?._id 
          : order.dealerId;
        const userId = typeof order.userId === 'object' 
          ? order.userId?._id 
          : order.userId;
        
        const userDealerId = typeof req.user.dealerId === 'object' 
          ? req.user.dealerId?._id 
          : req.user.dealerId;
        
        hasAccess = 
          userId?.toString() === req.user._id.toString() ||
          (userDealerId && dealerId?.toString() === userDealerId.toString());
      } else if (req.user.role === 'SUB_USER') {
        const dealerId = typeof order.dealerId === 'object' 
          ? order.dealerId?._id 
          : order.dealerId;
        const userDealerId = typeof req.user.dealerId === 'object' 
          ? req.user.dealerId?._id 
          : req.user.dealerId;
        hasAccess = userDealerId && dealerId?.toString() === userDealerId.toString();
      }
      
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
      let hasAccess = false;
      
      if (req.user.role === 'ADMIN') {
        hasAccess = true;
      } else if (req.user.role === 'DEALER') {
        const dealerId = typeof existing.dealerId === 'object' 
          ? existing.dealerId?._id 
          : existing.dealerId;
        hasAccess = dealerId?.toString() === req.user._id.toString();
      }
      
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