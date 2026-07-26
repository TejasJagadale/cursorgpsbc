// controllers/order.controller.js
import { Order } from '../models/Order.js';
import { createCrudController } from '../utils/createCrudController.js';

export const orderController = createCrudController(Order, {
  populate: ['dealerId', 'userId', 'packageId', 'licenseId', 'createdBy'],
  searchableFields: ['orderNumber', 'transactionReference', 'description'],
  filterableFields: ['dealerId', 'userId', 'orderType', 'paymentStatus', 'orderStatus', 'status'],
  ownerScopes: {
    DEALER: 'dealerId',
    USER: 'dealerId',
    SUB_USER: 'dealerId',
  },
  transformCreate: async (body, req) => {
    // Set createdBy only if user exists, otherwise leave as null
    if (req.user) {
      body.createdBy = req.user._id;
      
      // If user is DEALER, set dealerId to their ID
      if (req.user.role === 'DEALER') {
        body.dealerId = req.user._id;
      }
    }
    
    // Ensure dealerId is set
    if (!body.dealerId) {
      throw new Error('dealerId is required for orders');
    }
    
    // Set default values if not provided
    if (!body.paymentStatus) {
      body.paymentStatus = 'COMPLETED';
    }
    if (!body.orderStatus) {
      body.orderStatus = 'COMPLETED';
    }
    
    return body;
  },
});